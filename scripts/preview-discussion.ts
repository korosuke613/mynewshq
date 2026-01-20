// Discussion投稿内容をプレビューするスクリプト
import {
  type DailyLink,
  generateBodyWithSummaries,
  generateDefaultBody,
  generateMention,
  generateTitle,
  generateWeeklyBodyWithSummaries,
  type SummaryData,
  type WeeklySummaryData,
} from "./create-discussion.ts";

// 週次プレビュー用のダミーデータ（--summaries-json がない場合に使用）
const DUMMY_WEEKLY_SUMMARIES: WeeklySummaryData = {
  weeklyHighlights: [
    {
      url: "https://example.com/highlight1",
      title: "サンプルハイライト 1",
      category: "github",
      reason:
        "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      impact:
        "これはプレビュー用のダミーデータです。実際の技術者への影響がここに表示されます。",
    },
    {
      url: "https://example.com/highlight2",
      title: "サンプルハイライト 2",
      category: "aws",
      reason:
        "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      impact:
        "これはプレビュー用のダミーデータです。実際の技術者への影響がここに表示されます。",
    },
    {
      url: "https://example.com/highlight3",
      title: "サンプルハイライト 3",
      category: "claudeCode",
      reason:
        "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      impact:
        "これはプレビュー用のダミーデータです。実際の技術者への影響がここに表示されます。",
    },
  ],
  categorySummaries: {
    github: "【ダミー】GitHub Changelogの週間傾向がここに表示されます。",
    aws: "【ダミー】AWS What's Newの週間傾向がここに表示されます。",
    claudeCode:
      "【ダミー】Claude Codeの週間アップデート傾向がここに表示されます。",
    linear: "【ダミー】今週の更新はありませんでした。",
  },
  trendAnalysis: {
    overallTrend: "【ダミー】今週の技術動向の全体傾向がここに表示されます。",
    crossCategoryInsights:
      "【ダミー】カテゴリ横断の関連性分析がここに表示されます。",
    futureImplications:
      "【ダミー】今後の展望や技術者が注目すべきポイントがここに表示されます。",
  },
};

interface ChangelogData {
  date: string;
  startDate?: string; // 週次の場合の開始日
  endDate?: string; // 週次の場合の終了日
  github: Array<{
    title: string;
    url: string;
    content: string;
    pubDate: string;
    muted?: boolean;
    mutedBy?: string;
    labels?: Record<string, string[]>;
  }>;
  aws: Array<{
    title: string;
    url: string;
    content: string;
    pubDate: string;
    muted?: boolean;
    mutedBy?: string;
    labels?: Record<string, string[]>;
  }>;
  claudeCode: Array<{
    version: string;
    url: string;
    body: string;
    publishedAt: string;
    muted?: boolean;
    mutedBy?: string;
  }>;
  linear: Array<{
    title: string;
    url: string;
    content: string;
    pubDate: string;
    muted?: boolean;
    mutedBy?: string;
  }>;
}

async function preview(
  date?: string,
  summariesJson?: string,
  weekly?: boolean,
) {
  // 日付を取得
  const targetDate = date || new Date().toISOString().split("T")[0];
  const subDir = weekly ? "weekly" : "daily";
  const changelogPath = `data/changelogs/${subDir}/${targetDate}.json`;

  // JSONファイルを読み込み
  let data: ChangelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // タイトルを生成
  const title = generateTitle(data);
  const isWeekly = !!(data.startDate && data.endDate);

  // 統計情報を表示
  if (isWeekly) {
    console.log(`📊 データ統計 (週次: ${data.startDate} ~ ${data.endDate})`);
  } else {
    console.log(`📊 データ統計 (${data.date})`);
  }
  console.log(`---`);

  const githubActive = data.github.filter((e) => !e.muted).length;
  const githubMuted = data.github.filter((e) => e.muted).length;
  console.log(`GitHub: ${githubActive} 件 (ミュート: ${githubMuted} 件)`);

  const awsActive = data.aws.filter((e) => !e.muted).length;
  const awsMuted = data.aws.filter((e) => e.muted).length;
  console.log(`AWS: ${awsActive} 件 (ミュート: ${awsMuted} 件)`);

  const claudeActive = data.claudeCode.filter((e) => !e.muted).length;
  const claudeMuted = data.claudeCode.filter((e) => e.muted).length;
  console.log(
    `Claude Code: ${claudeActive} 件 (ミュート: ${claudeMuted} 件)`,
  );

  const linearActive = data.linear.filter((e) => !e.muted).length;
  const linearMuted = data.linear.filter((e) => e.muted).length;
  console.log(`Linear: ${linearActive} 件 (ミュート: ${linearMuted} 件)`);

  const totalActive = githubActive + awsActive + claudeActive + linearActive;
  const totalMuted = githubMuted + awsMuted + claudeMuted + linearMuted;
  console.log(`合計: ${totalActive} 件 (ミュート: ${totalMuted} 件)`);
  console.log();

  // ボディを生成
  let body: string;
  if (weekly) {
    // 週次モード: WeeklySummaryData を使用
    let summaries: WeeklySummaryData;
    if (summariesJson) {
      try {
        summaries = JSON.parse(summariesJson);
        console.log(`📝 週次要約JSON を使用してボディを生成`);
      } catch (error) {
        console.error(`Failed to parse weekly summaries JSON:`, error);
        Deno.exit(1);
      }
    } else {
      // --summaries-json がない場合はダミーデータを使用
      summaries = DUMMY_WEEKLY_SUMMARIES;
      console.log(`📝 ダミーデータを使用してボディを生成（プレビュー用）`);
    }
    // プレビュー時はDailyリンクは空（APIアクセスなし）
    const dailyLinks: DailyLink[] = [];
    body = generateWeeklyBodyWithSummaries(data, summaries, dailyLinks);
    console.log(`⚠️ プレビューのためDailyリンクは空です`);
  } else if (summariesJson) {
    // 日次モード: SummaryData を使用
    try {
      const summaries: SummaryData = JSON.parse(summariesJson);
      body = generateBodyWithSummaries(data, summaries);
      console.log(`📝 要約JSON を使用してボディを生成`);
    } catch (error) {
      console.error(`Failed to parse summaries JSON:`, error);
      console.log(`⚠️ デフォルトボディにフォールバック`);
      body = generateDefaultBody(data);
    }
  } else {
    body = generateDefaultBody(data);
  }
  const bodyWithMention = body + generateMention();

  // summary.mdに保存（週次の場合はsummary-weekly.md）
  const outputFile = isWeekly ? "summary-weekly.md" : "summary.md";
  await Deno.writeTextFile(outputFile, bodyWithMention);
  console.log(`✅ ${outputFile} に保存しました`);
  console.log();

  // プレビューを表示
  console.log(`📄 プレビュー:`);
  console.log(`📋 タイトル: ${title}`);
  console.log(`---`);
  console.log(bodyWithMention);
}

// メイン処理
if (import.meta.main) {
  const dateArg = Deno.args.find((arg) => arg.startsWith("--date="));
  const date = dateArg ? dateArg.split("=")[1] : undefined;

  const summariesJsonArg = Deno.args.find((arg) =>
    arg.startsWith("--summaries-json=")
  );
  const summariesJson = summariesJsonArg
    ? summariesJsonArg.substring("--summaries-json=".length)
    : undefined;

  const weekly = Deno.args.includes("--weekly");

  await preview(date, summariesJson, weekly);
}
