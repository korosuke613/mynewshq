# mynewshq

技術系Changelogを自動収集・AI要約・投稿するシステム

## 概要

毎日9:00 JSTに以下のChangelogを自動収集し、Claude Code Actionで日本語要約を生成してGitHub Discussionsに投稿します。

### 対象Changelog

- **GitHub Changelog** - [RSS](https://github.blog/changelog/feed/)
- **AWS What's New** - [RSS](https://aws.amazon.com/about-aws/whats-new/recent/feed/)
- **Claude Code** - [GitHub Releases](https://github.com/anthropics/claude-code/releases)

## アーキテクチャ

```
[cron 9:00 JST]
      │
      ▼
┌─────────────────────────────┐
│ fetch-changelog.yml         │
│ - RSS/Releases取得          │
│ - JSONファイルに保存        │
│ - 更新があればコミット      │
└─────────────────────────────┘
      │
      ▼ (push をトリガー)
┌─────────────────────────────┐
│ summarize-changelog.yml     │
│ - claude-code-actionで要約  │
│ - Discussionに投稿          │
└─────────────────────────────┘
```

## セットアップ

### 1. Denoのインストール

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 2. GitHub Discussionsを有効化

リポジトリの Settings > General > Features で Discussions を有効化してください。

### 3. claude-code-actionのセットアップ

ターミナルで以下を実行：

```bash
claude
/install-github-app
```

画面の指示に従ってGitHub Appをインストールしてください。

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
2. "Fetch Changelogs" を選択
3. "Run workflow" をクリック

## ファイル構造

```
mynewshq/
├── .github/workflows/
│   ├── fetch-changelog.yml      # データ取得ワークフロー
│   └── summarize-changelog.yml  # 要約・投稿ワークフロー
├── scripts/
│   ├── fetch-changelogs.ts      # RSS/Releases取得
│   └── create-discussion.ts     # Discussion投稿
├── data/changelogs/             # 収集データ（Git管理）
│   └── YYYY-MM-DD.json
├── deno.json                    # Deno設定
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

`.github/workflows/fetch-changelog.yml` の `cron` を編集：

```yaml
schedule:
  - cron: "0 0 * * *"  # UTC 0:00 = JST 9:00
```

### 要約フォーマットの変更

`CLAUDE.md` を編集して、Claude Code Actionへのプロンプトを調整してください。

### Discussionカテゴリの変更

`scripts/create-discussion.ts` の引数を変更するか、ワークフローから渡すパラメータを調整してください。

## トラブルシューティング

### 更新が投稿されない

- GitHub Actionsのログを確認してください
- Discussionsが有効化されているか確認してください
- claude-code-actionが正しくセットアップされているか確認してください

### データ取得エラー

- RSS URLが変更されていないか確認してください
- GitHub APIのレート制限に達していないか確認してください

## ライセンス

MIT
