import { assertEquals, assertExists } from "@std/assert";
import {
  getProviderConfig,
  getProviderDisplayName,
  getProviderEmoji,
  getProviderIds,
  getProviderLabelName,
  PROVIDER_CONFIGS,
} from "./providers.ts";

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
  }
});

Deno.test("getProviderConfig - 存在するIDで設定を取得できる", () => {
  const github = getProviderConfig("github");
  assertExists(github);
  assertEquals(github.displayName, "GitHub Changelog");
  assertEquals(github.emoji, "🐙");
  assertEquals(github.labelName, "github");
  assertEquals(github.labelPrefix, "gh:");

  const aws = getProviderConfig("aws");
  assertExists(aws);
  assertEquals(aws.displayName, "AWS What's New");
  assertEquals(aws.emoji, "☁️");
  assertEquals(aws.labelPrefix, "aws:");
  assertExists(aws.transformLabel);

  const claudeCode = getProviderConfig("claudeCode");
  assertExists(claudeCode);
  assertEquals(claudeCode.displayName, "Claude Code");
  assertEquals(claudeCode.emoji, "🤖");
  assertEquals(claudeCode.titleField, "version");
  assertEquals(claudeCode.pubDateField, "publishedAt");

  const linear = getProviderConfig("linear");
  assertExists(linear);
  assertEquals(linear.displayName, "Linear Changelog");
  assertEquals(linear.emoji, "📐");
});

Deno.test("getProviderConfig - 存在しないIDでundefinedを返す", () => {
  const result = getProviderConfig("unknown");
  assertEquals(result, undefined);
});

Deno.test("getProviderEmoji - 各プロバイダーの絵文字を取得できる", () => {
  assertEquals(getProviderEmoji("github"), "🐙");
  assertEquals(getProviderEmoji("aws"), "☁️");
  assertEquals(getProviderEmoji("claudeCode"), "🤖");
  assertEquals(getProviderEmoji("linear"), "📐");
});

Deno.test("getProviderEmoji - 存在しないIDでデフォルト絵文字を返す", () => {
  assertEquals(getProviderEmoji("unknown"), "📌");
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
