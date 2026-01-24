# Blog カテゴリ追加計画

## 概要

changelog とは別に「blog」カテゴリを追加し、はてなブックマークのテクノロジーカテゴリを最初のソースとして実装する。

**要件**:
- changelog と blog で別々の GitHub Discussion に投稿
- 将来的に Zenn, Qiita 等の他ソースも追加予定

---

## 設計方針

### カテゴリ概念の導入

`ProviderConfig` に `category` フィールドを追加し、プロバイダーをグループ化する。

```typescript
type ContentCategory = "changelog" | "blog";
```

### データ分離

- **ファイル保存**: カテゴリごとに別ファイル
  - `data/changelogs/daily/{date}.json` (既存)
  - `data/blogs/daily/{date}.json` (新規)
- **Discussion投稿**: カテゴリごとに別 Discussion
  - 📰 Tech Changelog - YYYY-MM-DD
  - 📖 Tech Blog - YYYY-MM-DD

---

## 変更対象ファイル

### 1. 型定義
- `scripts/domain/providers/types.ts` - `category` フィールド追加
- `scripts/domain/types.ts` - `BlogData` 型追加

### 2. プロバイダー
- `scripts/domain/providers/*-provider.ts` - 既存4つに `category: "changelog"` 追加
- `scripts/domain/providers/hatena-bookmark-provider.ts` - 新規作成
- `scripts/domain/providers/index.ts` - カテゴリ別ヘルパー追加

### 3. エントリポイント
- `scripts/fetch-changelogs.ts` - カテゴリ別データ取得に拡張
- `scripts/create-discussion.ts` - カテゴリ対応

### 4. Markdown生成
- `scripts/presentation/markdown/blog-generator.ts` - 新規作成

### 5. ワークフロー
- `.github/workflows/daily-changelog.yml` - blog処理を追加

---

## 実装手順

### フェーズ1: 基盤整備

1. `scripts/domain/providers/types.ts` に `ContentCategory` 型と `category` フィールド追加
2. 既存4プロバイダーに `category: "changelog"` 追加
3. `scripts/domain/providers/index.ts` に `getProvidersByCategory()` ヘルパー追加
4. テスト実行で後方互換性確認

### フェーズ2: はてなブックマークプロバイダー

5. `scripts/domain/providers/hatena-bookmark-provider.ts` 作成
   - `rss-parser` を利用して RSS/RDF フィードを解析（`dc:date`, `dc:subject` 対応）
   - RSS URL: `http://b.hatena.ne.jp/hotentry/it.rss`
6. `scripts/domain/providers/index.ts` に登録
7. `scripts/domain/providers/hatena-bookmark-provider_test.ts` 作成

### フェーズ3: データ分離

8. `scripts/domain/types.ts` に `BlogData` 型追加
9. `scripts/fetch-changelogs.ts` をカテゴリ別に拡張
   - `--category=changelog|blog|all` オプション追加
   - 保存先を `data/changelogs/` と `data/blogs/` に分離
10. `scripts/presentation/markdown/blog-generator.ts` 作成

### フェーズ4: Discussion分離

11. `scripts/create-discussion.ts` にカテゴリ対応追加
    - `--category` オプション
    - タイトル/本文生成をカテゴリ別に
12. ワークフロー更新（2つのDiscussion投稿）

### フェーズ5: 検証

13. `deno task test` 全テスト通過確認
14. `deno task fetch` でデータ取得確認
15. `deno task preview` でMarkdown確認
16. プランファイルを `plans/2026-01-24-add-blog-category.md` にリネーム

---

## 検証方法

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# テスト実行
deno task test

# データ取得（全カテゴリ）
GITHUB_TOKEN=$(gh auth token) deno task fetch

# blog カテゴリのみ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch -- --category=blog

# プレビュー
deno task preview
deno task preview-blog  # 新規追加

# lint/format
deno lint && deno fmt
```

---

## 備考

- はてなブックマークのホットエントリは翌日にまとめて配信されるため、日次バッチに適している
- 将来的なソース追加時は `category: "blog"` のプロバイダーを追加するだけで対応可能
