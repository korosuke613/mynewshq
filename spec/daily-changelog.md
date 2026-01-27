# 日次Changelog機能仕様書

## 1. 機能概要

### 目的と背景

日次Changelog機能は、複数の技術系サービスからChangelogを自動収集し、Claude Code Actionで要約を生成してGitHub Discussionsに投稿するシステムです。

これにより以下のメリットを実現します：

- **情報集約**: 複数の技術系Changelogを一箇所で確認可能
- **日本語要約**: 英語コンテンツも日本語で簡潔に要約
- **自動化**: 毎日の更新情報を自動で収集・投稿

### 対象プロバイダー

| プロバイダー | データソース |
|-------------|-------------|
| GitHub Changelog | RSS フィード |
| AWS What's New | RSS フィード |
| Claude Code | GitHub Releases API |
| Linear Changelog | RSS フィード |
| はてなブックマーク | RSS フィード（技術カテゴリ） |

---

## 2. ワークフロートリガー

### スケジュール実行

- **実行時刻**: 毎日 12:00 JST（UTC 3:00）
- **理由**: アメリカ西海岸時間の夜（18:00以降）の更新をカバー

### 手動実行

- **パラメータ**: 対象日付（YYYY-MM-DD形式、省略時は当日）

---

## 3. 処理フロー

1. **データ取得**: 全プロバイダーからデータを並列取得
2. **ミュートフィルタ適用**: Issue #1 のミュートワードでフィルタリング
3. **JSONファイル保存**: 収集データをファイルに保存
4. **要約生成**: Claude Code Action でJSON形式の要約を生成
5. **Discussion投稿**: 要約を含むDiscussionを作成
6. **ラベル自動付与**: プロバイダー名 + サブカテゴリラベルを付与

---

## 4. Discussion構成

### タイトル形式

```
📰 Tech Changelog - YYYY-MM-DD
```

### Changelog Discussion構造

```markdown
# 📰 Tech Changelog - YYYY-MM-DD

📅 **対象期間**: YYYY-MM-DD 03:00 UTC ~ YYYY-MM-DD 03:00 UTC

## GitHub Changelog

### [タイトル](URL)
`ラベル1` `ラベル2`

**要約**: 2-3文での日本語要約...

---

## AWS What's New

### [タイトル](URL)
`プロダクト1` `プロダクト2`

**要約**: 2-3文での日本語要約...

---

## Claude Code

### [v1.0.0](URL)

**要約**: 2-3文での日本語要約...

---

## Linear Changelog

### [タイトル](URL)

**要約**: 2-3文での日本語要約...
```

### Blog Discussion構造

```markdown
# 📝 Tech Blog - YYYY-MM-DD

📅 **対象期間**: YYYY-MM-DD 03:00 UTC ~ YYYY-MM-DD 03:00 UTC

## 今日の開発者向けトピック

[全体の解説・トレンド分析（2-3段落）]

## 選定記事

### [記事タイトル](URL)

**選定理由**: この記事を選定した理由...
```

---

## 5. 要約JSON形式

### Changelog用

```json
{
  "github": {
    "https://example.com/article1": "要約文...",
    "https://example.com/article2": "要約文..."
  },
  "aws": { ... },
  "claudeCode": { ... },
  "linear": { ... }
}
```

### Blog用

```json
{
  "hatenaBookmark": {
    "selectedTopics": [
      {
        "url": "https://example.com/article1",
        "title": "記事タイトル",
        "reason": "選定理由..."
      }
    ],
    "overview": "選定記事全体の解説・トレンド分析..."
  }
}
```

---

## 6. ラベル付与ルール

### 自動付与されるラベル

1. **プロバイダーラベル**: データが存在するプロバイダーのラベルを付与
   - `GitHub Changelog`, `AWS`, `Claude Code`, `Linear`

2. **サブカテゴリラベル**（日次のみ）:
   - GitHub: `gh:copilot`, `gh:actions`, `gh:security` など
   - AWS: `aws:s3`, `aws:lambda`, `aws:ec2` など

### ラベル生成ルール

- GitHub: `labels.changelog-label` の値に `gh:` プレフィックスを付与
- AWS: `labels.general:products` の値から `amazon-`/`aws-` を除去し `aws:` プレフィックスを付与

---

## 7. コマンド一覧

### データ取得

```bash
# 全プロバイダーからデータ取得（今日）
GITHUB_TOKEN=$(gh auth token) deno task fetch

# 特定の日付を指定
GITHUB_TOKEN=$(gh auth token) deno task fetch -- --date=2026-01-15

# Changelogのみ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch-changelog

# Blogのみ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog
```

### プレビュー

```bash
# 最新データをプレビュー
deno task preview

# 特定の日付をプレビュー
deno task preview --date=2026-01-13

# Blogプレビュー
deno task preview-blog
```

### Discussion投稿

```bash
# Changelog投稿
GITHUB_TOKEN=$(gh auth token) deno task post --category=changelog korosuke613 mynewshq Daily

# Blog投稿
GITHUB_TOKEN=$(gh auth token) deno task post --category=blog korosuke613 mynewshq Daily
```

---

## 8. データファイル形式

### Changelog JSONファイル

**パス**: `data/changelogs/daily/YYYY-MM-DD.json`

```json
{
  "date": "2026-01-18",
  "github": [
    {
      "title": "GitHub Copilot improvements",
      "url": "https://github.blog/changelog/...",
      "content": "記事本文...",
      "pubDate": "2026-01-18T10:00:00Z",
      "labels": {
        "changelog-type": ["Improvement"],
        "changelog-label": ["copilot"]
      },
      "muted": false
    }
  ],
  "aws": [ ... ],
  "claudeCode": [
    {
      "version": "v1.2.3",
      "url": "https://github.com/anthropics/claude-code/releases/tag/v1.2.3",
      "body": "リリースノート本文...",
      "publishedAt": "2026-01-18T12:00:00Z",
      "muted": false
    }
  ],
  "linear": [ ... ]
}
```

### Blog JSONファイル

**パス**: `data/blogs/daily/YYYY-MM-DD.json`

```json
{
  "date": "2026-01-18",
  "hatenaBookmark": [
    {
      "title": "記事タイトル",
      "url": "https://example.com/article",
      "bookmarkCount": 100,
      "pubDate": "2026-01-18T06:00:00Z",
      "muted": false
    }
  ]
}
```

---

## 9. 対象期間の計算

日次Changelogの対象期間はUTC 3:00（JST 12:00）を基準とした24時間ウィンドウです。

```
対象日: YYYY-MM-DD
開始: YYYY-MM-(DD-1) 03:00 UTC
終了: YYYY-MM-DD 03:00 UTC
```

これにより、アメリカ西海岸（PST/PDT）の夕方〜夜の更新を翌日の日本時間正午に収集できます。
