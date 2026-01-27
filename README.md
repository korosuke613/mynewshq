# mynewshq

技術系Changelogを自動収集・AI要約・投稿するシステム

## 概要

毎日12:00 JST（アメリカ西海岸時間の夜）に以下のChangelogを自動収集し、Claude Code
Actionで日本語要約を生成してGitHub Discussionsに投稿します。

📰 **投稿された要約**: [Discussions](../../discussions)

### 対象Changelog

- **GitHub Changelog** - [RSS](https://github.blog/changelog/feed/)
- **AWS What's New** -
  [RSS](https://aws.amazon.com/about-aws/whats-new/recent/feed/)
- **Claude Code** -
  [GitHub Releases](https://github.com/anthropics/claude-code/releases)
- **Linear Changelog** - [RSS](https://linear.app/rss/changelog.xml)

### 対象Blog

- **はてなブックマーク** - テクノロジーカテゴリのホットエントリ

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

## 使い方

### 自動実行

- **日次**: 毎日 12:00 JST（アメリカ西海岸時間の夜）に自動実行
- **週次**: 毎週水曜日 10:00 JST に自動実行

### 手動実行

GitHub Actionsページから手動でワークフローを実行できます：

#### 日次ワークフロー
1. Actions タブを開く
2. "Daily Changelog" を選択
3. "Run workflow" をクリック
4. （オプション）特定の日付のデータを処理する場合は、「対象日付」に `YYYY-MM-DD` 形式で入力

#### 週次ワークフロー
1. Actions タブを開く
2. "Weekly Changelog" を選択
3. "Run workflow" をクリック
4. （オプション）終了日を `YYYY-MM-DD` 形式で入力（7日間分を取得）

実行後、[Discussions](../../discussions)で要約が投稿されているか確認できます。

**注意**: 過去の日付を指定してもRSSフィードは最新のエントリのみを返すため、新しい記事しか取得できません。GitHub Releasesは過去データも取得可能です。

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

### 🤖 @claudeメンション機能

Discussion内のコメントで `@claude` とメンションすると、Claude Code Actionが質問に回答します：

- **使い方**: Discussionのコメントに `@claude 質問内容` と入力
- **対象ユーザー**: 現在は `korosuke613` のみ有効
- **動作**: メンションを検知 → Claude Codeワークフロー起動 → 自動回答を投稿

#### 例

```
@claude このリポジトリの最新のAWS更新は何ですか？
```

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
現在のワークフローでは `--json-schema` を使用して構造化出力を取得しているため、`settings` は不要です。

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

## 開発者向け情報

開発コマンド、アーキテクチャ、ファイル構造などの詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## ライセンス

MIT
