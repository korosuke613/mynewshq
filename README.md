# mynewshq

技術系Changelogを自動収集・AI要約・投稿するシステム

## 概要

毎日9:00 JSTに以下のChangelogを自動収集し、Claude Code
Actionで日本語要約を生成してGitHub Discussionsに投稿します。

📰 **投稿された要約**: [Discussions](../../discussions)

### 対象Changelog

- **GitHub Changelog** - [RSS](https://github.blog/changelog/feed/)
- **AWS What's New** -
  [RSS](https://aws.amazon.com/about-aws/whats-new/recent/feed/)
- **Claude Code** -
  [GitHub Releases](https://github.com/anthropics/claude-code/releases)
- **Linear Changelog** - [RSS](https://linear.app/rss/changelog.xml)

## アーキテクチャ

```
[cron 9:00 JST]
      │
      ▼
┌─────────────────────────────────────┐
│ daily-changelog.yml                 │
│ 1. RSS/Releases取得                 │
│ 2. JSONファイルに保存               │
│ 3. Claude Code Actionで要約生成     │
│ 4. GitHub Discussionに投稿          │
└─────────────────────────────────────┘
```

## セットアップ

### 1. Denoのインストール

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 2. GitHub Discussionsを有効化

リポジトリの Settings > General > Features で Discussions を有効化してください。

### 3. Claude Code Actionのセットアップ

#### GitHub Appの作成とインストール

ターミナルで以下を実行：

```bash
claude /install-github-app
```

画面の指示に従ってGitHub Appを作成・インストールしてください。

#### 必要な権限

GitHub Appに以下の権限を付与してください：

- **Repository permissions:**
  - Contents: Read and write
  - Discussions: Read and write
  - Metadata: Read-only

権限変更後は、リポジトリのInstallationページで「Accept new permissions」をクリックして承認してください。

#### シークレットの設定

リポジトリのSettings > Secrets and variables > Actionsで以下を設定：

- `KIBA_CLAUDE_CODE_GH_APP_ID` (Variables): GitHub App ID
- `KIBA_CLAUDE_CODE_GH_APP_PRIVATE_KEY` (Secrets): GitHub Appの秘密鍵
- `CLAUDE_CODE_OAUTH_TOKEN` (Secrets): Claude Code OAuthトークン

### 4. ミュートワード機能の設定（オプション）

ミュートワード機能を使用する場合は、Issue #1 を作成してください：

1. リポジトリのIssuesタブで「New issue」をクリック
2. タイトル: "ミュートワード設定"
3. 本文に箇条書きでミュートワードを記載（上記の例を参照）
4. Issueを作成

### 5. ローカルテスト

```bash
# データ取得をテスト（ミュートワード機能が自動で有効）
GITHUB_TOKEN=$(gh auth token) deno task fetch

# 過去の日付でデータ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch -- --date=2026-01-15

# 特定のIssue番号からミュートワードを取得
GITHUB_TOKEN=$(gh auth token) MUTE_WORDS_ISSUE_NUMBER=2 deno task fetch

# Discussion投稿をテスト（GITHUB_TOKEN必要）
GITHUB_TOKEN=$(gh auth token) deno task post korosuke613 mynewshq General "テストメッセージ"

# 過去の日付のデータで投稿
GITHUB_TOKEN=$(gh auth token) deno task post -- --date=2026-01-15 korosuke613 mynewshq General "テストメッセージ"

# メンション先を変更して投稿
GITHUB_TOKEN=$(gh auth token) MENTION_USER=your-username deno task post korosuke613 mynewshq General "テストメッセージ"

# Discussion投稿内容をプレビュー
deno task preview
deno task preview -- --date=2026-01-13

# テストの実行
deno task test
```

## 使い方

### 自動実行

GitHub Actionsが毎日9:00 JSTに自動実行します。何もする必要はありません。

### 手動実行

GitHub Actionsページから手動でワークフローを実行できます：

1. Actions タブを開く
2. "Daily Changelog" を選択
3. "Run workflow" をクリック
4. （オプション）特定の日付のデータを処理する場合は、「対象日付」に `YYYY-MM-DD` 形式で入力

実行後、[Discussions](../../discussions)で要約が投稿されているか確認できます。

**注意**: 過去の日付を指定してもRSSフィードは最新のエントリのみを返すため、新しい記事しか取得できません。GitHub Releasesは過去データも取得可能です。

## ファイル構造

```
mynewshq/
├── .github/workflows/
│   ├── daily-changelog.yml         # メインワークフロー（収集→要約→投稿）
│   └── quality-check.yml           # コード品質チェック
├── scripts/
│   ├── fetch-changelogs.ts         # RSS/Releases取得 + ミュートフィルタ
│   ├── fetch-changelogs_test.ts    # テストコード
│   ├── create-discussion.ts        # Discussion投稿 + ラベル自動付与 + メンション
│   ├── create-discussion_test.ts   # テストコード
│   └── preview-discussion.ts       # Discussion投稿内容をプレビュー
├── data/changelogs/                # 収集データ（Git管理）
│   └── YYYY-MM-DD.json
├── plans/                          # 実装計画ドキュメント
│   └── YYYY-MM-DD-説明.md
├── deno.json                       # Denoタスク定義
├── deno.lock                       # 依存関係ロックファイル
├── CLAUDE.md                       # Claude Code Action設定
└── README.md
```

## 機能

### ✨ 自動ラベル付与

Discussion作成時に、changelogの内容に応じて自動的にラベルを付与します：

- `github` - GitHub Changelogが含まれる場合
- `aws` - AWS What's Newが含まれる場合
- `claude-code` - Claude Codeリリースが含まれる場合
- `linear` - Linear Changelogが含まれる場合

### 🔔 メンション通知機能

Discussion投稿時に、本文の末尾に自動的にメンションを追加して通知を送ります：

- **デフォルト**: `@korosuke613` にメンション
- **カスタマイズ**: 環境変数 `MENTION_USER` でメンション先を変更可能
- **表示形式**: 本文末尾に `---` 区切り線の後、`cc: @username` の形式で表示

#### 環境変数

- `MENTION_USER` - メンション先のGitHubユーザー名（デフォルト: korosuke613）

### 🔇 ミュートワード機能

特定のキーワードを含むエントリを自動でミュートできます：

- **設定方法**: Issue #1 の本文に箇条書きでミュートワードを記載
- **動作**: タイトルに部分一致（大文字小文字無視）でマッチ
- **表示**: AI要約対象外とし、Discussionでは折りたたみでタイトルとリンクのみ表示

#### ミュートワード設定例

Issue #1 の本文:

```markdown
## ミュートワード

以下のワードを含むエントリは自動でミュートされます。

- Amazon SageMaker
- AWS Glue
- Generative AI
```

#### 環境変数

- `GITHUB_TOKEN` - Issue取得に必要（必須）
- `MUTE_WORDS_ISSUE_NUMBER` - ミュートワード設定用のIssue番号（デフォルト: 1）

**注意**: `GITHUB_TOKEN` が設定されていない場合、ミュート機能は動作しません。`MUTE_WORDS_ISSUE_NUMBER` は未設定時に自動的に Issue #1 を使用します。

## JSONデータフォーマット

```json
{
  "date": "2025-01-18",
  "github": [
    {
      "title": "...",
      "url": "...",
      "content": "...",
      "pubDate": "...",
      "muted": false,
      "mutedBy": "keyword"
    }
  ],
  "aws": [...],
  "claudeCode": [
    {
      "version": "...",
      "url": "...",
      "body": "...",
      "publishedAt": "...",
      "muted": false,
      "mutedBy": "keyword"
    }
  ],
  "linear": [
    {
      "title": "...",
      "url": "...",
      "content": "...",
      "pubDate": "...",
      "muted": false,
      "mutedBy": "keyword"
    }
  ]
}
```

`muted` と `mutedBy` フィールドはミュートワード機能が有効な場合のみ含まれます。

## カスタマイズ

### 実行時刻の変更

`.github/workflows/daily-changelog.yml` の `cron` を編集：

```yaml
schedule:
  - cron: "0 0 * * *" # UTC 0:00 = JST 9:00
```

### 要約フォーマットの変更

`CLAUDE.md` を編集して、Claude Code Actionへのプロンプトを調整してください。

### Discussionカテゴリの変更

`scripts/create-discussion.ts`
の引数を変更するか、ワークフローから渡すパラメータを調整してください。

## 開発

### Discussion投稿内容のプレビュー

Discussion投稿前に、生成されるMarkdownを確認できます：

```bash
# 最新のデータをプレビュー
deno task preview

# 特定の日付のデータをプレビュー
deno task preview -- --date=2026-01-13
```

**出力内容:**
- 📊 データ統計（アクティブ/ミュート件数）
- ✅ `summary.md` に自動保存
- 📄 ターミナルにプレビュー表示

### テストの実行

```bash
deno task test
```

### コード品質チェック

```bash
deno fmt        # フォーマット
deno lint       # リント
deno check scripts/*.ts  # 型チェック
```

### 依存関係

プロジェクトは以下のパッケージを使用しています：

- `@octokit/rest` - GitHub REST API クライアント
- `@octokit/graphql` - GitHub GraphQL API クライアント
- `rss-parser` - RSSフィード解析
- `@std/assert` - Deno標準アサーションライブラリ（テスト用）

依存関係の更新は `deno.json` と `deno.lock` で管理されています。

## トラブルシューティング

### Discussion投稿が失敗する

**エラー**: `Resource not accessible by integration`

**原因**: GitHub Appに `discussions: write` 権限が不足している、または権限変更後に再承認していない

**解決方法**:
1. GitHub App設定でDiscussions権限が「Read and write」になっているか確認
2. Settings > Installations > Configure で「Accept new permissions」をクリック

### ラベル付与が失敗する

**エラー**: ラベルが付与されない、またはエラーが発生

**原因**: リポジトリに必要なラベルが存在しない

**解決方法**:
以下のラベルを手動で作成してください：
- `github`
- `aws`
- `claude-code`
- `linear`

### ミュートワード機能が動作しない

**問題**: ミュートワードが適用されない

**確認事項**:
1. `GITHUB_TOKEN` が設定されているか（必須）
2. `MUTE_WORDS_ISSUE_NUMBER` が正しい番号か（未設定時はデフォルトで Issue #1 を使用）
3. Issueの本文が箇条書き形式（`- keyword`）になっているか
4. Issueが存在するか

**解決方法**:
```bash
# GITHUB_TOKENを設定して実行
GITHUB_TOKEN=$(gh auth token) deno task fetch

# 特定のIssue番号を指定
GITHUB_TOKEN=$(gh auth token) MUTE_WORDS_ISSUE_NUMBER=1 deno task fetch
```

### Claude Code Actionでツールが実行できない

**エラー**: `permission_denials`

**原因**: ワークフローの`settings`で必要なツールが許可されていない

**解決方法**:
`.github/workflows/daily-changelog.yml`の`settings`を確認：
```yaml
settings: |
  {
    "permissions": {
      "allow": ["Bash", "Write"]
    }
  }
```

### データ取得エラー

- RSS URLが変更されていないか確認してください
- GitHub APIのレート制限に達していないか確認してください

### GITHUB_TOKEN環境変数エラー

**エラー**: `GITHUB_TOKEN environment variable is required`

**原因**: Claude Code Actionから実行されるBashコマンドにGITHUB_TOKENが渡されていない

**解決方法**:
ワークフローで`env`を設定：
```yaml
- name: Summarize and post with Claude Code
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app.outputs.token }}
```

## ライセンス

MIT
