import { assertEquals, assertExists } from "@std/assert";
import {
  applyMuteFilterToAll,
  getProviderConfig,
  getProviderDisplayName,
  getProviderEmoji,
  getProviderIds,
  getProviderLabelName,
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
import { linearProvider } from "./linear-provider.ts";

Deno.test("PROVIDER_CONFIGS - 全4プロバイダーが定義されている", () => {
  assertEquals(PROVIDER_CONFIGS.length, 4);
  const ids = PROVIDER_CONFIGS.map((c) => c.id);
  assertEquals(ids, ["github", "aws", "claudeCode", "linear"]);
});

Deno.test("PROVIDER_CONFIGS - 各プロバイダーの必須フィールドが存在する", () => {
  for (const config of PROVIDER_CONFIGS) {
    assertExists(config.id);
    assertExists(config.displayName);
    assertExists(config.emoji);
    assertExists(config.labelName);
    assertExists(config.titleField);
    assertExists(config.pubDateField);
    assertExists(config.fetch);
  }
});

Deno.test("PROVIDER_REGISTRY - Mapで高速にアクセスできる", () => {
  assertEquals(PROVIDER_REGISTRY.size, 4);
  assertExists(PROVIDER_REGISTRY.get("github"));
  assertExists(PROVIDER_REGISTRY.get("aws"));
  assertExists(PROVIDER_REGISTRY.get("claudeCode"));
  assertExists(PROVIDER_REGISTRY.get("linear"));
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
});

Deno.test("getProviderConfig - 存在しないIDでundefinedを返す", () => {
  const result = getProviderConfig("unknown");
  assertEquals(result, undefined);
});

Deno.test("getProviderEmoji - 各プロバイダーの絵文字を取得できる", () => {
  assertEquals(getProviderEmoji("github"), "\u{1F419}");
  assertEquals(getProviderEmoji("aws"), "\u2601\uFE0F");
  assertEquals(getProviderEmoji("claudeCode"), "\u{1F916}");
  assertEquals(getProviderEmoji("linear"), "\u{1F4D0}");
});

Deno.test("getProviderEmoji - 存在しないIDでデフォルト絵文字を返す", () => {
  assertEquals(getProviderEmoji("unknown"), "\u{1F4CC}");
});

Deno.test("getProviderDisplayName - 各プロバイダーの表示名を取得できる", () => {
  assertEquals(getProviderDisplayName("github"), "GitHub Changelog");
  assertEquals(getProviderDisplayName("aws"), "AWS What's New");
  assertEquals(getProviderDisplayName("claudeCode"), "Claude Code");
  assertEquals(getProviderDisplayName("linear"), "Linear Changelog");
});

Deno.test("getProviderDisplayName - 存在しないIDでID自体を返す", () => {
  assertEquals(getProviderDisplayName("unknown"), "unknown");
});

Deno.test("getProviderLabelName - 各プロバイダーのラベル名を取得できる", () => {
  assertEquals(getProviderLabelName("github"), "github");
  assertEquals(getProviderLabelName("aws"), "aws");
  assertEquals(getProviderLabelName("claudeCode"), "claude-code");
  assertEquals(getProviderLabelName("linear"), "linear");
});

Deno.test("getProviderLabelName - 存在しないIDでID自体を返す", () => {
  assertEquals(getProviderLabelName("unknown"), "unknown");
});

Deno.test("getProviderIds - 全プロバイダーIDを取得できる", () => {
  const ids = getProviderIds();
  assertEquals(ids, ["github", "aws", "claudeCode", "linear"]);
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
  assertEquals(linearProvider.labelPrefix, undefined);
  assertEquals(linearProvider.titleField, "title");
  assertEquals(linearProvider.pubDateField, "pubDate");
  assertExists(linearProvider.fetch);
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
    linear: [],
  };
}

Deno.test("getTotalEntryCount - 全エントリの合計を正しくカウントする", () => {
  const results = createMockResults();
  assertEquals(getTotalEntryCount(results), 4); // github: 2 + aws: 1 + claudeCode: 1 + linear: 0
});

Deno.test("getTotalEntryCount - 空の結果で0を返す", () => {
  const results: Record<string, AnyEntry[]> = {
    github: [],
    aws: [],
    claudeCode: [],
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
  assertEquals(data.linear.length, 0);
});
