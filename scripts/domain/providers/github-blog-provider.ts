// GitHub Blog Provider
// GitHub Blog の RSS フィードから記事を取得

import Parser from "rss-parser";
import type { BlogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

// rss-parser にカスタムフィールドを定義
type GitHubBlogFeed = {
  items: GitHubBlogItem[];
};

type GitHubBlogItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  categories?: string[];
};

const parser: Parser<GitHubBlogFeed, GitHubBlogItem> = new Parser({
  customFields: {
    item: [
      ["category", "categories", { keepArray: true }],
    ],
  },
});

/**
 * GitHub Blog の記事を取得
 */
async function fetchGitHubBlog(
  targetDate: Date,
  days: number = 1,
): Promise<BlogEntry[]> {
  const feed = await parser.parseURL(
    "https://github.blog/feed/",
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
 * GitHub Blog Provider設定
 */
export const githubBlogProvider: ProviderConfig<BlogEntry> = {
  id: "githubBlog",
  displayName: "GitHub Blog",
  emoji: "📝",
  labelName: "github-blog",
  category: "blog",
  titleField: "title",
  pubDateField: "pubDate",
  fetch: fetchGitHubBlog,
};
