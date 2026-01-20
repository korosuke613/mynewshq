import Parser from "rss-parser"; // Used by fetchAWSChangelog and fetchLinearChangelog
import { Octokit } from "@octokit/rest";
import { parse } from "xml/mod.ts";

interface XmlCategory {
  "@domain"?: string;
  "#text"?: string;
}

interface XmlItem {
  title: string;
  link: string;
  pubDate: string;
  "content:encoded": string;
  description: string;
  category?: XmlCategory | XmlCategory[];
}

interface RssChannel {
  item?: XmlItem[];
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
  startDate?: string; // 週次の場合の開始日
  endDate?: string; // 週次の場合の終了日
  github: ChangelogEntry[];
  aws: ChangelogEntry[];
  claudeCode: ReleaseEntry[];
  linear: ChangelogEntry[];
}

const parser = new Parser();
const octokit = new Octokit();

// コマンドライン引数からオプションを取得
interface ParsedArgs {
  targetDate: Date;
  days: number;
  weekly: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const dateArg = args.find((arg) => arg.startsWith("--date="));
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const weeklyArg = args.includes("--weekly");

  let targetDate: Date;
  if (dateArg) {
    const dateStr = dateArg.split("=")[1];
    // cronスケジュール（UTC 3:00）と同じ時刻を使用
    // これにより、workflow_dispatchで過去の日付を指定した場合も
    // cronと同じ24時間ウィンドウでデータを収集できる
    targetDate = new Date(dateStr + "T03:00:00Z");
  } else {
    targetDate = new Date();
  }

  let days = 1; // デフォルト: 1日
  if (daysArg) {
    const parsedDays = parseInt(daysArg.split("=")[1], 10);
    if (!isNaN(parsedDays) && parsedDays > 0) {
      days = parsedDays;
    }
  }

  return { targetDate, days, weekly: weeklyArg };
}

// コマンドライン引数から日付を取得（後方互換性のため）
function _parseDate(args: string[]): Date {
  return parseArgs(args).targetDate;
}
// エクスポートしてテストから使用可能にする
export { _parseDate as parseDate };

// URLを正規化（破損したURLを修正）
export function normalizeUrl(url: string): string {
  // AWS RSSフィードで `aws.amazon.comabout-aws` のように
  // TLDの後にスラッシュなしでパスが続くケースを修正
  // 例: .comの直後にアルファベットが続く場合に `/` を挿入
  return url.replace(/\.com([a-z])/i, ".com/$1");
}

// 過去24時間以内かチェック
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return date >= dayAgo && date <= now;
}

// 過去N日以内かチェック
export function isWithinDays(
  dateString: string,
  days: number,
  now: Date = new Date(),
): boolean {
  const date = new Date(dateString);
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= daysAgo && date <= now;
}

// AWSカテゴリ文字列からラベルを抽出
// 形式: "general:products/amazon-connect" → { "general:products": ["amazon-connect"] }
// general:products系のみを抽出（marketing:marchitectureなどは除外）
// rss-parserはカテゴリをカンマ区切りの文字列として返す場合があるため、分割処理を行う
export function extractLabelsFromAWSCategory(
  categories?: string[],
): Record<string, string[]> {
  const labels: Record<string, string[]> = {};
  if (!categories) return labels;

  for (const rawCat of categories) {
    // カンマ区切りの場合は分割
    const splitCategories = rawCat.split(",").map((c) => c.trim());

    for (const cat of splitCategories) {
      // general:products/xxx のみを抽出
      const match = cat.match(/^general:products\/(.+)$/);
      if (match) {
        const [, value] = match;
        if (!labels["general:products"]) {
          labels["general:products"] = [];
        }
        labels["general:products"].push(value);
      }
    }
  }

  return labels;
}

// XMLのカテゴリ情報からラベルを抽出
export function extractLabelsFromCategories(
  category?: XmlCategory | XmlCategory[],
): Record<string, string[]> {
  const labels: Record<string, string[]> = {};
  const categories = Array.isArray(category)
    ? category
    : (category ? [category] : []);

  for (const cat of categories) {
    if (
      typeof cat === "object" && cat !== null &&
      cat["@domain"] && cat["#text"]
    ) {
      const domain = cat["@domain"];
      const value = cat["#text"];
      if (!labels[domain]) {
        labels[domain] = [];
      }
      labels[domain].push(value);
    }
  }

  return labels;
}

// GitHub Changelog取得
async function fetchGitHubChangelog(
  targetDate: Date,
  days: number = 1,
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
      if (pubDate && isWithinDays(pubDate, days, targetDate)) {
        const labels = extractLabelsFromCategories(item.category);

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
async function fetchAWSChangelog(
  targetDate: Date,
  days: number = 1,
): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL(
    "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
  );
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isWithinDays(item.pubDate, days, targetDate)) {
      const labels = extractLabelsFromAWSCategory(item.categories);

      entries.push({
        title: item.title || "",
        url: normalizeUrl(item.link || ""),
        content: item.contentSnippet || item.content || "",
        pubDate: item.pubDate,
        labels: Object.keys(labels).length > 0 ? labels : undefined,
      });
    }
  }

  return entries;
}

// Claude Code Releases取得
async function fetchClaudeCodeReleases(
  targetDate: Date,
  days: number = 1,
): Promise<ReleaseEntry[]> {
  const { data: releases } = await octokit.repos.listReleases({
    owner: "anthropics",
    repo: "claude-code",
    per_page: 10,
  });

  const entries: ReleaseEntry[] = [];

  for (const release of releases) {
    if (
      release.published_at &&
      isWithinDays(release.published_at, days, targetDate)
    ) {
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
  days: number = 1,
): Promise<ChangelogEntry[]> {
  const feed = await parser.parseURL("https://linear.app/rss/changelog.xml");
  const entries: ChangelogEntry[] = [];

  for (const item of feed.items) {
    if (item.pubDate && isWithinDays(item.pubDate, days, targetDate)) {
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

  const { targetDate, days, weekly } = parseArgs(Deno.args);
  const dateString = targetDate.toISOString().split("T")[0];
  console.log(`Target date: ${dateString}`);
  console.log(`Days: ${days}`);
  if (weekly) {
    console.log("Mode: Weekly");
  }

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
    fetchGitHubChangelog(targetDate, days),
    fetchAWSChangelog(targetDate, days),
    fetchClaudeCodeReleases(targetDate, days),
    fetchLinearChangelog(targetDate, days),
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
    console.log(`No updates found in the last ${days} day(s).`);
    Deno.exit(0);
  }

  // 週次の場合は開始日・終了日を設定
  let data: ChangelogData;
  if (weekly || days > 1) {
    const startDate = new Date(
      targetDate.getTime() - days * 24 * 60 * 60 * 1000,
    );
    const startDateString = startDate.toISOString().split("T")[0];
    data = {
      date: dateString,
      startDate: startDateString,
      endDate: dateString,
      github,
      aws,
      claudeCode,
      linear,
    };
  } else {
    data = {
      date: dateString,
      github,
      aws,
      claudeCode,
      linear,
    };
  }

  // 出力先ディレクトリを決定
  const subDir = weekly ? "weekly" : "daily";
  const outputPath = `data/changelogs/${subDir}/${data.date}.json`;
  await Deno.mkdir(`data/changelogs/${subDir}`, { recursive: true });
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
