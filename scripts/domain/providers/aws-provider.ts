// AWS What's New Provider
// 設定とデータ取得ロジックを統合

import Parser from "rss-parser";
import type { ChangelogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";
import { extractLabelsFromAWSCategory } from "../label-extractor.ts";
import { normalizeUrl } from "../url-normalizer.ts";

const parser = new Parser();

/**
 * AWS What's Newを取得
 */
async function fetchAWSChangelog(
  targetDate: Date,
  days: number = 1,
): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL(
    "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
  );
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isWithinDays(item.pubDate, days, targetDate)) {
      const labels = extractLabelsFromAWSCategory(item.categories);

      entries.push({
        title: item.title || "",
        url: normalizeUrl(item.link || ""),
        content: item.contentSnippet || item.content || "",
        pubDate: item.pubDate,
        labels: Object.keys(labels).length > 0 ? labels : undefined,
      });
    }
  }

  return entries;
}

/**
 * AWS Provider設定
 */
export const awsProvider: ProviderConfig<ChangelogEntry> = {
  id: "aws",
  displayName: "AWS What's New",
  emoji: "\u2601\uFE0F",
  labelName: "aws",
  category: "changelog",
  labelPrefix: "aws:",
  transformLabel: (label: string) => label.replace(/^(amazon-|aws-)/, ""),
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchAWSChangelog,
};
