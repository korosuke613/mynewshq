// プロバイダー単位でWeekly Discussionのプレビューを生成するスクリプト

import type {
  ChangelogData,
  ChangelogEntry,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "./domain/types.ts";
import {
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
} from "./presentation/markdown/weekly-generator.ts";

interface PreviewWeeklyProviderArgs {
  date: string;
  provider: string;
  summariesFile: string | null;
  outputFile: string | null;
}

function parseArgs(args: string[]): PreviewWeeklyProviderArgs {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const providerArg = args.find((arg) => arg.startsWith("--provider="));
  const summariesFileArg = args.find((arg) =>
    arg.startsWith("--summaries-file=")
  );
  const outputArg = args.find((arg) => arg.startsWith("--output="));

  const date = dateArg
    ? dateArg.split("=")[1]
    : new Date().toISOString().split("T")[0];

  const provider = providerArg ? providerArg.split("=")[1] : "";
  if (!provider) {
    console.error("Error: --provider is required");
    console.error(
      "Usage: deno task preview-weekly-provider --provider=github --date=2026-01-20",
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
    outputFile: outputArg ? outputArg.split("=")[1] : null,
  };
}

// ダミーの要約データを生成（要約ファイルがない場合のプレビュー用）
function generateDummySummary(
  providerId: string,
  data: ChangelogEntry[] | ReleaseEntry[],
): ProviderWeeklySummary {
  const hasCategories = providerId === "github" || providerId === "aws";
  const entries = data
    .filter((entry) => ("muted" in entry ? !entry.muted : true))
    .map((entry) => ({
      url: "url" in entry ? entry.url : "",
      title: "title" in entry
        ? entry.title
        : ("version" in entry ? entry.version : "Unknown"),
    }));

  const summary: ProviderWeeklySummary = {
    providerId,
    highlights: [
      "[プレビュー] 今週のハイライト1がここに入ります",
      "[プレビュー] 今週のハイライト2がここに入ります",
      "[プレビュー] 今週のハイライト3がここに入ります",
    ],
  };

  if (hasCategories) {
    // GitHub/AWSの場合はカテゴリ分類
    summary.categories = [
      {
        category: "その他",
        entries: entries.slice(0, 5),
        comment: "[プレビュー] カテゴリのコメントがここに入ります",
        historicalContext: "[プレビュー] 過去との比較がここに入ります",
      },
    ];
  } else {
    // Claude Code/Linearの場合はエントリリスト
    summary.entries = entries;
    summary.overallComment = "[プレビュー] 全体コメントがここに入ります";
    summary.historicalContext = "[プレビュー] 過去との比較がここに入ります";
  }

  return summary;
}

async function main() {
  const { date, provider, summariesFile, outputFile } = parseArgs(Deno.args);

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

  // プロバイダーのデータを取得
  const providerData = changelogData[
    provider as keyof Pick<
      ChangelogData,
      "github" | "aws" | "claudeCode" | "linear"
    >
  ] as ChangelogEntry[] | ReleaseEntry[];

  // 要約データを読み込む（ない場合はダミーを生成）
  let summary: ProviderWeeklySummary;
  if (summariesFile) {
    try {
      const summaryContent = await Deno.readTextFile(summariesFile);
      summary = JSON.parse(summaryContent);
    } catch (error) {
      console.error(`Failed to read summaries file ${summariesFile}:`, error);
      console.log("Using dummy summary data for preview...");
      summary = generateDummySummary(provider, providerData);
    }
  } else {
    console.log(
      "No --summaries-file provided. Using dummy summary data for preview...",
    );
    summary = generateDummySummary(provider, providerData);
  }

  const { startDate, endDate } = changelogData;
  if (!startDate || !endDate) {
    console.error(
      "Error: startDate and endDate must be defined in changelogData to generate a weekly preview.",
    );
    Deno.exit(1);
  }

  // タイトルとボディを生成
  const title = generateProviderWeeklyTitle(provider, endDate);
  const body = generateProviderWeeklyBody(
    provider,
    providerData,
    summary,
    startDate,
    endDate,
  );

  const output = `# Preview: ${title}\n\n---\n\n${body}`;

  if (outputFile) {
    await Deno.writeTextFile(outputFile, output);
    console.log(`Preview saved to: ${outputFile}`);
  } else {
    console.log(output);
  }
}

if (import.meta.main) {
  main();
}
