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
function isRecent(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
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

  const outputPath = `data/changelogs/${data.date}.json`;
  await Deno.writeTextFile(outputPath, JSON.stringify(data, null, 2));

  console.log(
    `Saved ${
      github.length + aws.length + claudeCode.length
    } updates to ${outputPath}`,
  );
  console.log(`- GitHub: ${github.length}`);
  console.log(`- AWS: ${aws.length}`);
  console.log(`- Claude Code: ${claudeCode.length}`);
}

if (import.meta.main) {
  main();
}
