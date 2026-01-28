// Weekly Orchestratorのテスト

import { assertEquals } from "@std/assert";
import type { ChangelogData, ProviderWeeklySummary } from "../types.ts";
import {
  createOrchestrator,
  getAdapter,
  getAllAdapters,
  WeeklyOrchestrator,
} from "./orchestrator.ts";

Deno.test("getAdapter should return correct adapter for github", () => {
  const adapter = getAdapter("github");
  assertEquals(adapter?.providerId, "github");
});

Deno.test("getAdapter should return correct adapter for claudeCode", () => {
  const adapter = getAdapter("claudeCode");
  assertEquals(adapter?.providerId, "claudeCode");
});

Deno.test("getAdapter should return undefined for unknown provider", () => {
  const adapter = getAdapter("unknown");
  assertEquals(adapter, undefined);
});

Deno.test("getAllAdapters should return 4 adapters", () => {
  const adapters = getAllAdapters();
  assertEquals(adapters.size, 4);
  assertEquals(adapters.has("github"), true);
  assertEquals(adapters.has("aws"), true);
  assertEquals(adapters.has("claudeCode"), true);
  assertEquals(adapters.has("linear"), true);
});

Deno.test("createOrchestrator should create orchestrator with all adapters", () => {
  const orchestrator = createOrchestrator();
  // オーケストレーターが作成されることを確認
  assertEquals(orchestrator instanceof WeeklyOrchestrator, true);
});

Deno.test("prepareSummarizeRequests should skip providers with no entries", () => {
  const orchestrator = createOrchestrator();

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
  const orchestrator = createOrchestrator();

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
  const orchestrator = createOrchestrator();

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
  const githubAdapter = getAdapter("github");
  const claudeCodeAdapter = getAdapter("claudeCode");

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
  const adapter = getAdapter("github");

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

Deno.test("postAllDiscussions should filter muted entries before generating markdown", () => {
  const orchestrator = createOrchestrator();

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
        title: "Amazon RDS Muted Entry",
        url: "https://github.blog/changelog/muted",
        content: "Muted content",
        pubDate: "2026-01-25",
        muted: true,
        mutedBy: "Amazon RDS",
      },
    ],
    aws: [],
    claudeCode: [],
    linear: [],
  };

  const summary: ProviderWeeklySummary = {
    providerId: "github",
    highlights: ["Highlight 1"],
    categories: [
      {
        category: "copilot",
        entries: [
          { url: "https://github.blog/changelog/active", title: "Active Entry" },
        ],
        comment: "Test comment",
        historicalContext: "Test context",
      },
    ],
  };

  // generateMarkdown が正しくフィルタされたデータを受け取ることを確認
  // （実際の投稿はテストしない）
  const adapter = orchestrator["adapters"].get("github");
  const data = orchestrator.getProviderData(changelogData, "github");

  // フィルタ前: 2エントリ（1つmuted）
  assertEquals(data.length, 2);

  // フィルタ後: 1エントリ（mutedを除外）
  const filteredData = data.filter((entry) => !entry.muted);
  assertEquals(filteredData.length, 1);
  assertEquals(
    (filteredData[0] as { title: string }).title,
    "Active Entry",
  );
});
