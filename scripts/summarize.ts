#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env
/**
 * ローカル要約生成スクリプト
 *
 * Claude Code CLIを使ってローカルで要約JSONを生成する
 *
 * 使用例:
 *   deno task summarize --date=2026-01-15
 *   deno task summarize --date=2026-01-15 --category=blog
 *   deno task summarize --date=2026-01-15 --output=/tmp/summaries.json
 *   deno task summarize --date=2026-01-15 --dry-run
 */

import { parseArgs } from "@std/cli/parse-args";
import { resolve } from "@std/path/resolve";
import { exists } from "@std/fs/exists";
import {
  DAILY_BLOG_SCHEMA,
  DAILY_CHANGELOG_SCHEMA,
  getDailyBlogPrompt,
  getDailyChangelogPrompt,
  getWeeklyBlogPrompt,
  getWeeklyChangelogPrompt,
  WEEKLY_BLOG_SCHEMA,
  WEEKLY_CATEGORIZED_SCHEMA,
  WEEKLY_SIMPLE_SCHEMA,
} from "./domain/summarize/prompts.ts";
import {
  executeClaudeCli,
  isClaudeCliAvailable,
} from "./infrastructure/claude-cli.ts";

interface CliArgs {
  date?: string;
  category?: "changelog" | "blog";
  output?: string;
  "dry-run"?: boolean;
  weekly?: boolean;
  provider?:
    | "github"
    | "aws"
    | "claudeCode"
    | "githubCli"
    | "linear"
    | "hatenaBookmark"
    | "githubBlog"
    | "awsBlog"
    | "hackerNews";
  "past-discussions"?: string;
  help?: boolean;
}

function showHelp() {
  console.log(`
Usage: deno task summarize [OPTIONS]

Options:
  --date=YYYY-MM-DD           対象日付（必須）
  --category=TYPE             カテゴリ（changelog | blog）デフォルト: changelog
  --weekly                    週次モード（プロバイダー指定必須）
  --provider=PROVIDER         週次モード用プロバイダー
                              Changelog: github | aws | claudeCode | githubCli | linear
                              Blog: hatenaBookmark | githubBlog | awsBlog | hackerNews
  --past-discussions=PATH     過去Discussionファイルパス（週次Changelog用、オプション）
  --output=PATH               出力ファイルパス（指定しない場合は標準出力）
  --dry-run                   プロンプトを表示するだけで実行しない
  --help                      このヘルプを表示

Examples:
  # 日次Changelog要約
  deno task summarize --date=2026-01-15

  # 日次Blog要約
  deno task summarize --date=2026-01-15 --category=blog

  # 週次Changelog要約（プロバイダー指定）
  deno task summarize --date=2026-02-01 --weekly --provider=github
  deno task summarize --date=2026-02-01 --weekly --provider=aws

  # 週次Blog要約（プロバイダー指定）
  deno task summarize --date=2026-02-01 --weekly --provider=hatenaBookmark
  deno task summarize --date=2026-02-01 --weekly --provider=githubBlog
  deno task summarize --date=2026-02-01 --weekly --provider=awsBlog
  deno task summarize --date=2026-02-01 --weekly --provider=hackerNews

  # 週次Changelog要約（過去Discussion参照あり）
  deno task summarize --date=2026-02-01 --weekly --provider=github \\
    --past-discussions=data/past-discussions.json

  # ファイル出力
  deno task summarize --date=2026-01-15 --output=/tmp/summaries.json

  # dry-run
  deno task summarize --date=2026-01-15 --dry-run
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["date", "category", "output", "provider", "past-discussions"],
    boolean: ["dry-run", "help", "weekly"],
    default: {
      category: "changelog",
      "dry-run": false,
      weekly: false,
    },
  }) as CliArgs;

  if (args.help) {
    showHelp();
    Deno.exit(0);
  }

  // 日付チェック
  if (!args.date) {
    console.error("Error: --date is required");
    console.error("Run with --help for usage information");
    Deno.exit(1);
  }

  const category = args.category || "changelog";
  const isWeekly = args.weekly || false;

  // 週次モードのバリデーション
  if (isWeekly) {
    if (!args.provider) {
      console.error("Error: --provider is required for weekly mode");
      if (category === "changelog") {
        console.error(
          "Available providers: github, aws, claudeCode, githubCli, linear",
        );
      } else {
        console.error(
          "Available providers: hatenaBookmark, githubBlog, awsBlog, hackerNews",
        );
      }
      Deno.exit(1);
    }

    // プロバイダーとカテゴリの整合性チェック
    const changelogProviders = [
      "github",
      "aws",
      "claudeCode",
      "githubCli",
      "linear",
    ];
    const blogProviders = [
      "hatenaBookmark",
      "githubBlog",
      "awsBlog",
      "hackerNews",
    ];

    if (
      category === "changelog" && !changelogProviders.includes(args.provider)
    ) {
      console.error(
        `Error: Provider '${args.provider}' is not valid for changelog category`,
      );
      console.error(
        "Available providers: github, aws, claudeCode, githubCli, linear",
      );
      Deno.exit(1);
    }

    if (category === "blog" && !blogProviders.includes(args.provider)) {
      console.error(
        `Error: Provider '${args.provider}' is not valid for blog category`,
      );
      console.error(
        "Available providers: hatenaBookmark, githubBlog, awsBlog, hackerNews",
      );
      Deno.exit(1);
    }
  }

  // データファイルパス
  let dataFile: string;
  if (isWeekly) {
    // 週次モード: フィルタリング済みJSONを使用
    const dataDir = category === "changelog"
      ? "data/changelogs/weekly"
      : "data/blogs/weekly";
    dataFile = resolve(
      Deno.cwd(),
      dataDir,
      `${args.date}-filtered.json`,
    );
  } else {
    // 日次モード
    const dataDir = category === "changelog"
      ? "data/changelogs/daily"
      : "data/blogs/daily";
    dataFile = resolve(Deno.cwd(), dataDir, `${args.date}.json`);
  }

  // データファイル存在確認
  if (!await exists(dataFile)) {
    console.error(`Error: Data file not found: ${dataFile}`);
    if (isWeekly) {
      if (category === "changelog") {
        console.error(
          `Hint: Run 'GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly --date=${args.date}' first`,
        );
        console.error(
          `      Then run 'deno task filter-muted --input=data/changelogs/weekly/${args.date}.json --output=data/changelogs/weekly/${args.date}-filtered.json'`,
        );
      } else {
        console.error(
          `Hint: Run 'GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly-blog --date=${args.date}' first`,
        );
        console.error(
          `      Then run 'deno task filter-muted --input=data/blogs/weekly/${args.date}.json --output=data/blogs/weekly/${args.date}-filtered.json'`,
        );
      }
    } else {
      console.error(
        `Hint: Run 'deno task fetch --date=${args.date} --category=${category}' first`,
      );
    }
    Deno.exit(1);
  }

  // プロンプトとスキーマ取得
  let prompt: string;
  let schema: object;

  if (isWeekly) {
    // 週次モード
    const provider = args.provider!;

    if (category === "changelog") {
      // 週次Changelog
      prompt = getWeeklyChangelogPrompt(
        dataFile,
        provider,
        args["past-discussions"],
      );

      // プロバイダーに応じてスキーマを選択
      // github, aws: CATEGORIZED_SCHEMA
      // claudeCode, githubCli, linear: SIMPLE_SCHEMA
      schema = (provider === "github" || provider === "aws")
        ? WEEKLY_CATEGORIZED_SCHEMA
        : WEEKLY_SIMPLE_SCHEMA;
    } else {
      // 週次Blog
      prompt = getWeeklyBlogPrompt(dataFile, provider);
      schema = WEEKLY_BLOG_SCHEMA;
    }
  } else {
    // 日次モード
    prompt = category === "changelog"
      ? getDailyChangelogPrompt(dataFile)
      : getDailyBlogPrompt(dataFile);

    schema = category === "changelog"
      ? DAILY_CHANGELOG_SCHEMA
      : DAILY_BLOG_SCHEMA;
  }

  // dry-runモード
  if (args["dry-run"]) {
    console.log("=== Dry Run Mode ===");
    console.log("\nMode:", isWeekly ? "weekly" : "daily");
    console.log("Category:", category);
    if (isWeekly) {
      console.log("Provider:", args.provider);
      if (args["past-discussions"]) {
        console.log("Past Discussions:", args["past-discussions"]);
      }
    }
    console.log("Data File:", dataFile);
    console.log("\nPrompt:");
    console.log("---");
    console.log(prompt);
    console.log("---");
    console.log("\nJSON Schema:");
    console.log(JSON.stringify(schema, null, 2));
    Deno.exit(0);
  }

  // Claude CLI利用可能性チェック
  if (!await isClaudeCliAvailable()) {
    console.error(
      "Error: Claude Code CLI is not installed or not available in PATH",
    );
    console.error(
      "Install: npm install -g @anthropics/claude-code",
    );
    console.error(
      "Or visit: https://github.com/anthropics/claude-code",
    );
    Deno.exit(1);
  }

  // Claude CLI実行
  if (isWeekly) {
    console.error(
      `Generating weekly ${args.provider} summaries for ${args.date}...`,
    );
  } else {
    console.error(`Generating ${category} summaries for ${args.date}...`);
  }
  console.error("This may take a few minutes...\n");

  const result = await executeClaudeCli({
    prompt,
    jsonSchema: schema,
    timeout: 300000, // 5分
  });

  if (!result.success) {
    console.error("Error: Claude Code CLI execution failed");
    console.error(result.error || "Unknown error");
    Deno.exit(1);
  }

  if (!result.output) {
    console.error("Error: No output from Claude Code CLI");
    Deno.exit(1);
  }

  // 出力
  if (args.output) {
    await Deno.writeTextFile(args.output, result.output);
    console.error(`\nSummaries written to: ${args.output}`);
  } else {
    console.log(result.output);
  }

  console.error("\nDone!");
}

if (import.meta.main) {
  main();
}
