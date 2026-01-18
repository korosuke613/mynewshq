import { graphql } from "@octokit/graphql";

interface CreateDiscussionInput {
  repositoryId: string;
  categoryId: string;
  title: string;
  body: string;
}

// GitHub GraphQL APIでDiscussion作成
async function createDiscussion(
  token: string,
  owner: string,
  repo: string,
  categoryName: string,
  title: string,
  body: string
): Promise<string> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  // リポジトリIDとカテゴリIDを取得
  const repoData: any = await graphqlWithAuth(
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
      }
    }
  `,
    { owner, repo }
  );

  const repositoryId = repoData.repository.id;
  const category = repoData.repository.discussionCategories.nodes.find(
    (c: any) => c.name === categoryName
  );

  if (!category) {
    throw new Error(
      `Category "${categoryName}" not found. Available categories: ${repoData.repository.discussionCategories.nodes
        .map((c: any) => c.name)
        .join(", ")}`
    );
  }

  // Discussion作成
  const result: any = await graphqlWithAuth(
    `
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repositoryId
        categoryId: $categoryId
        title: $title
        body: $body
      }) {
        discussion {
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
    }
  );

  return result.createDiscussion.discussion.url;
}

// メイン処理
async function main() {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // 引数からリポジトリ情報を取得（デフォルト: korosuke613/mynewshq）
  const owner = Deno.args[0] || "korosuke613";
  const repo = Deno.args[1] || "mynewshq";
  const categoryName = Deno.args[2] || "General";

  // 最新のchangelog JSONファイルを取得
  const today = new Date().toISOString().split("T")[0];
  const changelogPath = `data/changelogs/${today}.json`;

  let changelogData;
  try {
    const content = await Deno.readTextFile(changelogPath);
    changelogData = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }

  // 引数から要約を取得（4番目以降の引数をすべて結合）
  const summary = Deno.args.slice(3).join(" ");

  const title = `📰 Tech Changelog - ${changelogData.date}`;
  const body = summary || generateDefaultBody(changelogData);

  console.log(`Creating discussion: ${title}`);

  const url = await createDiscussion(
    token,
    owner,
    repo,
    categoryName,
    title,
    body
  );

  console.log(`Discussion created: ${url}`);
}

// デフォルトのボディ生成（要約がない場合）
function generateDefaultBody(data: any): string {
  let body = `# 📰 Tech Changelog - ${data.date}\n\n`;

  if (data.github && data.github.length > 0) {
    body += "## GitHub Changelog\n";
    for (const item of data.github) {
      body += `### [${item.title}](${item.url})\n`;
      body += `*Published: ${item.pubDate}*\n\n`;
    }
    body += "---\n\n";
  }

  if (data.aws && data.aws.length > 0) {
    body += "## AWS What's New\n";
    for (const item of data.aws) {
      body += `### [${item.title}](${item.url})\n`;
      body += `*Published: ${item.pubDate}*\n\n`;
    }
    body += "---\n\n";
  }

  if (data.claudeCode && data.claudeCode.length > 0) {
    body += "## Claude Code\n";
    for (const item of data.claudeCode) {
      body += `### [${item.version}](${item.url})\n`;
      body += `*Published: ${item.publishedAt}*\n\n`;
    }
  }

  return body;
}

if (import.meta.main) {
  main();
}
