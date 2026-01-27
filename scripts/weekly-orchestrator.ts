// 週次処理Orchestratorエントリポイント
// fetch-past-all, post-all サブコマンドをサポート

import type { ChangelogData, ProviderWeeklySummary } from "./domain/types.ts";
import type { WeeklyContext } from "./domain/weekly/types.ts";
import {
  createOrchestrator,
  filterMutedEntries,
  getAdapter,
  getProviderDataFromChangelog,
} from "./domain/weekly/orchestrator.ts";
import { renderPromptTemplate } from "./domain/weekly/pipeline.ts";

/**
 * コマンドライン引数をパース
 */
function parseArgs(args: string[]): {
  command: string;
  date: string;
  owner: string;
  repo: string;
  categoryName: string;
  dryRun: boolean;
  summariesFile: string | null;
  changelogFile: string | null;
  outputFile: string | null;
  limit: number;
} {
  const command = args[0] ?? "help";
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const ownerArg = args.find((arg) => arg.startsWith("--owner="));
  const repoArg = args.find((arg) => arg.startsWith("--repo="));
  const categoryArg = args.find((arg) => arg.startsWith("--category="));
  const summariesFileArg = args.find((arg) =>
    arg.startsWith("--summaries-file=")
  );
  const changelogFileArg = args.find((arg) =>
    arg.startsWith("--changelog-file=")
  );
  const outputFileArg = args.find((arg) => arg.startsWith("--output="));
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const dryRun = args.includes("--dry-run");

  return {
    command,
    date: dateArg?.split("=")[1] ?? new Date().toISOString().split("T")[0],
    owner: ownerArg?.split("=")[1] ?? "korosuke613",
    repo: repoArg?.split("=")[1] ?? "mynewshq",
    categoryName: categoryArg?.split("=")[1] ?? "General",
    dryRun,
    summariesFile: summariesFileArg?.split("=")[1] ?? null,
    changelogFile: changelogFileArg?.split("=")[1] ?? null,
    outputFile: outputFileArg?.split("=")[1] ?? null,
    limit: limitArg ? parseInt(limitArg.split("=")[1], 10) : 2,
  };
}

/**
 * 日付文字列からstartDate/endDateを計算（7日間）
 */
function calculateDateRange(
  endDateStr: string,
): { startDate: string; endDate: string } {
  const endDate = new Date(endDateStr);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 7日間（endDate含む）

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDateStr,
  };
}

/**
 * Changelogデータを読み込み
 */
async function loadChangelogData(
  filePathOrDate: string,
): Promise<ChangelogData> {
  let filePath: string;

  if (filePathOrDate.endsWith(".json")) {
    filePath = filePathOrDate;
  } else {
    // 日付からファイルパスを推定
    filePath = `data/changelogs/weekly/${filePathOrDate}.json`;
  }

  const content = await Deno.readTextFile(filePath);
  return JSON.parse(content);
}

/**
 * fetch-past-all: 全プロバイダーの過去Discussion取得
 */
async function fetchPastAll(options: {
  date: string;
  owner: string;
  repo: string;
  categoryName: string;
  limit: number;
  outputFile: string | null;
}): Promise<void> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  const { startDate, endDate } = calculateDateRange(options.date);

  const ctx: WeeklyContext = {
    startDate,
    endDate,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: options.categoryName,
  };

  const orchestrator = createOrchestrator();
  console.log("Fetching past discussions for all providers...");
  console.log(`  Date range: ${startDate} ~ ${endDate}`);
  console.log(`  Limit: ${options.limit}`);

  const result = await orchestrator.fetchAllPastDiscussions(ctx, options.limit);

  // 結果表示
  console.log("\n=== Results ===");
  for (const [providerId, discussions] of Object.entries(result.succeeded)) {
    console.log(`\n${providerId}: ${discussions.length} discussions found`);
    for (const d of discussions) {
      console.log(`  - ${d.date}: ${d.url}`);
    }
  }

  if (Object.keys(result.failed).length > 0) {
    console.log("\n=== Failures ===");
    for (const [providerId, error] of Object.entries(result.failed)) {
      console.error(`${providerId}: ${error}`);
    }
  }

  // ファイル出力
  if (options.outputFile) {
    await Deno.writeTextFile(
      options.outputFile,
      JSON.stringify(result.succeeded, null, 2),
    );
    console.log(`\nSaved to: ${options.outputFile}`);
  }
}

/**
 * prepare-summarize: 要約生成リクエストを準備
 */
async function prepareSummarize(options: {
  date: string;
  owner: string;
  repo: string;
  categoryName: string;
  changelogFile: string | null;
  outputFile: string | null;
  limit: number;
}): Promise<void> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // Changelogデータを読み込み
  const changelogFile = options.changelogFile ?? options.date;
  const changelogData = await loadChangelogData(changelogFile);

  const ctx: WeeklyContext = {
    startDate: changelogData.startDate ?? options.date,
    endDate: changelogData.endDate ?? options.date,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: options.categoryName,
  };

  const orchestrator = createOrchestrator();

  // 過去Discussionを取得
  console.log("Fetching past discussions...");
  const pastResult = await orchestrator.fetchAllPastDiscussions(
    ctx,
    options.limit,
  );

  // 要約リクエストを準備
  console.log("Preparing summarize requests...");
  const requests = orchestrator.prepareSummarizeRequests(
    changelogData,
    pastResult.succeeded,
  );

  console.log(`\n=== Summarize Requests (${requests.length} providers) ===`);
  for (const req of requests) {
    console.log(`\n--- ${req.providerId} ---`);
    console.log(`  Current entries: ${req.currentData.length}`);
    console.log(`  Past discussions: ${req.pastDiscussions.length}`);
  }

  // ファイル出力
  if (options.outputFile) {
    await Deno.writeTextFile(
      options.outputFile,
      JSON.stringify(requests, null, 2),
    );
    console.log(`\nSaved to: ${options.outputFile}`);
  }
}

/**
 * render-prompt: 特定プロバイダーのプロンプトを生成
 */
async function renderPrompt(options: {
  providerId: string;
  date: string;
  owner: string;
  repo: string;
  categoryName: string;
  changelogFile: string | null;
  outputFile: string | null;
  limit: number;
}): Promise<void> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  const adapter = getAdapter(options.providerId);
  if (!adapter) {
    console.error(`Unknown provider: ${options.providerId}`);
    Deno.exit(1);
  }

  // Changelogデータを読み込み
  const changelogFile = options.changelogFile ?? options.date;
  const changelogData = await loadChangelogData(changelogFile);

  const ctx: WeeklyContext = {
    startDate: changelogData.startDate ?? options.date,
    endDate: changelogData.endDate ?? options.date,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: options.categoryName,
  };

  // 過去Discussionを取得
  console.log(`Fetching past discussions for ${options.providerId}...`);
  const pastResult = await adapter.fetchPastDiscussions(ctx, options.limit);
  const pastDiscussions = pastResult.success ? pastResult.data : [];

  // プロバイダーのデータを取得
  const currentData = getProviderDataFromChangelog(
    changelogData,
    options.providerId,
  );

  // mutedエントリを除外
  const filteredData = filterMutedEntries(currentData);

  // プロンプトを生成
  const config = adapter.getSummarizeConfig();
  const prompt = renderPromptTemplate(
    config.promptTemplate,
    options.providerId,
    filteredData as Parameters<typeof renderPromptTemplate>[2],
    pastDiscussions,
  );

  console.log("\n=== JSON Schema ===");
  console.log(JSON.stringify(config.jsonSchema, null, 2));

  console.log("\n=== Rendered Prompt ===");
  console.log(prompt);

  // ファイル出力
  if (options.outputFile) {
    const output = {
      providerId: options.providerId,
      jsonSchema: config.jsonSchema,
      prompt,
    };
    await Deno.writeTextFile(
      options.outputFile,
      JSON.stringify(output, null, 2),
    );
    console.log(`\nSaved to: ${options.outputFile}`);
  }
}

/**
 * post-all: 全プロバイダーのDiscussion投稿
 */
async function postAll(options: {
  date: string;
  owner: string;
  repo: string;
  categoryName: string;
  dryRun: boolean;
  summariesFile: string | null;
  changelogFile: string | null;
}): Promise<void> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  if (!options.summariesFile) {
    console.error("--summaries-file is required for post-all command");
    Deno.exit(1);
  }

  // Changelogデータを読み込み
  const changelogFile = options.changelogFile ?? options.date;
  const changelogData = await loadChangelogData(changelogFile);

  // 要約データを読み込み
  const summariesContent = await Deno.readTextFile(options.summariesFile);
  const summaries: Record<string, ProviderWeeklySummary> = JSON.parse(
    summariesContent,
  );

  const ctx: WeeklyContext = {
    startDate: changelogData.startDate ?? options.date,
    endDate: changelogData.endDate ?? options.date,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: options.categoryName,
    dryRun: options.dryRun,
  };

  const orchestrator = createOrchestrator();

  console.log("Posting discussions for all providers...");
  console.log(`  Date range: ${ctx.startDate} ~ ${ctx.endDate}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Providers: ${Object.keys(summaries).join(", ")}`);

  const result = await orchestrator.postAllDiscussions(
    changelogData,
    summaries,
    ctx,
  );

  // 結果表示
  console.log("\n=== Results ===");
  for (const [providerId, data] of Object.entries(result.succeeded)) {
    console.log(`\n${providerId}:`);
    console.log(`  Title: ${data.title}`);
    console.log(`  URL: ${data.url}`);
  }

  if (Object.keys(result.failed).length > 0) {
    console.log("\n=== Failures ===");
    for (const [providerId, error] of Object.entries(result.failed)) {
      console.error(`${providerId}: ${error}`);
    }
    Deno.exit(1);
  }

  console.log("\n✅ All discussions posted successfully!");
}

/**
 * ヘルプ表示
 */
function showHelp(): void {
  console.log(`
Weekly Orchestrator - 週次処理の統括ツール

Usage:
  deno task weekly-orchestrator <command> [options]

Commands:
  fetch-past-all      全プロバイダーの過去Discussion取得（並列）
  prepare-summarize   要約生成リクエストを準備
  render-prompt       特定プロバイダーのプロンプトを生成
  post-all            全プロバイダーのDiscussion投稿（並列）
  help                このヘルプを表示

Options:
  --date=YYYY-MM-DD       対象日（デフォルト: 今日）
  --owner=OWNER           リポジトリオーナー（デフォルト: korosuke613）
  --repo=REPO             リポジトリ名（デフォルト: mynewshq）
  --category=CATEGORY     Discussionカテゴリ（デフォルト: General）
  --changelog-file=PATH   Changelogファイルパス（省略時は日付から推定）
  --summaries-file=PATH   要約JSONファイルパス（post-allで必須）
  --output=PATH           出力ファイルパス
  --limit=N               過去Discussion取得件数（デフォルト: 2）
  --dry-run               ドライラン（投稿せずに結果表示）

Examples:
  # 過去Discussionを取得
  deno task fetch-past-discussions-all --date=2026-01-27

  # 要約リクエストを準備
  deno task weekly-orchestrator prepare-summarize --date=2026-01-27 --output=requests.json

  # プロンプトを生成
  deno task weekly-orchestrator render-prompt github --date=2026-01-27

  # Discussion投稿（ドライラン）
  deno task post-weekly-all --date=2026-01-27 --summaries-file=summaries.json --dry-run
`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const options = parseArgs(Deno.args);

  switch (options.command) {
    case "fetch-past-all":
      await fetchPastAll(options);
      break;
    case "prepare-summarize":
      await prepareSummarize(options);
      break;
    case "render-prompt": {
      const providerId = Deno.args[1];
      if (!providerId || providerId.startsWith("--")) {
        console.error("Provider ID is required for render-prompt command");
        console.error("Usage: render-prompt <providerId> [options]");
        Deno.exit(1);
      }
      await renderPrompt({ ...options, providerId });
      break;
    }
    case "post-all":
      await postAll(options);
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

if (import.meta.main) {
  main();
}
