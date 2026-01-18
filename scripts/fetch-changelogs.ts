import Parser from "rss-parser";
import { Octokit } from "@octokit/rest";

interface ChangelogEntry {
  title: string;
  url: string;
  content: string;
  pubDate: string;
}

interface ReleaseEntry {
  version: string;
  url: string;
  body: string;
  publishedAt: string;
}

interface ChangelogData {
  date: string;
  github: ChangelogEntry[];
  aws: ChangelogEntry[];
  claudeCode: ReleaseEntry[];
}

const parser = new Parser();
const octokit = new Octokit();

// 過去24時間以内かチェック
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return date >= dayAgo;
}

// GitHub Changelog取得
async function fetchGitHubChangelog(): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL("https://github.blog/changelog/feed/");
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isRecent(item.pubDate)) {
      entries.push({
        title: item.title || "",
        url: item.link || "",
        content: item.contentSnippet || item.content || "",
        pubDate: item.pubDate,
      });
    }
  }

  return entries;
}

// AWS Changelog取得
async function fetchAWSChangelog(): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL(
    "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
  );
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isRecent(item.pubDate)) {
      entries.push({
        title: item.title || "",
        url: item.link || "",
        content: item.contentSnippet || item.content || "",
        pubDate: item.pubDate,
      });
    }
  }

  return entries;
}

// Claude Code Releases取得
async function fetchClaudeCodeReleases(): Promise<ReleaseEntry[]> {
  const { data: releases } = await octokit.repos.listReleases({
    owner: "anthropics",
    repo: "claude-code",
    per_page: 10,
  });

  const entries: ReleaseEntry[] = [];

  for (const release of releases) {
    if (release.published_at && isRecent(release.published_at)) {
      entries.push({
        version: release.tag_name,
        url: release.html_url,
        body: release.body || "",
        publishedAt: release.published_at,
      });
    }
  }

  return entries;
}

// Issueにコメントを投稿
async function postToIssue(
  data: ChangelogData,
  issueNumber: number,
  owner: string,
  repo: string,
): Promise<void> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const octokit = new Octokit({ auth: token });
  const changelogJson = JSON.stringify(data, null, 2);
  const today = data.date;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body:
      `📰 ${today}のChangelogを要約してください。\n\n<details>\n<summary>Changelog Data</summary>\n\n\`\`\`json\n${changelogJson}\n\`\`\`\n\n</details>`,
  });

  console.log(`Posted changelog data to Issue #${issueNumber}`);
}

// メイン処理
async function main() {
  console.log("Fetching changelogs...");

  const [github, aws, claudeCode] = await Promise.all([
    fetchGitHubChangelog(),
    fetchAWSChangelog(),
    fetchClaudeCodeReleases(),
  ]);

  // 更新がない場合は終了
  if (github.length === 0 && aws.length === 0 && claudeCode.length === 0) {
    console.log("No updates found in the last 24 hours.");
    Deno.exit(0);
  }

  const data: ChangelogData = {
    date: new Date().toISOString().split("T")[0],
    github,
    aws,
    claudeCode,
  };

  console.log(
    `Found ${github.length + aws.length + claudeCode.length} updates:`,
  );
  console.log(`- GitHub: ${github.length}`);
  console.log(`- AWS: ${aws.length}`);
  console.log(`- Claude Code: ${claudeCode.length}`);

  // コマンドライン引数をチェック
  const args = Deno.args;
  const postToIssueFlag = args.indexOf("--post-to-issue");

  if (postToIssueFlag !== -1 && args[postToIssueFlag + 1]) {
    // Issueに投稿
    const issueNumber = parseInt(args[postToIssueFlag + 1]);
    const owner = args[postToIssueFlag + 2] || "korosuke613";
    const repo = args[postToIssueFlag + 3] || "mynewshq";

    await postToIssue(data, issueNumber, owner, repo);
  } else {
    // ローカルファイルに保存
    const outputPath = `data/changelogs/${data.date}.json`;
    await Deno.mkdir("data/changelogs", { recursive: true });
    await Deno.writeTextFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`Saved to ${outputPath}`);
  }
}

if (import.meta.main) {
  main();
}
