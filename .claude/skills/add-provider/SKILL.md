---
name: add-provider
description: 新しいChangelogプロバイダーを追加する手順
disable-model-invocation: true
---

# Provider 追加手順

$ARGUMENTS のプロバイダーを追加します。

## Phase 1: 日次処理用プロバイダー

1. `scripts/domain/providers/{name}-provider.ts` を作成
   - 既存プロバイダーをテンプレートとして使用
   - `ProviderConfig` インターフェースに準拠

2. `scripts/domain/providers/index.ts` を更新
   - `PROVIDER_CONFIGS` 配列に追加
   - `toChangelogData()` 関数を更新

3. `scripts/domain/types.ts` を更新
   - `ChangelogData` 型に新しいフィールドを追加

4. テストを作成
   - `scripts/domain/providers/{name}-provider_test.ts`

## Phase 2: 週次処理用アダプタ

5. プロバイダータイプを決定
   - **categorized**: カテゴリ分類あり（GitHub, AWS のような labels を使う場合）
   - **simple**: カテゴリなし（Claude Code, Linear のようなリスト形式）

6. `scripts/domain/weekly/types.ts` を更新
   - `WEEKLY_PROVIDER_CONFIGS` 配列に追加

7. アダプタクラスを追加
   - **categorized**: `scripts/domain/weekly/adapters/categorized-adapter.ts`
     - `BaseAdapter` を継承したクラスを作成
     - `getCategorizedAdapter()` 関数に追加
   - **simple**: `scripts/domain/weekly/adapters/simple-adapter.ts`
     - `BaseAdapter` を継承したクラスを作成
     - `getSimpleAdapter()` 関数に追加

8. `scripts/domain/weekly/orchestrator.ts` を更新
   - `getProviderData()` メソッドに新プロバイダーの case を追加
   - `filterMutedEntries()` メソッドに必要に応じて追加

## Phase 3: GitHub Actions ワークフロー

9. `.github/workflows/weekly-changelog.yml` を更新
   - `fetch-data` ジョブの `outputs` に `has_{name}` を追加
   - `summarize` ジョブの `matrix.include` に新プロバイダーを追加
   - `post-discussions` ジョブに要約ダウンロードステップを追加

## 動作確認

```bash
# テスト実行
deno task test

# 日次データ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch

# 週次データ取得（dry-run）
GITHUB_TOKEN=$(gh auth token) deno task fetch-past-discussions-all --dry-run
```
