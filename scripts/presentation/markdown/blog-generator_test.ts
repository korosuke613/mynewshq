// Blog Markdown生成のテスト
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  generateBlogBodyWithSummaries,
  generateBlogTitle,
  generateCoveragePeriod,
  generateDefaultBlogBody,
} from "./blog-generator.ts";
import type { BlogData, BlogSummaryData } from "../../domain/types.ts";

Deno.test("generateBlogTitle - 日次", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [],
    githubBlog: [],
  };
  const title = generateBlogTitle(data);
  assertEquals(title, "📖 Tech Blog - 2026-01-18");
});

Deno.test("generateBlogTitle - 週次", () => {
  const data: BlogData = {
    date: "2026-01-20",
    startDate: "2026-01-13",
    endDate: "2026-01-20",
    hatenaBookmark: [],
    githubBlog: [],
  };
  const title = generateBlogTitle(data);
  assertEquals(title, "📖 Tech Blog - Weekly (2026-01-13 ~ 2026-01-20)");
});

Deno.test("generateCoveragePeriod", () => {
  const period = generateCoveragePeriod("2026-01-18");
  assertEquals(
    period,
    "📅 **対象期間**: 2026-01-17 03:00 UTC ~ 2026-01-18 03:00 UTC",
  );
});

Deno.test("generateDefaultBlogBody - 日次（カテゴリベース）", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "AWS記事",
        url: "https://example.com/aws",
        description: "AWS説明",
        pubDate: "2026-01-18T06:00:00Z",
        tags: ["aws"],
        matchedCategories: ["aws"],
      },
      {
        title: "GitHub記事",
        url: "https://example.com/github",
        description: "GitHub説明",
        pubDate: "2026-01-18T07:00:00Z",
        tags: ["github"],
        matchedCategories: ["github"],
      },
    ],
    githubBlog: [],
  };
  const body = generateDefaultBlogBody(data);
  assertStringIncludes(body, "# 📖 Tech Blog - 2026-01-18");
  assertStringIncludes(body, "📅 **対象期間**:");
  // カテゴリベースで出力されることを確認
  assertStringIncludes(body, "## aws (1件)");
  assertStringIncludes(body, "- [AWS記事](https://example.com/aws)");
  assertStringIncludes(body, "## github (1件)");
  assertStringIncludes(body, "- [GitHub記事](https://example.com/github)");
});

Deno.test("generateDefaultBlogBody - ミュート済みエントリを除外", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "アクティブ記事",
        url: "https://example.com/active",
        description: "アクティブな記事",
        pubDate: "2026-01-18T06:00:00Z",
        matchedCategories: ["aws"],
      },
      {
        title: "ミュート記事",
        url: "https://example.com/muted",
        description: "ミュートされた記事",
        pubDate: "2026-01-18T06:00:00Z",
        muted: true,
        mutedBy: "keyword",
      },
    ],
    githubBlog: [],
  };
  const body = generateDefaultBlogBody(data);
  assertStringIncludes(body, "[アクティブ記事]");
  assertStringIncludes(body, "[ミュート記事]"); // ミュートセクションに含まれる
  assertStringIncludes(body, "ミュートされたエントリ");
});

Deno.test("generateBlogBodyWithSummaries - カテゴリごとグループ化形式", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "AWS Lambda新機能",
        url: "https://example.com/aws-lambda",
        description: "Lambda最新機能の紹介",
        pubDate: "2026-01-18T06:00:00Z",
        matchedCategories: ["aws"],
      },
      {
        title: "GitHub Actions活用",
        url: "https://example.com/github-actions",
        description: "GitHub ActionsでCI/CD",
        pubDate: "2026-01-18T07:00:00Z",
        matchedCategories: ["github", "ci/cd"],
      },
    ],
    githubBlog: [],
  };

  const summaries: BlogSummaryData = {
    categories: [
      {
        category: "AWS",
        entries: [
          {
            url: "https://example.com/aws-lambda",
            title: "AWS Lambda新機能",
            comment: "サーバーレス開発が便利に",
          },
        ],
        categoryComment:
          "インフラ・コスト最適化系の記事が多く、効率的なクラウド運用への関心が高まっています。",
      },
      {
        category: "GitHub",
        entries: [
          {
            url: "https://example.com/github-actions",
            title: "GitHub Actions活用",
            comment: "CI/CDパイプラインの改善",
          },
        ],
        categoryComment: "AI支援開発とCI/CDの高度化がトレンドです。",
      },
    ],
  };

  const body = generateBlogBodyWithSummaries(data, summaries);

  // 基本構造の確認
  assertStringIncludes(body, "# 📖 Tech Blog - 2026-01-18");
  assertStringIncludes(body, "📅 **対象期間**:");
  assertStringIncludes(
    body,
    "本日の技術ブログから、開発者向けの注目記事をカテゴリごとにまとめました。",
  );

  // AWSカテゴリの確認
  assertStringIncludes(body, "## AWS (1件)");
  assertStringIncludes(
    body,
    "- [AWS Lambda新機能](https://example.com/aws-lambda) - サーバーレス開発が便利に",
  );
  assertStringIncludes(
    body,
    "**今日のAWS**: インフラ・コスト最適化系の記事が多く、効率的なクラウド運用への関心が高まっています。",
  );

  // GitHubカテゴリの確認
  assertStringIncludes(body, "## GitHub (1件)");
  assertStringIncludes(
    body,
    "- [GitHub Actions活用](https://example.com/github-actions) - CI/CDパイプラインの改善",
  );
  assertStringIncludes(
    body,
    "**今日のGitHub**: AI支援開発とCI/CDの高度化がトレンドです。",
  );

  // 区切り線の確認
  assertStringIncludes(body, "---");
});

Deno.test("generateBlogBodyWithSummaries - カテゴリが空の場合", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [],
    githubBlog: [],
  };

  const summaries: BlogSummaryData = {
    categories: [],
  };

  const body = generateBlogBodyWithSummaries(data, summaries);

  // 基本構造のみ確認
  assertStringIncludes(body, "# 📖 Tech Blog - 2026-01-18");
  assertStringIncludes(body, "📅 **対象期間**:");
});

Deno.test("generateBlogBodyWithSummaries - 複数カテゴリマッチ", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "AWS Lambda on EKS",
        url: "https://example.com/aws-eks",
        description: "Kubernetes上でLambda実行",
        pubDate: "2026-01-18T06:00:00Z",
        matchedCategories: ["aws", "kubernetes"],
      },
    ],
    githubBlog: [],
  };

  const summaries: BlogSummaryData = {
    categories: [
      {
        category: "AWS",
        entries: [
          {
            url: "https://example.com/aws-eks",
            title: "AWS Lambda on EKS",
            comment: "Kubernetesでサーバーレスを実現",
          },
        ],
        categoryComment: "AWSとKubernetesの統合が進んでいます。",
      },
      {
        category: "Kubernetes",
        entries: [
          {
            url: "https://example.com/aws-eks",
            title: "AWS Lambda on EKS",
            comment: "Kubernetesでサーバーレスを実現",
          },
        ],
        categoryComment: "Kubernetesの活用範囲が広がっています。",
      },
    ],
  };

  const body = generateBlogBodyWithSummaries(data, summaries);

  // 同じ記事が両方のカテゴリに表示される
  assertStringIncludes(body, "## AWS (1件)");
  assertStringIncludes(body, "## Kubernetes (1件)");
  // 記事は2回表示される（重複表示）
  const matches = body.match(
    /\[AWS Lambda on EKS\]\(https:\/\/example\.com\/aws-eks\)/g,
  );
  assertEquals(matches?.length, 2);
});

Deno.test("generateDefaultBlogBody - その他カテゴリは最後に表示", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "その他記事",
        url: "https://example.com/other",
        description: "カテゴリなし",
        pubDate: "2026-01-18T06:00:00Z",
        matchedCategories: [],
      },
      {
        title: "AWS記事",
        url: "https://example.com/aws",
        description: "AWS説明",
        pubDate: "2026-01-18T07:00:00Z",
        matchedCategories: ["aws"],
      },
    ],
    githubBlog: [],
  };
  const body = generateDefaultBlogBody(data);
  // AWSが先に表示され、その他が後に表示されることを確認
  const awsIndex = body.indexOf("## aws (1件)");
  const otherIndex = body.indexOf("## その他 (1件)");
  assertEquals(awsIndex < otherIndex, true);
});

Deno.test("generateDefaultBlogBody - 両プロバイダーの記事を統合", () => {
  const data: BlogData = {
    date: "2026-01-18",
    hatenaBookmark: [
      {
        title: "はてなのAWS記事",
        url: "https://example.com/hatena-aws",
        description: "はてなから",
        pubDate: "2026-01-18T06:00:00Z",
        matchedCategories: ["aws"],
      },
    ],
    githubBlog: [
      {
        title: "GitHub BlogのAWS記事",
        url: "https://example.com/github-aws",
        description: "GitHub Blogから",
        pubDate: "2026-01-18T07:00:00Z",
        matchedCategories: ["aws"],
      },
    ],
  };
  const body = generateDefaultBlogBody(data);
  // 両プロバイダーの記事が同じawsカテゴリにまとまる
  assertStringIncludes(body, "## aws (2件)");
  assertStringIncludes(body, "[はてなのAWS記事]");
  assertStringIncludes(body, "[GitHub BlogのAWS記事]");
});
