import { assertEquals } from "@std/assert";
import {
  DEFAULT_CATEGORY_CONFIG,
  getCategoryName,
  parseCategoryConfig,
} from "./category-config.ts";

Deno.test("parseCategoryConfig", async (t) => {
  await t.step("全てのカテゴリを正しくパースする", () => {
    const issueBody = `# Discussion カテゴリ設定

## Changelog カテゴリ
- changelog_daily: Daily
- changelog_weekly: Weekly
- changelog_manual: manual trigger

## Blog カテゴリ
- blog_daily: Daily
- blog_manual: manual trigger

## デフォルト
- default: General`;

    const result = parseCategoryConfig(issueBody);
    assertEquals(result.changelogDaily, "Daily");
    assertEquals(result.changelogWeekly, "Weekly");
    assertEquals(result.changelogManual, "manual trigger");
    assertEquals(result.blogDaily, "Daily");
    assertEquals(result.blogManual, "manual trigger");
    assertEquals(result.default, "General");
  });

  await t.step(
    "一部のカテゴリのみ設定された場合、未設定はデフォルト値を使用",
    () => {
      const issueBody = `# カテゴリ設定

- changelog_daily: Custom Daily
- blog_manual: Custom Manual`;

      const result = parseCategoryConfig(issueBody);
      assertEquals(result.changelogDaily, "Custom Daily");
      assertEquals(result.changelogWeekly, "Weekly"); // デフォルト
      assertEquals(result.changelogManual, "manual trigger"); // デフォルト
      assertEquals(result.blogDaily, "Daily"); // デフォルト
      assertEquals(result.blogManual, "Custom Manual");
      assertEquals(result.default, "General"); // デフォルト
    },
  );

  await t.step("空のIssue本文の場合はデフォルト値を返す", () => {
    const result = parseCategoryConfig("");
    assertEquals(result, DEFAULT_CATEGORY_CONFIG);
  });

  await t.step("箇条書きがない場合はデフォルト値を返す", () => {
    const issueBody = "これは普通のテキストです。カテゴリ設定はありません。";
    const result = parseCategoryConfig(issueBody);
    assertEquals(result, DEFAULT_CATEGORY_CONFIG);
  });

  await t.step("値の前後の空白をトリムする", () => {
    const issueBody = `- changelog_daily:   Custom Category   `;
    const result = parseCategoryConfig(issueBody);
    assertEquals(result.changelogDaily, "Custom Category");
  });

  await t.step("未知のキーは無視する", () => {
    const issueBody = `- changelog_daily: Daily
- unknown_key: Some Value
- another_unknown: Another Value`;

    const result = parseCategoryConfig(issueBody);
    assertEquals(result.changelogDaily, "Daily");
    // 他の値はデフォルト
    assertEquals(result.changelogWeekly, "Weekly");
  });
});

Deno.test("getCategoryName", async (t) => {
  const config = {
    changelogDaily: "Test Daily",
    changelogWeekly: "Test Weekly",
    changelogManual: "Test Manual",
    blogDaily: "Blog Daily",
    blogManual: "Blog Manual",
    default: "Test General",
  };

  await t.step("changelog + schedule + 日次 → changelogDaily", () => {
    const result = getCategoryName(config, "changelog", "schedule", false);
    assertEquals(result, "Test Daily");
  });

  await t.step("changelog + schedule + 週次 → changelogWeekly", () => {
    const result = getCategoryName(config, "changelog", "schedule", true);
    assertEquals(result, "Test Weekly");
  });

  await t.step("changelog + workflow_dispatch → changelogManual", () => {
    const result = getCategoryName(
      config,
      "changelog",
      "workflow_dispatch",
      false,
    );
    assertEquals(result, "Test Manual");
  });

  await t.step(
    "changelog + workflow_dispatch + 週次 → changelogManual（isWeeklyは無視）",
    () => {
      const result = getCategoryName(
        config,
        "changelog",
        "workflow_dispatch",
        true,
      );
      assertEquals(result, "Test Manual");
    },
  );

  await t.step("blog + schedule → blogDaily", () => {
    const result = getCategoryName(config, "blog", "schedule", false);
    assertEquals(result, "Blog Daily");
  });

  await t.step("blog + workflow_dispatch → blogManual", () => {
    const result = getCategoryName(config, "blog", "workflow_dispatch", false);
    assertEquals(result, "Blog Manual");
  });

  await t.step(
    "blog + schedule + isWeekly=true でも blogDaily（blogには週次がない）",
    () => {
      const result = getCategoryName(config, "blog", "schedule", true);
      assertEquals(result, "Blog Daily");
    },
  );
});

Deno.test("DEFAULT_CATEGORY_CONFIG", async (t) => {
  await t.step("デフォルト値が正しく設定されている", () => {
    assertEquals(DEFAULT_CATEGORY_CONFIG.changelogDaily, "Daily");
    assertEquals(DEFAULT_CATEGORY_CONFIG.changelogWeekly, "Weekly");
    assertEquals(DEFAULT_CATEGORY_CONFIG.changelogManual, "manual trigger");
    assertEquals(DEFAULT_CATEGORY_CONFIG.blogDaily, "Daily");
    assertEquals(DEFAULT_CATEGORY_CONFIG.blogManual, "manual trigger");
    assertEquals(DEFAULT_CATEGORY_CONFIG.default, "General");
  });
});
