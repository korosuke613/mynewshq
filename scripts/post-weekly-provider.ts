// プロバイダー単位でWeekly Discussionを投稿するスクリプト

import { Octokit } from "@octokit/rest";
import type {
  ChangelogData,
  ChangelogEntry,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "./domain/types.ts";
import { createProviderWeeklyDiscussion } from "./create-discussion.ts";
import { getCategoryNameFromEnv } from "./domain/category-config.ts";

interface PostWeeklyProviderArgs {
  date: string;
  provider: string;
  summariesFile: string | null;
  owner: string;
  repo: string;
  dryRun: boolean;
}

function parseArgs(args: string[]): PostWeeklyProviderArgs {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const providerArg = args.find((arg) => arg.startsWith("--provider="));
  const summariesFileArg = args.find((arg) =>
    arg.startsWith("--summaries-file=")
  );
  const ownerArg = args.find((arg) => arg.startsWith("--owner="));
  const repoArg = args.find((arg) => arg.startsWith("--repo="));
  const dryRunArg = args.includes("--dry-run");

  const date = dateArg
    ? dateArg.split("=")[1]
    : new Date().toISOString().split("T")[0];

  const provider = providerArg ? providerArg.split("=")[1] : "";
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
    summariesFile: summariesFileArg ? summariesFileArg.split("=")[1] : null,
    owner: ownerArg ? ownerArg.split("=")[1] : "korosuke613",
    repo: repoArg ? repoArg.split("=")[1] : "mynewshq",
    dryRun: dryRunArg,
  };
}

async function main() {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  const {
    date,
    provider,
    summariesFile,
    owner,
    repo,
    dryRun,
  } = parseArgs(Deno.args);

  // 週次データを読み込む
  const changelogPath = `data/changelogs/weekly/${date}.json`;
  let changelogData: ChangelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    changelogData = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // 要約データを読み込む
  if (!summariesFile) {
    console.error("Error: --summaries-file is required");
    Deno.exit(1);
  }

  let summary: ProviderWeeklySummary;
  try {
    const summaryContent = await Deno.readTextFile(summariesFile);
    summary = JSON.parse(summaryContent);
  } catch (error) {
    console.error(`Failed to read summaries file ${summariesFile}:`, error);
    Deno.exit(1);
  }

  // カテゴリ名の決定：環境変数から設定を取得
  const octokit = new Octokit({ auth: token });
  const categoryName = await getCategoryNameFromEnv(
    octokit,
    owner,
    repo,
    "changelog",
    true, // 週次処理
  );
  console.log(`Using category from config: ${categoryName}`);

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
