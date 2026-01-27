// 週次Markdown生成
import type {
  ChangelogData,
  ChangelogEntry,
  DailyLink,
  ProviderWeeklySummary,
  ReleaseEntry,
  WeeklySummaryData,
} from "../../domain/types.ts";
import { getProviderDisplayName } from "../../domain/providers/index.ts";
import { getCategoryEmoji, getEntryTitle } from "./helpers.ts";
import { generateWeeklyCoveragePeriod } from "./daily-generator.ts";

// 週次用の要約データ付きボディ生成
export function generateWeeklyBodyWithSummaries(
  data: ChangelogData,
  summaries: WeeklySummaryData,
  dailyLinks: DailyLink[],
): string {
  if (data.startDate == null || data.endDate == null) {
    throw new Error("Weekly generation requires both startDate and endDate.");
  }

  // 1. ヘッダー + 対象期間
  let body = `# 📰 Tech Changelog - Weekly\n\n`;
  body += generateWeeklyCoveragePeriod(data.startDate, data.endDate) + "\n\n";

  // 2. 🌟 今週のハイライト（3-5件）
  body += "## 🌟 今週のハイライト\n\n";
  summaries.weeklyHighlights.forEach((highlight, index, highlights) => {
    const emoji = getCategoryEmoji(highlight.category);
    body += `### ${emoji} [${highlight.title}](${highlight.url})\n\n`;
    body += `**選定理由**: ${highlight.reason}\n\n`;
    body += `**技術者への影響**: ${highlight.impact}\n\n`;
    // 最後のハイライト以外は区切り線を追加
    if (index < highlights.length - 1) {
      body += "---\n\n";
    }
  });
  body += "\n";

  // 3. 🔮 傾向分析
  body += "## 🔮 傾向分析\n\n";
  body += "### 今週の技術動向\n";
  body += `${summaries.trendAnalysis.overallTrend}\n\n`;
  body += "### クロスカテゴリの洞察\n";
  body += `${summaries.trendAnalysis.crossCategoryInsights}\n\n`;
  body += "### 今後の展望\n";
  body += `${summaries.trendAnalysis.futureImplications}\n\n`;

  // 4. 📊 カテゴリ別総括
  body += "## 📊 カテゴリ別総括\n\n";
  body += `### ${getProviderDisplayName("github")}\n`;
  body += `${summaries.categorySummaries.github}\n\n`;
  body += `### ${getProviderDisplayName("aws")}\n`;
  body += `${summaries.categorySummaries.aws}\n\n`;
  body += `### ${getProviderDisplayName("claudeCode")}\n`;
  body += `${summaries.categorySummaries.claudeCode}\n\n`;
  body += `### ${getProviderDisplayName("linear")}\n`;
  body += `${summaries.categorySummaries.linear}\n\n`;

  // 5. 📅 Daily詳細（リンクリスト）
  if (dailyLinks.length > 0) {
    body += "## 📅 Daily詳細\n\n";
    body += "各日の詳細は以下のリンクからご確認ください:\n\n";
    // 日付の降順でソート
    const sortedLinks = [...dailyLinks].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    for (const link of sortedLinks) {
      body += `- [${link.date}](${link.url})\n`;
    }
    body += "\n";
  }

  return body;
}

// プロバイダー単位のDiscussionタイトルを生成
export function generateProviderWeeklyTitle(
  providerId: string,
  endDate: string,
): string {
  const displayName = getProviderDisplayName(providerId);
  return `📰 Tech Changelog - Weekly [${displayName}] (${endDate})`;
}

// プロバイダー単位のMarkdown生成（V2形式）
export function generateProviderWeeklyBody(
  providerId: string,
  providerData: ChangelogEntry[] | ReleaseEntry[],
  summary: ProviderWeeklySummary,
  startDate: string,
  endDate: string,
): string {
  const displayName = getProviderDisplayName(providerId);
  const emoji = getCategoryEmoji(providerId);

  // ヘッダー + 対象期間
  let body = `# ${emoji} Tech Changelog - Weekly [${displayName}]\n\n`;
  body += generateWeeklyCoveragePeriod(startDate, endDate) + "\n\n";

  // ハイライトセクション
  if (summary.highlights.length > 0) {
    body += "## 🌟 今週のハイライト\n\n";
    for (const highlight of summary.highlights) {
      body += `- ${highlight}\n`;
    }
    body += "\n";
  }

  // カテゴリ別詳細（GitHub/AWS）またはリリース一覧（Claude Code/Linear）
  const hasCategories = summary.categories && summary.categories.length > 0;

  if (hasCategories) {
    // カテゴリありプロバイダー（GitHub/AWS）
    body += "## 📊 カテゴリ別詳細\n\n";
    for (const categoryGroup of summary.categories!) {
      const entryCount = categoryGroup.entries.length;
      body += `### ${categoryGroup.category} (${entryCount}件)\n`;
      for (const entry of categoryGroup.entries) {
        body += `- [${entry.title}](${entry.url})\n`;
      }
      body += "\n";
      body += `**コメント**: ${categoryGroup.comment}\n\n`;
      if (categoryGroup.historicalContext) {
        body += `**過去との比較**: ${categoryGroup.historicalContext}\n\n`;
      }
      body += "---\n\n";
    }
  } else {
    // カテゴリなしプロバイダー（Claude Code/Linear）
    const sectionTitle = providerId === "claudeCode"
      ? "リリース一覧"
      : "エントリ一覧";
    body += `## 📊 ${sectionTitle}\n\n`;

    // summary.entriesがある場合はそれを使用、なければproviderDataから生成
    const entries = summary.entries ?? providerData.map((entry) => ({
      url: "url" in entry ? entry.url : "",
      title: getEntryTitle(entry),
    }));

    for (const entry of entries) {
      body += `- [${entry.title}](${entry.url})\n`;
    }
    body += "\n";

    if (summary.overallComment) {
      body += `**コメント**: ${summary.overallComment}\n\n`;
    }
    if (summary.historicalContext) {
      body += `**過去との比較**: ${summary.historicalContext}\n\n`;
    }
  }

  return body;
}
