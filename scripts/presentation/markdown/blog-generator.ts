// Blog用 Markdown生成
import type { BlogData, BlogSummaryData } from "../../domain/types.ts";
import { getProviderDisplayName } from "../../domain/providers/index.ts";
import { generateMutedSection } from "./muted-section.ts";

// 対象期間の文字列を生成（UTC 3:00 基準の24時間ウィンドウ）
export function generateCoveragePeriod(dateStr: string): string {
  const endDate = new Date(dateStr + "T03:00:00Z");
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  const formatDateTime = (date: Date): string => {
    return date.toISOString().replace("T", " ").replace(":00.000Z", " UTC");
  };

  return `📅 **対象期間**: ${formatDateTime(startDate)} ~ ${
    formatDateTime(endDate)
  }`;
}

// 週次用の対象期間の文字列を生成
export function generateWeeklyCoveragePeriod(
  startDateStr: string,
  endDateStr: string,
): string {
  return `📅 **対象期間**: ${startDateStr} ~ ${endDateStr} (1週間)`;
}

// タグをフォーマット
function formatTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((tag) => `\`${tag}\``).join(" ");
}

// ブックマーク数をフォーマット
function formatBookmarkCount(count: number | undefined): string {
  if (count === undefined) return "";
  return `🔖 ${count} users`;
}

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
    body += generateWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📖 Tech Blog - ${data.date}\n\n`;
    body += generateCoveragePeriod(data.date) + "\n\n";
  }

  if (data.hatenaBookmark && data.hatenaBookmark.length > 0) {
    const activeEntries = data.hatenaBookmark.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("hatenaBookmark")}\n\n`;
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n`;
        const tagsStr = formatTags(item.tags);
        const bookmarkStr = formatBookmarkCount(item.bookmarkCount);
        if (tagsStr || bookmarkStr) {
          body += [tagsStr, bookmarkStr].filter(Boolean).join(" | ") + "\n";
        }
        if (item.description) {
          body += `\n${item.description}\n`;
        }
        body += "\n";
      }
    }
    body += generateMutedSection(data.hatenaBookmark);
    if (
      activeEntries.length > 0 || data.hatenaBookmark.some((e) => e.muted)
    ) {
      body += "---\n\n";
    }
  }

  return body;
}

// 要約データ付きのボディ生成（トピック選定形式）
export function generateBlogBodyWithSummaries(
  data: BlogData,
  summaries: BlogSummaryData,
): string {
  const isWeekly = !!(data.startDate && data.endDate);
  let body: string;

  if (isWeekly) {
    body = `# 📖 Tech Blog - Weekly\n\n`;
    body += generateWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📖 Tech Blog - ${data.date}\n\n`;
    body += generateCoveragePeriod(data.date) + "\n\n";
  }

  if (data.hatenaBookmark && data.hatenaBookmark.length > 0) {
    const hatenaData = summaries.hatenaBookmark;

    // 選定されたトピックがある場合
    if (hatenaData?.selectedTopics && hatenaData.selectedTopics.length > 0) {
      body += `## ${getProviderDisplayName("hatenaBookmark")}\n\n`;
      body +=
        `本日のはてなブックマークから、開発者向けの注目記事をピックアップしました。\n\n`;

      body += `### 注目トピック\n\n`;
      for (const topic of hatenaData.selectedTopics) {
        body += `- [${topic.title}](${topic.url}) - ${topic.reason}\n`;
      }
      body += "\n";

      // 全体の解説
      if (hatenaData.overview) {
        body += `### 解説\n\n`;
        body += `${hatenaData.overview}\n\n`;
      }
    }

    body += generateMutedSection(data.hatenaBookmark);
    if (
      hatenaData?.selectedTopics?.length > 0 ||
      data.hatenaBookmark.some((e) => e.muted)
    ) {
      body += "---\n\n";
    }
  }

  return body;
}
