// 日次Markdown生成
import type { ChangelogData, SummaryData } from "../../domain/types.ts";
import { getProviderDisplayName } from "../../domain/providers/index.ts";
import { formatLabelsString } from "./helpers.ts";
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

// 週次用の対象期間の文字列を生成（日次生成でも使用されるためここに配置）
export function generateWeeklyCoveragePeriod(
  startDateStr: string,
  endDateStr: string,
): string {
  return `📅 **対象期間**: ${startDateStr} ~ ${endDateStr} (1週間)`;
}

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
    body += generateWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📰 Tech Changelog - ${data.date}\n\n`;
    body += generateCoveragePeriod(data.date) + "\n\n";
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
    body += generateWeeklyCoveragePeriod(data.startDate!, data.endDate!) +
      "\n\n";
  } else {
    body = `# 📰 Tech Changelog - ${data.date}\n\n`;
    body += generateCoveragePeriod(data.date) + "\n\n";
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
        const summary = summaries.github?.[item.url];
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
        const summary = summaries.aws?.[item.url];
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
        const summary = summaries.claudeCode?.[item.url];
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
        const summary = summaries.linear?.[item.url];
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
