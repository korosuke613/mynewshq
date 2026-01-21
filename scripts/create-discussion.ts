import { graphql } from "@octokit/graphql";
import type {
  ChangelogData,
  ChangelogEntry,
  DailyLink,
  ReleaseEntry,
  SummaryData,
  WeeklySummaryData,
} from "./domain/types.ts";
import { determineLabels, stripAwsPrefix } from "./domain/label-extractor.ts";
import {
  generateBodyWithSummaries,
  generateCoveragePeriod,
  generateDefaultBody,
  generateTitle,
  generateWeeklyCoveragePeriod,
} from "./presentation/markdown/daily-generator.ts";
import { generateWeeklyBodyWithSummaries } from "./presentation/markdown/weekly-generator.ts";
import {
  generateMention,
  getCategoryEmoji,
} from "./presentation/markdown/helpers.ts";
import { generateMutedSection } from "./presentation/markdown/muted-section.ts";

// 後方互換性のため型と関数を再エクスポート
export type {
  ChangelogData,
  ChangelogEntry,
  DailyLink,
  ReleaseEntry,
  SummaryData,
  WeeklySummaryData,
};
export {
  determineLabels,
  generateBodyWithSummaries,
  generateCoveragePeriod,
  generateDefaultBody,
  generateMention,
  generateMutedSection,
  generateTitle,
  generateWeeklyBodyWithSummaries,
  generateWeeklyCoveragePeriod,
  getCategoryEmoji,
  stripAwsPrefix,
};

// GraphQL API用の内部型定義
interface DiscussionCategory {
  id: string;
  name: string;
}

interface Label {
  id: string;
  name: string;
}

interface RepositoryData {
  repository: {
    id: string;
    discussionCategories: {
      nodes: DiscussionCategory[];
    };
    labels: {
      nodes: Label[];
    };
  };
}

interface CreateDiscussionResult {
  createDiscussion: {
    discussion: {
      id: string;
      url: string;
    };
  };
}

interface AddLabelsResult {
  addLabelsToLabelable: {
    labelable: {
      labels: {
        nodes: Label[];
      };
    };
  };
}

// ランダムな16進数の色を生成（アクセシブルな色のリストから選択）
const ACCESSIBLE_LABEL_COLORS: string[] = [
  "0e8a16", // green
  "1d76db", // blue
  "d93f0b", // orange
  "6f42c1", // purple
  "0052cc", // dark blue
  "b60205", // dark red
  "5319e7", // indigo
  "0366d6", // bright blue
  "22863a", // dark green
  "b31d28", // dark crimson
];

function getRandomHexColor(): string {
  const index = Math.floor(Math.random() * ACCESSIBLE_LABEL_COLORS.length);
  return ACCESSIBLE_LABEL_COLORS[index];
}

// 新しいラベルを作成し、そのIDを返す
async function createNewLabel(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  name: string,
): Promise<string> {
  const { createLabel } = await graphqlWithAuth<{
    createLabel: { label: { id: string } };
  }>(
    `
    mutation($repositoryId: ID!, $name: String!, $color: String!) {
      createLabel(input: {
        repositoryId: $repositoryId
        name: $name
        color: $color
      }) {
        label {
          id
        }
      }
    }
  `,
    {
      repositoryId,
      name,
      color: getRandomHexColor(),
    },
  );
  return createLabel.label.id;
}

// DiscussionにラベルIDsを追加
async function addLabelsToDiscussion(
  graphqlWithAuth: typeof graphql,
  discussionId: string,
  labelIds: string[],
): Promise<void> {
  if (labelIds.length === 0) {
    return;
  }

  await graphqlWithAuth<AddLabelsResult>(
    `
    mutation($labelableId: ID!, $labelIds: [ID!]!) {
      addLabelsToLabelable(input: {
        labelableId: $labelableId
        labelIds: $labelIds
      }) {
        labelable {
          ... on Discussion {
            id
            labels(first: 10) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `,
    {
      labelableId: discussionId,
      labelIds,
    },
  );
}

// Daily Discussion のリンクを期間内で取得
export async function fetchDailyDiscussionLinks(
  token: string,
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
): Promise<DailyLink[]> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  // Generalカテゴリの最新Discussionを取得
  interface DiscussionNode {
    title: string;
    url: string;
    createdAt: string;
  }

  interface DiscussionSearchResult {
    repository: {
      discussions: {
        nodes: DiscussionNode[];
      };
    };
  }

  const result = await graphqlWithAuth<DiscussionSearchResult>(
    `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            title
            url
            createdAt
          }
        }
      }
    }
  `,
    { owner, repo },
  );

  const discussions = result.repository.discussions.nodes;
  const dailyLinks: DailyLink[] = [];

  // "📰 Tech Changelog - YYYY-MM-DD" 形式のタイトルをパースして期間内をフィルタ
  const dailyTitlePattern = /📰 Tech Changelog - (\d{4}-\d{2}-\d{2})$/;

  for (const discussion of discussions) {
    const match = discussion.title.match(dailyTitlePattern);
    if (match) {
      const date = match[1];
      // 期間内かどうかをチェック（startDate <= date <= endDate）
      if (date >= startDate && date <= endDate) {
        dailyLinks.push({
          date,
          url: discussion.url,
          title: discussion.title,
        });
      }
    }
  }

  return dailyLinks;
}

// GitHub GraphQL APIでDiscussion作成
async function createDiscussion(
  token: string,
  owner: string,
  repo: string,
  categoryName: string,
  title: string,
  body: string,
  changelogData?: ChangelogData,
): Promise<string> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  // リポジトリIDとカテゴリID、ラベル一覧を取得
  const repoData = await graphqlWithAuth<RepositoryData>(
    `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        discussionCategories(first: 10) {
          nodes {
            id
            name
          }
        }
        labels(first: 100) {
          nodes {
            id
            name
          }
        }
      }
    }
  `,
    { owner, repo },
  );

  const repositoryId = repoData.repository.id;
  const category = repoData.repository.discussionCategories.nodes.find(
    (c) => c.name === categoryName,
  );

  if (!category) {
    throw new Error(
      `Category "${categoryName}" not found. Available categories: ${
        repoData.repository.discussionCategories.nodes
          .map((c) => c.name)
          .join(", ")
      }`,
    );
  }

  // Discussion作成
  const result = await graphqlWithAuth<CreateDiscussionResult>(
    `
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repositoryId
        categoryId: $categoryId
        title: $title
        body: $body
      }) {
        discussion {
          id
          url
        }
      }
    }
  `,
    {
      repositoryId,
      categoryId: category.id,
      title,
      body,
    },
  );

  const discussionId = result.createDiscussion.discussion.id;
  const discussionUrl = result.createDiscussion.discussion.url;

  // ラベル付与処理
  if (changelogData) {
    // 週次レポートの場合はサービス名ラベルのみを付与（サブカテゴリラベルは除外）
    const isWeekly = !!(changelogData.startDate && changelogData.endDate);
    const labelNames = determineLabels(changelogData, {
      serviceOnly: isWeekly,
    });
    if (labelNames.length > 0) {
      const existingLabels = new Map(
        repoData.repository.labels.nodes.map((l) => [l.name, l.id]),
      );

      const labelIdPromises = labelNames.map(async (name) => {
        if (existingLabels.has(name)) {
          return existingLabels.get(name)!;
        } else {
          try {
            console.log(`Label "${name}" not found. Creating it...`);
            const newLabelId = await createNewLabel(
              graphqlWithAuth,
              repositoryId,
              name,
            );
            existingLabels.set(name, newLabelId); // 後続の重複作成を防ぐためマップに追加
            return newLabelId;
          } catch (error) {
            if (error instanceof Error) {
              console.warn(
                `Warning: Failed to create label "${name}":`,
                error.message,
              );
              if (error.stack) {
                console.error(
                  `Stack trace for failure while creating label "${name}":`,
                  error.stack,
                );
              }
            } else {
              console.warn(
                `Warning: Failed to create label "${name}" with unknown error:`,
                error,
              );
            }
            return null;
          }
        }
      });

      const labelIdResults = await Promise.all(labelIdPromises);
      const labelIds = labelIdResults.filter((
        id,
      ): id is string => id !== null);

      const failedLabelNames = labelNames.filter(
        (_labelName, index) => labelIdResults[index] === null,
      );
      if (failedLabelNames.length > 0) {
        console.error(
          `The following labels could not be created and will not be added to the discussion: ${
            failedLabelNames.join(
              ", ",
            )
          }`,
        );
      }

      if (labelIds.length > 0) {
        try {
          await addLabelsToDiscussion(graphqlWithAuth, discussionId, labelIds);
          console.log(`Labels added: ${labelNames.join(", ")}`);
        } catch (error) {
          console.error(
            `Failed to add labels to discussion ${discussionId}:`,
            error,
          );
        }
      }
    }
  }

  return discussionUrl;
}

// コマンドライン引数から日付と要約JSONを取得し、フラグ以外の引数を返す
export function parseArgs(
  args: string[],
): {
  date: string;
  summariesJson: string | null;
  weekly: boolean;
  otherArgs: string[];
} {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const summariesJsonArg = args.find((arg) =>
    arg.startsWith("--summaries-json=")
  );
  const weeklyArg = args.includes("--weekly");
  const otherArgs = args.filter(
    (arg) =>
      !arg.startsWith("--date=") &&
      !arg.startsWith("--summaries-json=") &&
      arg !== "--weekly",
  );

  let date: string;
  if (dateArg) {
    date = dateArg.split("=")[1];
  } else {
    date = new Date().toISOString().split("T")[0];
  }

  let summariesJson: string | null = null;
  if (summariesJsonArg) {
    summariesJson = summariesJsonArg.substring("--summaries-json=".length);
  }

  return { date, summariesJson, weekly: weeklyArg, otherArgs };
}

// メイン処理
async function main() {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // 引数からリポジトリ情報を取得（デフォルト: korosuke613/mynewshq）
  const { date, summariesJson, weekly, otherArgs } = parseArgs(Deno.args);
  const owner = otherArgs[0] || "korosuke613";
  const repo = otherArgs[1] || "mynewshq";
  const categoryName = otherArgs[2] || "General";

  // 指定された日付のchangelog JSONファイルを取得
  // 週次モードの場合は weekly/ ディレクトリから、日次の場合は daily/ ディレクトリから
  const subDir = weekly ? "weekly" : "daily";
  const changelogPath = `data/changelogs/${subDir}/${date}.json`;

  let changelogData: ChangelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    changelogData = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // 引数から要約を取得（4番目以降の引数をすべて結合）- 後方互換性のため維持
  const legacySummary = otherArgs.slice(3).join(" ");

  const title = generateTitle(changelogData);
  let body: string;

  if (weekly) {
    // 週次モード: WeeklySummaryData を使用（--summaries-json 必須）
    if (!summariesJson) {
      console.error("週次モードでは --summaries-json が必須です");
      Deno.exit(1);
    }
    try {
      const summaries: WeeklySummaryData = JSON.parse(summariesJson);
      const dailyLinks = await fetchDailyDiscussionLinks(
        token,
        owner,
        repo,
        changelogData.startDate!,
        changelogData.endDate!,
      );
      body =
        generateWeeklyBodyWithSummaries(changelogData, summaries, dailyLinks) +
        generateMention();
      console.log("Using weekly structured summaries JSON");
      console.log(`Found ${dailyLinks.length} daily discussion links`);
    } catch (error) {
      console.error("Failed to parse weekly summaries JSON:", error);
      Deno.exit(1);
    }
  } else if (summariesJson) {
    // 日次モード: 既存の SummaryData を使用
    try {
      const summaries: SummaryData = JSON.parse(summariesJson);
      body = generateBodyWithSummaries(changelogData, summaries) +
        generateMention();
      console.log("Using structured summaries JSON");
    } catch (error) {
      console.error("Failed to parse summaries JSON:", error);
      console.error("Falling back to default body generation");
      body = generateDefaultBody(changelogData) + generateMention();
    }
  } else if (legacySummary) {
    // 従来の要約文字列が指定された場合（後方互換性）
    const isWeekly = !!(changelogData.startDate && changelogData.endDate);
    const coveragePeriod = isWeekly
      ? generateWeeklyCoveragePeriod(
        changelogData.startDate!,
        changelogData.endDate!,
      )
      : generateCoveragePeriod(changelogData.date);
    body = coveragePeriod + "\n\n" + legacySummary + generateMention();
  } else {
    // 要約なしの場合
    body = generateDefaultBody(changelogData) + generateMention();
  }

  console.log(`Creating discussion: ${title}`);

  const url = await createDiscussion(
    token,
    owner,
    repo,
    categoryName,
    title,
    body,
    changelogData,
  );

  console.log(`Discussion created: ${url}`);
}

if (import.meta.main) {
  main();
}
