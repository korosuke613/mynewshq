# Claude Code Action 設定

このリポジトリは、技術系Changelogを自動収集・要約・投稿するシステムです。

./plans に作るプランファイルの命名規則は YYYY-MM-DD-説明.md です。ファイル作成時にこの形式にしてください。
また、開発ルールは dev-standards skill に従います。

## プロジェクト概要

毎日9:00 JSTに以下のChangelogを自動収集します：

- GitHub Changelog (RSS)
- AWS What's New (RSS)
- Claude Code (GitHub Releases)

収集したデータは `data/changelogs/YYYY-MM-DD.json` に保存され、 Claude Code
Actionで要約を生成してGitHub Discussionsに投稿します。

## 使用技術

- **ランタイム**: Deno
- **言語**: TypeScript
- **CI/CD**: GitHub Actions
- **AI要約**: Claude Code Action

## ファイル構造

- `scripts/fetch-changelogs.ts`: データ取得スクリプト
- `scripts/create-discussion.ts`: Discussion投稿スクリプト
- `data/changelogs/`: 収集したデータを保存
- `.github/workflows/fetch-changelog.yml`: データ取得ワークフロー
- `.github/workflows/summarize-changelog.yml`: 要約・投稿ワークフロー

## Claude Code Actionの役割

Changelogデータを読み込み、以下の形式で日本語要約を生成してください：

### 要約フォーマット

```markdown
# 📰 Tech Changelog - YYYY-MM-DD

## GitHub Changelog

### [タイトル](URL)

**要約**: 2-3文で簡潔に日本語で要約。技術者向けに重要なポイントを強調。

## AWS What's New

### [タイトル](URL)

**要約**: 2-3文で簡潔に日本語で要約。技術者向けに重要なポイントを強調。

## Claude Code

### [バージョン](URL)

**要約**: 2-3文で簡潔に日本語で要約。技術者向けに重要なポイントを強調。
```

### 要約のルール

1. **簡潔さ**: 各エントリは2-3文で要約
2. **技術的正確性**: 技術用語は正確に使用
3. **重要度**: 技術者にとって重要なポイントを優先
4. **日本語**: すべて日本語で記述
5. **リンク**: タイトルは元記事へのリンクとして表示

### 実行手順

要約を生成したら：

1. `summary.md` に要約を保存
2. `deno task post korosuke613 mynewshq General "$(cat summary.md)"`
   を実行してDiscussionに投稿
