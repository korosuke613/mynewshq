import { assertEquals, assertStringIncludes } from "@std/assert";
import type {
  ChangelogEntry,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../../domain/types.ts";
import {
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
} from "./weekly-generator.ts";

Deno.test("generateProviderWeeklyTitle - GitHubプロバイダーのタイトル生成", () => {
  const title = generateProviderWeeklyTitle("github", "2026-01-20");
  assertEquals(
    title,
    "📰 Tech Changelog - Weekly [GitHub Changelog] (2026-01-20)",
  );
});

Deno.test("generateProviderWeeklyTitle - AWSプロバイダーのタイトル生成", () => {
  const title = generateProviderWeeklyTitle("aws", "2026-01-20");
  assertEquals(
    title,
    "📰 Tech Changelog - Weekly [AWS What's New] (2026-01-20)",
  );
});

Deno.test("generateProviderWeeklyTitle - Claude Codeプロバイダーのタイトル生成", () => {
  const title = generateProviderWeeklyTitle("claudeCode", "2026-01-20");
  assertEquals(title, "📰 Tech Changelog - Weekly [Claude Code] (2026-01-20)");
});

Deno.test("generateProviderWeeklyBody - カテゴリありプロバイダー（GitHub）のMarkdown生成", () => {
  const providerData: ChangelogEntry[] = [
    {
      title: "Copilot SDK in Technical Preview",
      url: "https://github.blog/changelog/copilot-sdk",
      content: "Copilot SDK release",
      pubDate: "2026-01-18",
      labels: { "changelog-label": ["copilot"] },
    },
    {
      title: "Actions runner improvements",
      url: "https://github.blog/changelog/actions-runner",
      content: "Actions improvements",
      pubDate: "2026-01-17",
      labels: { "changelog-label": ["actions"] },
    },
  ];

  const summary: ProviderWeeklySummary = {
    providerId: "github",
    highlights: [
      "Copilot SDKがTechnical Previewで公開され、AIアシスタント開発が身近に",
      "GitHub Actionsの実行環境が改善され、CI/CDパイプラインの効率が向上",
      "AI支援開発ツールへの継続的な投資が見られる",
    ],
    categories: [
      {
        category: "copilot",
        entries: [
          {
            url: "https://github.blog/changelog/copilot-sdk",
            title: "Copilot SDK in Technical Preview",
          },
        ],
        comment: "今週はCopilot関連の機能が大幅に強化されました",
        historicalContext: "前週に続きCopilotへの投資が継続",
      },
      {
        category: "actions",
        entries: [
          {
            url: "https://github.blog/changelog/actions-runner",
            title: "Actions runner improvements",
          },
        ],
        comment: "GitHub Actionsの実行環境が改善されました",
        historicalContext: "Actions関連は安定した更新ペースを維持",
      },
    ],
  };

  const body = generateProviderWeeklyBody(
    "github",
    providerData,
    summary,
    "2026-01-13",
    "2026-01-20",
  );

  // ヘッダーの確認
  assertStringIncludes(body, "# 🐙 Tech Changelog - Weekly [GitHub Changelog]");
  assertStringIncludes(body, "📅 **対象期間**: 2026-01-13 ~ 2026-01-20");

  // ハイライトセクションの確認
  assertStringIncludes(body, "## 🌟 今週のハイライト");
  assertStringIncludes(
    body,
    "- Copilot SDKがTechnical Previewで公開され、AIアシスタント開発が身近に",
  );
  assertStringIncludes(
    body,
    "- GitHub Actionsの実行環境が改善され、CI/CDパイプラインの効率が向上",
  );

  // カテゴリ別詳細の確認
  assertStringIncludes(body, "## 📊 カテゴリ別詳細");
  assertStringIncludes(body, "### copilot (1件)");
  assertStringIncludes(body, "### actions (1件)");
  assertStringIncludes(
    body,
    "**コメント**: 今週はCopilot関連の機能が大幅に強化されました",
  );
});

Deno.test("generateProviderWeeklyBody - カテゴリなしプロバイダー（Claude Code）のMarkdown生成", () => {
  const providerData: ReleaseEntry[] = [
    {
      version: "v2.1.19",
      url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.19",
      body: "Release notes for v2.1.19",
      publishedAt: "2026-01-18",
    },
    {
      version: "v2.1.14",
      url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.14",
      body: "Release notes for v2.1.14",
      publishedAt: "2026-01-15",
    },
  ];

  const summary: ProviderWeeklySummary = {
    providerId: "claudeCode",
    highlights: [
      "v2.1.19でセッション管理機能が大幅に改善され、長時間作業が快適に",
      "今週は2つのリリースがあり、UI改善とバグ修正が中心",
      "VSCode向け機能の追加が増加傾向",
    ],
    entries: [
      {
        url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.14",
        title: "v2.1.14",
      },
      {
        url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.19",
        title: "v2.1.19",
      },
    ],
    overallComment: "今週は2つのリリースがあり、主にUI改善とバグ修正が中心",
    historicalContext: "VSCode向け機能の追加が増加傾向にあります",
  };

  const body = generateProviderWeeklyBody(
    "claudeCode",
    providerData,
    summary,
    "2026-01-13",
    "2026-01-20",
  );

  // ヘッダーの確認
  assertStringIncludes(body, "# 🤖 Tech Changelog - Weekly [Claude Code]");

  // ハイライトセクションの確認
  assertStringIncludes(body, "## 🌟 今週のハイライト");
  assertStringIncludes(body, "[v2.1.19]");

  // リリース一覧の確認（カテゴリなしプロバイダー）
  assertStringIncludes(body, "## 📊 リリース一覧");
  assertStringIncludes(body, "[v2.1.14]");
  assertStringIncludes(body, "[v2.1.19]");
  assertStringIncludes(body, "**コメント**: 今週は2つのリリースがあり");
  assertStringIncludes(
    body,
    "**過去との比較**: VSCode向け機能の追加が増加傾向",
  );
});

Deno.test("generateProviderWeeklyBody - mutedエントリを含むデータの処理", () => {
  const providerData: ChangelogEntry[] = [
    {
      title: "Active entry",
      url: "https://example.com/active",
      content: "Active content",
      pubDate: "2026-01-18",
    },
    {
      title: "Muted entry",
      url: "https://example.com/muted",
      content: "Muted content",
      pubDate: "2026-01-17",
      muted: true,
      mutedBy: "test-word",
    },
  ];

  const summary: ProviderWeeklySummary = {
    providerId: "linear",
    highlights: [
      "重要な更新でユーザー体験が向上",
      "今週の変更点の概要",
    ],
    entries: [
      {
        url: "https://example.com/active",
        title: "Active entry",
      },
    ],
    overallComment: "今週の更新",
    historicalContext: "先週からの変化",
  };

  const body = generateProviderWeeklyBody(
    "linear",
    providerData,
    summary,
    "2026-01-13",
    "2026-01-20",
  );

  // summary.entriesにはmutedが含まれていない（LLMが処理済み）ことを確認
  assertStringIncludes(body, "Active entry");
  // mutedエントリはsummaryに含まれていないので表示されない
});
