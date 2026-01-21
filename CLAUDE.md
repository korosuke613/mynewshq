# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要なルール（必ず守ること）

- **プランファイル**: プランモード終了時、todoの最後にプランファイルを `./plans/YYYY-MM-DD-説明.md` 形式にリネームするタスクを追加。コミット時にプランファイルを含める
- **開発ルール**: コード作成・編集後は `dev-standards` skill を実行してチェック
- **言語**: 日本語で回答すること

---

## プロジェクト概要

技術系Changelogを自動収集・AI要約・GitHub Discussionsに投稿するシステム。

**対象サービス**: GitHub Changelog, AWS What's New, Claude Code, Linear Changelog

**スケジュール**:
- 日次: 毎日 12:00 JST
- 週次: 毎週水曜日 10:00 JST

## 開発コマンド

```bash
# データ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch
GITHUB_TOKEN=$(gh auth token) deno task fetch -- --date=2026-01-15
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly

# プレビュー（投稿せずにMarkdown確認）
deno task preview
deno task preview-weekly

# テスト・品質チェック
deno task test                              # 全テスト実行
deno test scripts/domain/mute-filter_test.ts  # 単一ファイル
deno check scripts/*.ts scripts/**/*.ts     # 型チェック
deno lint                                   # リント
deno fmt                                    # フォーマット
```

## アーキテクチャ

```
scripts/
├── fetch-changelogs.ts          # エントリポイント：データ取得
├── create-discussion.ts         # エントリポイント：Discussion投稿
├── domain/                      # ビジネスロジック層
│   ├── types.ts                 # 共通型定義（ChangelogData等）
│   ├── providers/               # Provider Pattern
│   │   ├── index.ts             # 統合モジュール・ヘルパー関数
│   │   ├── types.ts             # ProviderConfig型定義
│   │   └── *-provider.ts        # 各サービスのデータ取得
│   ├── date-filter.ts           # 日付フィルタリング
│   ├── mute-filter.ts           # ミュート機能
│   └── label-extractor.ts       # ラベル抽出
└── presentation/markdown/       # プレゼンテーション層
    ├── daily-generator.ts       # 日次Markdown生成
    └── weekly-generator.ts      # 週次Markdown生成
```

### Provider Pattern

新しいChangelogソースを追加する場合：

1. `scripts/domain/providers/xxx-provider.ts` を作成（`ProviderConfig`に準拠）
2. `scripts/domain/providers/index.ts` の `PROVIDER_CONFIGS` に登録、`toChangelogData()` を更新
3. `scripts/domain/types.ts` の `ChangelogData` 型にフィールドを追加

### データフロー

```
各Provider.fetch() → fetchAll()並列実行 → ミュートフィルタ適用
→ toChangelogData() → JSON保存 → Markdown生成 → Discussion投稿
```

## テストの配置

テストファイルは対象ファイルと同じディレクトリに `*_test.ts` として配置。

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
