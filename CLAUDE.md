# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要なルール（必ず守ること）

- **プランファイル**: プランモード終了時、todoの最後にプランファイルを `./plans/YYYY-MM-DD-説明.md` 形式にリネームするタスクを追加。コミット時にプランファイルを含める
- **開発ルール**: コード作成・編集後は `dev-standards` skill を実行してチェック
- **言語**: 日本語で回答すること
- **仕様書**: 外部仕様に集中し、内部実装詳細は書かない。変更時は仕様への影響を確認し、更新が必要ならユーザーに確認を取る（下記参照）

### 仕様書の書き方

仕様書（`spec/*.md`）は「何を実現するか」を記述し、「どう実装するか」は書かない。

**含めるべき内容**:
- 機能概要・目的
- トリガー条件（cron、イベント）
- 入出力形式（JSON、Markdown）
- ユーザー向けコマンド
- 外部から見た振る舞い

**含めない内容**:
- TypeScriptコード・関数シグネチャ
- 実装ファイル一覧
- 内部アーキテクチャ詳細
- テストコード

---

## プロジェクト概要

技術系Changelogを自動収集・AI要約・GitHub Discussionsに投稿するシステム。

**対象サービス**:
- Changelog: GitHub Changelog, AWS What's New, Claude Code, Linear Changelog
- Blog: はてなブックマーク（テクノロジーカテゴリ）

**スケジュール**:
- 日次: 毎日 12:00 JST
- 週次: 毎週水曜日 10:00 JST

**仕様書**: `spec/` ディレクトリに配置

## 開発コマンド

```bash
# データ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch
GITHUB_TOKEN=$(gh auth token) deno task fetch -- --date=2026-01-15
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly
GITHUB_TOKEN=$(gh auth token) deno task fetch-changelog  # Changelogのみ
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog       # Blogのみ

# ローカル要約生成（Claude Code CLI使用）
deno task summarize --date=2026-01-15                        # Changelog要約
deno task summarize --date=2026-01-15 --category=blog        # Blog要約
deno task summarize --date=2026-01-15 --output=/tmp/sum.json # ファイル出力
deno task summarize --date=2026-01-15 --dry-run              # プロンプト確認

# プレビュー（投稿せずにMarkdown確認）
deno task preview
deno task preview-weekly
deno task preview-blog
deno task preview-weekly-provider -- --provider=github

# 週次オーケストレーター（プロバイダー別並列処理）
GITHUB_TOKEN=$(gh auth token) deno task weekly-orchestrator fetch-past-all
GITHUB_TOKEN=$(gh auth token) deno task weekly-orchestrator post-all

# テスト・品質チェック
deno task test                                # 全テスト実行
deno task test:integration                    # 統合テスト
deno test scripts/domain/mute-filter_test.ts  # 単一ファイル
deno check scripts/*.ts scripts/**/*.ts       # 型チェック
deno lint                                     # リント
deno fmt                                      # フォーマット
```

## アーキテクチャ

```
scripts/
├── fetch-changelogs.ts          # エントリポイント：データ取得
├── create-discussion.ts         # エントリポイント：Discussion投稿
├── weekly-orchestrator.ts       # 週次プロバイダー別並列処理
├── domain/                      # ビジネスロジック層
│   ├── types.ts                 # 共通型定義（ChangelogData, BlogData等）
│   ├── providers/               # Provider Pattern
│   │   ├── index.ts             # 統合モジュール・ヘルパー関数
│   │   ├── types.ts             # ProviderConfig型定義
│   │   └── *-provider.ts        # 各サービスのデータ取得
│   ├── weekly/                  # 週次処理ロジック
│   │   ├── orchestrator.ts      # 週次オーケストレーター
│   │   ├── pipeline.ts          # 処理パイプライン
│   │   ├── types.ts             # 週次処理型定義
│   │   └── adapters/            # プロバイダーアダプター
│   ├── date-filter.ts           # 日付フィルタリング
│   ├── mute-filter.ts           # ミュート機能
│   └── label-extractor.ts       # ラベル抽出
└── presentation/markdown/       # プレゼンテーション層
    ├── daily-generator.ts       # 日次Markdown生成
    ├── weekly-generator.ts      # 週次Markdown生成
    └── blog-generator.ts        # Blog Markdown生成
```

### Provider Pattern

新しいプロバイダーを追加する場合は `/add-provider` スキルを使用。

### データフロー

```
各Provider.fetch() → fetchAll()並列実行 → ミュートフィルタ適用
→ toChangelogData() → JSON保存 → Markdown生成 → Discussion投稿
```

### 週次オーケストレーター

週次ワークフローでは各プロバイダーを並列処理:
- GitHub Actions の matrix で各プロバイダーを同時実行
- 過去Discussionからハイライトを取得して引用

## テストの配置

テストファイルは対象ファイルと同じディレクトリに `*_test.ts` として配置：
- `scripts/*_test.ts` - エントリポイントのテスト
- `scripts/domain/*_test.ts` - ドメインロジックのテスト
- `scripts/domain/providers/*_test.ts` - Providerのテスト
- `scripts/domain/weekly/*_test.ts` - 週次処理のテスト
- `scripts/presentation/markdown/*_test.ts` - Markdown生成のテスト

## ファイル構造（詳細）

```
mynewshq/
├── .github/workflows/
│   ├── daily-changelog.yml         # 日次ワークフロー（収集→要約→投稿）
│   ├── weekly-changelog.yml        # 週次ワークフロー（毎週水曜日）
│   ├── discussion-claude-answer.yml # Claudeによる質問回答
│   ├── discussion-claude-mention.yml # @claudeメンションのトリガー
│   └── quality-check.yml           # コード品質チェック
├── scripts/
│   ├── fetch-changelogs.ts         # データ取得エントリポイント
│   ├── fetch-past-discussions.ts   # 過去Discussion取得
│   ├── create-discussion.ts        # Discussion投稿 + ラベル自動付与
│   ├── preview-discussion.ts       # Discussion投稿内容をプレビュー
│   ├── reply-discussion.ts         # Discussionにコメントを投稿
│   ├── weekly-orchestrator.ts      # 週次プロバイダー別並列処理
│   ├── post-weekly-provider.ts     # 週次プロバイダー別投稿
│   ├── preview-weekly-provider.ts  # 週次プロバイダー別プレビュー
│   ├── domain/                     # ドメインロジック層
│   │   ├── types.ts                # 共通型定義
│   │   ├── date-filter.ts          # 日付フィルタリング
│   │   ├── mute-filter.ts          # ミュートフィルタリング
│   │   ├── label-extractor.ts      # ラベル抽出
│   │   ├── url-normalizer.ts       # URL正規化
│   │   ├── providers/              # Provider Pattern
│   │   │   ├── index.ts            # Provider統合・ヘルパー関数
│   │   │   ├── types.ts            # Provider型定義
│   │   │   ├── github-provider.ts  # GitHub Changelog取得
│   │   │   ├── aws-provider.ts     # AWS What's New取得
│   │   │   ├── claude-code-provider.ts # Claude Code取得
│   │   │   ├── linear-provider.ts  # Linear Changelog取得
│   │   │   └── hatena-bookmark-provider.ts # はてなブックマーク取得
│   │   └── weekly/                 # 週次処理ロジック
│   │       ├── orchestrator.ts     # 週次オーケストレーター
│   │       ├── pipeline.ts         # 処理パイプライン
│   │       ├── types.ts            # 週次処理型定義
│   │       └── adapters/           # プロバイダーアダプター
│   │           ├── base-adapter.ts       # 基底アダプター
│   │           ├── simple-adapter.ts     # シンプルアダプター
│   │           └── categorized-adapter.ts # カテゴリ付きアダプター
│   └── presentation/markdown/      # プレゼンテーション層
│       ├── daily-generator.ts      # 日次Markdown生成
│       ├── weekly-generator.ts     # 週次Markdown生成
│       ├── blog-generator.ts       # Blog Markdown生成
│       ├── helpers.ts              # 共通ヘルパー
│       └── muted-section.ts        # ミュートセクション生成
├── data/
│   ├── changelogs/                 # Changelog収集データ（Git管理）
│   │   ├── daily/                  # 日次データ
│   │   │   └── YYYY-MM-DD.json
│   │   └── YYYY-MM-DD.json         # レガシー日次データ
│   └── blogs/                      # Blog収集データ（Git管理）
│       └── daily/
│           └── YYYY-MM-DD.json
├── plans/                          # 実装計画ドキュメント
│   └── YYYY-MM-DD-説明.md
├── spec/                           # 仕様書
│   └── weekly-changelog.md
├── deno.json                       # Denoタスク定義
├── deno.lock                       # 依存関係ロックファイル
├── CLAUDE.md                       # Claude Code Action設定
└── README.md
```

## JSONデータフォーマット

### Changelogデータ（`data/changelogs/daily/YYYY-MM-DD.json`）

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
  "linear": [...]
}
```

`muted` と `mutedBy` フィールドはミュートワード機能が有効な場合のみ含まれます。

### 要約JSON（Claude Code Actionの出力）

```json
{
  "github": { "エントリのURL": "要約文", ... },
  "aws": { "エントリのURL": "要約文", ... },
  "claudeCode": { "エントリのURL": "要約文", ... },
  "linear": { "エントリのURL": "要約文", ... }
}
```

## カスタマイズ

### 実行時刻の変更

`.github/workflows/daily-changelog.yml` の `cron` を編集：

```yaml
schedule:
  - cron: "0 3 * * *" # UTC 3:00 = JST 12:00 = PST 19:00/PDT 20:00
```

`.github/workflows/weekly-changelog.yml` の `cron` を編集：

```yaml
schedule:
  - cron: "0 1 * * 3" # 毎週水曜日 UTC 1:00 = JST 10:00
```

### 要約フォーマットの変更

`CLAUDE.md` の「Claude Code Actionの役割」セクションを編集。

### Discussionカテゴリの変更

ワークフローの投稿コマンドで最後の引数を変更：
- 日次: `General` カテゴリ
- 週次: `Weekly` カテゴリ

### 新しいChangelogソースの追加

Provider Patternにより、新しいChangelogソースを追加する場合は `/add-provider` スキルを使用するか、以下のファイルを手動で変更：

1. `scripts/domain/providers/xxx-provider.ts` - 新規Providerを作成
2. `scripts/domain/providers/index.ts` - Providerを登録・`toChangelogData`を更新
3. `scripts/domain/types.ts` - `ChangelogData`型にフィールドを追加

## プレビュー機能

Discussion投稿前に生成されるMarkdownを確認できます：

```bash
# 最新のデータをプレビュー
deno task preview

# 特定の日付のデータをプレビュー
deno task preview --date=2026-01-13

# 構造化要約JSONを指定してプレビュー
deno task preview --date=2026-01-13 --summaries-json='{"github":{"https://example.com":"テスト要約"},"aws":{},"claudeCode":{},"linear":{}}'
```

**出力内容:**
- データ統計（アクティブ/ミュート件数）
- 要約JSON使用時はその旨を表示
- `summary.md` に自動保存
- ターミナルにプレビュー表示

## ローカル完全ワークフロー

GitHub Actionsを使わずにローカルで完全なワークフローを実行できます：

```bash
# 1. データ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch --date=2026-01-15

# 2. 要約生成（Claude Code CLI使用）
deno task summarize --date=2026-01-15 --output=/tmp/summaries.json

# 3. プレビュー
deno task preview --date=2026-01-15 --summaries-file=/tmp/summaries.json

# 4. 投稿（dry-run）
deno run --allow-read --allow-env scripts/create-discussion.ts \
  --date=2026-01-15 \
  --summaries-file=/tmp/summaries.json \
  --dry-run
```

**必要な準備:**
- Claude Code CLIのインストール: `npm install -g @anthropics/claude-code`
- GitHub Token: `gh auth token` で取得

## 依存関係

プロジェクトは以下のパッケージを使用：

- `@octokit/rest` - GitHub REST API クライアント
- `@octokit/graphql` - GitHub GraphQL API クライアント
- `rss-parser` - RSSフィード解析
- `xml` - XMLパーサー（GitHub Changelog用）
- `@std/assert` - Deno標準アサーションライブラリ（テスト用）

依存関係の更新は `deno.json` と `deno.lock` で管理。

---

## Claude Code Actionの役割（要約生成時）

Changelogデータを読み込み、以下の形式で日本語要約を生成：

```markdown
# 📰 Tech Changelog - YYYY-MM-DD

## GitHub Changelog

### [タイトル](URL) `ラベル1` `ラベル2`

**要約**: 2-3文で簡潔に日本語で要約。技術者向けに重要なポイントを強調。
```

### ラベル表示

`labels`フィールドがある場合、見出しの後ろにバッククォートで表示：
```json
"labels": { "changelog-type": ["Improvement"], "changelog-label": ["copilot"] }
```
→ `### [タイトル](URL) \`Improvement\` \`copilot\``

### 要約ルール

1. 各エントリは2-3文で要約
2. 技術用語は正確に使用
3. `muted: true` のエントリはスキップ
4. すべて日本語で記述
