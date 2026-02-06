// Hacker News Provider のテスト
import { assertEquals, assertExists } from "@std/assert";
import { extractPoints, hackerNewsProvider } from "./hacker-news-provider.ts";

// =============================================================================
// プロバイダー設定値の確認
// =============================================================================

Deno.test("hackerNewsProvider - 設定値の確認", () => {
  assertEquals(hackerNewsProvider.id, "hackerNews");
  assertEquals(hackerNewsProvider.displayName, "Hacker News");
  assertEquals(hackerNewsProvider.emoji, "🔶");
  assertEquals(hackerNewsProvider.labelName, "hacker-news");
  assertEquals(hackerNewsProvider.category, "blog");
  assertEquals(hackerNewsProvider.fixedCategory, "HackerNews");
  assertEquals(hackerNewsProvider.titleField, "title");
  assertEquals(hackerNewsProvider.pubDateField, "pubDate");
  assertExists(hackerNewsProvider.fetch);
});

// =============================================================================
// extractPoints関数のユニットテスト
// =============================================================================

Deno.test("extractPoints - 正常系: Points: 123 から123を抽出", () => {
  assertEquals(extractPoints("Points: 123"), 123);
});

Deno.test("extractPoints - 正常系: Points: 1 から1を抽出", () => {
  assertEquals(extractPoints("Points: 1"), 1);
});

Deno.test("extractPoints - 境界値: Points: 0 から0を抽出", () => {
  assertEquals(extractPoints("Points: 0"), 0);
});

Deno.test("extractPoints - 境界値: Points: 9999 から9999を抽出", () => {
  assertEquals(extractPoints("Points: 9999"), 9999);
});

Deno.test("extractPoints - 複数行テキスト内のポイント抽出", () => {
  const text = "Article Title\nPoints: 456\nComments: 78";
  assertEquals(extractPoints(text), 456);
});

Deno.test("extractPoints - 異常系: ポイント情報なし → undefined", () => {
  assertEquals(extractPoints("No points here"), undefined);
});

Deno.test("extractPoints - 異常系: 空文字列 → undefined", () => {
  assertEquals(extractPoints(""), undefined);
});

Deno.test("extractPoints - 異常系: undefined入力 → undefined", () => {
  assertEquals(extractPoints(undefined), undefined);
});

Deno.test("extractPoints - 異常系: 不正フォーマット Points:abc → undefined", () => {
  assertEquals(extractPoints("Points: abc"), undefined);
});
