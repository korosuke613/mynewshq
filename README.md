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

### 4. ローカルテスト

```bash
# データ取得をテスト
deno task fetch

# Discussion投稿をテスト（GITHUB_TOKEN必要）
export GITHUB_TOKEN=your_token
deno task post korosuke613 mynewshq General "テストメッセージ"
```

## 使い方

### 自動実行

GitHub Actionsが毎日9:00 JSTに自動実行します。何もする必要はありません。

### 手動実行

GitHub Actionsページから手動でワークフローを実行できます：

1. Actions タブを開く
2. "Daily Changelog" を選択
3. "Run workflow" をクリック

実行後、[Discussions](../../discussions)で要約が投稿されているか確認できます。

## ファイル構造

```
mynewshq/
├── .github/workflows/
│   ├── daily-changelog.yml      # メインワークフロー（収集→要約→投稿）
│   └── quality-check.yml        # コード品質チェック
├── scripts/
│   ├── fetch-changelogs.ts      # RSS/Releases取得
│   └── create-discussion.ts     # Discussion投稿
├── data/changelogs/             # 収集データ（Git管理）
│   └── YYYY-MM-DD.json
├── deno.json                    # Denoタスク定義
├── CLAUDE.md                    # Claude Code Action設定
└── README.md
```

## JSONデータフォーマット

```json
{
  "date": "2025-01-18",
  "github": [
    {
      "title": "...",
      "url": "...",
      "content": "...",
      "pubDate": "..."
    }
  ],
  "aws": [...],
  "claudeCode": [
    {
      "version": "...",
      "url": "...",
      "body": "...",
      "publishedAt": "..."
    }
  ]
}
```

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

## トラブルシューティング

### Discussion投稿が失敗する

**エラー**: `Resource not accessible by integration`

**原因**: GitHub Appに `discussions: write` 権限が不足している、または権限変更後に再承認していない

**解決方法**:
1. GitHub App設定でDiscussions権限が「Read and write」になっているか確認
2. Settings > Installations > Configure で「Accept new permissions」をクリック

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
