// プロバイダー単位でWeekly Discussionを投稿するスクリプト

import { Octokit } from "@octokit/rest";
import type {
  ChangelogData,
  ChangelogEntry,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "./domain/types.ts";
import { createProviderWeeklyDiscussion } from "./create-discussion.ts";
import {
  DEFAULT_CATEGORY_CONFIG,
  getCategoryName,
  getCategoryNameFromEnv,
} from "./domain/category-config.ts";
import {
  hasFlag,
  parseArg,
  parseArgWithDefault,
  requireGitHubToken,
} from "./infrastructure/cli-parser.ts";
import { getTodayDateString } from "./infrastructure/date-utils.ts";
import {
  loadChangelogData,
  loadJsonFile,
} from "./infrastructure/data-loader.ts";

interface PostWeeklyProviderArgs {
  date: string;
  provider: string;
  summariesFile: string | null;
  owner: string;
  repo: string;
  dryRun: boolean;
}

function parseArgs(args: string[]): PostWeeklyProviderArgs {
  const date = parseArgWithDefault(
    args,
    "date",
    getTodayDateString(),
  );

  const provider = parseArg(args, "provider") ?? "";
  if (!provider) {
    console.error("Error: --provider is required");
    console.error(
      "Usage: deno task post-weekly-provider --provider=github --date=2026-01-20",
    );
    Deno.exit(1);
  }

  const validProviders = ["github", "aws", "claudeCode", "linear"];
  if (!validProviders.includes(provider)) {
    console.error(`Error: Invalid provider "${provider}"`);
    console.error(`Valid providers: ${validProviders.join(", ")}`);
    Deno.exit(1);
  }

  return {
    date,
    provider,
    summariesFile: parseArg(args, "summaries-file") ?? null,
    owner: parseArgWithDefault(args, "owner", "korosuke613"),
    repo: parseArgWithDefault(args, "repo", "mynewshq"),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const {
    date,
    provider,
    summariesFile,
    owner,
    repo,
    dryRun,
  } = parseArgs(Deno.args);

  // dry-run時はトークン不要
  const token = dryRun ? "" : requireGitHubToken();

  // 週次データを読み込む
  const changelogData = await loadChangelogData(date, true);

  // 要約データを読み込む
  if (!summariesFile) {
    console.error("Error: --summaries-file is required");
    Deno.exit(1);
  }

  const summary = await loadJsonFile<ProviderWeeklySummary>(summariesFile);

  // カテゴリ名の決定
  let categoryName: string;
  if (dryRun) {
    // dry-run時はデフォルト設定を使用
    const triggerStr = Deno.env.get("WORKFLOW_TRIGGER");
    const trigger = triggerStr === "workflow_dispatch"
      ? "workflow_dispatch"
      : "schedule";
    categoryName = getCategoryName(
      DEFAULT_CATEGORY_CONFIG,
      "changelog",
      trigger,
      true, // 週次処理
    );
    console.log(`Using default category config: ${categoryName}`);
  } else {
    // 通常時は環境変数から設定を取得
    const octokit = new Octokit({ auth: token });
    categoryName = await getCategoryNameFromEnv(
      octokit,
      owner,
      repo,
      "changelog",
      true, // 週次処理
    );
    console.log(`Using category from config: ${categoryName}`);
  }

  // プロバイダーのデータを取得
  const providerData = changelogData[
    provider as keyof Pick<
      ChangelogData,
      "github" | "aws" | "claudeCode" | "linear"
    >
  ];

  // mutedでないエントリのみをフィルタ
  // 型を維持するため、プロバイダーごとに処理
  let activeData: ChangelogEntry[] | ReleaseEntry[];
  if (provider === "claudeCode") {
    activeData = (providerData as ReleaseEntry[]).filter((entry) =>
      !entry.muted
    );
  } else {
    activeData = (providerData as ChangelogEntry[]).filter((entry) =>
      !entry.muted
    );
  }

  if (activeData.length === 0) {
    console.log(
      `No active entries for provider "${provider}" on ${date}. Skipping.`,
    );
    return;
  }

  const startDate = changelogData.startDate!;
  const endDate = changelogData.endDate!;

  console.log(`Provider: ${provider}`);
  console.log(`Date range: ${startDate} ~ ${endDate}`);
  console.log(`Active entries: ${activeData.length}`);
  console.log(`Highlights: ${summary.highlights.length}`);
  console.log(`Categories: ${summary.categories?.length ?? 0}`);
  console.log(`Dry run: ${dryRun}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would create discussion with the following:");
    console.log(`  Owner: ${owner}`);
    console.log(`  Repo: ${repo}`);
    console.log(`  Category: ${categoryName}`);
    console.log(`  Provider: ${provider}`);
    return;
  }

  // Discussion作成
  const result = await createProviderWeeklyDiscussion(
    token,
    owner,
    repo,
    categoryName,
    provider,
    summary,
    activeData,
    startDate,
    endDate,
  );

  console.log(`\nDiscussion created successfully!`);
  console.log(`URL: ${result.url}`);
}

if (import.meta.main) {
  main();
}
