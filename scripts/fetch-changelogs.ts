import Parser from "rss-parser";
import { Octokit } from "@octokit/rest";
import { parse } from "xml/mod.ts";

interface XmlCategory {
  "@domain"?: string;
  "#text": string;
}

interface XmlItem {
  title: string;
  link: string;
  pubDate: string;
  "content:encoded": string;
  description: string;
  category: XmlCategory | XmlCategory[];
}

interface RssChannel {
  item: XmlItem[];
}

interface RssFeed {
  rss: {
    channel: RssChannel;
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

const parser = new Parser();
const octokit = new Octokit();

// コマンドライン引数から日付を取得
function parseDate(args: string[]): Date {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  if (dateArg) {
    const dateStr = dateArg.split("=")[1];
    return new Date(dateStr + "T23:59:59Z"); // 指定日の終わりを基準に
  }
  return new Date();
}

// 過去24時間以内かチェック
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return date >= dayAgo && date <= now;
}

// GitHub Changelog取得
async function fetchGitHubChangelog(
  targetDate: Date,
): Promise<ChangelogEntry[]> {
  try {
    const response = await fetch("https://github.blog/changelog/feed/");
    if (!response.ok) {
      console.error(`Failed to fetch GitHub Changelog: ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const doc = parse(xmlText) as unknown as RssFeed;

    if (!doc?.rss?.channel?.item) {
      console.error("Failed to parse GitHub Changelog: Invalid XML structure");
      return [];
    }

    const entries: ChangelogEntry[] = [];
    const items = doc.rss.channel.item;

    for (const item of items) {
      const pubDate = item.pubDate;
      if (pubDate && isRecent(pubDate, targetDate)) {
        const labels: Record<string, string[]> = {};
        const categories = Array.isArray(item.category)
          ? item.category
          : (item.category ? [item.category] : []);

        for (const category of categories) {
          if (
            typeof category === "object" && category !== null &&
            category["@domain"]
          ) {
            const domain = category["@domain"];
            const value = category["#text"];
            if (!labels[domain]) {
              labels[domain] = [];
            }
            labels[domain].push(value);
          }
        }

        entries.push({
          title: item.title,
          url: item.link,
          content: item["content:encoded"] || item.description || "",
          pubDate: pubDate,
          labels: Object.keys(labels).length > 0 ? labels : undefined,
        });
      }
    }
    return entries;
  } catch (error) {
    console.error("Failed to process GitHub Changelog feed:", error);
    return [];
  }
}

// AWS Changelog取得
async function fetchAWSChangelog(targetDate: Date): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL(
    "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
  );
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isRecent(item.pubDate, targetDate)) {
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
async function fetchClaudeCodeReleases(
  targetDate: Date,
): Promise<ReleaseEntry[]> {
  const { data: releases } = await octokit.repos.listReleases({
    owner: "anthropics",
    repo: "claude-code",
    per_page: 10,
  });

  const entries: ReleaseEntry[] = [];

  for (const release of releases) {
    if (release.published_at && isRecent(release.published_at, targetDate)) {
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

// Linear Changelog取得
async function fetchLinearChangelog(
  targetDate: Date,
): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL("https://linear.app/rss/changelog.xml");
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isRecent(item.pubDate, targetDate)) {
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

// Issue本文から箇条書きのミュートワードを抽出
export function parseMuteWords(issueBody: string): string[] {
  const lines = issueBody.split("\n");
  const muteWords: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // "- " で始まる行を箇条書きとして抽出
    if (trimmed.startsWith("- ")) {
      const word = trimmed.slice(2).trim();
      if (word) {
        muteWords.push(word);
      }
    }
  }

  return muteWords;
}

// GitHub Issueからミュートワードのリストを取得
export async function fetchMuteWords(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string[]> {
  try {
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    if (!issue.body) {
      console.warn(`Issue #${issueNumber} has no body`);
      return [];
    }

    const muteWords = parseMuteWords(issue.body);
    console.log(
      `Loaded ${muteWords.length} mute words from issue #${issueNumber}`,
    );
    return muteWords;
  } catch (error) {
    console.warn(
      `Failed to fetch mute words from issue #${issueNumber}:`,
      error,
    );
    return [];
  }
}

// タイトルがミュートワードに一致するかチェック（部分一致・大文字小文字無視）
export function isMuted(title: string, muteWords: string[]): string | null {
  const lowerTitle = title.toLowerCase();
  for (const word of muteWords) {
    if (lowerTitle.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

// エントリ配列にミュートフラグを適用
export function applyMuteFilter<
  T extends { title?: string; version?: string },
>(
  entries: T[],
  muteWords: string[],
): (T & { muted?: boolean; mutedBy?: string })[] {
  return entries.map((entry) => {
    const titleToCheck = "title" in entry && entry.title
      ? entry.title
      : "version" in entry && entry.version
      ? entry.version
      : "";
    const mutedBy = isMuted(titleToCheck, muteWords);
    if (mutedBy) {
      return { ...entry, muted: true, mutedBy };
    }
    return entry;
  });
}

// メイン処理
async function main() {
  console.log("Fetching changelogs...");

  const targetDate = parseDate(Deno.args);
  const dateString = targetDate.toISOString().split("T")[0];
  console.log(`Target date: ${dateString}`);

  // ミュートワード機能の準備
  const token = Deno.env.get("GITHUB_TOKEN");
  const muteWordsIssueNumber = Deno.env.get("MUTE_WORDS_ISSUE_NUMBER") || "1";
  const repositoryOwner = Deno.env.get("GITHUB_REPOSITORY_OWNER") ||
    "korosuke613";
  const repositoryName = Deno.env.get("GITHUB_REPOSITORY_NAME") || "mynewshq";
  let muteWords: string[] = [];

  if (token && muteWordsIssueNumber) {
    const authenticatedOctokit = new Octokit({ auth: token });
    const issueNumber = parseInt(muteWordsIssueNumber, 10);
    if (!isNaN(issueNumber)) {
      muteWords = await fetchMuteWords(
        authenticatedOctokit,
        repositoryOwner,
        repositoryName,
        issueNumber,
      );
    } else {
      console.warn(
        `Invalid MUTE_WORDS_ISSUE_NUMBER: ${muteWordsIssueNumber}`,
      );
    }
  }

  let [github, aws, claudeCode, linear] = await Promise.all([
    fetchGitHubChangelog(targetDate),
    fetchAWSChangelog(targetDate),
    fetchClaudeCodeReleases(targetDate),
    fetchLinearChangelog(targetDate),
  ]);

  // ミュートフィルタを適用
  if (muteWords.length > 0) {
    github = applyMuteFilter(github, muteWords);
    aws = applyMuteFilter(aws, muteWords);
    claudeCode = applyMuteFilter(claudeCode, muteWords);
    linear = applyMuteFilter(linear, muteWords);

    const mutedCount = [
      ...github.filter((e) => e.muted),
      ...aws.filter((e) => e.muted),
      ...claudeCode.filter((e) => e.muted),
      ...linear.filter((e) => e.muted),
    ].length;
    console.log(`Muted ${mutedCount} entries`);
  }

  // 更新がない場合は終了
  if (
    github.length === 0 && aws.length === 0 && claudeCode.length === 0 &&
    linear.length === 0
  ) {
    console.log("No updates found in the last 24 hours.");
    Deno.exit(0);
  }

  const data: ChangelogData = {
    date: dateString,
    github,
    aws,
    claudeCode,
    linear,
  };

  const outputPath = `data/changelogs/${data.date}.json`;
  await Deno.mkdir("data/changelogs", { recursive: true });
  await Deno.writeTextFile(outputPath, JSON.stringify(data, null, 2));

  console.log(
    `Saved ${
      github.length + aws.length + claudeCode.length + linear.length
    } updates to ${outputPath}`,
  );
  console.log(`- GitHub: ${github.length}`);
  console.log(`- AWS: ${aws.length}`);
  console.log(`- Claude Code: ${claudeCode.length}`);
  console.log(`- Linear: ${linear.length}`);
}

if (import.meta.main) {
  main();
}
