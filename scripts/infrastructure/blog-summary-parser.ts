// Blog要約JSONパーサー
// Claude Code ActionやローカルCLIが出力する要約JSONを
// BlogSummaryData形式に変換する共通ユーティリティ

import type { BlogCategoryGroup, BlogSummaryData } from "../domain/types.ts";

/**
 * Blog要約JSONをパースしてBlogSummaryData形式に変換
 *
 * 2つの入力形式をサポート:
 * 1. BlogSummaryData形式: { "categories": [...] }
 * 2. Claude Code Action形式: { "hatenaBookmark": { "categories": [...] }, "hackerNews": { "categories": [...] }, ... }
 *
 * @param summariesJson - JSON文字列
 * @returns BlogSummaryData形式のオブジェクト
 * @throws JSON.parse エラー
 */
export function parseBlogSummariesJson(
  summariesJson: string,
): BlogSummaryData {
  const parsedSummaries = JSON.parse(summariesJson);

  // BlogSummaryData形式（トップレベルにcategoriesがある）で渡された場合はそのまま使用
  if (Array.isArray(parsedSummaries.categories)) {
    return {
      categories: parsedSummaries.categories as BlogCategoryGroup[],
    };
  }

  // Claude Code Action形式の場合は、全プロバイダーのcategoriesを統合してBlogSummaryData形式に変換
  const allCategories: BlogCategoryGroup[] = [];

  if (parsedSummaries.hatenaBookmark?.categories) {
    allCategories.push(...parsedSummaries.hatenaBookmark.categories);
  }
  if (parsedSummaries.githubBlog?.categories) {
    allCategories.push(...parsedSummaries.githubBlog.categories);
  }
  if (parsedSummaries.awsBlog?.categories) {
    allCategories.push(...parsedSummaries.awsBlog.categories);
  }
  if (parsedSummaries.hackerNews?.categories) {
    allCategories.push(...parsedSummaries.hackerNews.categories);
  }

  return { categories: allCategories };
}
