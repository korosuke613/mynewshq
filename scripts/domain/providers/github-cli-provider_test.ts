import { assertEquals, assertExists } from "@std/assert";
import { githubCliProvider } from "./github-cli-provider.ts";

Deno.test("githubCliProvider - 設定が正しい", () => {
  assertEquals(githubCliProvider.id, "githubCli");
  assertEquals(githubCliProvider.displayName, "GitHub CLI");
  assertEquals(githubCliProvider.emoji, "⌨️");
  assertEquals(githubCliProvider.labelName, "github-cli");
  assertEquals(githubCliProvider.category, "changelog");
  assertEquals(githubCliProvider.labelPrefix, undefined);
  assertEquals(githubCliProvider.titleField, "version");
  assertEquals(githubCliProvider.pubDateField, "publishedAt");
  assertExists(githubCliProvider.fetch);
});
