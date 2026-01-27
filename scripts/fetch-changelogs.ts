import { Octokit } from "@octokit/rest";
import type {
  ChangelogData,
  ChangelogEntry,
  ReleaseEntry,
  XmlCategory,
} from "./domain/types.ts";
import { isRecent, isWithinDays } from "./domain/date-filter.ts";
import {
  applyMuteFilter,
  isMuted,
  parseMuteWords,
} from "./domain/mute-filter.ts";
import {
  extractLabelsFromAWSCategory,
  extractLabelsFromCategories,
} from "./domain/label-extractor.ts";
import type { ContentCategory } from "./domain/providers/types.ts";
import {
  applyMuteFilterToAll,
  fetchByCategory,
  getProviderDisplayName,
  getProvidersByCategory,
  getTotalEntryCount,
  hasNoEntries,
  toBlogData,
  toChangelogData,
} from "./domain/providers/index.ts";

// 後方互換性のため型と関数を再エクスポート
export type { ChangelogData, ChangelogEntry, ReleaseEntry, XmlCategory };
export {
  applyMuteFilter,
  extractLabelsFromAWSCategory,
  extractLabelsFromCategories,
  isMuted,
  isRecent,
  isWithinDays,
  parseMuteWords,
};

// 1日のミリ秒数
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// GitHub Actions用の出力を書き込む
export function writeGitHubOutput(key: string, value: string): void {
  const outputFile = Deno.env.get("GITHUB_OUTPUT");
  if (!outputFile) {
    console.warn(
      `GITHUB_OUTPUT is not set; skipping write for key "${key}".`,
    );
    return;
  }

  try {
    Deno.writeTextFileSync(outputFile, `${key}=${value}\n`, { append: true });
  } catch (error) {
    console.warn(
      `Failed to write GitHub Actions output for key "${key}" to "${outputFile}":`,
      error,
    );
  }
}

// カテゴリオプションの型
type CategoryOption = ContentCategory | "all";

// コマンドライン引数からオプションを取得
interface ParsedArgs {
  targetDate: Date;
  days: number;
  weekly: boolean;
  category: CategoryOption;
}

function parseArgs(args: string[]): ParsedArgs {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const weeklyArg = args.includes("--weekly");
  const categoryArg = args.find((arg) => arg.startsWith("--category="));

  let targetDate: Date;
  if (dateArg) {
    const dateStr = dateArg.split("=")[1];
    // cronスケジュール（UTC 3:00）と同じ時刻を使用
    // これにより、workflow_dispatchで過去の日付を指定した場合も
    // cronと同じ24時間ウィンドウでデータを収集できる
    targetDate = new Date(dateStr + "T03:00:00Z");
  } else {
    targetDate = new Date();
  }

  let days = 1; // デフォルト: 1日
  if (daysArg) {
    const parsedDays = parseInt(daysArg.split("=")[1], 10);
    if (!isNaN(parsedDays) && parsedDays > 0) {
      days = parsedDays;
    }
  }

  // カテゴリの解析（デフォルト: all）
  let category: CategoryOption = "all";
  if (categoryArg) {
    const categoryValue = categoryArg.split("=")[1];
    if (
      categoryValue === "changelog" || categoryValue === "blog" ||
      categoryValue === "all"
    ) {
      category = categoryValue;
    } else {
      console.warn(`Invalid category: ${categoryValue}. Using "all".`);
    }
  }

  return { targetDate, days, weekly: weeklyArg, category };
}

// コマンドライン引数から日付を取得（後方互換性のため）
function parseTargetDate(args: string[]): Date {
  return parseArgs(args).targetDate;
}
// エクスポートしてテストから使用可能にする
export { parseTargetDate as parseDate };

// GitHub Issueからミュートワードのリストを取得
export async function fetchMuteWords(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string[]> {
  try {
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    if (!issue.body) {
      console.warn(`Issue #${issueNumber} has no body`);
      return [];
    }

    const muteWords = parseMuteWords(issue.body);
    console.log(
      `Loaded ${muteWords.length} mute words from issue #${issueNumber}`,
    );
    return muteWords;
  } catch (error) {
    console.warn(
      `Failed to fetch mute words from issue #${issueNumber}:`,
      error,
    );
    return [];
  }
}

// Changelogカテゴリのデータを取得・保存
async function processChangelog(
  targetDate: Date,
  days: number,
  weekly: boolean,
  dateString: string,
  muteWords: string[],
): Promise<void> {
  console.log("\n--- Processing Changelog ---");

  // changelogカテゴリのプロバイダーからデータを取得
  let results = await fetchByCategory("changelog", targetDate, days);

  // ミュートフィルタを適用
  if (muteWords.length > 0) {
    const { filtered, mutedCount } = applyMuteFilterToAll(results, muteWords);
    results = filtered;
    if (mutedCount > 0) {
      console.log(`Muted ${mutedCount} changelog entries`);
    }
  }

  // 更新がない場合はスキップ
  if (hasNoEntries(results)) {
    console.log(`No changelog updates found in the last ${days} day(s).`);
    // GitHub Actions向けに全プロバイダーfalseを出力
    for (const config of getProvidersByCategory("changelog")) {
      writeGitHubOutput(`has_${config.id}`, "false");
    }
    return;
  }

  // 週次の場合は開始日・終了日を設定
  const weeklyOptions = (weekly || days > 1)
    ? {
      startDate: new Date(targetDate.getTime() - days * MILLISECONDS_PER_DAY)
        .toISOString().split("T")[0],
      endDate: dateString,
    }
    : undefined;

  const data = toChangelogData(results, dateString, weeklyOptions);

  // 出力先ディレクトリを決定
  const subDir = weekly ? "weekly" : "daily";
  const outputPath = `data/changelogs/${subDir}/${data.date}.json`;
  await Deno.mkdir(`data/changelogs/${subDir}`, { recursive: true });
  await Deno.writeTextFile(outputPath, JSON.stringify(data, null, 2));

  console.log(
    `Saved ${getTotalEntryCount(results)} changelog updates to ${outputPath}`,
  );

  // GitHub Actions向けにプロバイダーごとのデータ有無を出力
  for (const config of getProvidersByCategory("changelog")) {
    const entries = results[config.id] ?? [];
    // muted: true を除いたアクティブエントリ数をカウント
    const activeCount = entries.filter((e) => !e.muted).length;
    const hasData = activeCount > 0;
    writeGitHubOutput(`has_${config.id}`, String(hasData));
    console.log(
      `- ${
        getProviderDisplayName(config.id)
      }: ${activeCount} active entries (has_${config.id}=${hasData})`,
    );
  }
}

// Blogカテゴリのデータを取得・保存
async function processBlog(
  targetDate: Date,
  days: number,
  weekly: boolean,
  dateString: string,
  muteWords: string[],
): Promise<void> {
  console.log("\n--- Processing Blog ---");

  // blogカテゴリのプロバイダーからデータを取得
  let results = await fetchByCategory("blog", targetDate, days);

  // ミュートフィルタを適用
  if (muteWords.length > 0) {
    const { filtered, mutedCount } = applyMuteFilterToAll(results, muteWords);
    results = filtered;
    if (mutedCount > 0) {
      console.log(`Muted ${mutedCount} blog entries`);
    }
  }

  // 更新がない場合はスキップ
  if (hasNoEntries(results)) {
    console.log(`No blog updates found in the last ${days} day(s).`);
    return;
  }

  // 週次の場合は開始日・終了日を設定
  const weeklyOptions = (weekly || days > 1)
    ? {
      startDate: new Date(targetDate.getTime() - days * MILLISECONDS_PER_DAY)
        .toISOString().split("T")[0],
      endDate: dateString,
    }
    : undefined;

  const data = toBlogData(results, dateString, weeklyOptions);

  // 出力先ディレクトリを決定
  const subDir = weekly ? "weekly" : "daily";
  const outputPath = `data/blogs/${subDir}/${data.date}.json`;
  await Deno.mkdir(`data/blogs/${subDir}`, { recursive: true });
  await Deno.writeTextFile(outputPath, JSON.stringify(data, null, 2));

  console.log(
    `Saved ${getTotalEntryCount(results)} blog updates to ${outputPath}`,
  );
  for (const config of getProvidersByCategory("blog")) {
    const count = results[config.id]?.length ?? 0;
    console.log(`- ${getProviderDisplayName(config.id)}: ${count}`);
  }
}

// メイン処理
async function main() {
  console.log("Fetching content...");

  const { targetDate, days, weekly, category } = parseArgs(Deno.args);
  const dateString = targetDate.toISOString().split("T")[0];
  console.log(`Target date: ${dateString}`);
  console.log(`Days: ${days}`);
  console.log(`Category: ${category}`);
  if (weekly) {
    console.log("Mode: Weekly");
  }

  // ミュートワード機能の準備
  const token = Deno.env.get("GITHUB_TOKEN");
  const muteWordsIssueNumber = Deno.env.get("MUTE_WORDS_ISSUE_NUMBER") || "1";
  const repositoryOwner = Deno.env.get("GITHUB_REPOSITORY_OWNER") ||
    "korosuke613";
  const repositoryName = Deno.env.get("GITHUB_REPOSITORY_NAME") || "mynewshq";
  let muteWords: string[] = [];

  if (token && muteWordsIssueNumber) {
    const authenticatedOctokit = new Octokit({ auth: token });
    const issueNumber = parseInt(muteWordsIssueNumber, 10);
    if (!isNaN(issueNumber)) {
      muteWords = await fetchMuteWords(
        authenticatedOctokit,
        repositoryOwner,
        repositoryName,
        issueNumber,
      );
    } else {
      console.warn(
        `Invalid MUTE_WORDS_ISSUE_NUMBER: ${muteWordsIssueNumber}`,
      );
    }
  }

  // カテゴリに応じて処理を実行
  if (category === "changelog" || category === "all") {
    await processChangelog(targetDate, days, weekly, dateString, muteWords);
  }

  if (category === "blog" || category === "all") {
    await processBlog(targetDate, days, weekly, dateString, muteWords);
  }

  console.log("\nDone!");
}

if (import.meta.main) {
  main();
}
