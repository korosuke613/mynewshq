import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  formatLabelsString,
  getCategoryEmoji,
  getEntryTitle,
} from "./helpers.ts";

Deno.test("getCategoryEmoji", async (t) => {
  await t.step("各カテゴリに対応する絵文字を返す", () => {
    assertEquals(getCategoryEmoji("github"), "🐙");
    assertEquals(getCategoryEmoji("aws"), "☁️");
    assertEquals(getCategoryEmoji("claudeCode"), "🤖");
    assertEquals(getCategoryEmoji("linear"), "📐");
  });

  await t.step("未知のカテゴリにはデフォルト絵文字を返す", () => {
    assertEquals(getCategoryEmoji("unknown"), "📌");
    assertEquals(getCategoryEmoji(""), "📌");
  });
});

Deno.test("formatLabelsString", async (t) => {
  await t.step("複数のラベルをバッククォート付きで結合する", () => {
    const labels = {
      "changelog-label": ["copilot", "security"],
      "changelog-type": ["improvement"],
    };
    const result = formatLabelsString(labels);
    assertStringIncludes(result, "`copilot`");
    assertStringIncludes(result, "`security`");
    assertStringIncludes(result, "`improvement`");
  });

  await t.step("ラベルが空の場合は空文字を返す", () => {
    const result = formatLabelsString({});
    assertEquals(result, "");
  });

  await t.step("labelsがundefinedの場合は空文字を返す", () => {
    const result = formatLabelsString(undefined);
    assertEquals(result, "");
  });

  await t.step("すべての配列が空の場合は空文字を返す", () => {
    const labels = {
      "changelog-label": [],
      "changelog-type": [],
    };
    const result = formatLabelsString(labels);
    assertEquals(result, "");
  });
});

Deno.test("getEntryTitle", async (t) => {
  await t.step("titleがある場合はtitleを返す", () => {
    const result = getEntryTitle({ title: "Feature A", version: "v1.0.0" });
    assertEquals(result, "Feature A");
  });

  await t.step("titleがなくversionがある場合はversionを返す", () => {
    const result = getEntryTitle({ version: "v1.0.0" });
    assertEquals(result, "v1.0.0");
  });

  await t.step("titleもversionもない場合はUntitledを返す", () => {
    const result = getEntryTitle({});
    assertEquals(result, "Untitled");
  });
});
