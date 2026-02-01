import { assertEquals } from "@std/assert";
import {
  applyCategoryFilter,
  findMatchedCategories,
  matchesCategory,
  parseCategoryKeywords,
} from "./category-filter.ts";

Deno.test("parseCategoryKeywords", async (t) => {
  await t.step("should parse keywords from bullet list", () => {
    const issueBody = `
- aws
- github
- kubernetes
`;
    const result = parseCategoryKeywords(issueBody);
    assertEquals(result, ["aws", "github", "kubernetes"]);
  });

  await t.step("should handle empty lines", () => {
    const issueBody = `
- aws

- github
`;
    const result = parseCategoryKeywords(issueBody);
    assertEquals(result, ["aws", "github"]);
  });

  await t.step("should return empty array for empty body", () => {
    const result = parseCategoryKeywords("");
    assertEquals(result, []);
  });

  await t.step("should ignore non-bullet lines", () => {
    const issueBody = `
# Categories
- aws
Some description
- github
`;
    const result = parseCategoryKeywords(issueBody);
    assertEquals(result, ["aws", "github"]);
  });
});

Deno.test("matchesCategory", async (t) => {
  await t.step("should match case-insensitively", () => {
    const result = matchesCategory("AWS S3 Update", ["aws"]);
    assertEquals(result, "aws");
  });

  await t.step("should return null when no match", () => {
    const result = matchesCategory("React Update", ["aws", "github"]);
    assertEquals(result, null);
  });

  await t.step("should match partial text", () => {
    const result = matchesCategory("GitHub Actions Update", ["github"]);
    assertEquals(result, "github");
  });
});

Deno.test("findMatchedCategories", async (t) => {
  await t.step("should find category from title", () => {
    const entry = {
      title: "AWS Lambda Update",
      tags: ["serverless"],
      description: "New features",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result, ["aws"]);
  });

  await t.step("should find category from tags", () => {
    const entry = {
      title: "Cloud Update",
      tags: ["aws", "serverless"],
      description: "New features",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result, ["aws"]);
  });

  await t.step("should find category from description", () => {
    const entry = {
      title: "Cloud Update",
      tags: ["serverless"],
      description: "New AWS features",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result, ["aws"]);
  });

  await t.step("should find multiple categories", () => {
    const entry = {
      title: "GitHub Actions for AWS",
      tags: ["ci-cd"],
      description: "Deploy to AWS using GitHub Actions",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result.sort(), ["aws", "github"]);
  });

  await t.step("should return empty array when no match", () => {
    const entry = {
      title: "React Update",
      tags: ["frontend"],
      description: "New hooks",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result, []);
  });
});

Deno.test("applyCategoryFilter", async (t) => {
  await t.step("should filter entries matching categories", () => {
    const entries = [
      { title: "AWS Update", tags: [], description: "Lambda" },
      { title: "React Update", tags: [], description: "Hooks" },
      { title: "GitHub Actions", tags: [], description: "CI/CD" },
    ];
    const { filtered, excludedCount } = applyCategoryFilter(entries, [
      "aws",
      "github",
    ]);
    assertEquals(filtered.length, 2);
    assertEquals(excludedCount, 1);
    assertEquals(filtered[0].title, "AWS Update");
    assertEquals(filtered[0].matchedCategories, ["aws"]);
    assertEquals(filtered[1].title, "GitHub Actions");
    assertEquals(filtered[1].matchedCategories, ["github"]);
  });

  await t.step(
    "should return all entries with empty matchedCategories when no keywords",
    () => {
      const entries = [
        { title: "AWS Update", tags: [], description: "Lambda" },
        { title: "React Update", tags: [], description: "Hooks" },
      ];
      const { filtered, excludedCount } = applyCategoryFilter(entries, []);
      assertEquals(filtered.length, 2);
      assertEquals(excludedCount, 0);
      assertEquals(filtered[0].matchedCategories, []);
      assertEquals(filtered[1].matchedCategories, []);
    },
  );

  await t.step("should exclude all entries when none match", () => {
    const entries = [
      { title: "Vue Update", tags: [], description: "Composition API" },
      { title: "React Update", tags: [], description: "Hooks" },
    ];
    const { filtered, excludedCount } = applyCategoryFilter(entries, [
      "aws",
      "github",
    ]);
    assertEquals(filtered.length, 0);
    assertEquals(excludedCount, 2);
  });
});
