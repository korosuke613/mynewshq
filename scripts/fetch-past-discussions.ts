// 過去のWeekly Discussionを取得するスクリプト
// 全プロバイダーの過去Discussion内容をJSON形式で出力

import {
  fetchAllPastWeeklyDiscussions,
  fetchPastWeeklyDiscussionsByProvider,
} from "./create-discussion.ts";
import type { PastWeeklyDiscussion } from "./domain/types.ts";
import {
  parseArg,
  parseArgWithDefault,
  requireGitHubToken,
} from "./infrastructure/cli-parser.ts";

interface FetchPastDiscussionsArgs {
  owner: string;
  repo: string;
  limit: number;
  outputFile: string | null;
  provider: string | null;
}

function parseArgs(args: string[]): FetchPastDiscussionsArgs {
  const limitArg = parseArg(args, "limit");

  return {
    owner: parseArgWithDefault(args, "owner", "korosuke613"),
    repo: parseArgWithDefault(args, "repo", "mynewshq"),
    limit: limitArg ? parseInt(limitArg, 10) : 2,
    outputFile: parseArg(args, "output") ?? null,
    provider: parseArg(args, "provider") ?? null,
  };
}

async function main() {
  const token = requireGitHubToken();
  const { owner, repo, limit, outputFile, provider } = parseArgs(Deno.args);

  console.log(`Fetching past weekly discussions from ${owner}/${repo}...`);
  console.log(`Limit: ${limit} discussions per provider`);

  let pastDiscussions: Record<string, PastWeeklyDiscussion[]>;

  if (provider) {
    // 単一プロバイダーのみ取得
    console.log(`Provider filter: ${provider}`);
    const discussions = await fetchPastWeeklyDiscussionsByProvider(
      token,
      owner,
      repo,
      provider,
      limit,
    );
    pastDiscussions = { [provider]: discussions };
  } else {
    // 全プロバイダー取得（既存動作）
    pastDiscussions = await fetchAllPastWeeklyDiscussions(
      token,
      owner,
      repo,
      limit,
    );
  }

  // 各プロバイダーの結果を表示
  for (const [providerId, discussions] of Object.entries(pastDiscussions)) {
    console.log(
      `\n${providerId}: ${discussions.length} past discussions found`,
    );
    for (const discussion of discussions) {
      console.log(`  - ${discussion.date}: ${discussion.url}`);
    }
  }

  const jsonOutput = JSON.stringify(pastDiscussions, null, 2);

  if (outputFile) {
    await Deno.writeTextFile(outputFile, jsonOutput);
    console.log(`\nOutput saved to: ${outputFile}`);
  } else {
    console.log("\n--- JSON Output ---");
    console.log(jsonOutput);
  }
}

if (import.meta.main) {
  main();
}
