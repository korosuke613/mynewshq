# GitHub Blog プロバイダー追加

## 概要

GitHub Blog（Changelog除く）のRSSフィードからデータを取得するプロバイダーを追加する。

- **データソース**: `https://github.blog/feed/`
- **カテゴリ**: `blog`（はてなブックマークと同じBlog Discussion）
- **週次対応**: あり
- **フィルタ**: なし（全カテゴリ取得）

## 設計決定事項

| 項目 | 決定 |
|------|------|
| Provider ID | `githubBlog` |
| 表示名 | `GitHub Blog` |
| 絵文字 | `📝` |
| ラベル名 | `github-blog` |
| 型 | `BlogEntry`（はてなブックマークと同じ） |
| パーサー | `rss-parser`（AWS/はてなと同様） |
| 週次アダプタ | `simple`（カテゴリ分類なし、リスト形式） |

## 変更対象ファイル

### Phase 1: 日次処理用プロバイダー

#### 1. `scripts/domain/providers/github-blog-provider.ts` (新規)
```typescript
// 新規作成：hatena-bookmark-provider.ts をテンプレートに
export const githubBlogProvider: ProviderConfig<BlogEntry> = {
  id: "githubBlog",
  displayName: "GitHub Blog",
  emoji: "📝",
  labelName: "github-blog",
  category: "blog",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchGitHubBlog,
};
```

#### 2. `scripts/domain/providers/index.ts`
- `githubBlogProvider` をimport
- `PROVIDER_CONFIGS` 配列に追加
- `toBlogData()` 関数を更新

#### 3. `scripts/domain/types.ts`
- `BlogData` 型に `githubBlog: BlogEntry[]` フィールドを追加

#### 4. `scripts/domain/providers/github-blog-provider_test.ts` (新規)
- パース処理のテストを追加

### Phase 2: 週次処理用アダプタ

#### 5. `scripts/domain/weekly/types.ts`
- `WEEKLY_PROVIDER_CONFIGS` に `githubBlog` を追加（simpleタイプ）

#### 6. `scripts/domain/weekly/adapters/simple-adapter.ts`
- `GitHubBlogAdapter` クラスを追加
- `getSimpleAdapter()` 関数に case を追加

#### 7. `scripts/domain/weekly/orchestrator.ts`
- `getProviderData()` メソッドに `githubBlog` case を追加
- `filterMutedEntries()` メソッドに必要に応じて追加

### Phase 3: Markdown生成

#### 8. `scripts/presentation/markdown/blog-generator.ts`
- `generateDefaultBlogBody()` に `githubBlog` セクション追加
- `generateBlogBodyWithSummaries()` は既存のカテゴリ形式で対応済み

### Phase 4: ワークフロー

#### 9. `.github/workflows/daily-changelog.yml`
- Blog処理のプロンプトに `githubBlog` を追加（必要に応じて）

#### 10. `.github/workflows/weekly-changelog.yml`
- `fetch-data` ジョブの outputs に `has_github_blog` を追加
- `summarize` ジョブの matrix に `github-blog` を追加
- `post-discussions` ジョブに要約ダウンロードステップを追加

## 実装順序

1. 型定義の変更 (`types.ts`)
2. プロバイダー作成 (`github-blog-provider.ts`)
3. プロバイダー登録 (`providers/index.ts`)
4. Markdown生成更新 (`blog-generator.ts`)
5. 週次アダプタ追加 (`simple-adapter.ts`, `types.ts`)
6. オーケストレーター更新 (`orchestrator.ts`)
7. ワークフロー更新
8. テスト追加・実行

## 検証方法

### 単体テスト
```bash
deno test scripts/domain/providers/github-blog-provider_test.ts
deno task test
```

### 日次データ取得
```bash
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog
```

### プレビュー
```bash
deno task preview-blog
```

### 全テスト
```bash
deno task test
deno check scripts/*.ts scripts/**/*.ts
deno lint
```

## プランファイルのリネーム

実装完了後: `plans/2026-02-01-add-github-blog-provider.md`
