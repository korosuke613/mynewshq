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
 * @throws JSON.parse エラー、またはトップレベルがオブジェクトでない場合
 */
export function parseBlogSummariesJson(
  summariesJson: string,
): BlogSummaryData {
  const parsedSummaries = JSON.parse(summariesJson);

  if (!parsedSummaries || typeof parsedSummaries !== "object") {
    throw new TypeError(
      "Blog要約JSONのトップレベルはオブジェクトである必要があります",
    );
  }

  // BlogSummaryData形式（トップレベルにcategoriesがある）で渡された場合はそのまま使用
  if (Array.isArray(parsedSummaries.categories)) {
    return {
      categories: parsedSummaries.categories as BlogCategoryGroup[],
    };
  }

  // Claude Code Action形式の場合は、トップレベルの全キーを走査してcategories配列を集約
  const allCategories: BlogCategoryGroup[] = [];

  for (
    const value of Object.values(
      parsedSummaries as Record<string, unknown>,
    )
  ) {
    const provider = value as Record<string, unknown> | null | undefined;
    if (provider && Array.isArray(provider.categories)) {
      allCategories.push(...(provider.categories as BlogCategoryGroup[]));
    }
  }

  return { categories: allCategories };
}
