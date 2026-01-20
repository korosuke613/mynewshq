import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  determineLabels,
  generateBodyWithSummaries,
  generateDefaultBody,
  generateMutedSection,
  generateTitle,
  generateWeeklyCoveragePeriod,
  parseArgs,
  stripAwsPrefix,
  type SummaryData,
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
      assertStringIncludes(
        body,
        "[Feature A](https://example.com/a)\n`copilot` `improvement`",
      );
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

  await t.step(
    "AWSエントリのlabelsオブジェクトからプレフィックス付きラベルを生成する（amazon-/aws-省略）",
    () => {
      const dataWithAwsLabels = {
        ...mockData,
        github: [],
        claudeCode: [],
        linear: [],
        aws: [
          {
            title: "VPC Update",
            url: "https://example.com/a",
            content: "",
            pubDate: "2026-01-18T10:00:00Z",
            labels: {
              "general:products": ["amazon-vpc", "aws-govcloud-us"],
            },
          },
        ],
      };
      const labels = determineLabels(dataWithAwsLabels);
      assertEquals(
        labels.sort(),
        ["aws", "aws:vpc", "aws:govcloud-us"].sort(),
      );
    },
  );

  await t.step("AWSのラベルが重複していてもユニークになる", () => {
    const dataWithDuplicateAwsLabels = {
      ...mockData,
      github: [],
      claudeCode: [],
      linear: [],
      aws: [
        {
          title: "Bedrock Update A",
          url: "https://example.com/a",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: {
            "general:products": ["amazon-bedrock"],
          },
        },
        {
          title: "Bedrock Update B",
          url: "https://example.com/b",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          labels: {
            "general:products": ["amazon-bedrock", "amazon-s3"],
          },
        },
      ],
    };
    const labels = determineLabels(dataWithDuplicateAwsLabels);
    assertEquals(labels.sort(), ["aws", "aws:bedrock", "aws:s3"].sort());
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

Deno.test("parseArgs", async (t) => {
  await t.step("日付なしの場合は今日の日付を返す", () => {
    const result = parseArgs(["owner", "repo"]);
    assertEquals(result.otherArgs, ["owner", "repo"]);
    assertEquals(result.summariesJson, null);
    // 日付は動的なのでフォーマットのみチェック
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(result.date), true);
  });

  await t.step("--date オプションで日付を指定できる", () => {
    const result = parseArgs(["--date=2026-01-15", "owner", "repo"]);
    assertEquals(result.date, "2026-01-15");
    assertEquals(result.otherArgs, ["owner", "repo"]);
    assertEquals(result.summariesJson, null);
  });

  await t.step("--summaries-json オプションで要約JSONを指定できる", () => {
    const json = '{"github":{"https://example.com":"要約"}}';
    const result = parseArgs([`--summaries-json=${json}`, "owner", "repo"]);
    assertEquals(result.summariesJson, json);
    assertEquals(result.otherArgs, ["owner", "repo"]);
  });

  await t.step("--date と --summaries-json を同時に指定できる", () => {
    const json = '{"github":{}}';
    const result = parseArgs([
      "--date=2026-01-20",
      `--summaries-json=${json}`,
      "owner",
      "repo",
    ]);
    assertEquals(result.date, "2026-01-20");
    assertEquals(result.summariesJson, json);
    assertEquals(result.otherArgs, ["owner", "repo"]);
  });
});

Deno.test("generateBodyWithSummaries", async (t) => {
  const mockDataWithLabels = {
    date: "2026-01-18",
    github: [
      {
        title: "Copilot SDK in Technical Preview",
        url: "https://github.blog/changelog/copilot-sdk",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
        labels: {
          "changelog-type": ["Release"],
          "changelog-label": ["copilot"],
        },
      },
      {
        title: "Muted Feature",
        url: "https://github.blog/changelog/muted",
        content: "",
        pubDate: "2026-01-18T11:00:00Z",
        muted: true,
        mutedBy: "SageMaker",
      },
    ],
    aws: [
      {
        title: "Amazon S3 Update",
        url: "https://aws.amazon.com/about-aws/whats-new/s3",
        content: "",
        pubDate: "2026-01-18T12:00:00Z",
      },
    ],
    claudeCode: [
      {
        version: "v2.1.12",
        url: "https://github.com/anthropics/claude-code/releases/v2.1.12",
        body: "",
        publishedAt: "2026-01-17T16:00:00Z",
      },
    ],
    linear: [],
  };

  const summaries: SummaryData = {
    github: {
      "https://github.blog/changelog/copilot-sdk":
        "Copilot SDKがテクニカルプレビューとして公開されました。開発者はこのSDKを使用してCopilot機能をアプリケーションに統合できます。",
    },
    aws: {
      "https://aws.amazon.com/about-aws/whats-new/s3":
        "Amazon S3に新機能が追加されました。ストレージ管理がより効率的になります。",
    },
    claudeCode: {
      "https://github.com/anthropics/claude-code/releases/v2.1.12":
        "Claude Code v2.1.12がリリースされました。パフォーマンス改善とバグ修正が含まれています。",
    },
    linear: {},
  };

  await t.step("要約付きで正しいMarkdownを生成する", () => {
    const body = generateBodyWithSummaries(mockDataWithLabels, summaries);

    // タイトルと対象期間
    assertStringIncludes(body, "# 📰 Tech Changelog - 2026-01-18");
    assertStringIncludes(body, "📅 **対象期間**:");

    // GitHub Changelog セクション
    assertStringIncludes(body, "## GitHub Changelog");
    assertStringIncludes(
      body,
      "[Copilot SDK in Technical Preview](https://github.blog/changelog/copilot-sdk)",
    );
    assertStringIncludes(
      body,
      "**要約**: Copilot SDKがテクニカルプレビューとして公開されました",
    );

    // AWS セクション
    assertStringIncludes(body, "## AWS What's New");
    assertStringIncludes(
      body,
      "[Amazon S3 Update](https://aws.amazon.com/about-aws/whats-new/s3)",
    );
    assertStringIncludes(body, "**要約**: Amazon S3に新機能が追加されました");

    // Claude Code セクション
    assertStringIncludes(body, "## Claude Code");
    assertStringIncludes(
      body,
      "[v2.1.12](https://github.com/anthropics/claude-code/releases/v2.1.12)",
    );
    assertStringIncludes(
      body,
      "**要約**: Claude Code v2.1.12がリリースされました",
    );
  });

  await t.step("ラベルがインラインコードとして表示される", () => {
    const body = generateBodyWithSummaries(mockDataWithLabels, summaries);

    // ラベルが見出しの後にバッククォートで表示される
    assertStringIncludes(body, "`Release`");
    assertStringIncludes(body, "`copilot`");
  });

  await t.step("mutedエントリは折りたたみセクションに表示される", () => {
    const body = generateBodyWithSummaries(mockDataWithLabels, summaries);

    assertStringIncludes(body, "<details>");
    assertStringIncludes(
      body,
      "<summary>ミュートされたエントリ (1件)</summary>",
    );
    assertStringIncludes(
      body,
      "[Muted Feature](https://github.blog/changelog/muted)",
    );
    assertStringIncludes(body, "*(ミュートワード: SageMaker)*");
  });

  await t.step("URLでマッチングする（タイトルのブレに影響されない）", () => {
    const summariesWithDifferentKey: SummaryData = {
      github: {
        // URL でマッチするので、タイトルが違っても問題ない
        "https://github.blog/changelog/copilot-sdk": "URLでマッチした要約",
      },
      aws: {},
      claudeCode: {},
      linear: {},
    };

    const body = generateBodyWithSummaries(
      mockDataWithLabels,
      summariesWithDifferentKey,
    );
    assertStringIncludes(body, "**要約**: URLでマッチした要約");
  });

  await t.step("要約がないエントリは要約なしで表示される", () => {
    const emptySummaries: SummaryData = {
      github: {},
      aws: {},
      claudeCode: {},
      linear: {},
    };

    const body = generateBodyWithSummaries(mockDataWithLabels, emptySummaries);

    // エントリは表示されるが、要約は表示されない
    assertStringIncludes(
      body,
      "[Copilot SDK in Technical Preview](https://github.blog/changelog/copilot-sdk)",
    );
    assertEquals(body.includes("**要約**:"), false);
  });

  await t.step("空のカテゴリはセクションに含めない", () => {
    const body = generateBodyWithSummaries(mockDataWithLabels, summaries);
    // linear は空なのでセクションがない
    assertEquals(body.includes("## Linear Changelog"), false);
  });
});

Deno.test("stripAwsPrefix", async (t) => {
  await t.step("amazon- プレフィックスを省略する", () => {
    assertEquals(stripAwsPrefix("amazon-vpc"), "vpc");
    assertEquals(stripAwsPrefix("amazon-bedrock"), "bedrock");
    assertEquals(stripAwsPrefix("amazon-s3"), "s3");
  });

  await t.step("aws- プレフィックスを省略する", () => {
    assertEquals(stripAwsPrefix("aws-govcloud-us"), "govcloud-us");
    assertEquals(
      stripAwsPrefix("aws-iot-device-management"),
      "iot-device-management",
    );
  });

  await t.step("プレフィックスがない場合はそのまま返す", () => {
    assertEquals(stripAwsPrefix("ec2"), "ec2");
    assertEquals(stripAwsPrefix("lambda"), "lambda");
    assertEquals(stripAwsPrefix("some-service"), "some-service");
  });

  await t.step("先頭以外のamazon-/aws-は省略しない", () => {
    assertEquals(stripAwsPrefix("my-amazon-service"), "my-amazon-service");
    assertEquals(stripAwsPrefix("custom-aws-tool"), "custom-aws-tool");
  });
});

// 週次対応のテスト
Deno.test("generateWeeklyCoveragePeriod", async (t) => {
  await t.step("週次用の対象期間文字列を生成する", () => {
    const result = generateWeeklyCoveragePeriod("2026-01-13", "2026-01-20");
    assertEquals(result, "📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)");
  });
});

Deno.test("generateTitle", async (t) => {
  await t.step("日次データの場合は日付のみのタイトルを生成する", () => {
    const data = {
      date: "2026-01-18",
      github: [],
      aws: [],
      claudeCode: [],
      linear: [],
    };
    const result = generateTitle(data);
    assertEquals(result, "📰 Tech Changelog - 2026-01-18");
  });

  await t.step("週次データの場合は期間付きのタイトルを生成する", () => {
    const data = {
      date: "2026-01-20",
      startDate: "2026-01-13",
      endDate: "2026-01-20",
      github: [],
      aws: [],
      claudeCode: [],
      linear: [],
    };
    const result = generateTitle(data);
    assertEquals(
      result,
      "📰 Tech Changelog - Weekly (2026-01-13 ~ 2026-01-20)",
    );
  });
});

Deno.test("parseArgs with weekly flag", async (t) => {
  await t.step("--weekly オプションを認識する", () => {
    const result = parseArgs(["--weekly", "owner", "repo", "Weekly"]);
    assertEquals(result.weekly, true);
    assertEquals(result.otherArgs, ["owner", "repo", "Weekly"]);
  });

  await t.step("--weekly なしの場合は false", () => {
    const result = parseArgs(["owner", "repo"]);
    assertEquals(result.weekly, false);
  });

  await t.step("--date と --weekly を同時に指定できる", () => {
    const result = parseArgs([
      "--date=2026-01-20",
      "--weekly",
      "owner",
      "repo",
    ]);
    assertEquals(result.date, "2026-01-20");
    assertEquals(result.weekly, true);
    assertEquals(result.otherArgs, ["owner", "repo"]);
  });
});

const mockWeeklyData = {
  date: "2026-01-20",
  startDate: "2026-01-13",
  endDate: "2026-01-20",
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
    pubDate: "2026-01-19T11:00:00Z",
  }],
  claudeCode: [],
  linear: [],
};

Deno.test("generateDefaultBody with weekly data", async (t) => {
  await t.step("週次データの場合はWeeklyタイトルと期間を表示する", () => {
    const body = generateDefaultBody(mockWeeklyData);
    assertStringIncludes(body, "# 📰 Tech Changelog - Weekly");
    assertStringIncludes(
      body,
      "📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)",
    );
    assertStringIncludes(body, "## GitHub Changelog");
    assertStringIncludes(body, "## AWS What's New");
  });
});

Deno.test("generateBodyWithSummaries with weekly data", async (t) => {
  const summaries: SummaryData = {
    github: {
      "https://example.com/a": "GitHub機能Aの要約です。",
    },
    aws: {
      "https://example.com/b": "AWS更新Bの要約です。",
    },
    claudeCode: {},
    linear: {},
  };

  await t.step("週次データの場合はWeeklyタイトルと期間を表示する", () => {
    const body = generateBodyWithSummaries(mockWeeklyData, summaries);
    assertStringIncludes(body, "# 📰 Tech Changelog - Weekly");
    assertStringIncludes(
      body,
      "📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)",
    );
    assertStringIncludes(body, "**要約**: GitHub機能Aの要約です。");
    assertStringIncludes(body, "**要約**: AWS更新Bの要約です。");
  });
});
