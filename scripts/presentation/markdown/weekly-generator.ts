// 週次Markdown生成
import type {
  ChangelogData,
  DailyLink,
  WeeklySummaryData,
} from "../../domain/types.ts";
import { getCategoryEmoji } from "./helpers.ts";
import { generateWeeklyCoveragePeriod } from "./daily-generator.ts";

// 週次用の要約データ付きボディ生成
export function generateWeeklyBodyWithSummaries(
  data: ChangelogData,
  summaries: WeeklySummaryData,
  dailyLinks: DailyLink[],
): string {
  // 1. ヘッダー + 対象期間
  let body = `# 📰 Tech Changelog - Weekly\n\n`;
  body += generateWeeklyCoveragePeriod(data.startDate!, data.endDate!) + "\n\n";

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
  body += "### GitHub Changelog\n";
  body += `${summaries.categorySummaries.github}\n\n`;
  body += "### AWS What's New\n";
  body += `${summaries.categorySummaries.aws}\n\n`;
  body += "### Claude Code\n";
  body += `${summaries.categorySummaries.claudeCode}\n\n`;
  body += "### Linear Changelog\n";
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
