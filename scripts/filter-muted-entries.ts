#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * ミュート済みエントリをChangelogデータまたはBlogデータから除外するスクリプト
 *
 * 使用方法:
 *   deno task filter-muted --input=<入力ファイル> --output=<出力ファイル>
 *
 * 例:
 *   deno task filter-muted \
 *     --input=data/changelogs/weekly/2026-01-21.json \
 *     --output=data/changelogs/weekly/2026-01-21-filtered.json
 *   deno task filter-muted \
 *     --input=data/blogs/weekly/2026-02-01.json \
 *     --output=data/blogs/weekly/2026-02-01-filtered.json
 */

import type {
  BlogData,
  BlogEntry,
  ChangelogData,
  ChangelogEntry,
  ReleaseEntry,
} from "./domain/types.ts";
import { parseArg } from "./infrastructure/cli-parser.ts";

/**
 * ChangelogEntryからmuted: trueのエントリを除外
 */
export function filterMutedChangelogEntries(
  entries: ChangelogEntry[],
): ChangelogEntry[] {
  return entries.filter((entry) => !entry.muted);
}

/**
 * ReleaseEntryからmuted: trueのエントリを除外
 */
export function filterMutedReleaseEntries(
  entries: ReleaseEntry[],
): ReleaseEntry[] {
  return entries.filter((entry) => !entry.muted);
}

/**
 * BlogEntryからmuted: trueのエントリを除外
 */
export function filterMutedBlogEntries(entries: BlogEntry[]): BlogEntry[] {
  return entries.filter((entry) => !entry.muted);
}

/**
 * ChangelogData全体からmuted: trueのエントリを除外
 */
export function filterMutedFromChangelog(data: ChangelogData): ChangelogData {
  return {
    ...data,
    github: filterMutedChangelogEntries(data.github),
    aws: filterMutedChangelogEntries(data.aws),
    claudeCode: filterMutedReleaseEntries(data.claudeCode),
    githubCli: filterMutedReleaseEntries(data.githubCli),
    linear: filterMutedChangelogEntries(data.linear),
  };
}

/**
 * BlogData全体からmuted: trueのエントリを除外
 */
export function filterMutedFromBlog(data: BlogData): BlogData {
  return {
    ...data,
    hatenaBookmark: filterMutedBlogEntries(data.hatenaBookmark),
    githubBlog: filterMutedBlogEntries(data.githubBlog),
    awsBlog: filterMutedBlogEntries(data.awsBlog),
  };
}

/**
 * 統計情報を出力
 */
function printFilterStats(
  stats: Record<string, { before: number; after: number }>,
): void {
  console.log("フィルタリング結果:");
  for (const [provider, stat] of Object.entries(stats)) {
    const removed = stat.before - stat.after;
    if (removed > 0) {
      console.log(
        `  ${provider}: ${stat.before} -> ${stat.after} (${removed}件ミュート除外)`,
      );
    } else {
      console.log(`  ${provider}: ${stat.after}件 (ミュートなし)`);
    }
  }
}

/**
 * コマンドライン引数をパース
 */
function parseArgs(args: string[]): { input: string; output: string } {
  const input = parseArg(args, "input");
  const output = parseArg(args, "output");

  if (!input || !output) {
    console.error(
      "使用方法: deno task filter-muted --input=<入力> --output=<出力>",
    );
    Deno.exit(1);
  }

  return { input, output };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const { input, output } = parseArgs(Deno.args);

  // 入力ファイルのパスからChangelogかBlogかを判定
  // パスを正規化して data/blogs/ 配下かどうかを判定
  const normalizedPath = input.replace(/\\/g, "/");
  const isBlogData = normalizedPath.includes("data/blogs/");

  // 入力ファイルを読み込み
  let rawContent: string;
  try {
    rawContent = await Deno.readTextFile(input);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`入力ファイルが見つかりません: ${input}`);
    } else {
      console.error(`入力ファイルの読み込みに失敗: ${input}`);
    }
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }

  if (isBlogData) {
    // Blogデータの処理
    let data: BlogData;
    try {
      data = JSON.parse(rawContent) as BlogData;
    } catch (error) {
      console.error(`入力ファイルのJSONパースに失敗: ${input}`);
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }

    // ミュート済みエントリを除外
    const filteredData = filterMutedFromBlog(data);

    // 統計情報を出力
    const stats = {
      hatenaBookmark: {
        before: data.hatenaBookmark.length,
        after: filteredData.hatenaBookmark.length,
      },
      githubBlog: {
        before: data.githubBlog.length,
        after: filteredData.githubBlog.length,
      },
      awsBlog: {
        before: data.awsBlog.length,
        after: filteredData.awsBlog.length,
      },
    };

    printFilterStats(stats);

    // 出力ファイルに書き込み
    try {
      await Deno.writeTextFile(output, JSON.stringify(filteredData, null, 2));
      console.log(`\n出力ファイル: ${output}`);
    } catch (error) {
      console.error(`出力ファイルの書き込みに失敗: ${output}`);
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }
  } else {
    // Changelogデータの処理
    let data: ChangelogData;
    try {
      data = JSON.parse(rawContent) as ChangelogData;
      // 後方互換性: githubCli フィールドが存在しない古いJSONデータに対応
      if (!data.githubCli) data.githubCli = [];
    } catch (error) {
      console.error(`入力ファイルのJSONパースに失敗: ${input}`);
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }

    // ミュート済みエントリを除外
    const filteredData = filterMutedFromChangelog(data);

    // 統計情報を出力
    const stats = {
      github: {
        before: data.github.length,
        after: filteredData.github.length,
      },
      aws: { before: data.aws.length, after: filteredData.aws.length },
      claudeCode: {
        before: data.claudeCode.length,
        after: filteredData.claudeCode.length,
      },
      githubCli: {
        before: data.githubCli.length,
        after: filteredData.githubCli.length,
      },
      linear: { before: data.linear.length, after: filteredData.linear.length },
    };

    printFilterStats(stats);

    // 出力ファイルに書き込み
    try {
      await Deno.writeTextFile(output, JSON.stringify(filteredData, null, 2));
      console.log(`\n出力ファイル: ${output}`);
    } catch (error) {
      console.error(`出力ファイルの書き込みに失敗: ${output}`);
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }
  }
}

// スクリプトとして実行された場合のみmain()を呼び出し
if (import.meta.main) {
  main();
}
