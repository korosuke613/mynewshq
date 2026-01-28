# 週次ラベルを日次形式（具体的サービス名）に統一

## 概要

日次と週次でDiscussionのラベル形式が異なる問題を修正し、週次でも日次と同じ具体的サービス名ラベル（`aws:deadline-cloud`など）を使用するように統一する。

## 現状の問題

| 種類 | ラベル例 | 生成元 |
|------|----------|--------|
| 日次 | `aws:deadline-cloud`, `aws:rds` | 元データの `labels` フィールド |
| 週次 | `aws:AI/ML (Bedrock/SageMaker)` | Claude生成のカテゴリ名 |

**原因**: `categorized-adapter.ts` の `buildSingleProviderChangelogData()` で、Claude生成のカテゴリ名を `labels` として設定している（L77, L118）

## 実装計画

### 1. `WeeklyPipeline` インターフェース変更
**ファイル**: `scripts/domain/weekly/pipeline.ts`

`postDiscussion` メソッドに `providerData` パラメータを追加（必須パラメータ）:
```typescript
postDiscussion(
  markdown: string,
  summary: ProviderWeeklySummary,
  ctx: WeeklyContext,
  providerData: ChangelogEntry[] | ReleaseEntry[], // 追加（必須）
): Promise<PipelineResult<PostDiscussionData>>;
```

### 2. `BaseAdapter` の変更
**ファイル**: `scripts/domain/weekly/adapters/base-adapter.ts`

- `postDiscussion`: `providerData` パラメータを受け取り、`addLabels` に渡す
- `addLabels`: `summary` ではなく `providerData` を使用してラベル抽出
- 新規メソッド `buildChangelogDataFromProviderData`: 元データから `ChangelogData` を構築

### 3. サブクラスの整理
**ファイル**:
- `scripts/domain/weekly/adapters/categorized-adapter.ts`
- `scripts/domain/weekly/adapters/simple-adapter.ts`

`buildSingleProviderChangelogData` メソッドを削除（不要になるため）

### 4. `WeeklyOrchestrator` の変更
**ファイル**: `scripts/domain/weekly/orchestrator.ts`

`postAllDiscussions` で `postDiscussion` 呼び出し時に元データ（`providerData`）を渡す

## 修正対象ファイル

1. `scripts/domain/weekly/pipeline.ts` - インターフェース変更
2. `scripts/domain/weekly/adapters/base-adapter.ts` - 主要な変更
3. `scripts/domain/weekly/adapters/categorized-adapter.ts` - メソッド削除
4. `scripts/domain/weekly/adapters/simple-adapter.ts` - メソッド削除
5. `scripts/domain/weekly/orchestrator.ts` - 呼び出し変更

## 検証方法

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# テスト実行
deno task test

# 週次プレビューでラベル確認
deno task preview-weekly-provider -- --provider=aws
```

## 注意点

- カテゴリ分類は週次レポート本文に残る（ラベルのみ変更）
- ミュートエントリも含めて全エントリの `labels` を使用（日次と同じ動作）

## TODO
- [ ] 実装完了後、プランファイルを `plans/2026-01-28-weekly-label-unification.md` にリネーム
