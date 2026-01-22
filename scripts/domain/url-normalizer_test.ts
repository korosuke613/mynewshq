import { assertEquals } from "@std/assert";
import {
  normalizeTrailingSlash,
  normalizeUrl,
} from "./url-normalizer.ts";

Deno.test("normalizeTrailingSlash", async (t) => {
  await t.step("末尾のスラッシュを削除する", () => {
    const result = normalizeTrailingSlash(
      "https://aws.amazon.com/about-aws/whats-new/test/",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("末尾にスラッシュがない場合はそのまま返す", () => {
    const result = normalizeTrailingSlash(
      "https://aws.amazon.com/about-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("複数の末尾スラッシュを削除する", () => {
    const result = normalizeTrailingSlash(
      "https://example.com/path///",
    );
    assertEquals(result, "https://example.com/path");
  });

  await t.step("空文字はそのまま返す", () => {
    const result = normalizeTrailingSlash("");
    assertEquals(result, "");
  });

  await t.step("スラッシュのみの場合はそのまま返す", () => {
    const result = normalizeTrailingSlash("/");
    assertEquals(result, "/");
  });

  await t.step("ドメインのみの場合はそのまま返す", () => {
    const result = normalizeTrailingSlash("https://example.com");
    assertEquals(result, "https://example.com");
  });
});

Deno.test("normalizeUrl", async (t) => {
  await t.step("破損したURLを修正し末尾スラッシュを削除する", () => {
    const result = normalizeUrl(
      "https://aws.amazon.comabout-aws/whats-new/test/",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("正常なURLの末尾スラッシュを削除する", () => {
    const result = normalizeUrl(
      "https://aws.amazon.com/about-aws/whats-new/test/",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("正常なURLで末尾スラッシュがない場合はそのまま返す", () => {
    const result = normalizeUrl(
      "https://aws.amazon.com/about-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("空文字はそのまま返す", () => {
    const result = normalizeUrl("");
    assertEquals(result, "");
  });
});
