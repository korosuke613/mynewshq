import { assertEquals, assertExists } from "@std/assert";
import {
  applyMuteFilterToAll,
  getProviderConfig,
  getProviderDisplayName,
  getProviderEmoji,
  getProviderIds,
  getProviderIdsByCategory,
  getProviderLabelName,
  getProvidersByCategory,
  getTotalEntryCount,
  hasNoEntries,
  PROVIDER_CONFIGS,
  PROVIDER_REGISTRY,
  toChangelogData,
} from "./index.ts";
import type { AnyEntry } from "./types.ts";
import { githubProvider } from "./github-provider.ts";
import { awsProvider } from "./aws-provider.ts";
import { claudeCodeProvider } from "./claude-code-provider.ts";
import { githubCliProvider } from "./github-cli-provider.ts";
import { linearProvider } from "./linear-provider.ts";
import { hatenaBookmarkProvider } from "./hatena-bookmark-provider.ts";
import { githubBlogProvider } from "./github-blog-provider.ts";
import { awsBlogProvider } from "./aws-blog-provider.ts";
import { hackerNewsProvider } from "./hacker-news-provider.ts";

Deno.test("PROVIDER_CONFIGS - 全9プロバイダーが定義されている", () => {
  assertEquals(PROVIDER_CONFIGS.length, 9);
  const ids = PROVIDER_CONFIGS.map((c) => c.id);
  assertEquals(ids, [
    "github",
    "aws",
    "claudeCode",
    "githubCli",
    "linear",
    "hatenaBookmark",
    "githubBlog",
    "awsBlog",
    "hackerNews",
  ]);
});

Deno.test("PROVIDER_CONFIGS - 各プロバイダーの必須フィールドが存在する", () => {
  for (const config of PROVIDER_CONFIGS) {
    assertExists(config.id);
    assertExists(config.displayName);
    assertExists(config.emoji);
    assertExists(config.labelName);
    assertExists(config.category);
    assertExists(config.titleField);
    assertExists(config.pubDateField);
    assertExists(config.fetch);
  }
});

Deno.test("PROVIDER_REGISTRY - Mapで高速にアクセスできる", () => {
  assertEquals(PROVIDER_REGISTRY.size, 9);
  assertExists(PROVIDER_REGISTRY.get("github"));
  assertExists(PROVIDER_REGISTRY.get("aws"));
  assertExists(PROVIDER_REGISTRY.get("claudeCode"));
  assertExists(PROVIDER_REGISTRY.get("githubCli"));
  assertExists(PROVIDER_REGISTRY.get("linear"));
  assertExists(PROVIDER_REGISTRY.get("hatenaBookmark"));
  assertExists(PROVIDER_REGISTRY.get("githubBlog"));
  assertExists(PROVIDER_REGISTRY.get("awsBlog"));
  assertExists(PROVIDER_REGISTRY.get("hackerNews"));
  assertEquals(PROVIDER_REGISTRY.get("unknown"), undefined);
});

Deno.test("getProviderConfig - 存在するIDで設定を取得できる", () => {
  const github = getProviderConfig("github");
  assertExists(github);
  assertEquals(github.displayName, "GitHub Changelog");
  assertEquals(github.emoji, "\u{1F419}");
  assertEquals(github.labelName, "github");
  assertEquals(github.labelPrefix, "gh:");

  const aws = getProviderConfig("aws");
  assertExists(aws);
  assertEquals(aws.displayName, "AWS What's New");
  assertEquals(aws.emoji, "\u2601\uFE0F");
  assertEquals(aws.labelPrefix, "aws:");
  assertExists(aws.transformLabel);

  const claudeCode = getProviderConfig("claudeCode");
  assertExists(claudeCode);
  assertEquals(claudeCode.displayName, "Claude Code");
  assertEquals(claudeCode.emoji, "\u{1F916}");
  assertEquals(claudeCode.titleField, "version");
  assertEquals(claudeCode.pubDateField, "publishedAt");

  const linear = getProviderConfig("linear");
  assertExists(linear);
  assertEquals(linear.displayName, "Linear Changelog");
  assertEquals(linear.emoji, "\u{1F4D0}");

  const githubCli = getProviderConfig("githubCli");
  assertExists(githubCli);
  assertEquals(githubCli.displayName, "GitHub CLI");
  assertEquals(githubCli.emoji, "⌨️");
  assertEquals(githubCli.titleField, "version");
  assertEquals(githubCli.pubDateField, "publishedAt");
});

Deno.test("getProviderConfig - 存在しないIDでundefinedを返す", () => {
  const result = getProviderConfig("unknown");
  assertEquals(result, undefined);
});

Deno.test("getProviderEmoji - 各プロバイダーの絵文字を取得できる", () => {
  assertEquals(getProviderEmoji("github"), "\u{1F419}");
  assertEquals(getProviderEmoji("aws"), "\u2601\uFE0F");
  assertEquals(getProviderEmoji("claudeCode"), "\u{1F916}");
  assertEquals(getProviderEmoji("githubCli"), "⌨️");
  assertEquals(getProviderEmoji("linear"), "\u{1F4D0}");
});

Deno.test("getProviderEmoji - 存在しないIDでデフォルト絵文字を返す", () => {
  assertEquals(getProviderEmoji("unknown"), "\u{1F4CC}");
});

Deno.test("getProviderDisplayName - 各プロバイダーの表示名を取得できる", () => {
  assertEquals(getProviderDisplayName("github"), "GitHub Changelog");
  assertEquals(getProviderDisplayName("aws"), "AWS What's New");
  assertEquals(getProviderDisplayName("claudeCode"), "Claude Code");
  assertEquals(getProviderDisplayName("githubCli"), "GitHub CLI");
  assertEquals(getProviderDisplayName("linear"), "Linear Changelog");
});

Deno.test("getProviderDisplayName - 存在しないIDでID自体を返す", () => {
  assertEquals(getProviderDisplayName("unknown"), "unknown");
});

Deno.test("getProviderLabelName - 各プロバイダーのラベル名を取得できる", () => {
  assertEquals(getProviderLabelName("github"), "github");
  assertEquals(getProviderLabelName("aws"), "aws");
  assertEquals(getProviderLabelName("claudeCode"), "claude-code");
  assertEquals(getProviderLabelName("githubCli"), "github-cli");
  assertEquals(getProviderLabelName("linear"), "linear");
});

Deno.test("getProviderLabelName - 存在しないIDでID自体を返す", () => {
  assertEquals(getProviderLabelName("unknown"), "unknown");
});

Deno.test("getProviderIds - 全プロバイダーIDを取得できる", () => {
  const ids = getProviderIds();
  assertEquals(ids, [
    "github",
    "aws",
    "claudeCode",
    "githubCli",
    "linear",
    "hatenaBookmark",
    "githubBlog",
    "awsBlog",
    "hackerNews",
  ]);
});

Deno.test("AWS transformLabel - amazon-/aws-プレフィックスを除去する", () => {
  const aws = getProviderConfig("aws");
  assertExists(aws?.transformLabel);
  assertEquals(aws.transformLabel("amazon-s3"), "s3");
  assertEquals(aws.transformLabel("aws-lambda"), "lambda");
  assertEquals(aws.transformLabel("dynamodb"), "dynamodb"); // プレフィックスなしはそのまま
});

// 個別Providerのテスト
Deno.test("githubProvider - 設定が正しい", () => {
  assertEquals(githubProvider.id, "github");
  assertEquals(githubProvider.displayName, "GitHub Changelog");
  assertEquals(githubProvider.emoji, "\u{1F419}");
  assertEquals(githubProvider.labelName, "github");
  assertEquals(githubProvider.labelPrefix, "gh:");
  assertEquals(githubProvider.titleField, "title");
  assertEquals(githubProvider.pubDateField, "pubDate");
  assertExists(githubProvider.fetch);
});

Deno.test("awsProvider - 設定が正しい", () => {
  assertEquals(awsProvider.id, "aws");
  assertEquals(awsProvider.displayName, "AWS What's New");
  assertEquals(awsProvider.emoji, "\u2601\uFE0F");
  assertEquals(awsProvider.labelName, "aws");
  assertEquals(awsProvider.labelPrefix, "aws:");
  assertExists(awsProvider.transformLabel);
  assertEquals(awsProvider.titleField, "title");
  assertEquals(awsProvider.pubDateField, "pubDate");
  assertExists(awsProvider.fetch);
});

Deno.test("claudeCodeProvider - 設定が正しい", () => {
  assertEquals(claudeCodeProvider.id, "claudeCode");
  assertEquals(claudeCodeProvider.displayName, "Claude Code");
  assertEquals(claudeCodeProvider.emoji, "\u{1F916}");
  assertEquals(claudeCodeProvider.labelName, "claude-code");
  assertEquals(claudeCodeProvider.labelPrefix, undefined);
  assertEquals(claudeCodeProvider.titleField, "version");
  assertEquals(claudeCodeProvider.pubDateField, "publishedAt");
  assertExists(claudeCodeProvider.fetch);
});

Deno.test("linearProvider - 設定が正しい", () => {
  assertEquals(linearProvider.id, "linear");
  assertEquals(linearProvider.displayName, "Linear Changelog");
  assertEquals(linearProvider.emoji, "\u{1F4D0}");
  assertEquals(linearProvider.labelName, "linear");
  assertEquals(linearProvider.category, "changelog");
  assertEquals(linearProvider.labelPrefix, undefined);
  assertEquals(linearProvider.titleField, "title");
  assertEquals(linearProvider.pubDateField, "pubDate");
  assertExists(linearProvider.fetch);
});

Deno.test("githubCliProvider - 設定が正しい", () => {
  assertEquals(githubCliProvider.id, "githubCli");
  assertEquals(githubCliProvider.displayName, "GitHub CLI");
  assertEquals(githubCliProvider.emoji, "⌨️");
  assertEquals(githubCliProvider.labelName, "github-cli");
  assertEquals(githubCliProvider.category, "changelog");
  assertEquals(githubCliProvider.labelPrefix, undefined);
  assertEquals(githubCliProvider.titleField, "version");
  assertEquals(githubCliProvider.pubDateField, "publishedAt");
  assertExists(githubCliProvider.fetch);
});

Deno.test("hatenaBookmarkProvider - 設定が正しい", () => {
  assertEquals(hatenaBookmarkProvider.id, "hatenaBookmark");
  assertEquals(hatenaBookmarkProvider.displayName, "Hatena Bookmark");
  assertEquals(hatenaBookmarkProvider.emoji, "\u{1F516}");
  assertEquals(hatenaBookmarkProvider.labelName, "hatena-bookmark");
  assertEquals(hatenaBookmarkProvider.category, "blog");
  assertEquals(hatenaBookmarkProvider.labelPrefix, undefined);
  assertEquals(hatenaBookmarkProvider.titleField, "title");
  assertEquals(hatenaBookmarkProvider.pubDateField, "pubDate");
  assertExists(hatenaBookmarkProvider.fetch);
});

Deno.test("githubBlogProvider - 設定が正しい", () => {
  assertEquals(githubBlogProvider.id, "githubBlog");
  assertEquals(githubBlogProvider.displayName, "GitHub Blog");
  assertEquals(githubBlogProvider.emoji, "📝");
  assertEquals(githubBlogProvider.labelName, "github-blog");
  assertEquals(githubBlogProvider.category, "blog");
  assertEquals(githubBlogProvider.labelPrefix, undefined);
  assertEquals(githubBlogProvider.titleField, "title");
  assertEquals(githubBlogProvider.pubDateField, "pubDate");
  assertExists(githubBlogProvider.fetch);
});

Deno.test("awsBlogProvider - 設定が正しい", () => {
  assertEquals(awsBlogProvider.id, "awsBlog");
  assertEquals(awsBlogProvider.displayName, "AWS Blog");
  assertEquals(awsBlogProvider.emoji, "📙");
  assertEquals(awsBlogProvider.labelName, "aws-blog");
  assertEquals(awsBlogProvider.category, "blog");
  assertEquals(awsBlogProvider.labelPrefix, undefined);
  assertEquals(awsBlogProvider.titleField, "title");
  assertEquals(awsBlogProvider.pubDateField, "pubDate");
  assertExists(awsBlogProvider.fetch);
});

Deno.test("hackerNewsProvider - 設定が正しい", () => {
  assertEquals(hackerNewsProvider.id, "hackerNews");
  assertEquals(hackerNewsProvider.displayName, "Hacker News");
  assertEquals(hackerNewsProvider.emoji, "🔶");
  assertEquals(hackerNewsProvider.labelName, "hacker-news");
  assertEquals(hackerNewsProvider.category, "blog");
  assertEquals(hackerNewsProvider.labelPrefix, undefined);
  assertEquals(hackerNewsProvider.titleField, "title");
  assertEquals(hackerNewsProvider.pubDateField, "pubDate");
  assertExists(hackerNewsProvider.fetch);
});

// =============================================================================
// カテゴリ機能のテスト
// =============================================================================

Deno.test("getProvidersByCategory - changelogカテゴリのプロバイダーを取得", () => {
  const providers = getProvidersByCategory("changelog");
  assertEquals(providers.length, 5);
  const ids = providers.map((p) => p.id);
  assertEquals(ids, ["github", "aws", "claudeCode", "githubCli", "linear"]);
});

Deno.test("getProvidersByCategory - blogカテゴリのプロバイダーを取得", () => {
  const providers = getProvidersByCategory("blog");
  assertEquals(providers.length, 4);
  const ids = providers.map((p) => p.id);
  assertEquals(ids, ["hatenaBookmark", "githubBlog", "awsBlog", "hackerNews"]);
});

Deno.test("getProviderIdsByCategory - changelogカテゴリのIDを取得", () => {
  const ids = getProviderIdsByCategory("changelog");
  assertEquals(ids, ["github", "aws", "claudeCode", "githubCli", "linear"]);
});

Deno.test("getProviderIdsByCategory - blogカテゴリのIDを取得", () => {
  const ids = getProviderIdsByCategory("blog");
  assertEquals(ids, ["hatenaBookmark", "githubBlog", "awsBlog", "hackerNews"]);
});

Deno.test("各プロバイダーのcategoryフィールドが正しく設定されている", () => {
  assertEquals(githubProvider.category, "changelog");
  assertEquals(awsProvider.category, "changelog");
  assertEquals(claudeCodeProvider.category, "changelog");
  assertEquals(githubCliProvider.category, "changelog");
  assertEquals(linearProvider.category, "changelog");
  assertEquals(hatenaBookmarkProvider.category, "blog");
});

// =============================================================================
// 汎用ヘルパー関数のテスト
// =============================================================================

// テスト用モックデータ
function createMockResults(): Record<string, AnyEntry[]> {
  return {
    github: [
      {
        title: "GitHub Update 1",
        url: "https://github.com/1",
        content: "",
        pubDate: "2024-01-01",
      },
      {
        title: "GitHub Update 2",
        url: "https://github.com/2",
        content: "",
        pubDate: "2024-01-02",
      },
    ],
    aws: [
      {
        title: "AWS Lambda Update",
        url: "https://aws.com/1",
        content: "",
        pubDate: "2024-01-01",
      },
    ],
    claudeCode: [
      {
        version: "1.0.0",
        url: "https://github.com/anthropics/1",
        body: "",
        publishedAt: "2024-01-01",
      },
    ],
    githubCli: [],
    linear: [],
  };
}

Deno.test("getTotalEntryCount - 全エントリの合計を正しくカウントする", () => {
  const results = createMockResults();
  assertEquals(getTotalEntryCount(results), 4); // github: 2 + aws: 1 + claudeCode: 1 + githubCli: 0 + linear: 0
});

Deno.test("getTotalEntryCount - 空の結果で0を返す", () => {
  const results: Record<string, AnyEntry[]> = {
    github: [],
    aws: [],
    claudeCode: [],
    githubCli: [],
    linear: [],
  };
  assertEquals(getTotalEntryCount(results), 0);
});

Deno.test("hasNoEntries - エントリがある場合はfalseを返す", () => {
  const results = createMockResults();
  assertEquals(hasNoEntries(results), false);
});

Deno.test("hasNoEntries - 全て空の場合はtrueを返す", () => {
  const results: Record<string, AnyEntry[]> = {
    github: [],
    aws: [],
    claudeCode: [],
    githubCli: [],
    linear: [],
  };
  assertEquals(hasNoEntries(results), true);
});

Deno.test("applyMuteFilterToAll - ミュートフィルタを全エントリに適用する", () => {
  const results = createMockResults();
  const muteWords = ["Lambda"];
  const { filtered, mutedCount } = applyMuteFilterToAll(results, muteWords);

  assertEquals(mutedCount, 1);
  assertEquals(filtered.aws[0].muted, true);
  assertEquals(filtered.aws[0].mutedBy, "Lambda");
  assertEquals(filtered.github[0].muted, undefined);
});

Deno.test("applyMuteFilterToAll - ミュートワードが空の場合は変更なし", () => {
  const results = createMockResults();
  const { filtered, mutedCount } = applyMuteFilterToAll(results, []);

  assertEquals(mutedCount, 0);
  assertEquals(filtered.github.length, 2);
  assertEquals(filtered.aws.length, 1);
});

Deno.test("toChangelogData - 日次データを正しく変換する", () => {
  const results = createMockResults();
  const data = toChangelogData(results, "2024-01-15");

  assertEquals(data.date, "2024-01-15");
  assertEquals(data.startDate, undefined);
  assertEquals(data.endDate, undefined);
  assertEquals(data.github.length, 2);
  assertEquals(data.aws.length, 1);
  assertEquals(data.claudeCode.length, 1);
  assertEquals(data.githubCli.length, 0);
  assertEquals(data.linear.length, 0);
});

Deno.test("toChangelogData - 週次データ（開始日・終了日あり）を正しく変換する", () => {
  const results = createMockResults();
  const data = toChangelogData(results, "2024-01-15", {
    startDate: "2024-01-08",
    endDate: "2024-01-15",
  });

  assertEquals(data.date, "2024-01-15");
  assertEquals(data.startDate, "2024-01-08");
  assertEquals(data.endDate, "2024-01-15");
});

Deno.test("toChangelogData - 存在しないキーはデフォルトで空配列になる", () => {
  const results: Record<string, AnyEntry[]> = { github: [] };
  const data = toChangelogData(results, "2024-01-15");

  assertEquals(data.github.length, 0);
  assertEquals(data.aws.length, 0);
  assertEquals(data.claudeCode.length, 0);
  assertEquals(data.githubCli.length, 0);
  assertEquals(data.linear.length, 0);
});
