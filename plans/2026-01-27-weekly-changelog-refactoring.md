# Weekly-Changelog 共通化・並列実行 設計計画

## 概要

各プロバイダの週次処理（fetch、文章生成、投稿）を共通インターフェースで統一し、並列実行可能にする。

## 設計方針

**Orchestrator + Pipeline ハイブリッドパターン**を採用：
- **Orchestrator層**: 全プロバイダの処理を統括、並列実行を制御
- **Pipeline層**: 各プロバイダの処理ステップを共通インターフェースで抽象化

## Phase 1: Deno側の共通化（Orchestrator + Adapter）

### 1.1 新規ディレクトリ構成

```
scripts/domain/weekly/           # 新規作成
├── types.ts                     # 週次処理用の共通型定義
├── pipeline.ts                  # WeeklyPipelineインターフェース
├── orchestrator.ts              # WeeklyOrchestrator
└── adapters/                    # プロバイダ固有のアダプタ
    ├── base-adapter.ts          # 基底アダプタ（共通処理）
    ├── categorized-adapter.ts   # GitHub/AWS用（カテゴリ分類あり）
    └── simple-adapter.ts        # Claude Code/Linear用（カテゴリなし）
```

### 1.2 共通インターフェース

```typescript
// scripts/domain/weekly/pipeline.ts
export interface WeeklyPipeline {
  readonly providerId: string;

  // 過去Discussion取得
  fetchPastDiscussions(ctx: WeeklyContext): Promise<PipelineResult<PastWeeklyDiscussion[]>>;

  // 要約生成用の設定取得
  getSummarizeConfig(): { jsonSchema: object; promptTemplate: string };

  // Markdown生成
  generateMarkdown(
    data: ChangelogEntry[] | ReleaseEntry[],
    summary: ProviderWeeklySummary,
    ctx: WeeklyContext
  ): string;

  // Discussion投稿
  postDiscussion(
    markdown: string,
    summary: ProviderWeeklySummary,
    ctx: WeeklyContext
  ): Promise<PipelineResult<{ url: string }>>;
}
```

### 1.3 アダプタ実装

| アダプタ | 対象プロバイダ | 特徴 |
|---------|--------------|------|
| `CategorizedAdapter` | GitHub, AWS | カテゴリ分類あり、labels フィールド使用 |
| `SimpleAdapter` | Claude Code, Linear | カテゴリなし、entriesリスト形式 |

### 1.4 Orchestrator

```typescript
// scripts/domain/weekly/orchestrator.ts
export class WeeklyOrchestrator {
  // Phase 1: 全プロバイダの過去Discussion取得（並列）
  async fetchAllPastDiscussions(ctx): Promise<Record<string, PipelineResult>>

  // Phase 2: 要約生成リクエストを準備
  prepareSummarizeRequests(changelogData, pastDiscussions): SummarizeRequest[]

  // Phase 3: 全プロバイダのDiscussion投稿（並列）
  async postAllDiscussions(changelogData, summaries, ctx): Promise<Record<string, PipelineResult>>
}
```

### 1.5 新規タスク追加（deno.json）

```json
{
  "fetch-past-discussions-all": "deno run ... weekly-orchestrator.ts fetch-past-all",
  "post-weekly-all": "deno run ... weekly-orchestrator.ts post-all"
}
```

### 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/domain/weekly/types.ts` | 新規作成：WeeklyContext, PipelineResult等 |
| `scripts/domain/weekly/pipeline.ts` | 新規作成：WeeklyPipelineインターフェース |
| `scripts/domain/weekly/adapters/*.ts` | 新規作成：各アダプタ |
| `scripts/domain/weekly/orchestrator.ts` | 新規作成：WeeklyOrchestrator |
| `scripts/weekly-orchestrator.ts` | 新規作成：エントリポイント |
| `deno.json` | タスク追加 |

---

## Phase 2: GitHub Actions改修（matrix戦略で並列化）

### 2.1 新しいワークフロー構成

```yaml
jobs:
  fetch-data:
    # 既存: 全プロバイダのデータ取得 + 過去Discussion取得（並列化）
    steps:
      - name: Fetch changelogs
      - name: Fetch all past discussions (parallel)  # 新規
    outputs:
      has_github, has_aws, has_claudeCode, has_linear

  summarize:
    needs: fetch-data
    strategy:
      matrix:
        provider: [github, aws, claudeCode, linear]
      fail-fast: false
    # 各プロバイダのClaude Code Actionを並列実行
    steps:
      - name: Generate summaries with Claude Code
      - name: Upload summary artifact

  post-discussions:
    needs: [fetch-data, summarize]
    # 全プロバイダのDiscussion投稿（Deno側で並列実行）
    steps:
      - name: Download all summary artifacts
      - name: Post all discussions (parallel)
```

### 2.2 メリット

- **並列化**: 要約生成が4並列で実行（現状の1/4程度の実行時間）
- **独立性**: 1プロバイダの失敗が他に影響しない（`fail-fast: false`）
- **シンプル化**: Deno側で投稿を一括処理

### 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `.github/workflows/weekly-changelog.yml` | 3フェーズ構成に改修 |

---

## 実装タスク

### Phase 1（Deno側共通化）
- [ ] `scripts/domain/weekly/types.ts` 作成
- [ ] `scripts/domain/weekly/pipeline.ts` 作成
- [ ] `scripts/domain/weekly/adapters/base-adapter.ts` 作成
- [ ] `scripts/domain/weekly/adapters/categorized-adapter.ts` 作成
- [ ] `scripts/domain/weekly/adapters/simple-adapter.ts` 作成
- [ ] `scripts/domain/weekly/orchestrator.ts` 作成
- [ ] `scripts/weekly-orchestrator.ts` 作成
- [ ] `deno.json` タスク追加
- [ ] テスト作成・実行

### Phase 2（GitHub Actions改修）
- [ ] `.github/workflows/weekly-changelog.yml` 改修
- [ ] 動作確認（workflow_dispatch で手動実行）

### 完了後
- [ ] プランファイルを `./plans/2026-01-27-weekly-changelog-refactoring.md` にリネーム

---

## 検証方法

1. **Phase 1 検証**
   ```bash
   deno task test  # 新規テストが通ることを確認
   deno task fetch-past-discussions-all --dry-run  # 並列取得の動作確認
   ```

2. **Phase 2 検証**
   - GitHub Actions の `workflow_dispatch` で手動実行
   - matrix job が並列で起動することを確認
   - 全プロバイダのDiscussionが正常に投稿されることを確認
