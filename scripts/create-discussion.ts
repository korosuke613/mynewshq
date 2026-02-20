import { Octokit } from "@octokit/rest";
import type {
  BlogData,
  ChangelogData,
  ChangelogEntry,
  DailyLink,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
  SummaryData,
  WeeklySummaryData,
} from "./domain/types.ts";
import { parseBlogSummariesJson } from "./infrastructure/blog-summary-parser.ts";
import { determineLabels, stripAwsPrefix } from "./domain/label-extractor.ts";
import { getProviderDisplayName } from "./domain/providers/index.ts";
import {
  generateBodyWithSummaries,
  generateDefaultBody,
  generateTitle,
} from "./presentation/markdown/daily-generator.ts";
import {
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
  generateWeeklyBodyWithSummaries,
} from "./presentation/markdown/weekly-generator.ts";
import {
  generateBlogBodyWithSummaries,
  generateBlogTitle,
  generateDefaultBlogBody,
} from "./presentation/markdown/blog-generator.ts";
import {
  generateMention,
  getCategoryEmoji,
} from "./presentation/markdown/helpers.ts";
import { generateMutedSection } from "./presentation/markdown/muted-section.ts";
import {
  DEFAULT_CATEGORY_CONFIG,
  getCategoryName,
  getCategoryNameFromEnv,
} from "./domain/category-config.ts";
import {
  hasFlag,
  parseArg,
  requireGitHubToken,
} from "./infrastructure/cli-parser.ts";
import {
  formatCoveragePeriod,
  formatWeeklyCoveragePeriod,
  getTodayDateString,
} from "./infrastructure/date-utils.ts";
import {
  closeDiscussion as closeDiscussionGraphQL,
  createAuthenticatedGraphQLClient,
  createDiscussion as createDiscussionGraphQL,
  type DiscussionCategory,
  fetchRepositoryData,
} from "./infrastructure/github/graphql-client.ts";
import {
  addLabelsToDiscussion,
  ensureLabelsExist,
} from "./infrastructure/github/label-manager.ts";

// カテゴリオプション
type CategoryOption = "changelog" | "blog";

// 後方互換性のため型と関数を再エクスポート
export type {
  ChangelogData,
  ChangelogEntry,
  DailyLink,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
  SummaryData,
  WeeklySummaryData,
};
export {
  determineLabels,
  formatCoveragePeriod,
  formatWeeklyCoveragePeriod,
  generateBodyWithSummaries,
  generateDefaultBody,
  generateMention,
  generateMutedSection,
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
  generateTitle,
  generateWeeklyBodyWithSummaries,
  getCategoryEmoji,
  stripAwsPrefix,
};

// Discussionをクローズ（外部からの呼び出し用）
export async function closeDiscussion(
  token: string,
  discussionId: string,
): Promise<void> {
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);
  await closeDiscussionGraphQL(graphqlWithAuth, discussionId);
}

// Daily Discussion のリンクを期間内で取得
export async function fetchDailyDiscussionLinks(
  token: string,
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
): Promise<DailyLink[]> {
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);

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

// プロバイダー別に過去のWeekly Discussionを取得
export async function fetchPastWeeklyDiscussionsByProvider(
  token: string,
  owner: string,
  repo: string,
  providerId: string,
  limit: number = 2,
): Promise<PastWeeklyDiscussion[]> {
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);

  // プロバイダー名を取得
  const displayName = getProviderDisplayName(providerId);
  if (displayName === providerId) {
    // getProviderDisplayNameは未知のIDの場合はID自体を返す
    console.warn(`Unknown provider ID: ${providerId}`);
    return [];
  }

  interface DiscussionNode {
    title: string;
    url: string;
    body: string;
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
            body
            createdAt
          }
        }
      }
    }
  `,
    { owner, repo },
  );

  const discussions = result.repository.discussions.nodes;
  const pastDiscussions: PastWeeklyDiscussion[] = [];

  // "📰 Tech Changelog - Weekly [プロバイダー名] (YYYY-MM-DD)" 形式のタイトルをパース
  const weeklyTitlePattern = new RegExp(
    `📰 Tech Changelog - Weekly \\[${displayName}\\] \\((\\d{4}-\\d{2}-\\d{2})\\)$`,
  );

  for (const discussion of discussions) {
    if (pastDiscussions.length >= limit) {
      break;
    }

    const match = discussion.title.match(weeklyTitlePattern);
    if (match) {
      const date = match[1];
      pastDiscussions.push({
        providerId,
        date,
        url: discussion.url,
        body: discussion.body,
      });
    }
  }

  return pastDiscussions;
}

// 全プロバイダーの過去Weekly Discussionを取得
export async function fetchAllPastWeeklyDiscussions(
  token: string,
  owner: string,
  repo: string,
  limit: number = 2,
): Promise<Record<string, PastWeeklyDiscussion[]>> {
  const providerIds = ["github", "aws", "claudeCode", "githubCli", "linear"];

  const results = await Promise.all(
    providerIds.map(async (providerId) => {
      const discussions = await fetchPastWeeklyDiscussionsByProvider(
        token,
        owner,
        repo,
        providerId,
        limit,
      );
      return [providerId, discussions] as const;
    }),
  );

  return Object.fromEntries(results);
}

// プロバイダー単位でDiscussionを作成
export async function createProviderWeeklyDiscussion(
  token: string,
  owner: string,
  repo: string,
  categoryName: string,
  providerId: string,
  summary: ProviderWeeklySummary,
  providerData: ChangelogEntry[] | ReleaseEntry[],
  startDate: string,
  endDate: string,
): Promise<{ id: string; url: string }> {
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);

  // リポジトリIDとカテゴリID、ラベル一覧を取得
  const repoData = await fetchRepositoryData(graphqlWithAuth, owner, repo);

  const repositoryId = repoData.repository.id;
  const category = repoData.repository.discussionCategories.nodes.find(
    (c: DiscussionCategory) => c.name === categoryName,
  );

  if (!category) {
    throw new Error(
      `Category "${categoryName}" not found. Available categories: ${
        repoData.repository.discussionCategories.nodes
          .map((c: DiscussionCategory) => c.name)
          .join(", ")
      }`,
    );
  }

  // タイトルとボディを生成
  const title = generateProviderWeeklyTitle(providerId, endDate);
  const body = generateProviderWeeklyBody(
    providerId,
    providerData,
    summary,
    startDate,
    endDate,
  ) + generateMention();

  // Discussion作成
  const result = await createDiscussionGraphQL(
    graphqlWithAuth,
    repositoryId,
    category.id,
    title,
    body,
  );

  const discussionId = result.createDiscussion.discussion.id;
  const discussionUrl = result.createDiscussion.discussion.url;

  console.log(`Created discussion: ${title}`);
  console.log(`URL: ${discussionUrl}`);

  // ラベル付与処理
  // 単一プロバイダーのChangelogDataを構築してdetermineLabelsを使用
  const singleProviderData: ChangelogData = {
    date: endDate,
    startDate,
    endDate,
    github: providerId === "github" ? (providerData as ChangelogEntry[]) : [],
    aws: providerId === "aws" ? (providerData as ChangelogEntry[]) : [],
    claudeCode: providerId === "claudeCode"
      ? (providerData as ReleaseEntry[])
      : [],
    githubCli: providerId === "githubCli"
      ? (providerData as ReleaseEntry[])
      : [],
    linear: providerId === "linear" ? (providerData as ChangelogEntry[]) : [],
  };

  // serviceOnly: false でサブカテゴリラベルも含める
  const labelNames = determineLabels(singleProviderData, {
    serviceOnly: false,
  });
  if (labelNames.length > 0) {
    const existingLabels = new Map(
      repoData.repository.labels.nodes.map((l) => [l.name, l.id]),
    );

    const labelIds = await ensureLabelsExist(
      graphqlWithAuth,
      repositoryId,
      existingLabels,
      labelNames,
    );

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

  return { id: discussionId, url: discussionUrl };
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
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);

  // リポジトリIDとカテゴリID、ラベル一覧を取得
  const repoData = await fetchRepositoryData(graphqlWithAuth, owner, repo);

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
  const result = await createDiscussionGraphQL(
    graphqlWithAuth,
    repositoryId,
    category.id,
    title,
    body,
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

      const labelIds = await ensureLabelsExist(
        graphqlWithAuth,
        repositoryId,
        existingLabels,
        labelNames,
      );

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

// コマンドライン引数から日付と要約JSON/ファイルを取得し、フラグ以外の引数を返す
export function parseArgs(
  args: string[],
): {
  date: string;
  summariesJson: string | null;
  summariesFile: string | null;
  weekly: boolean;
  category: CategoryOption;
  dryRun: boolean;
  otherArgs: string[];
} {
  const summariesJson = parseArg(args, "summaries-json") ?? null;
  const summariesFile = parseArg(args, "summaries-file") ?? null;
  const weekly = hasFlag(args, "weekly");
  const dryRun = hasFlag(args, "dry-run");
  const categoryArg = parseArg(args, "category");
  const otherArgs = args.filter(
    (arg) =>
      !arg.startsWith("--date=") &&
      !arg.startsWith("--summaries-json=") &&
      !arg.startsWith("--summaries-file=") &&
      !arg.startsWith("--category=") &&
      arg !== "--weekly" &&
      arg !== "--dry-run",
  );

  const date = parseArg(args, "date") ?? getTodayDateString();

  // カテゴリの解析（デフォルト: changelog）
  let category: CategoryOption = "changelog";
  if (categoryArg) {
    if (categoryArg === "changelog" || categoryArg === "blog") {
      category = categoryArg;
    } else {
      console.warn(`Invalid category: ${categoryArg}. Using "changelog".`);
    }
  }

  return {
    date,
    summariesJson,
    summariesFile,
    weekly,
    category,
    dryRun,
    otherArgs,
  };
}

// Changelog用Discussion作成
async function createChangelogDiscussion(
  token: string,
  owner: string,
  repo: string,
  categoryName: string,
  date: string,
  weekly: boolean,
  summariesJson: string | null,
  legacySummary: string,
  dryRun: boolean = false,
): Promise<void> {
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

  const title = generateTitle(changelogData);
  let body: string;

  if (weekly) {
    if (!summariesJson) {
      console.error(
        "週次モードでは --summaries-json または --summaries-file が必須です",
      );
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
    const isWeekly = !!(changelogData.startDate && changelogData.endDate);
    const coveragePeriod = isWeekly
      ? formatWeeklyCoveragePeriod(
        changelogData.startDate!,
        changelogData.endDate!,
      )
      : formatCoveragePeriod(changelogData.date);
    body = coveragePeriod + "\n\n" + legacySummary + generateMention();
  } else {
    body = generateDefaultBody(changelogData) + generateMention();
  }

  console.log(`Creating changelog discussion: ${title}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would create discussion with the following:");
    console.log(`\n📋 タイトル: ${title}`);
    console.log(`\n📁 投稿先カテゴリ: ${categoryName}`);

    // ラベルを表示
    const labels = determineLabels(changelogData, {
      serviceOnly: weekly,
    });
    console.log(`\n🏷️ 付与予定ラベル:`);
    console.log(labels.join(", "));

    // ボディを表示
    console.log(`\n📄 本文:`);
    console.log(`---`);
    console.log(body);
    console.log(`---`);
    return;
  }

  const url = await createDiscussion(
    token,
    owner,
    repo,
    categoryName,
    title,
    body,
    changelogData,
  );

  console.log(`Changelog discussion created: ${url}`);
}

// Blog用Discussion作成
async function createBlogDiscussion(
  token: string,
  owner: string,
  repo: string,
  categoryName: string,
  date: string,
  weekly: boolean,
  summariesJson: string | null,
  dryRun: boolean = false,
): Promise<void> {
  const subDir = weekly ? "weekly" : "daily";
  const blogPath = `data/blogs/${subDir}/${date}.json`;

  let blogData: BlogData;
  try {
    const content = await Deno.readTextFile(blogPath);
    blogData = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${blogPath}:`, error);
    Deno.exit(1);
  }

  const title = generateBlogTitle(blogData);
  let body: string;

  if (summariesJson) {
    try {
      const summaries = parseBlogSummariesJson(summariesJson);
      body = generateBlogBodyWithSummaries(blogData, summaries) +
        generateMention();
      console.log("Using blog summaries JSON");
    } catch (error) {
      console.error("Failed to parse blog summaries JSON:", error);
      console.error("Falling back to default body generation");
      body = generateDefaultBlogBody(blogData) + generateMention();
    }
  } else {
    body = generateDefaultBlogBody(blogData) + generateMention();
  }

  console.log(`Creating blog discussion: ${title}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would create discussion with the following:");
    console.log(`\n📋 タイトル: ${title}`);
    console.log(`\n📁 投稿先カテゴリ: ${categoryName}`);
    console.log(`\n🏷️ 付与予定ラベル: なし（Blogはラベル付与なし）`);

    // ボディを表示
    console.log(`\n📄 本文:`);
    console.log(`---`);
    console.log(body);
    console.log(`---`);
    return;
  }

  // BlogDataはラベル付与しないのでundefinedを渡す
  const url = await createDiscussion(
    token,
    owner,
    repo,
    categoryName,
    title,
    body,
    undefined,
  );

  console.log(`Blog discussion created: ${url}`);
}

// メイン処理
async function main() {
  // 引数からリポジトリ情報を取得（デフォルト: korosuke613/mynewshq）
  const {
    date,
    summariesJson: summariesJsonArg,
    summariesFile,
    weekly,
    category,
    dryRun,
    otherArgs,
  } = parseArgs(Deno.args);
  const owner = otherArgs[0] || "korosuke613";
  const repo = otherArgs[1] || "mynewshq";

  // dry-run時はトークン不要
  const token = dryRun ? "" : requireGitHubToken();

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
      category,
      trigger,
      weekly,
    );
    console.log(`Using default category config: ${categoryName}`);
  } else {
    // 通常時は環境変数から設定を取得
    const octokit = new Octokit({ auth: token });
    categoryName = await getCategoryNameFromEnv(
      octokit,
      owner,
      repo,
      category,
      weekly,
    );
    console.log(`Using category from config: ${categoryName}`);
  }

  // 要約JSONの取得：--summaries-file が優先、なければ --summaries-json を使用
  let summariesJson: string | null = summariesJsonArg;
  if (summariesFile) {
    // ログインジェクション対策：改行文字を除去
    const safeFilename = summariesFile.replace(/[\r\n]/g, "");
    try {
      summariesJson = await Deno.readTextFile(summariesFile);
      console.log(`Loaded summaries from file: ${safeFilename}`);
    } catch (error) {
      console.error(`Failed to read summaries file ${safeFilename}:`, error);
      Deno.exit(1);
    }
  }

  // 引数から要約を取得（3番目以降の引数をすべて結合）- 後方互換性のため維持
  const legacySummary = otherArgs.slice(2).join(" ");

  if (category === "blog") {
    await createBlogDiscussion(
      token,
      owner,
      repo,
      categoryName,
      date,
      weekly,
      summariesJson,
      dryRun,
    );
  } else {
    await createChangelogDiscussion(
      token,
      owner,
      repo,
      categoryName,
      date,
      weekly,
      summariesJson,
      legacySummary,
      dryRun,
    );
  }
}

if (import.meta.main) {
  main();
}
