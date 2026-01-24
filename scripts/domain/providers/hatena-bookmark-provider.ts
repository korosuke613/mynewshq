// はてなブックマーク Provider
// テクノロジーカテゴリのホットエントリを取得

import Parser from "rss-parser";
import type { BlogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

// rss-parser にカスタムフィールドを定義
type HatenaFeed = {
  items: HatenaItem[];
};

type HatenaItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  "dc:date"?: string;
  "dc:subject"?: string | string[];
  "hatena:bookmarkcount"?: string;
};

const parser: Parser<HatenaFeed, HatenaItem> = new Parser({
  customFields: {
    item: [
      ["dc:date", "dc:date"],
      ["dc:subject", "dc:subject"],
      ["hatena:bookmarkcount", "hatena:bookmarkcount"],
    ],
  },
});

/**
 * dc:subject を配列に正規化
 */
function normalizeSubjects(
  subject: string | string[] | undefined,
): string[] {
  if (!subject) return [];
  if (Array.isArray(subject)) return subject;
  return [subject];
}

/**
 * はてなブックマークのホットエントリを取得
 */
async function fetchHatenaBookmarks(
  targetDate: Date,
  days: number = 1,
): Promise<BlogEntry[]> {
  const feed = await parser.parseURL(
    "http://b.hatena.ne.jp/hotentry/it.rss",
  );
  const entries: BlogEntry[] = [];

  for (const item of feed.items) {
    // dc:date または isoDate を使用
    const pubDate = item["dc:date"] || item.isoDate;

    if (pubDate && isWithinDays(pubDate, days, targetDate)) {
      const tags = normalizeSubjects(item["dc:subject"]);
      const bookmarkCount = item["hatena:bookmarkcount"]
        ? parseInt(item["hatena:bookmarkcount"], 10)
        : undefined;

      entries.push({
        title: item.title || "",
        url: item.link || "",
        description: item.contentSnippet || "",
        pubDate: pubDate,
        bookmarkCount: bookmarkCount,
        tags: tags.length > 0 ? tags : undefined,
      });
    }
  }

  return entries;
}

/**
 * はてなブックマーク Provider設定
 */
export const hatenaBookmarkProvider: ProviderConfig<BlogEntry> = {
  id: "hatenaBookmark",
  displayName: "Hatena Bookmark",
  emoji: "\u{1F516}",
  labelName: "hatena-bookmark",
  category: "blog",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchHatenaBookmarks,
};
