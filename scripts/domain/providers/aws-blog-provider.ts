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
 * AWS Blog の記事を取得
 */
async function fetchAwsBlog(
  targetDate: Date,
  days: number = 1,
): Promise<BlogEntry[]> {
  const feed = await parser.parseURL(
    "https://aws.amazon.com/blogs/aws/feed/",
  );
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
