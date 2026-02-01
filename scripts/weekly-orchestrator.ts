// 週次処理Orchestratorエントリポイント
// fetch-past-all, post-all サブコマンドをサポート

import { Octokit } from "@octokit/rest";
import type { ChangelogData, ProviderWeeklySummary } from "./domain/types.ts";
import type { WeeklyContext } from "./domain/weekly/types.ts";
import {
  createOrchestrator,
  filterMutedEntries,
  getAdapter,
  getProviderDataFromChangelog,
  WeeklyOrchestrator,
} from "./domain/weekly/orchestrator.ts";
import { renderPromptTemplate } from "./domain/weekly/pipeline.ts";
import { closeDiscussion } from "./create-discussion.ts";
import { getCategoryNameFromEnv } from "./domain/category-config.ts";
import {
  hasFlag,
  parseArg,
  parseArgWithDefault,
  requireGitHubToken,
} from "./infrastructure/cli-parser.ts";
import { getTodayDateString } from "./infrastructure/date-utils.ts";
import { DefaultWeeklyMarkdownGenerator } from "./presentation/markdown/weekly-markdown-generator.ts";

/**
 * コマンドライン引数をパース
 */
function parseArgs(args: string[]): {
  command: string;
  date: string;
  owner: string;
  repo: string;
  dryRun: boolean;
  autoClose: boolean;
  summariesFile: string | null;
  changelogFile: string | null;
  outputFile: string | null;
  limit: number;
} {
  const command = args[0] ?? "help";
  const summariesFile = parseArg(args, "summaries-file") ?? null;
  const changelogFile = parseArg(args, "changelog-file") ?? null;
  const outputFile = parseArg(args, "output") ?? null;
  const limitArg = parseArg(args, "limit");
  const dryRun = hasFlag(args, "dry-run");
  const autoClose = hasFlag(args, "auto-close");

  return {
    command,
    date: parseArgWithDefault(
      args,
      "date",
      getTodayDateString(),
    ),
    owner: parseArgWithDefault(args, "owner", "korosuke613"),
    repo: parseArgWithDefault(args, "repo", "mynewshq"),
    dryRun,
    autoClose,
    summariesFile,
    changelogFile,
    outputFile,
    limit: limitArg ? parseInt(limitArg, 10) : 2,
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
async function fetchPastAll(
  options: {
    date: string;
    owner: string;
    repo: string;
    limit: number;
    outputFile: string | null;
  },
  orchestrator: WeeklyOrchestrator,
): Promise<void> {
  const token = requireGitHubToken();

  const { startDate, endDate } = calculateDateRange(options.date);

  const ctx: WeeklyContext = {
    startDate,
    endDate,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: "General", // 過去Discussion取得では使用されない
  };

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
async function prepareSummarize(
  options: {
    date: string;
    owner: string;
    repo: string;
    changelogFile: string | null;
    outputFile: string | null;
    limit: number;
  },
  orchestrator: WeeklyOrchestrator,
): Promise<void> {
  const token = requireGitHubToken();

  // Changelogデータを読み込み
  const changelogFile = options.changelogFile ?? options.date;
  const changelogData = await loadChangelogData(changelogFile);

  const ctx: WeeklyContext = {
    startDate: changelogData.startDate ?? options.date,
    endDate: changelogData.endDate ?? options.date,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName: "General", // 要約準備では使用されない
  };

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
async function renderPrompt(
  options: {
    providerId: string;
    date: string;
    owner: string;
    repo: string;
    changelogFile: string | null;
    outputFile: string | null;
    limit: number;
  },
  markdownGenerator: DefaultWeeklyMarkdownGenerator,
): Promise<void> {
  const token = requireGitHubToken();

  const adapter = getAdapter(options.providerId, markdownGenerator);
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
    categoryName: "General", // プロンプト生成では使用されない
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
async function postAll(
  options: {
    date: string;
    owner: string;
    repo: string;
    dryRun: boolean;
    autoClose: boolean;
    summariesFile: string | null;
    changelogFile: string | null;
  },
  orchestrator: WeeklyOrchestrator,
): Promise<void> {
  const token = requireGitHubToken();

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

  // カテゴリ名の決定：環境変数から設定を取得
  const octokit = new Octokit({ auth: token });
  const categoryName = await getCategoryNameFromEnv(
    octokit,
    options.owner,
    options.repo,
    "changelog",
    true, // 週次処理
  );
  console.log(`Using category from config: ${categoryName}`);

  const ctx: WeeklyContext = {
    startDate: changelogData.startDate ?? options.date,
    endDate: changelogData.endDate ?? options.date,
    token,
    owner: options.owner,
    repo: options.repo,
    categoryName,
    dryRun: options.dryRun,
  };

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

  // autoCloseが有効な場合、投稿したDiscussionをクローズ
  if (options.autoClose && Object.keys(result.succeeded).length > 0) {
    console.log("\n=== Closing Discussions (auto-close enabled) ===");
    for (const [providerId, data] of Object.entries(result.succeeded)) {
      try {
        await closeDiscussion(token, data.id);
        console.log(`  ${providerId}: closed`);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.error(`  ${providerId}: failed to close - ${errorMessage}`);
      }
    }
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
  --changelog-file=PATH   Changelogファイルパス（省略時は日付から推定）
  --summaries-file=PATH   要約JSONファイルパス（post-allで必須）
  --output=PATH           出力ファイルパス
  --limit=N               過去Discussion取得件数（デフォルト: 2）
  --dry-run               ドライラン（投稿せずに結果表示）
  --auto-close            投稿後にDiscussionを自動クローズ

Environment Variables:
  CATEGORY_CONFIG_ISSUE_NUMBER  カテゴリ設定を管理するIssue番号
  WORKFLOW_TRIGGER              ワークフロートリガー（schedule/workflow_dispatch）

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

  // MarkdownGeneratorのインスタンスを作成
  const markdownGenerator = new DefaultWeeklyMarkdownGenerator();

  // Orchestratorのインスタンスを作成
  const orchestrator = createOrchestrator(markdownGenerator);

  switch (options.command) {
    case "fetch-past-all":
      await fetchPastAll(options, orchestrator);
      break;
    case "prepare-summarize":
      await prepareSummarize(options, orchestrator);
      break;
    case "render-prompt": {
      const providerId = Deno.args[1];
      if (!providerId || providerId.startsWith("--")) {
        console.error("Provider ID is required for render-prompt command");
        console.error("Usage: render-prompt <providerId> [options]");
        Deno.exit(1);
      }
      await renderPrompt({ ...options, providerId }, markdownGenerator);
      break;
    }
    case "post-all":
      await postAll(options, orchestrator);
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
