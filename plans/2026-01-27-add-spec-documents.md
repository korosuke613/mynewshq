# 仕様書追加計画

## 目的

`spec/` ディレクトリに不足している仕様書を追加する。

## 追加する仕様書

1. **daily-changelog.md** - 日次処理の仕様
2. ~~**provider-pattern.md** - Provider Pattern の設計仕様~~ → 削除（実装内部詳細のため、CLAUDE.mdの記載で十分）
3. **mute-filter.md** - ミュート機能の仕様
4. **claude-mention.md** - @claude メンション機能の仕様

## 各仕様書の概要

### 1. daily-changelog.md
- ワークフロートリガー（cron、手動）
- 処理フロー（データ取得→要約生成→投稿）
- Discussion構成（Changelog/Blog）
- 要約JSON形式
- ラベル付与ルール
- コマンド一覧

### 2. mute-filter.md
- ミュートワード取得方法（Issue #1）
- マッチングルール（部分一致、大文字小文字無視）
- データ構造（muted, mutedBy フィールド）
- 表示方法（折りたたみ）

### 3. claude-mention.md
- トリガー条件（@claude メンション）
- 2段階ワークフロー構成
- 許可ユーザー制限
- 回答生成ルール
- 利用可能ツール

## 対象ファイル

- `spec/daily-changelog.md`（新規）
- `spec/mute-filter.md`（新規）
- `spec/claude-mention.md`（新規）

## プランファイルのリネーム

完了後、このファイルを `./plans/2026-01-27-add-spec-documents.md` にリネーム
