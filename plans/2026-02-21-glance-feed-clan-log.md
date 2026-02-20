# クラン「glance-feed-clan」イクサの記録

## 概要
Glance向け軽量Atomフィード生成機能の実装。GitHub Discussionsの標準Atomフィード（330KB）がRaspberry Pi上のGlanceダッシュボード（HTTPタイムアウト5秒固定）で取得不可のため、タイトル・URL・日時・カテゴリのみの軽量フィード（目標10KB以下）を生成しGitHub Pagesにデプロイする。

## メンバーと担当タスク

### グランドマスター（リーダー）
- **担当タスク**: deno.json編集、テスト実行・動作確認、プランファイルリネーム、dev-standardsチェック
- **ジッコウ内容**:
  - `deno.json` に `generate-feed` タスクを追加
  - 全148テスト（270ステップ）の実行確認 → 0 failed
  - `deno check` による型チェック確認
  - `deno lint` / `deno fmt --check` による品質確認
  - `any` / `as` 使用なしを確認
  - プランファイルを `plans/2026-02-21-glance-atom-feed.md` にリネーム
- **発生した問題**: なし

### ハガクレ（コーディング・ニンジャ）
- **担当タスク**: `scripts/generate-feed.ts` と `scripts/generate-feed_test.ts` の作成
- **ジッコウ内容**:
  - `generate-feed.ts`（141行）: GraphQL API呼び出し、カテゴリフィルタ、XMLエスケープ、Atom XML生成、CLI引数解析、ファイル書き出し
  - `generate-feed_test.ts`（174行）: 3テストスイート・18ステップ（escapeXml 7ケース、filterByCategories 4ケース、generateAtomFeed 7ケース）
  - 既存インフラ（`graphql-client.ts`, `cli-parser.ts`）を再利用
  - `@std/path` の `dirname` と `@std/fs` の `ensureDirSync` を使用
- **発生した問題**: なし

### ヤモト（ワークフロー・ニンジャ）
- **担当タスク**: `.github/workflows/generate-feed.yml` の作成
- **ジッコウ内容**:
  - `generate-feed.yml`（42行）: 毎時cron + discussion created/edited + workflow_dispatch トリガー
  - GitHub Pages デプロイ設定（actions/deploy-pages@v4）
  - concurrency制御（pages グループ）
- **発生した問題**: なし

## 成果物一覧

| ファイル | 行数 | 担当 |
|---------|------|------|
| `scripts/generate-feed.ts` | 141 | ハガクレ |
| `scripts/generate-feed_test.ts` | 174 | ハガクレ |
| `.github/workflows/generate-feed.yml` | 42 | ヤモト |
| `deno.json` | 編集 | グランドマスター |
| `plans/2026-02-21-glance-atom-feed.md` | リネーム | グランドマスター |

## 品質チェック結果
- テスト: 148 passed / 0 failed (270 steps)
- 型チェック: パス
- Lint: パス
- Format: パス
- any/as使用: なし
