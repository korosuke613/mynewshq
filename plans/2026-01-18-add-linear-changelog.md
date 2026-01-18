# Linear Changelog 対応

## 概要

Linear Changelog の RSS フィードを追加して、自動収集・要約・投稿に対応する。

## 背景

- ユーザーが Linear をよく使用している
- Linear には公式の RSS フィード (`https://linear.app/rss/changelog.xml`) が存在する
- 既存の RSS ベースの収集ロジックが流用可能

## 実装内容

### 1. データ取得機能の追加

**ファイル**: `scripts/fetch-changelogs.ts`

- `fetchLinearChangelog()` 関数を追加
- RSS パーサーで `https://linear.app/rss/changelog.xml` からデータ取得
- 過去24時間以内のエントリをフィルタリング
- `ChangelogData` インターフェースに `linear: ChangelogEntry[]` を追加
- ミュートフィルタ対応

### 2. Discussion 投稿機能の更新

**ファイル**: `scripts/create-discussion.ts`

- `generateDefaultBody()` に Linear セクションを追加
  - `## Linear Changelog` ヘッダー
  - タイトル・URL・公開日時を表示
  - ミュート対応
- `determineLabels()` に `linear` ラベル判定ロジックを追加
- `ChangelogData` インターフェースを更新

### 3. プレビュー機能の更新

**ファイル**: `scripts/preview-discussion.ts`

- Linear の統計情報表示を追加
- `ChangelogData` インターフェースを更新

### 4. テストの更新

**ファイル**: `scripts/create-discussion_test.ts`

- モックデータに `linear` フィールドを追加
- `determineLabels()` のテストケースを追加
  - 全エントリがある場合は4つのラベルを返す
  - Linear のみの場合は `linear` ラベルのみ返す

### 5. ドキュメントの更新

**ファイル**: `README.md`
- 対象 Changelog に Linear を追加
- 自動ラベル付与に `linear` を追加
- JSON データフォーマットに `linear` を追加
- トラブルシューティングに `linear` ラベル作成を追加

**ファイル**: `CLAUDE.md`
- プロジェクト概要に Linear を追加
- 要約フォーマットに Linear セクションを追加

## 動作確認

### テストデータ

2025-12-17 のデータで検証:

```bash
deno task fetch -- --date=2025-12-17
```

**結果**:
```json
{
  "date": "2025-12-17",
  "linear": [
    {
      "title": "Team owners",
      "url": "https://linear.app/changelog/2025-12-17-team-owners",
      "content": "",
      "pubDate": "Wed, 17 Dec 2025 16:02:03 GMT"
    }
  ]
}
```

### プレビュー確認

```bash
deno task preview -- --date=2025-12-17
```

**出力**:
```
📊 データ統計 (2025-12-17)
---
GitHub: 0 件 (ミュート: 0 件)
AWS: 0 件 (ミュート: 0 件)
Claude Code: 0 件 (ミュート: 0 件)
Linear: 1 件 (ミュート: 0 件)
合計: 1 件 (ミュート: 0 件)
```

### テスト結果

```bash
deno task test
```

- ✅ 全テスト通過 (8 tests, 35 steps)
- ✅ 型チェック完了
- ✅ フォーマット・リント完了

## 技術的詳細

### RSS フィード構造

- **URL**: `https://linear.app/rss/changelog.xml`
- **形式**: 標準的な RSS 2.0
- **フィールド**:
  - `title`: エントリのタイトル
  - `link`: 詳細ページの URL
  - `pubDate`: 公開日時 (RFC 2822 形式)
  - `content` / `contentSnippet`: 本文

### データフロー

1. **収集**: `fetchLinearChangelog()` → RSS パース → 24時間フィルタ
2. **保存**: `data/changelogs/YYYY-MM-DD.json`
3. **要約**: Claude Code Action が JSON を読み込み
4. **投稿**: `generateDefaultBody()` → Discussion 作成 → ラベル自動付与

## 影響範囲

### 変更されたファイル

- ✏️ `scripts/fetch-changelogs.ts` (+36 行)
- ✏️ `scripts/create-discussion.ts` (+19 行)
- ✏️ `scripts/preview-discussion.ts` (+16 行)
- ✏️ `scripts/create-discussion_test.ts` (+45 行)
- ✏️ `README.md` (+13 行)
- ✏️ `CLAUDE.md` (+7 行)

**合計**: 6 files changed, 131 insertions(+), 11 deletions(-)

### 新規作成が必要なもの

- GitHub リポジトリに `linear` ラベルを手動作成

## 今後の改善案

- [ ] Linear の content フィールドに詳細があれば要約に含める
- [ ] Linear の画像やスクリーンショットを表示する
- [ ] Linear の変更カテゴリ（Features/Improvements/Fixes）を区別する
- [ ] Linear API を使用してより詳細な情報を取得する

## 参考資料

- Linear Changelog: https://linear.app/changelog
- Linear RSS Feed: https://linear.app/rss/changelog.xml
- RSS Parser (rss-parser): https://www.npmjs.com/package/rss-parser
