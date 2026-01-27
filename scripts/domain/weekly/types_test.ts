// 週次処理用型定義のテスト

import { assertEquals } from "@std/assert";
import {
  CATEGORIZED_SUMMARY_SCHEMA,
  getWeeklyProviderConfig,
  isValidProviderWeeklySummary,
  SIMPLE_SUMMARY_SCHEMA,
  WEEKLY_PROVIDER_CONFIGS,
  WEEKLY_PROVIDER_IDS,
} from "./types.ts";

Deno.test("WEEKLY_PROVIDER_CONFIGS should contain 4 providers", () => {
  assertEquals(WEEKLY_PROVIDER_CONFIGS.length, 4);
});

Deno.test("WEEKLY_PROVIDER_IDS should contain correct provider IDs", () => {
  assertEquals(WEEKLY_PROVIDER_IDS, ["github", "aws", "claudeCode", "linear"]);
});

Deno.test("getWeeklyProviderConfig should return correct config for github", () => {
  const config = getWeeklyProviderConfig("github");
  assertEquals(config?.providerId, "github");
  assertEquals(config?.type, "categorized");
  assertEquals(config?.displayName, "GitHub Changelog");
});

Deno.test("getWeeklyProviderConfig should return correct config for claudeCode", () => {
  const config = getWeeklyProviderConfig("claudeCode");
  assertEquals(config?.providerId, "claudeCode");
  assertEquals(config?.type, "simple");
  assertEquals(config?.displayName, "Claude Code");
});

Deno.test("getWeeklyProviderConfig should return undefined for unknown provider", () => {
  const config = getWeeklyProviderConfig("unknown");
  assertEquals(config, undefined);
});

Deno.test("CATEGORIZED_SUMMARY_SCHEMA should have required properties", () => {
  assertEquals(CATEGORIZED_SUMMARY_SCHEMA.type, "object");
  assertEquals(CATEGORIZED_SUMMARY_SCHEMA.required, [
    "providerId",
    "highlights",
    "categories",
  ]);
});

Deno.test("SIMPLE_SUMMARY_SCHEMA should have required properties", () => {
  assertEquals(SIMPLE_SUMMARY_SCHEMA.type, "object");
  assertEquals(SIMPLE_SUMMARY_SCHEMA.required, [
    "providerId",
    "highlights",
    "entries",
    "overallComment",
    "historicalContext",
  ]);
});

Deno.test("isValidProviderWeeklySummary should return true for valid categorized summary", () => {
  const validSummary = {
    providerId: "github",
    highlights: ["highlight1", "highlight2", "highlight3"],
    categories: [
      {
        category: "copilot",
        entries: [{ url: "https://example.com", title: "Test" }],
        comment: "Test comment",
        historicalContext: "Test context",
      },
    ],
  };
  assertEquals(isValidProviderWeeklySummary(validSummary), true);
});

Deno.test("isValidProviderWeeklySummary should return true for valid simple summary", () => {
  const validSummary = {
    providerId: "claudeCode",
    highlights: ["highlight1"],
    entries: [{ url: "https://example.com", title: "v1.0.0" }],
    overallComment: "Test comment",
    historicalContext: "Test context",
  };
  assertEquals(isValidProviderWeeklySummary(validSummary), true);
});

Deno.test("isValidProviderWeeklySummary should return false for invalid data", () => {
  assertEquals(isValidProviderWeeklySummary(null), false);
  assertEquals(isValidProviderWeeklySummary(undefined), false);
  assertEquals(isValidProviderWeeklySummary("string"), false);
  assertEquals(isValidProviderWeeklySummary({}), false);
  assertEquals(isValidProviderWeeklySummary({ providerId: "test" }), false);
  assertEquals(
    isValidProviderWeeklySummary({
      providerId: "test",
      highlights: "not-array",
    }),
    false,
  );
});
