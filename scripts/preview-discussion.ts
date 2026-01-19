// Discussion投稿内容をプレビューするスクリプト
import {
  generateBodyWithSummaries,
  generateDefaultBody,
  generateMention,
  type SummaryData,
} from "./create-discussion.ts";

interface ChangelogData {
  date: string;
  github: Array<{
    title: string;
    url: string;
    content: string;
    pubDate: string;
    muted?: boolean;
    mutedBy?: string;
  }>;
  aws: Array<{
    title: string;
    url: string;
    content: string;
    pubDate: string;
    muted?: boolean;
    mutedBy?: string;
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

async function preview(date?: string, summariesJson?: string) {
  // 日付を取得
  const targetDate = date || new Date().toISOString().split("T")[0];
  const changelogPath = `data/changelogs/${targetDate}.json`;

  // JSONファイルを読み込み
  let data: ChangelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    data = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // 統計情報を表示
  console.log(`📊 データ統計 (${data.date})`);
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
  if (summariesJson) {
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

  // summary.mdに保存
  await Deno.writeTextFile("summary.md", bodyWithMention);
  console.log(`✅ summary.md に保存しました`);
  console.log();

  // プレビューを表示
  console.log(`📄 プレビュー:`);
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

  await preview(date, summariesJson);
}
