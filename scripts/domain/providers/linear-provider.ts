// Linear Changelog Provider
// 設定とデータ取得ロジックを統合

import Parser from "rss-parser";
import type { ChangelogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

const parser = new Parser();

/**
 * Linear Changelogを取得
 */
async function fetchLinearChangelog(
  targetDate: Date,
  days: number = 1,
): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL("https://linear.app/rss/changelog.xml");
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isWithinDays(item.pubDate, days, targetDate)) {
      entries.push({
        title: item.title || "",
        url: item.link || "",
        content: item.contentSnippet || item.content || "",
        pubDate: item.pubDate,
      });
    }
  }

  return entries;
}

/**
 * Linear Provider設定
 */
export const linearProvider: ProviderConfig<ChangelogEntry> = {
  id: "linear",
  displayName: "Linear Changelog",
  emoji: "\u{1F4D0}",
  labelName: "linear",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchLinearChangelog,
};
