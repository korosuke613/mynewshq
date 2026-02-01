// Blog用 Markdown生成
import type {
  BlogData,
  BlogEntry,
  BlogSummaryData,
} from "../../domain/types.ts";
import { generateMutedSection } from "./muted-section.ts";
import {
  formatCoveragePeriod,
  formatWeeklyCoveragePeriod,
} from "../../infrastructure/date-utils.ts";

// エントリをカテゴリごとにグループ化
function groupEntriesByCategory(
  entries: BlogEntry[],
): Map<string, BlogEntry[]> {
  const grouped = new Map<string, BlogEntry[]>();

  for (const entry of entries) {
    // マッチしたカテゴリが存在する場合は各カテゴリに追加
    if (entry.matchedCategories && entry.matchedCategories.length > 0) {
      for (const category of entry.matchedCategories) {
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(entry);
      }
    } else {
      // マッチしたカテゴリがない場合は「その他」に追加
      if (!grouped.has("その他")) {
        grouped.set("その他", []);
      }
      grouped.get("その他")!.push(entry);
    }
  }

  return grouped;
}

// 後方互換性のため再エクスポート
export {
  formatCoveragePeriod as formatCoveragePeriod,
  formatWeeklyCoveragePeriod as formatWeeklyCoveragePeriod,
} from "../../infrastructure/date-utils.ts";

// Discussionタイトルを生成
export function generateBlogTitle(data: BlogData): string {
  const isWeekly = !!(data.startDate && data.endDate);
  if (isWeekly) {
    return `📖 Tech Blog - Weekly (${data.startDate} ~ ${data.endDate})`;
  }
  return `📖 Tech Blog - ${data.date}`;
}

// デフォルトのボディ生成（要約がない場合）
export function generateDefaultBlogBody(data: BlogData): string {
  const isWeekly = !!(data.startDate && data.endDate);
  let body: string;

  if (isWeekly) {
    body = `# 📖 Tech Blog - Weekly\n\n`;
    body += formatWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📖 Tech Blog - ${data.date}\n\n`;
    body += formatCoveragePeriod(data.date) + "\n\n";
  }

  // 両プロバイダーのアクティブエントリを統合
  const allActiveEntries: BlogEntry[] = [];
  if (data.hatenaBookmark) {
    allActiveEntries.push(...data.hatenaBookmark.filter((e) => !e.muted));
  }
  if (data.githubBlog) {
    allActiveEntries.push(...data.githubBlog.filter((e) => !e.muted));
  }
  if (data.awsBlog) {
    allActiveEntries.push(...data.awsBlog.filter((e) => !e.muted));
  }

  // カテゴリごとにグループ化
  const groupedByCategory = groupEntriesByCategory(allActiveEntries);

  // カテゴリをソート（「その他」を最後に）
  const sortedCategories = Array.from(groupedByCategory.keys()).sort((a, b) => {
    if (a === "その他") return 1;
    if (b === "その他") return -1;
    return a.localeCompare(b, "ja");
  });

  // カテゴリごとに出力
  for (const category of sortedCategories) {
    const entries = groupedByCategory.get(category)!;
    // 日付順でソート（新しい順）
    const sortedEntries = entries.sort((a, b) =>
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    body += `## ${category} (${sortedEntries.length}件)\n\n`;

    for (const item of sortedEntries) {
      body += `- [${item.title}](${item.url})\n`;
    }
    body += "\n";
  }

  // ミュートセクションを生成（両プロバイダーをまとめて）
  const allMutedEntries: BlogEntry[] = [];
  if (data.hatenaBookmark) {
    allMutedEntries.push(...data.hatenaBookmark.filter((e) => e.muted));
  }
  if (data.githubBlog) {
    allMutedEntries.push(...data.githubBlog.filter((e) => e.muted));
  }
  if (data.awsBlog) {
    allMutedEntries.push(...data.awsBlog.filter((e) => e.muted));
  }

  if (allMutedEntries.length > 0) {
    body += generateMutedSection(allMutedEntries);
  }

  return body;
}

// 要約データ付きのボディ生成（カテゴリごとグループ化形式）
export function generateBlogBodyWithSummaries(
  data: BlogData,
  summaries: BlogSummaryData,
): string {
  const isWeekly = !!(data.startDate && data.endDate);
  let body: string;

  if (isWeekly) {
    body = `# 📖 Tech Blog - Weekly\n\n`;
    body += formatWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📖 Tech Blog - ${data.date}\n\n`;
    body += formatCoveragePeriod(data.date) + "\n\n";
  }

  // カテゴリごとにグループ化された記事がある場合
  if (summaries.categories && summaries.categories.length > 0) {
    body +=
      `本日の技術ブログから、開発者向けの注目記事をカテゴリごとにまとめました。\n\n`;

    // 各カテゴリのセクションを生成
    for (const categoryGroup of summaries.categories) {
      const entryCount = categoryGroup.entries.length;
      body += `## ${categoryGroup.category} (${entryCount}件)\n\n`;

      // カテゴリ内の記事一覧
      for (const entry of categoryGroup.entries) {
        body += `- [${entry.title}](${entry.url}) - ${entry.comment}\n`;
      }
      body += "\n";

      // カテゴリ全体のまとめコメント
      body +=
        `**今日の${categoryGroup.category}**: ${categoryGroup.categoryComment}\n\n`;
      body += "---\n\n";
    }
  }

  // ミュートセクションを生成（両プロバイダーをまとめて）
  const allMutedEntries: BlogEntry[] = [];
  if (data.hatenaBookmark) {
    allMutedEntries.push(...data.hatenaBookmark.filter((e) => e.muted));
  }
  if (data.githubBlog) {
    allMutedEntries.push(...data.githubBlog.filter((e) => e.muted));
  }
  if (data.awsBlog) {
    allMutedEntries.push(...data.awsBlog.filter((e) => e.muted));
  }

  if (allMutedEntries.length > 0) {
    body += generateMutedSection(allMutedEntries);
  }

  return body;
}
