// 日次Markdown生成
import type { ChangelogData, SummaryData } from "../../domain/types.ts";
import { getProviderDisplayName } from "../../domain/providers/index.ts";
import { formatLabelsString } from "./helpers.ts";
import { generateMutedSection } from "./muted-section.ts";
import { normalizeTrailingSlash } from "../../domain/url-normalizer.ts";
import {
  formatCoveragePeriod,
  formatWeeklyCoveragePeriod,
} from "../../infrastructure/date-utils.ts";

// 柔軟なURLマッチングで要約を検索
// 完全一致 → 正規化URL → 末尾スラッシュ追加の順で検索
function findSummary(
  summaryMap: Record<string, string> | undefined,
  url: string,
): string | undefined {
  if (!summaryMap) return undefined;

  // 完全一致
  if (summaryMap[url]) {
    return summaryMap[url];
  }

  // 正規化URL（末尾スラッシュを削除）
  const normalizedUrl = normalizeTrailingSlash(url);
  if (summaryMap[normalizedUrl]) {
    return summaryMap[normalizedUrl];
  }

  // 末尾スラッシュを追加したURLでも検索する。
  // normalizeTrailingSlash は URL の末尾スラッシュを削除して正規化するが、
  // 既存の summaryMap には「/」あり・なしのキーが混在している可能性がある。
  // そのため、互換性維持のためのフォールバックとして「正規化済みURL + '/'」も確認する。
  const urlWithSlash = normalizedUrl + "/";
  if (summaryMap[urlWithSlash]) {
    return summaryMap[urlWithSlash];
  }

  return undefined;
}

// 後方互換性のため再エクスポート
export {
  formatCoveragePeriod as formatCoveragePeriod,
  formatWeeklyCoveragePeriod as formatWeeklyCoveragePeriod,
} from "../../infrastructure/date-utils.ts";

// Discussionタイトルを生成
export function generateTitle(data: ChangelogData): string {
  const isWeekly = !!(data.startDate && data.endDate);
  if (isWeekly) {
    return `📰 Tech Changelog - Weekly (${data.startDate} ~ ${data.endDate})`;
  }
  return `📰 Tech Changelog - ${data.date}`;
}

// デフォルトのボディ生成（要約がない場合）
export function generateDefaultBody(data: ChangelogData): string {
  const isWeekly = !!(data.startDate && data.endDate);
  let body: string;

  if (isWeekly) {
    body = `# 📰 Tech Changelog - Weekly\n\n`;
    body += formatWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📰 Tech Changelog - ${data.date}\n\n`;
    body += formatCoveragePeriod(data.date) + "\n\n";
  }

  if (data.github && data.github.length > 0) {
    const activeEntries = data.github.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("github")}\n`;
      for (const item of activeEntries) {
        const labelsString = formatLabelsString(item.labels);
        body += `### [${item.title}](${item.url})\n`;
        if (labelsString) {
          body += `${labelsString}\n`;
        }
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.github);
    if (activeEntries.length > 0 || data.github.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.aws && data.aws.length > 0) {
    const activeEntries = data.aws.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("aws")}\n`;
      for (const item of activeEntries) {
        const labelsString = formatLabelsString(item.labels);
        body += `### [${item.title}](${item.url})\n`;
        if (labelsString) {
          body += `${labelsString}\n`;
        }
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.aws);
    if (activeEntries.length > 0 || data.aws.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.claudeCode && data.claudeCode.length > 0) {
    const activeEntries = data.claudeCode.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("claudeCode")}\n`;
      for (const item of activeEntries) {
        body += `### [${item.version}](${item.url})\n`;
        body += `*Published: ${item.publishedAt}*\n\n`;
      }
    }
    body += generateMutedSection(data.claudeCode);
    if (activeEntries.length > 0 || data.claudeCode.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.linear && data.linear.length > 0) {
    const activeEntries = data.linear.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("linear")}\n`;
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n`;
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.linear);
    if (activeEntries.length > 0 || data.linear.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  return body;
}

// 要約データ付きのボディ生成
export function generateBodyWithSummaries(
  data: ChangelogData,
  summaries: SummaryData,
): string {
  const isWeekly = !!(data.startDate && data.endDate);
  let body: string;

  if (isWeekly) {
    body = `# 📰 Tech Changelog - Weekly\n\n`;
    body += formatWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📰 Tech Changelog - ${data.date}\n\n`;
    body += formatCoveragePeriod(data.date) + "\n\n";
  }

  if (data.github && data.github.length > 0) {
    const activeEntries = data.github.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("github")}\n\n`;
      for (const item of activeEntries) {
        const labelsString = formatLabelsString(item.labels);
        body += `### [${item.title}](${item.url})\n`;
        if (labelsString) {
          body += `${labelsString}\n`;
        }
        body += "\n";
        const summary = findSummary(summaries.github, item.url);
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.github);
    if (activeEntries.length > 0 || data.github.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.aws && data.aws.length > 0) {
    const activeEntries = data.aws.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("aws")}\n\n`;
      for (const item of activeEntries) {
        const labelsString = formatLabelsString(item.labels);
        body += `### [${item.title}](${item.url})\n`;
        if (labelsString) {
          body += `${labelsString}\n`;
        }
        body += "\n";
        const summary = findSummary(summaries.aws, item.url);
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.aws);
    if (activeEntries.length > 0 || data.aws.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.claudeCode && data.claudeCode.length > 0) {
    const activeEntries = data.claudeCode.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("claudeCode")}\n\n`;
      for (const item of activeEntries) {
        body += `### [${item.version}](${item.url})\n\n`;
        const summary = findSummary(summaries.claudeCode, item.url);
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.claudeCode);
    if (activeEntries.length > 0 || data.claudeCode.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.linear && data.linear.length > 0) {
    const activeEntries = data.linear.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += `## ${getProviderDisplayName("linear")}\n\n`;
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n\n`;
        const summary = findSummary(summaries.linear, item.url);
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.linear);
    if (activeEntries.length > 0 || data.linear.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  return body;
}
