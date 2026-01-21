import { assertEquals } from "@std/assert";
import { normalizeUrl } from "./url-normalizer.ts";

Deno.test("normalizeUrl", async (t) => {
  await t.step("ドメインとパスの間の/が欠落している場合に修正する", () => {
    const result = normalizeUrl(
      "https://aws.amazon.comabout-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("正常なURLはそのまま返す", () => {
    const result = normalizeUrl(
      "https://aws.amazon.com/about-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("httpプロトコルも処理できる", () => {
    const result = normalizeUrl("http://example.compath/to/page");
    assertEquals(result, "http://example.com/path/to/page");
  });

  await t.step("空文字はそのまま返す", () => {
    const result = normalizeUrl("");
    assertEquals(result, "");
  });

  await t.step("パスがない場合はそのまま返す", () => {
    const result = normalizeUrl("https://example.com");
    assertEquals(result, "https://example.com");
  });

  await t.step("パスが/のみの場合はそのまま返す", () => {
    const result = normalizeUrl("https://example.com/");
    assertEquals(result, "https://example.com/");
  });
});
