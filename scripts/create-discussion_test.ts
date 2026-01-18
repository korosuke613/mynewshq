import { assertEquals, assertStringIncludes } from "@std/assert";
import { determineLabels, generateDefaultBody } from "./create-discussion.ts";

const mockData = {
  date: "2026-01-18",
  github: [{
    title: "Feature A",
    url: "https://example.com/a",
    content: "",
    pubDate: "2026-01-18T10:00:00Z",
  }],
  aws: [{
    title: "Update B",
    url: "https://example.com/b",
    content: "",
    pubDate: "2026-01-18T11:00:00Z",
  }],
  claudeCode: [{
    version: "v2.1.12",
    url: "https://example.com/c",
    body: "",
    publishedAt: "2026-01-17T16:00:00Z",
  }],
};

Deno.test("generateDefaultBody", async (t) => {
  await t.step("全カテゴリのデータを正しくフォーマットする", () => {
    const body = generateDefaultBody(mockData);
    assertStringIncludes(body, "# 📰 Tech Changelog - 2026-01-18");
    assertStringIncludes(body, "## GitHub Changelog");
    assertStringIncludes(body, "## AWS What's New");
    assertStringIncludes(body, "## Claude Code");
  });

  await t.step("空のカテゴリはセクションに含めない", () => {
    const body = generateDefaultBody({ ...mockData, github: [] });
    assertEquals(body.includes("## GitHub Changelog"), false);
    assertStringIncludes(body, "## AWS What's New");
  });

  await t.step("Markdownリンク形式で出力する", () => {
    const body = generateDefaultBody(mockData);
    assertStringIncludes(body, "[Feature A](https://example.com/a)");
  });
});

Deno.test("determineLabels", async (t) => {
  await t.step("すべてのエントリがある場合は3つのラベルを返す", () => {
    const labels = determineLabels(mockData);
    assertEquals(labels, ["github", "aws", "claude-code"]);
  });

  await t.step("githubのみの場合はgithubラベルのみ返す", () => {
    const labels = determineLabels({ ...mockData, aws: [], claudeCode: [] });
    assertEquals(labels, ["github"]);
  });

  await t.step("awsのみの場合はawsラベルのみ返す", () => {
    const labels = determineLabels({ ...mockData, github: [], claudeCode: [] });
    assertEquals(labels, ["aws"]);
  });

  await t.step("claudeCodeのみの場合はclaude-codeラベルのみ返す", () => {
    const labels = determineLabels({ ...mockData, github: [], aws: [] });
    assertEquals(labels, ["claude-code"]);
  });

  await t.step("すべて空の場合は空配列を返す", () => {
    const labels = determineLabels({
      ...mockData,
      github: [],
      aws: [],
      claudeCode: [],
    });
    assertEquals(labels, []);
  });

  await t.step("githubとawsのみの場合は2つのラベルを返す", () => {
    const labels = determineLabels({ ...mockData, claudeCode: [] });
    assertEquals(labels, ["github", "aws"]);
  });
});
