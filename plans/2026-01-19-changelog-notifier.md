# Changelog通知システム - 実装プラン

## 確定した要件

### 対象Changelog

1. **GitHub Changelog** - RSS (`https://github.blog/changelog/feed/`)
2. **AWS Changelog** - RSS
   (`https://aws.amazon.com/about-aws/whats-new/recent/feed/`)
3. **Claude Code** - GitHub Releases (`anthropics/claude-code`)

### 出力先

- GitHub Discussions（mynewshqリポジトリ）

### 実行環境

- GitHub Actions（cron で毎日 12:00 JST（アメリカ西海岸時間の夜）に実行）

### 表示形式

- AI要約付き（claude-code-action を使用、Claude Max Subscription利用）

### その他

- 更新がない場合は投稿しない

---

## 実装計画

### アーキテクチャ

```
[cron 12:00 JST]
      │
      ▼
┌─────────────────────────────┐
│ 1. fetch-changelog.yml      │
│    - RSS/Releases取得       │
│    - JSONファイルに出力     │
│    - 更新があればコミット   │
└─────────────────────────────┘
      │
      ▼ (push をトリガー)
┌─────────────────────────────┐
│ 2. summarize-changelog.yml  │
│    - JSONファイルを読み込み │
│    - claude-code-actionで   │
│      要約を生成             │
│    - Discussionに投稿       │
└─────────────────────────────┘
```

**ファイル構造（データ）**

```
data/
└── changelogs/
    └── 2025-01-18.json    # 日付ごとの生データ
```

### プロジェクト構造

```
mynewshq/
├── .github/
│   └── workflows/
│       ├── fetch-changelog.yml      # cron実行: データ取得&コミット
│       └── summarize-changelog.yml  # push時: 要約&投稿
├── scripts/
│   ├── fetch-changelogs.ts          # RSS/Releases取得（統合）
│   └── create-discussion.ts         # Discussion投稿
├── data/
│   └── changelogs/
│       └── YYYY-MM-DD.json          # 日付ごとの生データ
├── deno.json                        # Deno設定
└── CLAUDE.md                        # claude-code-action用プロンプト設定
```

### 技術スタック

- **言語**: TypeScript (Deno)
- **RSS取得**: `npm:rss-parser` or 独自実装
- **GitHub API**: `npm:@octokit/rest` or Deno標準fetch
- **要約**: claude-code-action（Claude Max Subscription）
- **実行**: GitHub Actions

---

## 実装ステップ

### Step 1: プロジェクト初期化

- `deno.json` 作成
- タスク定義（fetch, post）
- 依存関係はimport時に指定（npm:rss-parser, npm:@octokit/rest等）

### Step 2: データ取得スクリプト実装

**scripts/fetch-changelogs.ts**

- GitHub Changelog RSS取得
- AWS Changelog RSS取得
- anthropics/claude-code のReleasesを取得
- 過去24時間の更新のみフィルタリング
- `data/changelogs/YYYY-MM-DD.json` に出力

**JSONフォーマット例:**

```json
{
  "date": "2025-01-18",
  "github": [
    { "title": "...", "url": "...", "content": "...", "pubDate": "..." }
  ],
  "aws": [
    { "title": "...", "url": "...", "content": "...", "pubDate": "..." }
  ],
  "claudeCode": [
    { "version": "...", "url": "...", "body": "...", "publishedAt": "..." }
  ]
}
```

### Step 3: fetch-changelog.yml 作成

- cron: `0 3 * * *`（UTC 3:00 = JST 12:00 = PST 19:00/PDT 20:00）
- データ取得スクリプト実行
- 更新があれば `data/changelogs/YYYY-MM-DD.json` をコミット&プッシュ
- 更新がなければ何もしない

### Step 4: summarize-changelog.yml 作成

- トリガー: `data/changelogs/*.json` への push
- claude-code-action で要約生成
- CLAUDE.mdにプロンプト設定（要約ルール、日本語出力など）

### Step 5: Discussion投稿スクリプト実装

**scripts/create-discussion.ts**

- claude-code-actionが生成した要約をDiscussionに投稿
- GraphQL APIでDiscussion作成

### Step 6: テスト & 調整

- 手動でワークフローを実行して動作確認
- 要約品質の調整（CLAUDE.md修正）

---

## Discussion投稿フォーマット（案）

```markdown
# 📰 Tech Changelog - 2025-01-18

## GitHub Changelog

### [タイトル](URL)

**要約**: AIによる日本語要約...

---

## AWS What's New

### [タイトル](URL)

**要約**: AIによる日本語要約...

---

## Claude Code

### v1.0.x

**要約**: AIによる日本語要約...
```

---

## 必要な設定

### Secrets

- なし（Claude Max Subscription利用のため）

### GitHub App

- claude-code-action用のGitHub App設定
- `/install-github-app` コマンドでセットアップ

### Repository設定

- Discussionsを有効化
- 適切なカテゴリを作成（例: "Changelog"）

---

## 検証方法

1. `workflow_dispatch`で手動実行してデータ取得・コミット確認
2. JSONファイルをpushしてclaude-code-actionの動作確認
3. Discussionへの投稿確認
4. 翌日のcron実行で自動化確認

---

## 参考資料

- [claude-code-action](https://github.com/anthropics/claude-code-action)
- [Claude Code GitHub Actions Docs](https://code.claude.com/docs/en/github-actions)

---

## 追加タスク: Planファイルのリネーム

### 命名規則

`YYYY-MM-DD-タスク名.md` 形式を採用

### 実行内容

```bash
mv plans/glowing-dancing-twilight.md plans/2025-01-18-changelog-notifier.md
```

このファイルを `2025-01-18-changelog-notifier.md` にリネームする。
