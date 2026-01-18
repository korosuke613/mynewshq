import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  determineLabels,
  generateDefaultBody,
  generateMutedSection,
} from "./create-discussion.ts";

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
  linear: [{
    title: "Linear Feature C",
    url: "https://example.com/d",
    content: "",
    pubDate: "2026-01-18T12:00:00Z",
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

  await t.step(
    "GitHubエントリに複数のラベルがある場合にインラインコードとして表示する",
    () => {
      const dataWithGhLabels = {
        date: "2026-01-18",
        github: [{
          title: "Feature A",
          url: "https://example.com/a",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: {
            "changelog-label": ["copilot"],
            "changelog-type": ["improvement"],
          },
        }],
        aws: [],
        claudeCode: [],
        linear: [],
      };
      const body = generateDefaultBody(dataWithGhLabels);
      assertStringIncludes(body, "[Feature A](https://example.com/a)");
      assertStringIncludes(body, " `copilot`");
      assertStringIncludes(body, "`improvement`");
    },
  );

  await t.step(
    "GitHubエントリにラベルがない場合はスペースやバッククォートを追加しない",
    () => {
      const dataWithoutGhLabels = {
        date: "2026-01-18",
        github: [{
          title: "Feature A",
          url: "https://example.com/a",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: {}, // 空のlabels
        }],
        aws: [],
        claudeCode: [],
        linear: [],
      };
      const body = generateDefaultBody(dataWithoutGhLabels);
      assertStringIncludes(body, "[Feature A](https://example.com/a)\n");
      assertEquals(body.includes("`"), false);
    },
  );

  await t.step(
    "GitHubエントリにlabelsプロパティがない（undefined）場合もスペースやバッククォートを追加しない",
    () => {
      const dataWithUndefinedLabels = {
        date: "2026-01-18",
        github: [{
          title: "Feature A",
          url: "https://example.com/a",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          // labelsプロパティなし（undefined）
        }],
        aws: [],
        claudeCode: [],
        linear: [],
      };
      const body = generateDefaultBody(dataWithUndefinedLabels);
      assertStringIncludes(body, "[Feature A](https://example.com/a)\n");
      assertEquals(body.includes("`"), false);
    },
  );
});

Deno.test("determineLabels", async (t) => {
  await t.step("すべてのエントリがある場合は4つのラベルを返す", () => {
    const labels = determineLabels(mockData);
    assertEquals(
      labels.sort(),
      ["github", "aws", "claude-code", "linear"].sort(),
    );
  });

  await t.step("githubのみの場合はgithubラベルのみ返す", () => {
    const labels = determineLabels({
      ...mockData,
      aws: [],
      claudeCode: [],
      linear: [],
    });
    assertEquals(labels, ["github"]);
  });

  await t.step("awsのみの場合はawsラベルのみ返す", () => {
    const labels = determineLabels({
      ...mockData,
      github: [],
      claudeCode: [],
      linear: [],
    });
    assertEquals(labels, ["aws"]);
  });

  await t.step("claudeCodeのみの場合はclaude-codeラベルのみ返す", () => {
    const labels = determineLabels({
      ...mockData,
      github: [],
      aws: [],
      linear: [],
    });
    assertEquals(labels, ["claude-code"]);
  });

  await t.step("linearのみの場合はlinearラベルのみ返す", () => {
    const labels = determineLabels({
      ...mockData,
      github: [],
      aws: [],
      claudeCode: [],
    });
    assertEquals(labels, ["linear"]);
  });

  await t.step("すべて空の場合は空配列を返す", () => {
    const labels = determineLabels({
      ...mockData,
      github: [],
      aws: [],
      claudeCode: [],
      linear: [],
    });
    assertEquals(labels, []);
  });

  await t.step("githubとawsのみの場合は2つのラベルを返す", () => {
    const labels = determineLabels({
      ...mockData,
      claudeCode: [],
      linear: [],
    });
    assertEquals(labels.sort(), ["github", "aws"].sort());
  });

  await t.step(
    "GitHubエントリのlabelsオブジェクトからプレフィックス付きラベルを生成する",
    () => {
      const dataWithGhLabels = {
        ...mockData,
        aws: [],
        claudeCode: [],
        linear: [],
        github: [
          {
            title: "Feature A",
            url: "https://example.com/a",
            content: "",
            pubDate: "2026-01-18T10:00:00Z",
            labels: {
              "changelog-label": ["copilot", "security"],
              "changelog-type": ["improvement"],
            },
          },
        ],
      };
      const labels = determineLabels(dataWithGhLabels);
      assertEquals(
        labels.sort(),
        ["github", "gh:copilot", "gh:security", "gh:improvement"].sort(),
      );
    },
  );

  await t.step("GitHubのラベルが重複していてもユニークになる", () => {
    const dataWithDuplicateGhLabels = {
      ...mockData,
      aws: [],
      claudeCode: [],
      linear: [],
      github: [
        {
          title: "Feature A",
          url: "https://example.com/a",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: {
            "changelog-label": ["copilot"],
          },
        },
        {
          title: "Feature B",
          url: "https://example.com/b",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          labels: {
            "changelog-label": ["copilot", "actions"],
          },
        },
      ],
    };
    const labels = determineLabels(dataWithDuplicateGhLabels);
    assertEquals(labels.sort(), ["github", "gh:copilot", "gh:actions"].sort());
  });
});

Deno.test("generateMutedSection", async (t) => {
  await t.step("ミュートされたエントリがある場合は折りたたみを生成する", () => {
    const entries = [
      {
        title: "Active Entry",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
      },
      {
        title: "Muted Entry",
        url: "https://example.com/2",
        content: "",
        pubDate: "2026-01-18T11:00:00Z",
        muted: true,
        mutedBy: "SageMaker",
      },
    ];

    const result = generateMutedSection(entries);
    assertStringIncludes(result, "<details>");
    assertStringIncludes(
      result,
      "<summary>ミュートされたエントリ (1件)</summary>",
    );
    assertStringIncludes(result, "[Muted Entry](https://example.com/2)");
    assertStringIncludes(result, "*(ミュートワード: SageMaker)*");
    assertStringIncludes(result, "</details>");
  });

  await t.step("ミュートされたエントリがない場合は空文字を返す", () => {
    const entries = [
      {
        title: "Active Entry",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
      },
    ];

    const result = generateMutedSection(entries);
    assertEquals(result, "");
  });

  await t.step("ReleaseEntryでも動作する", () => {
    const entries = [
      {
        version: "v1.0.0",
        url: "https://example.com/1",
        body: "",
        publishedAt: "2026-01-18T10:00:00Z",
        muted: true,
        mutedBy: "Glue",
      },
    ];

    const result = generateMutedSection(entries);
    assertStringIncludes(result, "[v1.0.0](https://example.com/1)");
    assertStringIncludes(result, "*(ミュートワード: Glue)*");
  });
});

Deno.test("generateDefaultBody with muted entries", async (t) => {
  await t.step("ミュートされたエントリを折りたたみで表示する", () => {
    const dataWithMuted = {
      date: "2026-01-18",
      github: [
        {
          title: "Active Feature",
          url: "https://example.com/1",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
        },
        {
          title: "Muted Feature",
          url: "https://example.com/2",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          muted: true,
          mutedBy: "SageMaker",
        },
      ],
      aws: [],
      claudeCode: [],
      linear: [],
    };

    const body = generateDefaultBody(dataWithMuted);
    assertStringIncludes(body, "## GitHub Changelog");
    assertStringIncludes(body, "[Active Feature](https://example.com/1)");
    assertStringIncludes(body, "<details>");
    assertStringIncludes(body, "ミュートされたエントリ (1件)");
    assertStringIncludes(body, "[Muted Feature](https://example.com/2)");
  });

  await t.step(
    "アクティブなエントリがない場合はセクションヘッダーを表示しない",
    () => {
      const dataWithMutedOnly = {
        date: "2026-01-18",
        github: [
          {
            title: "Muted Feature",
            url: "https://example.com/1",
            content: "",
            pubDate: "2026-01-18T10:00:00Z",
            muted: true,
            mutedBy: "SageMaker",
          },
        ],
        aws: [],
        claudeCode: [],
        linear: [],
      };

      const body = generateDefaultBody(dataWithMutedOnly);
      assertEquals(body.includes("## GitHub Changelog"), false);
      assertStringIncludes(body, "<details>");
      assertStringIncludes(body, "ミュートされたエントリ (1件)");
    },
  );

  await t.step("すべてミュートの場合でも折りたたみを表示する", () => {
    const allMuted = {
      date: "2026-01-18",
      github: [],
      aws: [
        {
          title: "Muted AWS 1",
          url: "https://example.com/1",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          muted: true,
          mutedBy: "Glue",
        },
        {
          title: "Muted AWS 2",
          url: "https://example.com/2",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          muted: true,
          mutedBy: "SageMaker",
        },
      ],
      claudeCode: [],
      linear: [],
    };

    const body = generateDefaultBody(allMuted);
    assertStringIncludes(body, "ミュートされたエントリ (2件)");
    assertStringIncludes(body, "[Muted AWS 1](https://example.com/1)");
    assertStringIncludes(body, "[Muted AWS 2](https://example.com/2)");
  });
});
