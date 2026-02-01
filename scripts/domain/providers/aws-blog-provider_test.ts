// AWS Blog Provider のテスト
import { assertEquals } from "@std/assert";
import { AWS_BLOG_FEEDS, awsBlogProvider } from "./aws-blog-provider.ts";

Deno.test("awsBlogProvider - プロバイダー設定", () => {
  assertEquals(awsBlogProvider.id, "awsBlog");
  assertEquals(awsBlogProvider.displayName, "AWS Blog");
  assertEquals(awsBlogProvider.emoji, "📙");
  assertEquals(awsBlogProvider.labelName, "aws-blog");
  assertEquals(awsBlogProvider.category, "blog");
  assertEquals(awsBlogProvider.titleField, "title");
  assertEquals(awsBlogProvider.pubDateField, "pubDate");
  assertEquals(typeof awsBlogProvider.fetch, "function");
});

Deno.test("AWS_BLOG_FEEDS - フィード数", () => {
  // 9つの主要AWSブログフィードが登録されていることを確認
  assertEquals(AWS_BLOG_FEEDS.length, 9);
});

Deno.test("AWS_BLOG_FEEDS - 全てのURLが有効", () => {
  // すべてのフィードURLがhttpsで始まり、/feed/で終わることを確認
  for (const feedUrl of AWS_BLOG_FEEDS) {
    assertEquals(feedUrl.startsWith("https://aws.amazon.com/blogs/"), true);
    assertEquals(feedUrl.endsWith("/feed/"), true);
  }
});
