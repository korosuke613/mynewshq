# Blog出力形式のカテゴリベース統合

## 概要

Blog出力をプロバイダー別（Hatena Bookmark / GitHub Blog）からカテゴリ別（AWS, GitHub, Terraform等）に変更し、両ソースの記事を混ぜて表示する。

## 設計決定事項

| 項目 | 決定 |
|------|------|
| 未分類記事 | 「その他」カテゴリに表示 |
| 並び順 | 日付順（新しい順） |
| 出力構造 | カテゴリ → 記事リスト |

## 変更対象ファイル

### 1. `scripts/domain/category-filter.ts`
- `applyCategoryFilter`に`keepUnmatched`オプションを追加
- マッチしないエントリも`matchedCategories: []`で返せるように

### 2. `scripts/fetch-changelogs.ts`
- GitHub Blogにもカテゴリフィルタリングが既に適用される（isBlogEntry型チェック済み）
- `keepUnmatched: true`でフィルタを呼び出すように変更

### 3. `scripts/presentation/markdown/blog-generator.ts`
- `generateDefaultBlogBody()`: プロバイダー別 → カテゴリ別に変更
- `generateBlogBodyWithSummaries()`: 両プロバイダーの記事を統合
- 新規: `groupEntriesByCategory()` ヘルパー関数

### 4. `scripts/domain/types.ts`
- `BlogSummaryData`: プロバイダー非依存のカテゴリ形式に変更

### 5. テストファイル
- `scripts/domain/category-filter_test.ts`: keepUnmatchedオプションのテスト追加
- `scripts/presentation/markdown/blog-generator_test.ts`: 新形式に更新

## 新しい出力形式

### Before（現在）
```markdown
## GitHub Blog
### [GitHub記事1](url)
...

## Hatena Bookmark
### [はてな記事1](url)
...
```

### After（変更後）
```markdown
## AWS (3件)

- [Lambda新機能が発表されました](url)
- [AWS障害報告の詳細](url)
- [S3のコスト最適化](url)

## GitHub (2件)

- [GitHub Actions 2024年のアップデート](url)
- [GitHub Copilotの新機能](url)

## その他 (1件)

- [一般的な技術記事](url)
```

※ 情報元（Hatena / GitHub Blog）の区別は出力しない

## 実装順序

### Step 1: category-filter.ts の更新
`applyCategoryFilter`に`keepUnmatched`オプションを追加し、マッチしないエントリも保持可能に。

### Step 2: fetch-changelogs.ts の更新
`keepUnmatched: true`でフィルタを呼び出すように変更。

### Step 3: blog-generator.ts の更新
- `groupEntriesByCategory()` ヘルパー関数を追加
- `generateDefaultBlogBody()` をカテゴリベースに書き換え
- 「その他」カテゴリを最後に表示

### Step 4: BlogSummaryData 型の更新
プロバイダー非依存のカテゴリ形式に変更。

### Step 5: テストの更新
新形式に合わせてテストケースを更新。

## 検証方法

```bash
# テスト実行
deno task test

# 型チェック
deno check scripts/**/*.ts

# lint
deno lint

# 実際のデータでプレビュー
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog
deno task preview-blog
```

## プランファイルのリネーム

実装完了後: `plans/2026-02-01-blog-category-based-output.md`
