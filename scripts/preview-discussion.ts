// Discussion投稿内容をプレビューするスクリプト
import type {
  BlogData,
  BlogSummaryData,
  ChangelogData,
  DailyLink,
  SummaryData,
  WeeklySummaryData,
} from "./domain/types.ts";
import {
  generateBodyWithSummaries,
  generateDefaultBody,
  generateMention,
  generateTitle,
  generateWeeklyBodyWithSummaries,
} from "./create-discussion.ts";
import {
  generateBlogBodyWithSummaries,
  generateBlogTitle,
  generateDefaultBlogBody,
} from "./presentation/markdown/blog-generator.ts";

// カテゴリオプション
type CategoryOption = "changelog" | "blog";

// Blog プレビュー用のダミーデータ（--summaries-json がない場合に使用）
const DUMMY_BLOG_SUMMARIES: BlogSummaryData = {
  hatenaBookmark: {
    selectedTopics: [
      {
        url: "https://example.com/article1",
        title: "サンプル記事 1",
        reason:
          "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      },
      {
        url: "https://example.com/article2",
        title: "サンプル記事 2",
        reason:
          "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      },
      {
        url: "https://example.com/article3",
        title: "サンプル記事 3",
        reason:
          "これはプレビュー用のダミーデータです。実際の選定理由がここに表示されます。",
      },
    ],
    overview:
      "【ダミー】本日のはてなブックマークでは、開発生産性やAI関連の記事が注目を集めています。これはプレビュー用のダミーデータです。実際の解説・トレンド分析がここに表示されます。",
  },
};

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

// Changelog用プレビュー
async function previewChangelog(
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
    // デフォルトでダミーデータを設定し、JSONが指定されていれば上書き
    let summaries: WeeklySummaryData = DUMMY_WEEKLY_SUMMARIES;
    if (summariesJson) {
      try {
        summaries = JSON.parse(summariesJson);
        console.log(`📝 週次要約JSON を使用してボディを生成`);
      } catch (error) {
        console.error(`Failed to parse weekly summaries JSON:`, error);
        Deno.exit(1);
      }
    } else {
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

// Blog用プレビュー
async function previewBlog(
  date?: string,
  summariesJson?: string,
  weekly?: boolean,
) {
  // 日付を取得
  const targetDate = date || new Date().toISOString().split("T")[0];
  const subDir = weekly ? "weekly" : "daily";
  const blogPath = `data/blogs/${subDir}/${targetDate}.json`;

  // JSONファイルを読み込み
  let data: BlogData;
  try {
    const content = await Deno.readTextFile(blogPath);
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${blogPath}:`, error);
    Deno.exit(1);
  }

  // タイトルを生成
  const title = generateBlogTitle(data);
  const isWeekly = !!(data.startDate && data.endDate);

  // 統計情報を表示
  if (isWeekly) {
    console.log(`📊 データ統計 (週次: ${data.startDate} ~ ${data.endDate})`);
  } else {
    console.log(`📊 データ統計 (${data.date})`);
  }
  console.log(`---`);

  const hatenaActive = data.hatenaBookmark.filter((e) => !e.muted).length;
  const hatenaMuted = data.hatenaBookmark.filter((e) => e.muted).length;
  console.log(
    `Hatena Bookmark: ${hatenaActive} 件 (ミュート: ${hatenaMuted} 件)`,
  );
  console.log();

  // ボディを生成
  // デフォルトでダミーデータを設定し、JSONが指定されていれば上書き
  let body: string;
  let summaries: BlogSummaryData = DUMMY_BLOG_SUMMARIES;
  if (summariesJson) {
    try {
      summaries = JSON.parse(summariesJson);
      console.log(`📝 要約JSON を使用してボディを生成`);
    } catch (error) {
      console.error(`Failed to parse summaries JSON:`, error);
      console.log(`⚠️ ダミーデータにフォールバック`);
    }
  } else {
    console.log(`📝 ダミーデータを使用してボディを生成（プレビュー用）`);
  }
  body = generateBlogBodyWithSummaries(data, summaries);
  const bodyWithMention = body + generateMention();

  // summary-blog.mdに保存
  const outputFile = isWeekly ? "summary-blog-weekly.md" : "summary-blog.md";
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
  const summariesFileArg = Deno.args.find((arg) =>
    arg.startsWith("--summaries-file=")
  );
  const categoryArg = Deno.args.find((arg) => arg.startsWith("--category="));

  // --summaries-file が優先、なければ --summaries-json を使用
  let summariesJson: string | undefined;
  if (summariesFileArg) {
    const summariesFile = summariesFileArg.substring(
      "--summaries-file=".length,
    );
    // ログインジェクション対策：改行文字を除去
    const safeFilename = summariesFile.replace(/[\r\n]/g, "");
    try {
      summariesJson = await Deno.readTextFile(summariesFile);
      console.log(`Loaded summaries from file: ${safeFilename}`);
    } catch (error) {
      console.error(`Failed to read summaries file ${safeFilename}:`, error);
      Deno.exit(1);
    }
  } else if (summariesJsonArg) {
    summariesJson = summariesJsonArg.substring("--summaries-json=".length);
  }

  const weekly = Deno.args.includes("--weekly");

  // カテゴリの解析（デフォルト: changelog）
  let category: CategoryOption = "changelog";
  if (categoryArg) {
    const categoryValue = categoryArg.split("=")[1];
    if (categoryValue === "changelog" || categoryValue === "blog") {
      category = categoryValue;
    } else {
      console.warn(`Invalid category: ${categoryValue}. Using "changelog".`);
    }
  }

  if (category === "blog") {
    await previewBlog(date, summariesJson, weekly);
  } else {
    await previewChangelog(date, summariesJson, weekly);
  }
}
