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
  labels?: Record<string, string[]>;
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
  linear: ChangelogEntry[];
}

// 要約データの型定義（キーはURL、値は要約文）
export interface SummaryData {
  github: Record<string, string>;
  aws: Record<string, string>;
  claudeCode: Record<string, string>;
  linear: Record<string, string>;
}

// changelogデータからラベル名を決定
export function determineLabels(data: ChangelogData): string[] {
  const labels = new Set<string>(); // Setを使用して重複を避ける

  if (data.github && data.github.length > 0) {
    labels.add("github"); // サービス名ラベルはプレフィックスなし
    for (const entry of data.github) {
      if (entry.labels) {
        Object.values(entry.labels).flat().forEach((label) =>
          labels.add(`gh:${label}`)
        ); // サブカテゴリラベルにプレフィックスを付与
      }
    }
  }
  if (data.aws && data.aws.length > 0) {
    labels.add("aws");
  }
  if (data.claudeCode && data.claudeCode.length > 0) {
    labels.add("claude-code");
  }
  if (data.linear && data.linear.length > 0) {
    labels.add("linear");
  }

  return Array.from(labels); // Setを配列に変換して返す
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
): { date: string; summariesJson: string | null; otherArgs: string[] } {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const summariesJsonArg = args.find((arg) =>
    arg.startsWith("--summaries-json=")
  );
  const otherArgs = args.filter(
    (arg) => !arg.startsWith("--date=") && !arg.startsWith("--summaries-json="),
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

  return { date, summariesJson, otherArgs };
}

// メイン処理
async function main() {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // 引数からリポジトリ情報を取得（デフォルト: korosuke613/mynewshq）
  const { date, summariesJson, otherArgs } = parseArgs(Deno.args);
  const owner = otherArgs[0] || "korosuke613";
  const repo = otherArgs[1] || "mynewshq";
  const categoryName = otherArgs[2] || "General";

  // 指定された日付のchangelog JSONファイルを取得
  const changelogPath = `data/changelogs/${date}.json`;

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

  const title = `📰 Tech Changelog - ${changelogData.date}`;
  let body: string;

  if (summariesJson) {
    // 構造化要約JSONが指定された場合
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
    const coveragePeriod = generateCoveragePeriod(changelogData.date);
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

// メンション文字列を生成
export function generateMention(): string {
  const mentionUser = Deno.env.get("MENTION_USER") || "korosuke613";
  return `\n\n---\ncc: @${mentionUser}`;
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

// 対象期間の文字列を生成（UTC 3:00 基準の24時間ウィンドウ）
export function generateCoveragePeriod(dateStr: string): string {
  const endDate = new Date(dateStr + "T03:00:00Z");
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  const formatDateTime = (date: Date): string => {
    return date.toISOString().replace("T", " ").replace(":00.000Z", " UTC");
  };

  return `📅 **対象期間**: ${formatDateTime(startDate)} ~ ${
    formatDateTime(endDate)
  }`;
}

// デフォルトのボディ生成（要約がない場合）
export function generateDefaultBody(data: ChangelogData): string {
  let body = `# 📰 Tech Changelog - ${data.date}\n\n`;
  body += generateCoveragePeriod(data.date) + "\n\n";

  if (data.github && data.github.length > 0) {
    const activeEntries = data.github.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## GitHub Changelog\n";
      for (const item of activeEntries) {
        let labelsString = "";
        if (item.labels) {
          const allLabels = Object.values(item.labels).flat();
          if (allLabels.length > 0) {
            labelsString = allLabels.map((label) => `\`${label}\``).join(" ");
          }
        }
        body += `### [${item.title}](${item.url})${
          labelsString ? " " + labelsString : ""
        }\n`;
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

  if (data.linear && data.linear.length > 0) {
    const activeEntries = data.linear.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## Linear Changelog\n";
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n`;
        body += `*Published: ${item.pubDate}*\n\n`;
      }
    }
    body += generateMutedSection(data.linear);
    if (activeEntries.length > 0 || data.linear.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  return body;
}

// 要約データ付きのボディ生成
export function generateBodyWithSummaries(
  data: ChangelogData,
  summaries: SummaryData,
): string {
  let body = `# 📰 Tech Changelog - ${data.date}\n\n`;
  body += generateCoveragePeriod(data.date) + "\n\n";

  if (data.github && data.github.length > 0) {
    const activeEntries = data.github.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## GitHub Changelog\n\n";
      for (const item of activeEntries) {
        let labelsString = "";
        if (item.labels) {
          const allLabels = Object.values(item.labels).flat();
          if (allLabels.length > 0) {
            labelsString = allLabels.map((label) => `\`${label}\``).join(" ");
          }
        }
        body += `### [${item.title}](${item.url})${
          labelsString ? " " + labelsString : ""
        }\n\n`;
        const summary = summaries.github?.[item.url];
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
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
      body += "## AWS What's New\n\n";
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n\n`;
        const summary = summaries.aws?.[item.url];
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
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
      body += "## Claude Code\n\n";
      for (const item of activeEntries) {
        body += `### [${item.version}](${item.url})\n\n`;
        const summary = summaries.claudeCode?.[item.url];
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.claudeCode);
    if (activeEntries.length > 0 || data.claudeCode.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  if (data.linear && data.linear.length > 0) {
    const activeEntries = data.linear.filter((e) => !e.muted);
    if (activeEntries.length > 0) {
      body += "## Linear Changelog\n\n";
      for (const item of activeEntries) {
        body += `### [${item.title}](${item.url})\n\n`;
        const summary = summaries.linear?.[item.url];
        if (summary) {
          body += `**要約**: ${summary}\n\n`;
        }
      }
    }
    body += generateMutedSection(data.linear);
    if (activeEntries.length > 0 || data.linear.some((e) => e.muted)) {
      body += "---\n\n";
    }
  }

  return body;
}

if (import.meta.main) {
  main();
}
