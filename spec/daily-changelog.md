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
- **投稿先カテゴリ**: `manual trigger`（スケジュール実行時は `Daily`）

---

## 3. 処理フロー

### Changelog処理フロー

1. **データ取得**: 全プロバイダーからデータを並列取得
2. **ミュートフィルタ適用**: Issue #1 のミュートワードでフィルタリング
3. **JSONファイル保存**: 収集データをファイルに保存
4. **要約生成**: Claude Code Action でJSON形式の要約を生成
5. **Discussion投稿**: 要約を含むDiscussionを作成
6. **ラベル自動付与**: プロバイダー名 + サブカテゴリラベルを付与

### Blog処理フロー

1. **データ取得**: Blogプロバイダーからデータを並列取得
2. **ミュートフィルタ適用**: Issue #1 のミュートワードでフィルタリング
3. **カテゴリフィルタ適用**: 設定されている場合、カテゴリキーワードでフィルタリング
4. **JSONファイル保存**: 収集データをファイルに保存
5. **要約生成**: Claude Code Action でJSON形式の要約を生成
6. **Discussion投稿**: 要約を含むDiscussionを作成

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

2. **サブカテゴリラベル**:
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

# Blogをカテゴリフィルタ付きで取得
GITHUB_TOKEN=$(gh auth token) CATEGORY_FILTER_ISSUE_NUMBER=123 deno task fetch-blog
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
      "description": "記事の説明",
      "tags": ["tag1", "tag2"],
      "bookmarkCount": 100,
      "pubDate": "2026-01-18T06:00:00Z",
      "muted": false,
      "matchedCategories": ["aws", "github"]
    }
  ]
}
```

**フィールド説明**:
- `matchedCategories`: カテゴリフィルタ機能でマッチしたカテゴリキーワードの配列（フィルタ未使用時は含まれない）

---

## 9. 対象期間の計算

日次Changelogの対象期間はUTC 3:00（JST 12:00）を基準とした24時間ウィンドウです。

```
対象日: YYYY-MM-DD
開始: YYYY-MM-(DD-1) 03:00 UTC
終了: YYYY-MM-DD 03:00 UTC
```

これにより、アメリカ西海岸（PST/PDT）の夕方〜夜の更新を翌日の日本時間正午に収集できます。

---

## 10. カテゴリフィルタリング機能（Blog専用）

### 概要

Blog記事を特定のカテゴリキーワード（例: aws, github, kubernetes）でフィルタリングし、関係のない記事を除外する機能です。

**対象**: Blog（はてなブックマーク）のみ。Changelogには適用されません。

### 目的

- トピックが散らばりがちなBlog記事を、興味のあるカテゴリに絞り込む
- 関係のない記事を除外し、Discussion投稿の質を向上
- 収集データのノイズを削減

### 設定方法

#### 1. GitHub Issueにカテゴリキーワードを記載

指定したIssue番号の本文に、箇条書きでカテゴリキーワードを列挙します：

```markdown
- aws
- github
- kubernetes
- terraform
- docker
```

#### 2. 環境変数を設定

```bash
export CATEGORY_FILTER_ISSUE_NUMBER=123  # Issue番号を指定
```

GitHub Actionsの場合は、ワークフローファイルに追加：

```yaml
env:
  CATEGORY_FILTER_ISSUE_NUMBER: "123"
```

### フィルタリングの仕組み

#### マッチング対象フィールド

以下のフィールドで順にカテゴリキーワードをチェック：

1. **title**（タイトル）
2. **tags**（タグ配列）
3. **description**（説明文）

#### マッチング条件

- **部分一致**: キーワードがフィールド内に含まれているかチェック
- **大文字小文字を区別しない**: "AWS" と "aws" は同一扱い
- **複数カテゴリマッチ**: 1つのエントリが複数のカテゴリにマッチする場合、すべて記録

#### フィルタリング動作

```
カテゴリキーワードが設定されている場合:
  → マッチしたエントリのみ保持、マッチしないエントリは除外

カテゴリキーワードが空または未設定の場合:
  → すべてのエントリを保持（フィルタリングなし）
```

### 実行例

```bash
# カテゴリフィルタを使用してBlog記事を取得
GITHUB_TOKEN=$(gh auth token) \
CATEGORY_FILTER_ISSUE_NUMBER=123 \
deno task fetch-blog

# ログ出力例
Loaded 7 category keywords from issue #123: aws, github, kubernetes, terraform, docker...
Filtered out 15 hatenaBookmark entries (not matching categories: aws, github, kubernetes, terraform, docker...)
```

### データへの影響

フィルタリングされたエントリには `matchedCategories` フィールドが追加されます：

```json
{
  "title": "GitHub Actions for AWS Lambda",
  "url": "https://example.com/article",
  "matchedCategories": ["github", "aws"]
}
```

### 注意事項

- カテゴリキーワードは最大5個までログに表示（それ以上は `...` で省略）
- マッチしないエントリは完全に除外され、JSONファイルにも保存されません
- ミュートフィルタの後に適用されるため、ミュート済みエントリは既に除外されています

### 使用タイミング

- **日次ワークフロー**: 毎日のBlog収集時に自動適用
- **手動実行**: 環境変数を設定して `deno task fetch-blog` を実行
