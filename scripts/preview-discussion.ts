// Discussion投稿内容をプレビューするスクリプト
import { generateDefaultBody } from "./create-discussion.ts";

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
}

async function preview(date?: string) {
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

  const totalActive = githubActive + awsActive + claudeActive;
  const totalMuted = githubMuted + awsMuted + claudeMuted;
  console.log(`合計: ${totalActive} 件 (ミュート: ${totalMuted} 件)`);
  console.log();

  // デフォルトボディを生成
  const body = generateDefaultBody(data);

  // summary.mdに保存
  await Deno.writeTextFile("summary.md", body);
  console.log(`✅ summary.md に保存しました`);
  console.log();

  // プレビューを表示
  console.log(`📄 プレビュー:`);
  console.log(`---`);
  console.log(body);
}

// メイン処理
if (import.meta.main) {
  const dateArg = Deno.args.find((arg) => arg.startsWith("--date="));
  const date = dateArg ? dateArg.split("=")[1] : undefined;
  await preview(date);
}
