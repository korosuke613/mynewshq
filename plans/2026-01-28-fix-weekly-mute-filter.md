# 週次ワークフローのミュートフィルタ不適用バグ修正

## 問題の概要

Discussion #78（AWS What's New週次レポート）に、ミュートされるべきAmazon RDS記事が含まれている。

**影響を受けた記事**:
- `Amazon RDS for SQL Server enhances differential and transaction log restores support`
- `Amazon RDS for Oracle now supports replicas in Oracle multi-tenant configuration`

## 根本原因

週次ワークフローのPhase 2（要約生成）で、Claude Code Actionが**JSONファイルを直接読み込み**、「`muted: true`のエントリはスキップ」という**自然言語指示**に依存している。

```yaml
# .github/workflows/weekly-changelog.yml (L167-174)
prompt: |
  data/changelogs/weekly/{date}.json の ${{ matrix.provider }} 部分を読み込み...
  ## ルール
  - `muted: true` のエントリはスキップしてください  # ← AIへの指示（保証なし）
```

一方、`weekly-orchestrator.ts`の`prepareSummarizeRequests`関数では`filterMutedEntries()`でプログラム的にフィルタしているが、ワークフローからは呼び出されていない。

**問題の構造**:
```
[Phase 1: データ取得]
  fetch-changelogs.ts → JSONにmuted: true/falseフラグ付与 ✓

[Phase 2: 要約生成] ← 問題箇所
  Claude Code Action → 直接JSONを読み込み、自然言語指示に依存
  → AIが指示を無視するとミュートエントリがsummaryに含まれる

[Phase 3: 投稿]
  post-weekly-all → summaryを使用してMarkdown生成
  → summaryに含まれるエントリがそのまま表示される
```

## 解決策

### 1. Phase 2の前にフィルタ済みJSONを生成

AIへの依存を排除し、確実にフィルタリングを適用する。

### 2. 週次レポートにミュートセクションを追加（新規）

日次レポートと同様に、ミュートされた記事を折りたたみセクションとして表示する。

## 実装計画

### Step 1: フィルタスクリプト作成

**ファイル**: `scripts/filter-muted-entries.ts`

- 入力: `data/changelogs/weekly/{date}.json`
- 出力: `data/changelogs/weekly/{date}-filtered.json`
- 処理: 各プロバイダーのエントリから`muted: true`のものを除外

```typescript
// 主要なロジック
function filterMutedFromChangelog(data: ChangelogData): ChangelogData {
  return {
    ...data,
    github: data.github.filter(e => !e.muted),
    aws: data.aws.filter(e => !e.muted),
    claudeCode: data.claudeCode.filter(e => !e.muted),
    linear: data.linear.filter(e => !e.muted),
  };
}
```

### Step 2: deno.jsonにタスク追加

```json
"filter-muted": "deno run --allow-read --allow-write scripts/filter-muted-entries.ts"
```

### Step 3: ワークフロー修正

**ファイル**: `.github/workflows/weekly-changelog.yml`

1. `fetch-data`ジョブにフィルタステップを追加（L81付近）:
   ```yaml
   - name: Filter muted entries for summarization
     run: |
       deno task filter-muted \
         --input=data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}.json \
         --output=data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}-filtered.json
   ```

2. artifactに`-filtered.json`を追加（L97付近）:
   ```yaml
   path: |
     data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}.json
     data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}-filtered.json
     data/past-discussions.json
   ```

3. Phase 2のプロンプトで`-filtered.json`を参照（L168）:
   ```yaml
   prompt: |
     data/changelogs/weekly/${{ needs.fetch-data.outputs.end_date }}-filtered.json の ...
   ```

4. Phase 3では元のJSONを使用（投稿時のフォールバック用）

### Step 4: 週次レポートにミュートセクション追加

**ファイル**: `scripts/presentation/markdown/weekly-generator.ts`

`generateProviderWeeklyBody()` 関数の末尾にミュートセクションを追加:

```typescript
import { generateMutedSection } from "./muted-section.ts";

export function generateProviderWeeklyBody(
  providerId: string,
  providerData: ChangelogEntry[] | ReleaseEntry[],
  summary: ProviderWeeklySummary,
  startDate: string,
  endDate: string,
): string {
  // ... 既存のコード ...

  // ミュートセクションを追加（日次と同じフォーマット）
  body += generateMutedSection(providerData);

  return body;
}
```

**出力イメージ**:
```markdown
## 📊 カテゴリ別詳細
...

<details>
<summary>ミュートされたエントリ (2件)</summary>

- [Amazon RDS for SQL Server enhances...](URL) *(ミュートワード: Amazon RDS)*
- [Amazon RDS for Oracle now supports...](URL) *(ミュートワード: Amazon RDS)*
</details>
```

### Step 5: テスト作成・更新

**新規ファイル**: `scripts/filter-muted-entries_test.ts`
- フィルタ処理の正確性テスト
- 空データ・null値のハンドリングテスト

**更新ファイル**: `scripts/presentation/markdown/weekly-generator_test.ts`
- ミュートセクション生成のテストケース追加

## 変更対象ファイル

1. `scripts/filter-muted-entries.ts` (新規作成)
2. `scripts/filter-muted-entries_test.ts` (新規作成)
3. `.github/workflows/weekly-changelog.yml` (修正)
4. `deno.json` (タスク追加)
5. `scripts/presentation/markdown/weekly-generator.ts` (修正)
6. `scripts/presentation/markdown/weekly-generator_test.ts` (テスト追加)

## 検証方法

1. ローカルでフィルタスクリプトを実行し、出力を確認
   ```bash
   deno task filter-muted \
     --input=data/changelogs/weekly/2026-01-21.json \
     --output=/tmp/filtered.json
   # ミュートワード「Amazon RDS」に部分一致する記事が除外されていることを確認
   cat /tmp/filtered.json | jq '.aws[] | select(.title | test("Amazon RDS"; "i"))'
   # → 空の結果が期待される（「Amazon RDS for ...」で始まる記事がない）
   ```

2. テストが通ることを確認
   ```bash
   deno task test
   ```

3. プレビューで確認（ミュートセクションが表示されること）
   ```bash
   deno task preview-weekly-provider -- --provider=aws --date=2026-01-21
   ```

## リネームタスク

- [x] 完了後、このプランファイルを `./plans/2026-01-28-fix-weekly-mute-filter.md` にリネーム
