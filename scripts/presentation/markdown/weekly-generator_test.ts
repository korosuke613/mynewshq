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
      {
        url: "https://github.blog/changelog/copilot-sdk",
        title: "Copilot SDK in Technical Preview",
        reason: "AIアシスタントの開発がより身近になる重要なSDKリリース",
        impact: "自社プロダクトへのAI支援機能の組み込みが容易に",
      },
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
    trendAnalysis:
      "今週のGitHub全体の動向として、AI支援開発ツールへの投資が継続しています",
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
  assertStringIncludes(body, "[Copilot SDK in Technical Preview]");
  assertStringIncludes(
    body,
    "**選定理由**: AIアシスタントの開発がより身近になる重要なSDKリリース",
  );

  // カテゴリ別詳細の確認
  assertStringIncludes(body, "## 📊 カテゴリ別詳細");
  assertStringIncludes(body, "### copilot (1件)");
  assertStringIncludes(body, "### actions (1件)");
  assertStringIncludes(
    body,
    "**コメント**: 今週はCopilot関連の機能が大幅に強化されました",
  );

  // 傾向分析の確認
  assertStringIncludes(body, "## 🔮 傾向分析");
  assertStringIncludes(body, "AI支援開発ツールへの投資が継続");
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
      {
        url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.19",
        title: "v2.1.19",
        reason: "セッション管理機能の大幅改善",
        impact: "長時間のコーディングセッションがより快適に",
      },
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
    trendAnalysis:
      "Claude Codeは継続的にリリースを重ねており、開発者体験の向上に注力しています",
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

  // 傾向分析の確認
  assertStringIncludes(body, "## 🔮 傾向分析");
  assertStringIncludes(body, "Claude Codeは継続的にリリースを重ねており");
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
      {
        url: "https://example.com/active",
        title: "Active entry",
        reason: "重要な更新",
        impact: "ユーザー体験の向上",
      },
    ],
    entries: [
      {
        url: "https://example.com/active",
        title: "Active entry",
      },
    ],
    overallComment: "今週の更新",
    historicalContext: "先週からの変化",
    trendAnalysis: "傾向分析",
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
