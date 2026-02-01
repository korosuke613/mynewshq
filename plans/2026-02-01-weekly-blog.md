# 週次Blog機能の実装計画

## 概要

週次Blogワークフローを新規作成し、毎週水曜日10:00 JSTに実行する。

既存の `fetch-changelogs.ts` と `create-discussion.ts` が既に `--weekly --category=blog` オプションに対応しているため、新規スクリプトは不要。

## 変更ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `.github/workflows/weekly-blog.yml` | 新規作成 | 週次Blogワークフロー |
| `deno.json` | 編集 | タスク追加 |
| `spec/weekly-blog.md` | 新規作成 | 仕様書 |

## 実装詳細

### 1. `.github/workflows/weekly-blog.yml` (新規作成)

3フェーズ構成（週次Changelogと同様）：

1. **fetch-data**: `deno task fetch-weekly-blog` でデータ取得
2. **summarize**: Claude Code Actionで要約生成
3. **post-discussion**: `deno task post --weekly --category=blog` でDiscussion投稿

主な設定：
- `cron: "0 1 * * 3"` (UTC 1:00 = JST 10:00、毎週水曜日)
- `workflow_dispatch` で手動実行可能（end_date指定可）
- Discussionカテゴリ: `Weekly`
- 要約JSON Schema: 日次と同じカテゴリベース形式

### 2. `deno.json` タスク追加

```json
"fetch-weekly-blog": "deno run --allow-net --allow-read --allow-write --allow-env scripts/fetch-changelogs.ts --days=7 --weekly --category=blog",
"preview-weekly-blog": "deno run --allow-read --allow-write --allow-env scripts/preview-discussion.ts --weekly --category=blog"
```

### 3. `spec/weekly-blog.md` (新規作成)

週次Blog機能の仕様書を作成。

## 週次Changelogとの違い

| 項目 | 週次Changelog | 週次Blog |
|------|--------------|----------|
| プロバイダー数 | 4つ（並列処理） | 1つ（単一処理） |
| matrix戦略 | あり | なし |
| 過去Discussion参照 | あり | なし |
| 投稿数/実行 | プロバイダーごと | 1件 |

## 実装順序

1. `deno.json` にタスク追加
2. ローカルで動作確認（`deno task fetch-weekly-blog`, `deno task preview-weekly-blog`）
3. `.github/workflows/weekly-blog.yml` 作成
4. `spec/weekly-blog.md` 作成
5. `workflow_dispatch` で手動テスト

## 検証方法

### ローカルテスト

```bash
# データ取得テスト
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly-blog --date=2026-02-01

# プレビューテスト
deno task preview-weekly-blog --date=2026-02-01

# 投稿テスト（ドライラン的確認）
# preview で出力されるMarkdownを確認後、手動で post を実行
```

### GitHub Actionsテスト

1. PRマージ後、`workflow_dispatch` で手動実行
2. 各フェーズの成功を確認
3. 生成されたDiscussionの内容を確認

## プランファイルのリネーム

実装完了後、このファイルを `./plans/2026-02-01-weekly-blog.md` にリネームしてコミットに含める。
