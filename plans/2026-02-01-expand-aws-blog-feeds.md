# AWS Blog プロバイダー フィード拡張計画

## 背景

現在の `aws-blog-provider.ts` は `https://aws.amazon.com/blogs/aws/feed/`（AWS News Blog）のみを取得しているため、週に数件程度しか記事が取得されない。

AWS には多数のブログカテゴリがあり、https://aws.amazon.com/blogs/ を網羅するには複数のフィードを取得する必要がある。

## 対応方針

**選択肢 A: 主要フィード統合** を採用

9つの主要AWSブログフィードを1つのプロバイダーで並列取得する。

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `scripts/domain/providers/aws-blog-provider.ts` | 修正 |
| `scripts/domain/providers/aws-blog-provider_test.ts` | 修正 |

## 実装詳細

### aws-blog-provider.ts

```typescript
// 取得対象のAWSブログフィード一覧
const AWS_BLOG_FEEDS = [
  "https://aws.amazon.com/blogs/aws/feed/",
  "https://aws.amazon.com/blogs/compute/feed/",
  "https://aws.amazon.com/blogs/security/feed/",
  "https://aws.amazon.com/blogs/machine-learning/feed/",
  "https://aws.amazon.com/blogs/database/feed/",
  "https://aws.amazon.com/blogs/devops/feed/",
  "https://aws.amazon.com/blogs/architecture/feed/",
  "https://aws.amazon.com/blogs/containers/feed/",
  "https://aws.amazon.com/blogs/networking-and-content-delivery/feed/",
];

/**
 * 単一フィードから記事を取得
 */
async function fetchSingleFeed(
  feedUrl: string,
  targetDate: Date,
  days: number,
): Promise<BlogEntry[]> {
  const feed = await parser.parseURL(feedUrl);
  const entries: BlogEntry[] = [];

  for (const item of feed.items) {
    const pubDate = item.isoDate || item.pubDate;

    if (pubDate && isWithinDays(pubDate, days, targetDate)) {
      entries.push({
        title: item.title || "",
        url: item.link || "",
        description: item.contentSnippet || "",
        pubDate: pubDate,
        tags: item.categories && item.categories.length > 0
          ? item.categories
          : undefined,
      });
    }
  }

  return entries;
}

/**
 * AWS Blog の記事を取得（複数フィードから並列取得）
 */
async function fetchAwsBlog(
  targetDate: Date,
  days: number = 1,
): Promise<BlogEntry[]> {
  // 全フィードを並列取得
  const results = await Promise.all(
    AWS_BLOG_FEEDS.map((url) => fetchSingleFeed(url, targetDate, days))
  );

  // 結合
  const allEntries = results.flat();

  // 重複除去（URLベース）
  const seen = new Set<string>();
  const uniqueEntries: BlogEntry[] = [];
  for (const entry of allEntries) {
    if (!seen.has(entry.url)) {
      seen.add(entry.url);
      uniqueEntries.push(entry);
    }
  }

  return uniqueEntries;
}
```

### aws-blog-provider_test.ts

- `AWS_BLOG_FEEDS` の件数テストを追加
- export して定数をテスト可能にする

## 動作確認

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# リント・フォーマット
deno lint && deno fmt

# テスト実行
deno task test

# Blog データ取得テスト（実際のネットワークアクセス）
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog

# プレビュー確認
deno task preview-blog
```

## TODO

- [ ] プランファイルを `./plans/2026-02-01-expand-aws-blog-feeds.md` にリネーム
