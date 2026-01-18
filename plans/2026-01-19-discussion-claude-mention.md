# Discussion Claude Mention 機能実装

## 概要

GitHub Discussionsで `@claude` メンションを使ってClaude Code Actionに質問できる機能を実装しました。

## 実装アプローチ

Claude Code Actionは`discussion_comment`イベントを直接サポートしていないため、以下の2段階アプローチを採用：

1. **トリガーワークフロー** (`discussion-claude-mention.yml`): `discussion_comment`イベントで起動し、質問内容を解析して別ワークフローをトリガー
2. **実行ワークフロー** (`discussion-claude-answer.yml`): `workflow_dispatch`で起動し、Claude Code Actionを直接実行してDiscussionに回答を投稿

## 実装内容

### 1. トリガーワークフロー (.github/workflows/discussion-claude-mention.yml)

- **トリガー**: `discussion_comment` (created) 
- **条件**: コメント内に `@claude` メンションが含まれ、ユーザーが `korosuke613` の場合のみ実行
- **権限**: actions:write

**処理フロー**:
1. `@claude` メンション後の質問文を抽出
2. `gh workflow run` で実行ワークフローをトリガー
3. 質問内容、Discussion番号、コメントURLを引数として渡す

### 2. 実行ワークフロー (.github/workflows/discussion-claude-answer.yml)

- **トリガー**: `workflow_dispatch` (手動実行可能)
- **入力パラメータ**: 
  - `question`: ユーザーからの質問
  - `discussion_number`: Discussion番号
  - `comment_url`: 元のコメントURL
- **権限**: contents:read, discussions:write, id-token:write

**処理フロー**:
1. リポジトリをチェックアウト
2. Deno環境をセットアップ
3. GitHub Appでログイン
4. Claude Code Actionを直接実行
   - 質問内容をプロンプトとして渡す
   - リポジトリのコンテキスト（Changelogシステムの仕様）を提供
   - Claudeが回答を生成
   - `deno task reply-discussion` でDiscussionに回答を投稿

### 3. Discussion回答投稿スクリプト (scripts/reply-discussion.ts)

GitHub GraphQL APIを使用してDiscussionにコメントを投稿する機能：

**主な機能**:
- Discussion番号から内部IDを取得
- GraphQL mutationでコメントを投稿
- エラーハンドリングとログ出力

**使用方法**:
```bash
# GitHub Repositoryを環境変数から取得
deno task reply-discussion <discussion-number> "<comment-body>"

# 明示的にowner/repoを指定
deno task reply-discussion <discussion-number> <owner> <repo> "<comment-body>"
```

### 4. Denoタスク設定の更新 (deno.json)

`reply-discussion` タスクを追加：
```json
"reply-discussion": "deno run --allow-net --allow-env scripts/reply-discussion.ts"
```

## データフロー

```
Discussion Comment (@claude mention)
  ↓
discussion-claude-mention.yml (trigger)
  ↓ (gh workflow run with question/discussion_number)
discussion-claude-answer.yml (workflow_dispatch)
  ↓ (直接実行)
Claude Code Action
  ↓ (deno task reply-discussion)
Discussion Comment (answer)
```

## 使用方法

1. 対象のDiscussion（例: https://github.com/korosuke613/mynewshq/discussions/9）を開く
2. コメント欄に `@claude` メンションと質問を入力
3. 例: `@claude 最新のAWS変更点について詳しく教えて`
4. トリガーワークフローが自動起動し、実行ワークフローを呼び出す
5. Claude Code Actionが質問を処理し、回答を生成
6. 回答が自動的にDiscussionにコメントとして投稿される

## セキュリティ考慮事項

- GitHub Appトークンを使用した認証
- 適切な権限設定（discussions:write、actions:write等）
- 環境変数での機密情報管理
- Claude Code OAuth Tokenの安全な管理
- korosuke613 ユーザーからのメンションのみ処理

## 今後の拡張可能性

- 回答生成状況の通知機能（進行中であることを通知）
- 複数ユーザー対応（allowlistの追加）
- エラー時のリトライ機能
- Discussion内での会話履歴の考慮

## 制約事項

- Claude Code Actionは`discussion_comment`イベントを直接サポートしていない（`workflow_dispatch`経由で回避）
- `workflow_dispatch`のトリガーには若干の遅延が発生する可能性がある
- Claude Code Actionの実行制限に注意
- GitHub API rate limitへの配慮が必要

この実装により、Discussionでの対話的な技術サポートが可能になります。
