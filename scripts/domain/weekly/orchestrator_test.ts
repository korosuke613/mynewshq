// Weekly Orchestratorのテスト

import { assertEquals } from "@std/assert";
import type { ChangelogData, ProviderWeeklySummary } from "../types.ts";
import {
  createOrchestrator,
  getAdapter,
  getAllAdapters,
  WeeklyOrchestrator,
} from "./orchestrator.ts";
import { DefaultWeeklyMarkdownGenerator } from "../../presentation/markdown/weekly-markdown-generator.ts";

// テスト用のMarkdownGenerator
const testMarkdownGenerator = new DefaultWeeklyMarkdownGenerator();

Deno.test("getAdapter should return correct adapter for github", () => {
  const adapter = getAdapter("github", testMarkdownGenerator);
  assertEquals(adapter?.providerId, "github");
});

Deno.test("getAdapter should return correct adapter for claudeCode", () => {
  const adapter = getAdapter("claudeCode", testMarkdownGenerator);
  assertEquals(adapter?.providerId, "claudeCode");
});

Deno.test("getAdapter should return undefined for unknown provider", () => {
  const adapter = getAdapter("unknown", testMarkdownGenerator);
  assertEquals(adapter, undefined);
});

Deno.test("getAllAdapters should return 4 adapters", () => {
  const adapters = getAllAdapters(testMarkdownGenerator);
  assertEquals(adapters.size, 4);
  assertEquals(adapters.has("github"), true);
  assertEquals(adapters.has("aws"), true);
  assertEquals(adapters.has("claudeCode"), true);
  assertEquals(adapters.has("linear"), true);
});

Deno.test("createOrchestrator should create orchestrator with all adapters", () => {
  const orchestrator = createOrchestrator(testMarkdownGenerator);
  // オーケストレーターが作成されることを確認
  assertEquals(orchestrator instanceof WeeklyOrchestrator, true);
});

Deno.test("prepareSummarizeRequests should skip providers with no entries", () => {
  const orchestrator = createOrchestrator(testMarkdownGenerator);

  const emptyChangelogData: ChangelogData = {
    date: "2026-01-27",
    startDate: "2026-01-21",
    endDate: "2026-01-27",
    github: [],
    aws: [],
    claudeCode: [],
    linear: [],
  };

  const requests = orchestrator.prepareSummarizeRequests(
    emptyChangelogData,
    {},
  );

  assertEquals(requests.length, 0);
});

Deno.test("prepareSummarizeRequests should create requests for providers with entries", () => {
  const orchestrator = createOrchestrator(testMarkdownGenerator);

  const changelogData: ChangelogData = {
    date: "2026-01-27",
    startDate: "2026-01-21",
    endDate: "2026-01-27",
    github: [
      {
        title: "Test GitHub Entry",
        url: "https://github.blog/changelog/test",
        content: "Test content",
        pubDate: "2026-01-25",
      },
    ],
    aws: [],
    claudeCode: [
      {
        version: "1.0.0",
        url: "https://github.com/anthropics/claude-code/releases/tag/v1.0.0",
        body: "Release notes",
        publishedAt: "2026-01-24",
      },
    ],
    linear: [],
  };

  const requests = orchestrator.prepareSummarizeRequests(changelogData, {});

  // github と claudeCode の2つのリクエストが作成される
  assertEquals(requests.length, 2);

  const githubRequest = requests.find((r) => r.providerId === "github");
  const claudeCodeRequest = requests.find((r) => r.providerId === "claudeCode");

  assertEquals(githubRequest?.currentData.length, 1);
  assertEquals(claudeCodeRequest?.currentData.length, 1);
});

Deno.test("prepareSummarizeRequests should filter muted entries", () => {
  const orchestrator = createOrchestrator(testMarkdownGenerator);

  const changelogData: ChangelogData = {
    date: "2026-01-27",
    startDate: "2026-01-21",
    endDate: "2026-01-27",
    github: [
      {
        title: "Active Entry",
        url: "https://github.blog/changelog/active",
        content: "Active content",
        pubDate: "2026-01-25",
      },
      {
        title: "Muted Entry",
        url: "https://github.blog/changelog/muted",
        content: "Muted content",
        pubDate: "2026-01-25",
        muted: true,
      },
    ],
    aws: [],
    claudeCode: [],
    linear: [],
  };

  const requests = orchestrator.prepareSummarizeRequests(changelogData, {});

  assertEquals(requests.length, 1);
  assertEquals(requests[0].providerId, "github");
  assertEquals(requests[0].currentData.length, 1);
  assertEquals(
    (requests[0].currentData[0] as { title: string }).title,
    "Active Entry",
  );
});

Deno.test("adapter getSummarizeConfig should return valid config", () => {
  const githubAdapter = getAdapter("github", testMarkdownGenerator);
  const claudeCodeAdapter = getAdapter("claudeCode", testMarkdownGenerator);

  const githubConfig = githubAdapter?.getSummarizeConfig();
  const claudeCodeConfig = claudeCodeAdapter?.getSummarizeConfig();

  // GitHub（カテゴリあり）のスキーマ
  assertEquals(typeof githubConfig?.jsonSchema, "object");
  assertEquals(typeof githubConfig?.promptTemplate, "string");
  assertEquals(githubConfig?.promptTemplate.includes("{providerId}"), true);
  assertEquals(githubConfig?.promptTemplate.includes("{currentData}"), true);
  assertEquals(
    githubConfig?.promptTemplate.includes("{pastDiscussions}"),
    true,
  );

  // Claude Code（シンプル）のスキーマ
  assertEquals(typeof claudeCodeConfig?.jsonSchema, "object");
  assertEquals(typeof claudeCodeConfig?.promptTemplate, "string");
});

Deno.test("adapter generateMarkdown should return markdown string", () => {
  const adapter = getAdapter("github", testMarkdownGenerator);

  const data = [
    {
      title: "Test Entry",
      url: "https://example.com",
      content: "Test content",
      pubDate: "2026-01-25",
    },
  ];

  const summary: ProviderWeeklySummary = {
    providerId: "github",
    highlights: ["Highlight 1", "Highlight 2", "Highlight 3"],
    categories: [
      {
        category: "copilot",
        entries: [{ url: "https://example.com", title: "Test Entry" }],
        comment: "Test comment",
        historicalContext: "Test context",
      },
    ],
  };

  const ctx = {
    startDate: "2026-01-21",
    endDate: "2026-01-27",
    token: "test-token",
    owner: "korosuke613",
    repo: "mynewshq",
    categoryName: "General",
  };

  const markdown = adapter?.generateMarkdown(data, summary, ctx);

  assertEquals(typeof markdown, "string");
  assertEquals(markdown?.includes("Tech Changelog - Weekly"), true);
  assertEquals(markdown?.includes("GitHub Changelog"), true);
  assertEquals(markdown?.includes("今週のハイライト"), true);
});
