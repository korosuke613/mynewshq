// Hacker News Provider
// hnrss.org の RSS フィードからフロントページ記事を取得

import Parser from "rss-parser";
import type { BlogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

// rss-parser にカスタムフィールドを定義
type HackerNewsFeed = {
  items: HackerNewsItem[];
};

type HackerNewsItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  comments?: string;
};

const parser: Parser<HackerNewsFeed, HackerNewsItem> = new Parser({
  customFields: {
    item: [
      ["comments", "comments"],
    ],
  },
});

/**
 * contentSnippet から Points を抽出
 * hnrss.org のフィードは contentSnippet に "Points: 数値" を含む
 */
export function extractPoints(
  contentSnippet: string | undefined,
): number | undefined {
  if (!contentSnippet) return undefined;
  const match = contentSnippet.match(/Points:\s*(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Hacker News のフロントページ記事を取得
 */
async function fetchHackerNews(
  targetDate: Date,
  days: number = 1,
): Promise<BlogEntry[]> {
  const feed = await parser.parseURL(
    "https://hnrss.org/frontpage?count=100",
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
        bookmarkCount: extractPoints(item.contentSnippet),
      });
    }
  }

  return entries;
}

/**
 * Hacker News Provider設定
 */
export const hackerNewsProvider: ProviderConfig<BlogEntry> = {
  id: "hackerNews",
  displayName: "Hacker News",
  emoji: "🔶",
  labelName: "hacker-news",
  category: "blog",
  fixedCategory: "HackerNews",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchHackerNews,
};
