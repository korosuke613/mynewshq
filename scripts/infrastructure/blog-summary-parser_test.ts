import { assertEquals, assertThrows } from "@std/assert";
import { parseBlogSummariesJson } from "./blog-summary-parser.ts";

Deno.test("parseBlogSummariesJson", async (t) => {
  await t.step(
    "BlogSummaryData形式（トップレベルにcategoriesがある）をそのまま返す",
    () => {
      const input = JSON.stringify({
        categories: [
          {
            category: "AWS",
            entries: [{
              url: "https://example.com",
              title: "test",
              comment: "comment",
            }],
            categoryComment: "AWSの更新",
          },
        ],
      });
      const result = parseBlogSummariesJson(input);
      assertEquals(result.categories.length, 1);
      assertEquals(result.categories[0].category, "AWS");
    },
  );

  await t.step(
    "Claude Code Action形式（プロバイダー別）を統合して返す",
    () => {
      const input = JSON.stringify({
        hatenaBookmark: {
          categories: [
            {
              category: "git",
              entries: [{
                url: "https://example.com/1",
                title: "git記事",
                comment: "comment1",
              }],
              categoryComment: "gitの更新",
            },
          ],
        },
        hackerNews: {
          categories: [
            {
              category: "HackerNews",
              entries: [{
                url: "https://example.com/2",
                title: "HN記事",
                comment: "comment2",
              }],
              categoryComment: "HNの更新",
            },
          ],
        },
      });
      const result = parseBlogSummariesJson(input);
      assertEquals(result.categories.length, 2);
      assertEquals(result.categories[0].category, "git");
      assertEquals(result.categories[1].category, "HackerNews");
    },
  );

  await t.step(
    "プロバイダーのcategoriesが配列でない場合は無視する",
    () => {
      const input = JSON.stringify({
        hatenaBookmark: {
          categories: "not-an-array",
        },
        hackerNews: {
          categories: [
            {
              category: "HackerNews",
              entries: [{
                url: "https://example.com",
                title: "HN記事",
                comment: "comment",
              }],
              categoryComment: "HNの更新",
            },
          ],
        },
      });
      const result = parseBlogSummariesJson(input);
      assertEquals(result.categories.length, 1);
      assertEquals(result.categories[0].category, "HackerNews");
    },
  );

  await t.step("categoriesを持たないプロバイダーは無視する", () => {
    const input = JSON.stringify({
      hatenaBookmark: {
        someOtherField: "value",
      },
      hackerNews: {
        categories: [
          {
            category: "HackerNews",
            entries: [],
            categoryComment: "",
          },
        ],
      },
    });
    const result = parseBlogSummariesJson(input);
    assertEquals(result.categories.length, 1);
  });

  await t.step("空のJSONオブジェクトは空のcategoriesを返す", () => {
    const input = JSON.stringify({});
    const result = parseBlogSummariesJson(input);
    assertEquals(result.categories.length, 0);
  });

  await t.step("不正なJSON文字列はエラーをスローする", () => {
    assertThrows(
      () => parseBlogSummariesJson("invalid-json"),
      SyntaxError,
    );
  });

  await t.step(
    "トップレベルがオブジェクトでない場合はTypeErrorをスローする",
    () => {
      assertThrows(
        () => parseBlogSummariesJson("null"),
        TypeError,
        "トップレベルはオブジェクト",
      );
      assertThrows(
        () => parseBlogSummariesJson('"string"'),
        TypeError,
        "トップレベルはオブジェクト",
      );
      assertThrows(
        () => parseBlogSummariesJson("123"),
        TypeError,
        "トップレベルはオブジェクト",
      );
    },
  );

  await t.step(
    "動的走査により未知のプロバイダーのcategoriesも集約される",
    () => {
      const input = JSON.stringify({
        newProvider: {
          categories: [
            {
              category: "NewCategory",
              entries: [{
                url: "https://example.com/new",
                title: "新しい記事",
                comment: "comment",
              }],
              categoryComment: "新しいカテゴリ",
            },
          ],
        },
      });
      const result = parseBlogSummariesJson(input);
      assertEquals(result.categories.length, 1);
      assertEquals(result.categories[0].category, "NewCategory");
    },
  );
});
