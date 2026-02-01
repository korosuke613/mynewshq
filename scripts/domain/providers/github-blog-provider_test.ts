// GitHub Blog Provider のテスト
import { assertEquals, assertExists } from "@std/assert";
import { githubBlogProvider } from "./github-blog-provider.ts";

Deno.test("githubBlogProvider - 設定値の確認", () => {
  assertEquals(githubBlogProvider.id, "githubBlog");
  assertEquals(githubBlogProvider.displayName, "GitHub Blog");
  assertEquals(githubBlogProvider.emoji, "📝");
  assertEquals(githubBlogProvider.labelName, "github-blog");
  assertEquals(githubBlogProvider.category, "blog");
  assertEquals(githubBlogProvider.titleField, "title");
  assertEquals(githubBlogProvider.pubDateField, "pubDate");
  assertExists(githubBlogProvider.fetch);
});
