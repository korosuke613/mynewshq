# Hacker News Blogプロバイダー追加

## Context

技術系Blog収集の対象ソースにHacker Newsを追加する。現在Blogカテゴリには、はてなブックマーク・GitHub Blog・AWS Blogの3プロバイダーがあり、既存のProvider Patternに沿って4つ目のプロバイダーとしてHacker Newsを追加する。

データ取得は **hnrss.org** (`https://hnrss.org/frontpage?count=100`) を使用。既存の`rss-parser`パターンと一致し、ポイント数も取得可能。

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `scripts/domain/types.ts` | 変更 | `BlogData`に`hackerNews`フィールド追加 |
| `scripts/domain/providers/hacker-news-provider.ts` | **新規** | プロバイダー実装（fetch関数 + extractPoints） |
| `scripts/domain/providers/index.ts` | 変更 | PROVIDER_CONFIGS登録 + toBlogData更新 |
| `scripts/presentation/markdown/blog-generator.ts` | 変更 | allActiveEntries/allMutedEntriesにhackerNews追加 |
| `scripts/domain/providers/hacker-news-provider_test.ts` | **新規** | 設定値確認 + extractPointsテスト |
| `scripts/domain/providers/providers_test.ts` | 変更 | プロバイダー数・ID・カテゴリの更新 |
| `scripts/presentation/markdown/blog-generator_test.ts` | 変更 | BlogDataリテラルに`hackerNews: []`追加 |

## 実装手順

### 1. `scripts/domain/types.ts` - BlogDataにフィールド追加

```typescript
export interface BlogData {
  date: string;
  startDate?: string;
  endDate?: string;
  hatenaBookmark: BlogEntry[];
  githubBlog: BlogEntry[];
  awsBlog: BlogEntry[];
  hackerNews: BlogEntry[];  // 追加
}
```

HNのポイント数は既存の`BlogEntry.bookmarkCount`（オプショナル）にマッピングする。型変更は不要。

### 2. `scripts/domain/providers/hacker-news-provider.ts` - 新規作成

`github-blog-provider.ts`をテンプレートとして使用。

- RSS URL: `https://hnrss.org/frontpage?count=100`
- `rss-parser`でフィード解析、`isWithinDays()`で日付フィルタ
- `extractPoints()`: `contentSnippet`から`Points: 数値`を正規表現で抽出し`bookmarkCount`にマッピング
- Provider設定: `id: "hackerNews"`, `emoji: "🔶"`, `labelName: "hacker-news"`, `category: "blog"`
- `extractPoints`関数はテスト用にexportする

### 3. `scripts/domain/providers/index.ts` - 登録 + toBlogData更新

- import追加: `hackerNewsProvider`
- `PROVIDER_CONFIGS`配列の末尾（Blog プロバイダーセクション）に追加
- `toBlogData()`内の`base`オブジェクトに`hackerNews`フィールド追加

### 4. `scripts/presentation/markdown/blog-generator.ts` - エントリ統合

`generateDefaultBlogBody`と`generateBlogBodyWithSummaries`の両関数で:
- `allActiveEntries`に`data.hackerNews`のアクティブエントリを追加
- `allMutedEntries`に`data.hackerNews`のミュート済みエントリを追加

### 5. テスト更新

- **hacker-news-provider_test.ts（新規）**: 設定値確認 + extractPoints関数のユニットテスト
- **providers_test.ts**: プロバイダー数7→8、ID配列にhackerNews追加、REGISTRY.size更新、blogカテゴリ数3→4
- **blog-generator_test.ts**: 全BlogDataリテラル（約8箇所）に`hackerNews: []`追加

### 6. プランファイルをリネーム

`plans/mutable-churning-gizmo.md` → `plans/2026-02-07-add-hacker-news-provider.md`

## 変更不要なファイル

- `fetch-changelogs.ts`: `fetchByCategory("blog")`と`toBlogData`を使うため自動対応
- `deno.json`: `rss-parser`は既に依存関係に含まれる
- GitHub Actionsワークフロー: Blogカテゴリはプロバイダー非依存
- 週次オーケストレーター: BlogはChangelogパイプラインとは別系統

## 検証

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# テスト実行
deno task test

# 実際のデータ取得（Blogカテゴリ）
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog

# プレビュー確認
deno task preview-blog

# dev-standards チェック
# /dev-standards skill実行
```
