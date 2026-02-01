import { assertEquals } from "@std/assert";
import {
  applyCategoryFilter,
  findAllMatchedKeywords,
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

  await t.step("should NOT match partial word (git in digital)", () => {
    const result = matchesCategory("digital sovereignty", ["git"]);
    assertEquals(result, null);
  });

  await t.step("should match git as standalone word", () => {
    const result = matchesCategory("git repository", ["git"]);
    assertEquals(result, "git");
  });
});

Deno.test("findAllMatchedKeywords", async (t) => {
  await t.step("should find all matching keywords in text", () => {
    const result = findAllMatchedKeywords("GitHub Actions for AWS Lambda", [
      "aws",
      "github",
    ]);
    assertEquals(result.sort(), ["aws", "github"]);
  });

  await t.step("should match case-insensitively", () => {
    const result = findAllMatchedKeywords("AWS S3 Update", ["aws"]);
    assertEquals(result, ["aws"]);
  });

  await t.step("should return empty array when no match", () => {
    const result = findAllMatchedKeywords("React Update", ["aws", "github"]);
    assertEquals(result, []);
  });

  await t.step("should find multiple keywords", () => {
    const result = findAllMatchedKeywords(
      "Deploy to AWS using GitHub Actions with Terraform",
      ["aws", "github", "terraform"],
    );
    assertEquals(result.sort(), ["aws", "github", "terraform"]);
  });

  await t.step("should NOT match partial word (git in digital)", () => {
    const result = findAllMatchedKeywords("digital sovereignty", ["git"]);
    assertEquals(result, []);
  });

  await t.step("should NOT match partial word (go in goals)", () => {
    const result = findAllMatchedKeywords("our goals and objectives", ["go"]);
    assertEquals(result, []);
  });

  await t.step("should NOT match partial word (git in digitalization)", () => {
    const result = findAllMatchedKeywords(
      "AWS CloudFormation digitalization strategy",
      ["git"],
    );
    assertEquals(result, []);
  });

  await t.step("should match git as standalone word", () => {
    const result = findAllMatchedKeywords("git repository management", [
      "git",
    ]);
    assertEquals(result, ["git"]);
  });

  await t.step("should match Go language (capitalized)", () => {
    const result = findAllMatchedKeywords("Go programming language", ["go"]);
    assertEquals(result, ["go"]);
  });

  await t.step("should match go in 'go to production'", () => {
    const result = findAllMatchedKeywords("ready to go to production", ["go"]);
    assertEquals(result, ["go"]);
  });

  await t.step("should match multi-word keyword 'github actions'", () => {
    const result = findAllMatchedKeywords(
      "Deploy using GitHub Actions workflow",
      ["github actions"],
    );
    assertEquals(result, ["github actions"]);
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

  await t.step("should find multiple categories from single title", () => {
    const entry = {
      title: "GitHub Actions for AWS Lambda",
      tags: [],
      description: "",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result.sort(), ["aws", "github"]);
  });

  await t.step("should find multiple categories from single tag", () => {
    const entry = {
      title: "Cloud Update",
      tags: ["github-actions-aws"],
      description: "",
    };
    const result = findMatchedCategories(entry, ["aws", "github"]);
    assertEquals(result.sort(), ["aws", "github"]);
  });

  await t.step(
    "should find multiple categories from single description",
    () => {
      const entry = {
        title: "Update",
        tags: [],
        description: "Deploy to AWS using GitHub Actions",
      };
      const result = findMatchedCategories(entry, ["aws", "github"]);
      assertEquals(result.sort(), ["aws", "github"]);
    },
  );
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

  await t.step(
    "should keep unmatched entries with empty matchedCategories when keepUnmatched is true",
    () => {
      const entries = [
        { title: "AWS Update", tags: [], description: "Lambda" },
        { title: "React Update", tags: [], description: "Hooks" },
        { title: "GitHub Actions", tags: [], description: "CI/CD" },
      ];
      const { filtered, excludedCount } = applyCategoryFilter(
        entries,
        ["aws", "github"],
        { keepUnmatched: true },
      );
      assertEquals(filtered.length, 3);
      assertEquals(excludedCount, 0);
      assertEquals(filtered[0].title, "AWS Update");
      assertEquals(filtered[0].matchedCategories, ["aws"]);
      assertEquals(filtered[1].title, "React Update");
      assertEquals(filtered[1].matchedCategories, []);
      assertEquals(filtered[2].title, "GitHub Actions");
      assertEquals(filtered[2].matchedCategories, ["github"]);
    },
  );

  await t.step(
    "should exclude unmatched entries when keepUnmatched is false (default)",
    () => {
      const entries = [
        { title: "AWS Update", tags: [], description: "Lambda" },
        { title: "React Update", tags: [], description: "Hooks" },
      ];
      const { filtered, excludedCount } = applyCategoryFilter(
        entries,
        ["aws"],
        { keepUnmatched: false },
      );
      assertEquals(filtered.length, 1);
      assertEquals(excludedCount, 1);
      assertEquals(filtered[0].title, "AWS Update");
      assertEquals(filtered[0].matchedCategories, ["aws"]);
    },
  );
});
