# Discussion Claude Mention 機能実装

## 概要

GitHub Discussionsで `@claude` メンションを使ってClaude Code Actionに質問できる機能を実装しました。

## 実装内容

### 1. GitHub Actions ワークフロー (.github/workflows/discussion-claude-mention.yml)

- **トリガー**: `discussion_comment` (created) - Discussion内でコメントが作成された時
- **条件**: コメント内に `@claude` メンションが含まれている場合のみ実行
- **権限**: contents:read, discussions:write, id-token:write

**主な処理フロー**:
1. リポジトリをチェックアウト
2. Deno環境をセットアップ  
3. `@claude` メンション後の質問文を抽出
4. GitHub Appでログイン
5. Claude Code Actionに質問を送信し、回答を生成
6. 生成した回答をDiscussionに投稿

### 2. Discussion回答投稿スクリプト (scripts/reply-discussion.ts)

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

### 3. Denoタスク設定の更新 (deno.json)

`reply-discussion` タスクを追加：
```json
"reply-discussion": "deno run --allow-net --allow-env scripts/reply-discussion.ts"
```

## Claude Code Actionでの処理

Claude Code Actionは以下の流れで質問に回答します：

1. **質問の解釈**: ユーザーから受け取った質問を理解
2. **コンテキスト把握**: リポジトリの情報（Changelogシステムの仕様）を考慮
3. **データ参照**: 必要に応じて `data/changelogs/` 内のJSONファイルを読み込み
4. **回答生成**: 質問に対する詳細な回答を日本語で生成
5. **投稿処理**: 回答をMarkdown形式でDiscussionに投稿

## 使用方法

1. 対象のDiscussion（例: https://github.com/korosuke613/mynewshq/discussions/9）を開く
2. コメント欄に `@claude` メンションと質問を入力
3. 例: `@claude 最新のAWS変更点について詳しく教えて`
4. Claudeが自動的に回答をコメントで投稿

## セキュリティ考慮事項

- GitHub Appトークンを使用した認証
- 適切な権限設定（discussions:write等）
- 環境変数での機密情報管理
- Claude Code OAuth Tokenの安全な管理

## 今後の拡張可能性

- メンション形式の改善（複数行質問対応等）
- 回答にコンテキスト情報の自動添付
- 特定のトピック（AWS、GitHub等）での専門的な回答
- Discussion内の過去の会話履歴を考慮した回答

## 注意点

- Claude Code Actionの実行制限に注意
- GitHub API rate limitへの配慮
- 大量のメンションスパム対策（必要に応じて実装）

この実装により、Discussionでの対話的な技術サポートが可能になります。
