// AWS Blog Provider
// AWS Blog の RSS フィードから記事を取得

import Parser from "rss-parser";
import type { BlogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

// rss-parser にカスタムフィールドを定義
type AwsBlogFeed = {
  items: AwsBlogItem[];
};

type AwsBlogItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  categories?: string[];
};

const parser: Parser<AwsBlogFeed, AwsBlogItem> = new Parser({
  customFields: {
    item: [
      ["category", "categories", { keepArray: true }],
    ],
  },
});

/**
 * 取得対象のAWSブログフィード一覧
 */
export const AWS_BLOG_FEEDS = [
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
    // isoDate または pubDate を使用
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
    AWS_BLOG_FEEDS.map((url) => fetchSingleFeed(url, targetDate, days)),
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

/**
 * AWS Blog Provider設定
 */
export const awsBlogProvider: ProviderConfig<BlogEntry> = {
  id: "awsBlog",
  displayName: "AWS Blog",
  emoji: "📙",
  labelName: "aws-blog",
  category: "blog",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchAwsBlog,
};
