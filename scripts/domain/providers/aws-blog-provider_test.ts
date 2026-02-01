// AWS Blog Provider のテスト
import { assertEquals } from "@std/assert";
import { awsBlogProvider } from "./aws-blog-provider.ts";

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
