import { assertEquals } from "@std/assert";
import {
  determineLabels,
  extractLabelsFromAWSCategory,
  extractLabelsFromCategories,
  stripAwsPrefix,
} from "./label-extractor.ts";

Deno.test("extractLabelsFromCategories", async (t) => {
  await t.step("単一のカテゴリからラベルを抽出する", () => {
    const category = {
      "@domain": "changelog-label",
      "#text": "copilot",
    };
    const result = extractLabelsFromCategories(category);
    assertEquals(result, {
      "changelog-label": ["copilot"],
    });
  });

  await t.step("複数のカテゴリからラベルを抽出する", () => {
    const categories = [
      {
        "@domain": "changelog-label",
        "#text": "copilot",
      },
      {
        "@domain": "changelog-type",
        "#text": "improvement",
      },
    ];
    const result = extractLabelsFromCategories(categories);
    assertEquals(result, {
      "changelog-label": ["copilot"],
      "changelog-type": ["improvement"],
    });
  });

  await t.step("同じドメインの複数のカテゴリを集約する", () => {
    const categories = [
      {
        "@domain": "changelog-label",
        "#text": "copilot",
      },
      {
        "@domain": "changelog-label",
        "#text": "security",
      },
    ];
    const result = extractLabelsFromCategories(categories);
    assertEquals(result, {
      "changelog-label": ["copilot", "security"],
    });
  });

  await t.step("カテゴリがundefinedの場合は空のオブジェクトを返す", () => {
    const result = extractLabelsFromCategories(undefined);
    assertEquals(result, {});
  });

  await t.step("@domainがないカテゴリは無視する", () => {
    const categories = [
      {
        "@domain": "changelog-label",
        "#text": "copilot",
      },
      {
        "#text": "invalid",
      },
    ] as unknown as Parameters<typeof extractLabelsFromCategories>[0];
    const result = extractLabelsFromCategories(categories);
    assertEquals(result, {
      "changelog-label": ["copilot"],
    });
  });

  await t.step("#textがないカテゴリは無視する", () => {
    const categories = [
      {
        "@domain": "changelog-label",
        "#text": "copilot",
      },
      {
        "@domain": "invalid-domain",
      },
    ] as unknown as Parameters<typeof extractLabelsFromCategories>[0];
    const result = extractLabelsFromCategories(categories);
    assertEquals(result, {
      "changelog-label": ["copilot"],
    });
  });

  await t.step("空の配列の場合は空のオブジェクトを返す", () => {
    const result = extractLabelsFromCategories([]);
    assertEquals(result, {});
  });
});

Deno.test("extractLabelsFromAWSCategory", async (t) => {
  await t.step("general:products系のカテゴリからラベルを抽出する", () => {
    const categories = ["general:products/amazon-mwaa"];
    const result = extractLabelsFromAWSCategory(categories);
    assertEquals(result, {
      "general:products": ["amazon-mwaa"],
    });
  });

  await t.step("marketing:marchitecture系は無視する", () => {
    const categories = [
      "marketing:marchitecture/analytics",
      "general:products/amazon-mwaa",
    ];
    const result = extractLabelsFromAWSCategory(categories);
    assertEquals(result, {
      "general:products": ["amazon-mwaa"],
    });
  });

  await t.step("同じキーの複数のカテゴリを集約する", () => {
    const categories = [
      "general:products/amazon-s3",
      "general:products/amazon-ec2",
    ];
    const result = extractLabelsFromAWSCategory(categories);
    assertEquals(result, {
      "general:products": ["amazon-s3", "amazon-ec2"],
    });
  });

  await t.step("カテゴリがundefinedの場合は空のオブジェクトを返す", () => {
    const result = extractLabelsFromAWSCategory(undefined);
    assertEquals(result, {});
  });

  await t.step("空の配列の場合は空のオブジェクトを返す", () => {
    const result = extractLabelsFromAWSCategory([]);
    assertEquals(result, {});
  });

  await t.step("general:products以外のカテゴリは無視する", () => {
    const categories = [
      "marketing:marchitecture/analytics",
      "invalid-category",
      "no-slash:here",
    ];
    const result = extractLabelsFromAWSCategory(categories);
    assertEquals(result, {});
  });

  await t.step(
    "カンマ区切りのカテゴリを分割してgeneral:productsのみ抽出する",
    () => {
      const categories = [
        "general:products/amazon-connect,marketing:marchitecture/business-productivity,general:products/aws-govcloud-us",
      ];
      const result = extractLabelsFromAWSCategory(categories);
      assertEquals(result, {
        "general:products": ["amazon-connect", "aws-govcloud-us"],
      });
    },
  );

  await t.step(
    "複数スラッシュがある場合は最初のスラッシュ以降を値とする",
    () => {
      const categories = ["general:products/amazon-s3/deep/path"];
      const result = extractLabelsFromAWSCategory(categories);
      assertEquals(result, {
        "general:products": ["amazon-s3/deep/path"],
      });
    },
  );
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
  githubCli: [],
  linear: [{
    title: "Linear Feature C",
    url: "https://example.com/d",
    content: "",
    pubDate: "2026-01-18T12:00:00Z",
  }],
};

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

  await t.step(
    "serviceOnly: true の場合はサービス名ラベルのみを返す（GitHubサブカテゴリを除外）",
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
      const labels = determineLabels(dataWithGhLabels, { serviceOnly: true });
      assertEquals(labels, ["github"]); // サブカテゴリラベルが含まれない
    },
  );

  await t.step(
    "serviceOnly: true の場合はサービス名ラベルのみを返す（AWSサブカテゴリを除外）",
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
              "general:products": ["amazon-vpc", "amazon-bedrock"],
            },
          },
        ],
      };
      const labels = determineLabels(dataWithAwsLabels, { serviceOnly: true });
      assertEquals(labels, ["aws"]); // サブカテゴリラベルが含まれない
    },
  );

  await t.step(
    "serviceOnly: true の場合でも複数サービスのラベルは正しく返す",
    () => {
      const dataWithMultipleServices = {
        ...mockData,
        github: [{
          title: "GH Feature",
          url: "https://example.com/gh",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: { "changelog-label": ["copilot"] },
        }],
        aws: [{
          title: "AWS Update",
          url: "https://example.com/aws",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          labels: { "general:products": ["amazon-s3"] },
        }],
        claudeCode: [{
          version: "v1.0.0",
          url: "https://example.com/claude",
          body: "",
          publishedAt: "2026-01-18T10:00:00Z",
        }],
        linear: [{
          title: "Linear Update",
          url: "https://example.com/linear",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
        }],
      };
      const labels = determineLabels(dataWithMultipleServices, {
        serviceOnly: true,
      });
      assertEquals(
        labels.sort(),
        ["github", "aws", "claude-code", "linear"].sort(),
      );
    },
  );

  await t.step(
    "serviceOnly: false（デフォルト）の場合はサブカテゴリラベルも含める",
    () => {
      const dataWithLabels = {
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
            labels: { "changelog-label": ["copilot"] },
          },
        ],
      };
      // serviceOnly オプションなし（デフォルト）
      const labels = determineLabels(dataWithLabels);
      assertEquals(labels.sort(), ["github", "gh:copilot"].sort());
    },
  );
});
