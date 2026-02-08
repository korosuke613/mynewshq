// Hacker News Provider のテスト
import { assertEquals, assertExists } from "@std/assert";
import {
  extractPoints,
  hackerNewsProvider,
  truncateDescription,
} from "./hacker-news-provider.ts";

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

// =============================================================================
// truncateDescription関数のユニットテスト
// =============================================================================

Deno.test("truncateDescription - 300文字以下はそのまま返す", () => {
  const short = "短いdescription";
  assertEquals(truncateDescription(short), short);
});

Deno.test("truncateDescription - ちょうど300文字はそのまま返す", () => {
  const exact = "a".repeat(300);
  assertEquals(truncateDescription(exact), exact);
});

Deno.test("truncateDescription - 301文字以上は300文字+...に切り詰め", () => {
  const long = "a".repeat(500);
  const result = truncateDescription(long);
  assertEquals(result, "a".repeat(300) + "...");
  assertEquals(result.length, 303); // 300 + "..."
});

Deno.test("truncateDescription - 空文字列はそのまま返す", () => {
  assertEquals(truncateDescription(""), "");
});
