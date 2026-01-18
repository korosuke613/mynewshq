import { graphql } from "@octokit/graphql";

interface CreateDiscussionInput {
  repositoryId: string;
  categoryId: string;
  title: string;
  body: string;
}

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

interface ChangelogEntry {
  title: string;
  url: string;
  content: string;
  pubDate: string;
  muted?: boolean;
  mutedBy?: string;
}

interface ReleaseEntry {
  version: string;
  url: string;
  body: string;
  publishedAt: string;
  muted?: boolean;
  mutedBy?: string;
}

interface ChangelogData {
  date: string;
  github: ChangelogEntry[];
  aws: ChangelogEntry[];
  claudeCode: ReleaseEntry[];
}

// changelogデータからラベル名を決定
export function determineLabels(data: ChangelogData): string[] {
  const labels: string[] = [];

  if (data.github && data.github.length > 0) {
    labels.push("github");
  }
  if (data.aws && data.aws.length > 0) {
    labels.push("aws");
  }
  if (data.claudeCode && data.claudeCode.length > 0) {
    labels.push("claude-code");
  }

  return labels;
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
    const labelNames = determineLabels(changelogData);
    const labelIds = labelNames
      .map((name) =>
        repoData.repository.labels.nodes.find((l) => l.name === name)?.id
      )
      .filter((id): id is string => id !== undefined);

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
    } else if (labelNames.length > 0) {
      const missingLabels = labelNames.filter(
        (name) =>
          !repoData.repository.labels.nodes.find((l) => l.name === name),
      );
      console.warn(`Warning: Labels not found: ${missingLabels.join(", ")}`);
    }
  }

  return discussionUrl;
}

// コマンドライン引数から日付を取得し、フラグ以外の引数を返す
function parseArgs(args: string[]): { date: string; otherArgs: string[] } {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const otherArgs = args.filter((arg) => !arg.startsWith("--date="));

  let date: string;
  if (dateArg) {
    date = dateArg.split("=")[1];
  } else {
    date = new Date().toISOString().split("T")[0];
  }

  return { date, otherArgs };
}

// メイン処理
async function main() {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // 引数からリポジトリ情報を取得（デフォルト: korosuke613/mynewshq）
  const { date, otherArgs } = parseArgs(Deno.args);
  const owner = otherArgs[0] || "korosuke613";
  const repo = otherArgs[1] || "mynewshq";
  const categoryName = otherArgs[2] || "General";

  // 指定された日付のchangelog JSONファイルを取得
  const changelogPath = `data/changelogs/${date}.json`;

  let changelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    changelogData = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // 引数から要約を取得（4番目以降の引数をすべて結合）
  const summary = otherArgs.slice(3).join(" ");

  const title = `📰 Tech Changelog - ${changelogData.date}`;
  const mentionUser = Deno.env.get("MENTION_USER") || "korosuke613";
  const mention = `\n\n---\ncc: @${mentionUser}`;
  const body = (summary || generateDefaultBody(changelogData)) + mention;

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

// ミュートされたエントリの折りたたみセクションを生成
export function generateMutedSection<
  T extends { title?: string; version?: string; url: string; mutedBy?: string },
>(entries: T[]): string {
  const mutedEntries = entries.filter((e) => "muted" in e && e.muted);
  if (mutedEntries.length === 0) {
    return "";
  }

  let section =
    `<details>\n<summary>ミュートされたエントリ (${mutedEntries.length}件)</summary>\n\n`;
  for (const entry of mutedEntries) {
    const title = "title" in entry && entry.title
      ? entry.title
      : "version" in entry && entry.version
      ? entry.version
      : "Untitled";
    const mutedBy = entry.mutedBy || "unknown";
    section += `- [${title}](${entry.url}) *(ミュートワード: ${mutedBy})*\n`;
  }
  section += `</details>\n\n`;
  return section;
}

// デフォルトのボディ生成（要約がない場合）
export function generateDefaultBody(data: ChangelogData): string {
  let body = `# 📰 Tech Changelog - ${data.date}\n\n`;

  if (data.github && data.github.length > 0) {
    const activeEntries = data.github.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## GitHub Changelog\n";
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n`;
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.github);
    if (activeEntries.length > 0 || data.github.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.aws && data.aws.length > 0) {
    const activeEntries = data.aws.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## AWS What's New\n";
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n`;
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.aws);
    if (activeEntries.length > 0 || data.aws.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.claudeCode && data.claudeCode.length > 0) {
    const activeEntries = data.claudeCode.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## Claude Code\n";
      for (const item of activeEntries) {
        body += `### [${item.version}](${item.url})\n`;
        body += `*Published: ${item.publishedAt}*\n\n`;
      }
    }
    body += generateMutedSection(data.claudeCode);
    if (activeEntries.length > 0 || data.claudeCode.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  return body;
}

if (import.meta.main) {
  main();
}
