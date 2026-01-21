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

## アーキテクチャ

```
[cron 12:00 JST (日次) / 10:00 JST 水曜 (週次)]
      │
      ▼
┌─────────────────────────────────────────────────┐
│ daily-changelog.yml / weekly-changelog.yml      │
│                                                 │
│ Step 1: データ取得                              │
│   Provider Pattern で各サービスから並列取得     │
│   ├── GitHub Changelog (RSS)                   │
│   ├── AWS What's New (RSS)                     │
│   ├── Claude Code (GitHub Releases)            │
│   └── Linear Changelog (RSS)                   │
│   → data/changelogs/{daily,weekly}/ に保存     │
│                                                 │
│ Step 2: 要約生成（Claude Code Action）          │
│   JSON読込 → 構造化要約JSON出力                 │
│                                                 │
│ Step 3: Discussion投稿                          │
│   Presentation層でMarkdown生成                  │
│   → GitHub Discussionに投稿                     │
└─────────────────────────────────────────────────┘
```

**設計ポイント**:
- **Provider Pattern**: 各サービスの設定・取得ロジックを統一的に管理。新サービス追加が容易
- **クリーンアーキテクチャ**: Domain層（ビジネスロジック）とPresentation層（Markdown生成）を分離
- **構造化出力**: Claude Code Actionは要約JSONのみ出力し、Markdownはコードで生成

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
GITHUB_TOKEN=$(gh auth token) deno task post korosuke613 mynewshq General

# 過去の日付のデータで投稿
GITHUB_TOKEN=$(gh auth token) deno task post --date=2026-01-15 korosuke613 mynewshq General

# 構造化要約JSONを指定して投稿（新機能）
GITHUB_TOKEN=$(gh auth token) deno task post --date=2026-01-15 --summaries-json='{"github":{},"aws":{},"claudeCode":{},"linear":{}}' korosuke613 mynewshq General

# メンション先を変更して投稿
GITHUB_TOKEN=$(gh auth token) MENTION_USER=your-username deno task post korosuke613 mynewshq General

# Discussion投稿内容をプレビュー（日次）
deno task preview
deno task preview --date=2026-01-13

# Discussion投稿内容をプレビュー（週次）
deno task preview-weekly
deno task preview-weekly --date=2026-01-20

# 構造化要約JSONを指定してプレビュー
deno task preview --date=2026-01-13 --summaries-json='{"github":{"https://example.com":"テスト要約"},"aws":{},"claudeCode":{},"linear":{}}'

# 週次データを取得（7日間）
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly -- --date=2026-01-20

# Discussionにコメントを投稿
GITHUB_TOKEN=$(gh auth token) deno task reply-discussion 1 korosuke613 mynewshq "コメント内容"

# テストの実行
deno task test
```

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

## ファイル構造

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
│   ├── create-discussion.ts        # Discussion投稿 + ラベル自動付与
│   ├── preview-discussion.ts       # Discussion投稿内容をプレビュー
│   ├── reply-discussion.ts         # Discussionにコメントを投稿
│   ├── domain/                     # ドメインロジック層
│   │   ├── types.ts                # 共通型定義
│   │   ├── date-filter.ts          # 日付フィルタリング
│   │   ├── mute-filter.ts          # ミュートフィルタリング
│   │   ├── label-extractor.ts      # ラベル抽出
│   │   ├── url-normalizer.ts       # URL正規化
│   │   └── providers/              # Provider Pattern
│   │       ├── index.ts            # Provider統合・ヘルパー関数
│   │       ├── types.ts            # Provider型定義
│   │       ├── github-provider.ts  # GitHub Changelog取得
│   │       ├── aws-provider.ts     # AWS What's New取得
│   │       ├── claude-code-provider.ts # Claude Code取得
│   │       └── linear-provider.ts  # Linear Changelog取得
│   └── presentation/markdown/      # プレゼンテーション層
│       ├── daily-generator.ts      # 日次Markdown生成
│       ├── weekly-generator.ts     # 週次Markdown生成
│       ├── helpers.ts              # 共通ヘルパー
│       └── muted-section.ts        # ミュートセクション生成
├── data/changelogs/                # 収集データ（Git管理）
│   ├── daily/                      # 日次データ
│   │   └── YYYY-MM-DD.json
│   └── weekly/                     # 週次データ
│       └── YYYY-MM-DD.json
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

### 🔗 URL正規化機能

AWS RSSフィードなどで稀に発生するURL破損（`.com` の後の `/` が欠落）を自動修正します：

- **入力**: `https://aws.amazon.comabout-aws/...`
- **出力**: `https://aws.amazon.com/about-aws/...`

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
  - cron: "0 3 * * *" # UTC 3:00 = JST 12:00 = PST 19:00/PDT 20:00
```

`.github/workflows/weekly-changelog.yml` の `cron` を編集：

```yaml
schedule:
  - cron: "0 1 * * 3" # 毎週水曜日 UTC 1:00 = JST 10:00
```

### 要約フォーマットの変更

`CLAUDE.md` を編集して、Claude Code Actionへのプロンプトを調整してください。

### Discussionカテゴリの変更

ワークフローの投稿コマンドで最後の引数を変更してください：
- 日次: `General` カテゴリ
- 週次: `Weekly` カテゴリ

### 新しいChangelogソースの追加

Provider Patternにより、新しいChangelogソースを追加する場合は以下のファイルを変更します：

1. `scripts/domain/providers/xxx-provider.ts` - 新規Providerを作成
2. `scripts/domain/providers/index.ts` - Providerを登録・`toChangelogData`を更新
3. `scripts/domain/types.ts` - `ChangelogData`型にフィールドを追加

## 開発

### Discussion投稿内容のプレビュー

Discussion投稿前に、生成されるMarkdownを確認できます：

```bash
# 最新のデータをプレビュー
deno task preview

# 特定の日付のデータをプレビュー
deno task preview --date=2026-01-13

# 構造化要約JSONを指定してプレビュー
deno task preview --date=2026-01-13 --summaries-json='{"github":{"https://example.com":"テスト要約"},"aws":{},"claudeCode":{},"linear":{}}'
```

**出力内容:**
- 📊 データ統計（アクティブ/ミュート件数）
- 📝 要約JSON使用時はその旨を表示
- ✅ `summary.md` に自動保存
- 📄 ターミナルにプレビュー表示

**要約JSONフォーマット:**
```json
{
  "github": { "エントリのURL": "要約文", ... },
  "aws": { "エントリのURL": "要約文", ... },
  "claudeCode": { "エントリのURL": "要約文", ... },
  "linear": { "エントリのURL": "要約文", ... }
}
```

### テストの実行

```bash
deno task test
```

テストファイルは各モジュールと同じディレクトリに配置されています：
- `scripts/*_test.ts` - エントリポイントのテスト
- `scripts/domain/*_test.ts` - ドメインロジックのテスト
- `scripts/domain/providers/*_test.ts` - Providerのテスト
- `scripts/presentation/markdown/*_test.ts` - Markdown生成のテスト

### コード品質チェック

```bash
deno fmt        # フォーマット
deno lint       # リント
deno check scripts/*.ts scripts/**/*.ts  # 型チェック
```

### 依存関係

プロジェクトは以下のパッケージを使用しています：

- `@octokit/rest` - GitHub REST API クライアント
- `@octokit/graphql` - GitHub GraphQL API クライアント
- `rss-parser` - RSSフィード解析
- `xml` - XMLパーサー（GitHub Changelog用）
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

## ライセンス

MIT
