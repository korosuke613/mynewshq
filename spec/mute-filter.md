# ミュート機能仕様書

## 1. 概要

### 目的

ミュート機能は、特定のキーワードを含むChangelogエントリを自動的にフィルタリングし、メインの表示から除外する機能です。興味のないトピック（特定のプロダクト名や機能名など）を自動で非表示にできます。

### 特徴

- **非破壊的**: ミュートされたエントリは削除されず、折りたたみセクションに表示
- **設定の一元管理**: GitHub Issue を使用してミュートワードを管理
- **柔軟なマッチング**: 部分一致・大文字小文字無視でマッチング

---

## 2. ミュートワードの設定

### データソース

ミュートワードはGitHub Issue #1 の本文から取得されます。

- **リポジトリ**: korosuke613/mynewshq
- **Issue番号**: 環境変数 `MUTE_WORDS_ISSUE_NUMBER` で設定（デフォルト: `1`）

### Issue本文の形式

箇条書き形式でミュートワードを記述します：

```markdown
# ミュートワード一覧

以下のキーワードを含むエントリはミュートされます。

- AWS Marketplace
- Savings Plans
- Reserved Instances
- China Region
```

---

## 3. マッチングルール

### 基本ルール

1. **部分一致**: エントリのタイトルにミュートワードが含まれていればマッチ
2. **大文字小文字無視**: 比較時に両方を小文字に変換
3. **複数ワード**: 1つでもマッチすればミュート対象

### マッチング対象

- 一般エントリ: `title` フィールド
- リリースエントリ（Claude Code等）: `version` フィールド

### マッチング例

| タイトル | ミュートワード | 結果 |
|---------|---------------|------|
| "AWS Marketplace now supports..." | "AWS Marketplace" | ✅ ミュート |
| "aws marketplace updates" | "AWS Marketplace" | ✅ ミュート（大文字小文字無視） |
| "New S3 features" | "AWS Marketplace" | ❌ ミュートなし |
| "Savings Plans price reduction" | "Savings Plans" | ✅ ミュート |

---

## 4. 出力データ構造

ミュートされたエントリには以下のフィールドが追加されます：

| フィールド | 型 | 説明 |
|-----------|------|------|
| `muted` | `boolean` | ミュート対象の場合 `true` |
| `mutedBy` | `string` | マッチしたミュートワード |

### 出力例

```json
{
  "title": "AWS Marketplace now supports new payment options",
  "url": "https://aws.amazon.com/about-aws/whats-new/...",
  "content": "...",
  "pubDate": "2026-01-18T10:00:00Z",
  "muted": true,
  "mutedBy": "AWS Marketplace"
}
```

ミュートされていないエントリには `muted` と `mutedBy` フィールドは追加されません。

---

## 5. 表示方法

### メインセクション

ミュートされたエントリ（`muted: true`）はメインのリストから除外されます。

### 折りたたみセクション

ミュートされたエントリは各プロバイダーセクションの末尾に折りたたみ表示されます：

```markdown
## GitHub Changelog

### [Active Entry Title](URL)
**要約**: ...

<details>
<summary>ミュートされたエントリ (2件)</summary>

- [AWS Marketplace updates](URL) *(ミュートワード: AWS Marketplace)*
- [Savings Plans pricing](URL) *(ミュートワード: Savings Plans)*
</details>
```

---

## 6. 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `MUTE_WORDS_ISSUE_NUMBER` | ミュートワードを記載したIssue番号 | `1` |

---

## 7. 統計情報

プレビューコマンド実行時に、アクティブ/ミュートの件数が表示されます：

```
=== Changelog Statistics ===
Provider: github
  Active entries: 5
  Muted entries: 2

Provider: aws
  Active entries: 8
  Muted entries: 3

Total: 13 active, 5 muted
```
