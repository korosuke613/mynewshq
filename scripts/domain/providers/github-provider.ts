// GitHub Changelog Provider
// 設定とデータ取得ロジックを統合

import { parse } from "xml/mod.ts";
import type { ChangelogEntry, RssFeed } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";
import { extractLabelsFromCategories } from "../label-extractor.ts";

/**
 * GitHub Changelogを取得
 */
async function fetchGitHubChangelog(
  targetDate: Date,
  days: number = 1,
): Promise<ChangelogEntry[]> {
  try {
    const response = await fetch("https://github.blog/changelog/feed/");
    if (!response.ok) {
      console.error(`Failed to fetch GitHub Changelog: ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const doc = parse(xmlText) as unknown as RssFeed;

    if (!doc?.rss?.channel?.item) {
      console.error("Failed to parse GitHub Changelog: Invalid XML structure");
      return [];
    }

    const entries: ChangelogEntry[] = [];
    const items = doc.rss.channel.item;

    for (const item of items) {
      const pubDate = item.pubDate;
      if (pubDate && isWithinDays(pubDate, days, targetDate)) {
        const labels = extractLabelsFromCategories(item.category);

        entries.push({
          title: item.title,
          url: item.link,
          content: item["content:encoded"] || item.description || "",
          pubDate: pubDate,
          labels: Object.keys(labels).length > 0 ? labels : undefined,
        });
      }
    }
    return entries;
  } catch (error) {
    console.error("Failed to process GitHub Changelog feed:", error);
    return [];
  }
}

/**
 * GitHub Provider設定
 */
export const githubProvider: ProviderConfig<ChangelogEntry> = {
  id: "github",
  displayName: "GitHub Changelog",
  emoji: "\u{1F419}",
  labelName: "github",
  labelPrefix: "gh:",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchGitHubChangelog,
};
