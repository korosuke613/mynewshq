// Hacker News Provider
// hnrss.org の RSS フィードからフロントページ記事を取得

import Parser from "rss-parser";
import type { BlogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

/** 1回のfetchで返す最大記事数（Points上位のみ残す） */
const MAX_ENTRIES_PER_FETCH = 5;

/** descriptionの最大文字数（Show HN等の全文投稿を抑制） */
const MAX_DESCRIPTION_LENGTH = 300;

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
 * descriptionを最大文字数で切り詰める
 */
export function truncateDescription(description: string): string {
  if (description.length <= MAX_DESCRIPTION_LENGTH) {
    return description;
  }
  return description.substring(0, MAX_DESCRIPTION_LENGTH) + "...";
}

/**
 * Hacker News のフロントページ記事を取得
 * Points降順でソートし、上位N件のみ返す
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

    // title/urlが欠けているアイテムはスキップ（Markdownで壊れたリンクを防止）
    if (!item.title || !item.link) {
      continue;
    }

    if (pubDate && isWithinDays(pubDate, days, targetDate)) {
      entries.push({
        title: item.title,
        url: item.link,
        description: truncateDescription(item.contentSnippet || ""),
        pubDate: pubDate,
        bookmarkCount: extractPoints(item.contentSnippet),
      });
    }
  }

  // Points降順でソート（undefinedは最後に配置）
  entries.sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0));

  // 上位N件のみ返す
  return entries.slice(0, MAX_ENTRIES_PER_FETCH);
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
