# AWS Blog プロバイダー追加計画

## 概要

AWS Blog（`https://aws.amazon.com/blogs/aws/feed/`）を Blog カテゴリのプロバイダーとして追加する。

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `scripts/domain/providers/aws-blog-provider.ts` | 新規作成 |
| `scripts/domain/types.ts` | 修正 |
| `scripts/domain/providers/index.ts` | 修正 |
| `scripts/presentation/markdown/blog-generator.ts` | 修正 |
| `scripts/domain/providers/aws-blog-provider_test.ts` | 新規作成 |
| `scripts/domain/providers/providers_test.ts` | 修正 |

## 実装手順

### Step 1: BlogData 型に awsBlog フィールド追加

**ファイル**: `scripts/domain/types.ts`

```typescript
export interface BlogData {
  date: string;
  startDate?: string;
  endDate?: string;
  hatenaBookmark: BlogEntry[];
  githubBlog: BlogEntry[];
  awsBlog: BlogEntry[];  // 追加
}
```

### Step 2: aws-blog-provider.ts 新規作成

**ファイル**: `scripts/domain/providers/aws-blog-provider.ts`

- `github-blog-provider.ts` をベースにして作成
- RSS URL: `https://aws.amazon.com/blogs/aws/feed/`
- RSS の `category` タグを `tags` フィールドに格納
- プロバイダー設定:
  - `id`: `"awsBlog"`
  - `displayName`: `"AWS Blog"`
  - `emoji`: `"📙"`（AWS のオレンジカラーに合わせた本の絵文字）
  - `labelName`: `"aws-blog"`
  - `category`: `"blog"`

### Step 3: providers/index.ts への登録

**ファイル**: `scripts/domain/providers/index.ts`

1. `awsBlogProvider` をインポート
2. `PROVIDER_CONFIGS` 配列に追加
3. `toBlogData()` 関数に `awsBlog` フィールドを追加

### Step 4: blog-generator.ts の更新

**ファイル**: `scripts/presentation/markdown/blog-generator.ts`

`generateDefaultBlogBody` と `generateBlogBodyWithSummaries` 関数内で `awsBlog` も統合対象に追加:

```typescript
// アクティブエントリ統合部分
if (data.awsBlog) {
  allActiveEntries.push(...data.awsBlog.filter((e) => !e.muted));
}

// ミュートエントリ統合部分
if (data.awsBlog) {
  allMutedEntries.push(...data.awsBlog.filter((e) => e.muted));
}
```

### Step 5: テストファイル作成・更新

**新規**: `scripts/domain/providers/aws-blog-provider_test.ts`
- プロバイダー設定値のテスト

**更新**: `scripts/domain/providers/providers_test.ts`
- `PROVIDER_CONFIGS` のプロバイダー数を `6` → `7` に更新
- ID リストに `awsBlog` を追加
- `PROVIDER_REGISTRY` サイズを `6` → `7` に更新
- blog カテゴリのプロバイダー数を `2` → `3` に更新
- `awsBlogProvider` の設定テストを追加

## 動作確認

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# リント・フォーマット
deno lint && deno fmt

# テスト実行
deno task test

# Blog データ取得テスト
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog

# プレビュー確認
deno task preview-blog
```

## 備考

- 週次処理: 現在の仕様では Blog は週次処理対象外のため、週次関連のコード変更は不要
- カテゴリフィルター: 既存の `applyCategoryFilter` が `tags` フィールドを見るため追加変更不要
- ミュートフィルター: 既存の `applyMuteFilter` が title/description をチェックするため追加変更不要

## TODO

- [ ] プランファイルを `./plans/2026-02-01-add-aws-blog-provider.md` にリネーム
