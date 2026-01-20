import { assertEquals } from "@std/assert";
import {
  applyMuteFilter,
  extractLabelsFromAWSCategory,
  extractLabelsFromCategories,
  isMuted,
  isRecent,
  isWithinDays,
  normalizeUrl,
  parseMuteWords,
} from "./fetch-changelogs.ts";

const NOW = new Date("2026-01-18T12:00:00Z");

Deno.test("isRecent", async (t) => {
  await t.step("24時間以内の日付はtrueを返す", () => {
    assertEquals(isRecent("2026-01-18T00:00:00Z", NOW), true);
  });

  await t.step("ちょうど24時間前はtrueを返す（境界値）", () => {
    assertEquals(isRecent("2026-01-17T12:00:00Z", NOW), true);
  });

  await t.step("24時間より前はfalseを返す", () => {
    assertEquals(isRecent("2026-01-17T11:59:59Z", NOW), false);
  });

  await t.step("1週間前はfalseを返す", () => {
    assertEquals(isRecent("2026-01-11T12:00:00Z", NOW), false);
  });

  await t.step("未来の日付はfalseを返す", () => {
    assertEquals(isRecent("2026-01-19T00:00:00Z", NOW), false);
  });

  await t.step("ちょうどnowと同じ日時はtrueを返す（上限の境界値）", () => {
    assertEquals(isRecent("2026-01-18T12:00:00Z", NOW), true);
  });

  await t.step("nowより1秒後はfalseを返す（上限を超える）", () => {
    assertEquals(isRecent("2026-01-18T12:00:01Z", NOW), false);
  });

  await t.step("RFC 2822形式を処理できる", () => {
    assertEquals(isRecent("Sat, 18 Jan 2026 00:00:00 GMT", NOW), true);
  });
});

Deno.test("isWithinDays", async (t) => {
  await t.step("1日以内の日付はtrueを返す（days=1）", () => {
    assertEquals(isWithinDays("2026-01-18T00:00:00Z", 1, NOW), true);
  });

  await t.step("ちょうど1日前はtrueを返す（境界値）", () => {
    assertEquals(isWithinDays("2026-01-17T12:00:00Z", 1, NOW), true);
  });

  await t.step("1日より前はfalseを返す（days=1）", () => {
    assertEquals(isWithinDays("2026-01-17T11:59:59Z", 1, NOW), false);
  });

  await t.step("7日以内の日付はtrueを返す（days=7）", () => {
    assertEquals(isWithinDays("2026-01-12T12:00:00Z", 7, NOW), true);
  });

  await t.step("ちょうど7日前はtrueを返す（境界値）", () => {
    assertEquals(isWithinDays("2026-01-11T12:00:00Z", 7, NOW), true);
  });

  await t.step("7日より前はfalseを返す（days=7）", () => {
    assertEquals(isWithinDays("2026-01-11T11:59:59Z", 7, NOW), false);
  });

  await t.step("未来の日付はfalseを返す", () => {
    assertEquals(isWithinDays("2026-01-19T00:00:00Z", 7, NOW), false);
  });

  await t.step("ちょうどnowと同じ日時はtrueを返す", () => {
    assertEquals(isWithinDays("2026-01-18T12:00:00Z", 1, NOW), true);
  });

  await t.step("nowより1秒後はfalseを返す", () => {
    assertEquals(isWithinDays("2026-01-18T12:00:01Z", 1, NOW), false);
  });

  await t.step("30日間でも正しく動作する", () => {
    assertEquals(isWithinDays("2026-01-01T12:00:00Z", 30, NOW), true);
    assertEquals(isWithinDays("2025-12-19T12:00:00Z", 30, NOW), true);
    assertEquals(isWithinDays("2025-12-19T11:59:59Z", 30, NOW), false);
  });

  await t.step("RFC 2822形式を処理できる", () => {
    assertEquals(isWithinDays("Sat, 18 Jan 2026 00:00:00 GMT", 1, NOW), true);
    assertEquals(isWithinDays("Mon, 13 Jan 2026 00:00:00 GMT", 7, NOW), true);
  });
});

Deno.test("parseMuteWords", async (t) => {
  await t.step("箇条書きのワードを抽出する", () => {
    const issueBody = `## ミュートワード

以下のワードを含むエントリは自動でミュートされます。

- Amazon SageMaker
- AWS Glue
- Generative AI`;

    const result = parseMuteWords(issueBody);
    assertEquals(result, ["Amazon SageMaker", "AWS Glue", "Generative AI"]);
  });

  await t.step("箇条書きがない場合は空配列を返す", () => {
    const issueBody = "これは普通のテキストです。";
    const result = parseMuteWords(issueBody);
    assertEquals(result, []);
  });

  await t.step("空文字の場合は空配列を返す", () => {
    const result = parseMuteWords("");
    assertEquals(result, []);
  });

  await t.step("空白のみの箇条書きは無視する", () => {
    const issueBody = `-
-
- Valid Word`;
    const result = parseMuteWords(issueBody);
    assertEquals(result, ["Valid Word"]);
  });
});

Deno.test("isMuted", async (t) => {
  const muteWords = ["SageMaker", "AWS Glue", "Generative AI"];

  await t.step("部分一致でマッチする", () => {
    const result = isMuted("Amazon SageMaker now supports...", muteWords);
    assertEquals(result, "SageMaker");
  });

  await t.step("大文字小文字を無視する", () => {
    const result = isMuted("amazon sagemaker now supports...", muteWords);
    assertEquals(result, "SageMaker");
  });

  await t.step("マッチしない場合はnullを返す", () => {
    const result = isMuted("Amazon S3 now supports...", muteWords);
    assertEquals(result, null);
  });

  await t.step("複数のワードがマッチする場合は最初のワードを返す", () => {
    const result = isMuted(
      "AWS Glue with Generative AI features",
      muteWords,
    );
    assertEquals(result, "AWS Glue");
  });
});

Deno.test("applyMuteFilter", async (t) => {
  const muteWords = ["SageMaker", "Glue"];

  await t.step("ChangelogEntryにミュートフラグを適用する", () => {
    const entries = [
      {
        title: "Amazon SageMaker update",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
      },
      {
        title: "Amazon S3 update",
        url: "https://example.com/2",
        content: "",
        pubDate: "2026-01-18T11:00:00Z",
      },
    ];

    const result = applyMuteFilter(entries, muteWords);
    assertEquals(result[0].muted, true);
    assertEquals(result[0].mutedBy, "SageMaker");
    assertEquals(result[1].muted, undefined);
    assertEquals(result[1].mutedBy, undefined);
  });

  await t.step("ReleaseEntryにミュートフラグを適用する", () => {
    const entries = [
      {
        version: "v1.0.0-glue",
        url: "https://example.com/1",
        body: "",
        publishedAt: "2026-01-18T10:00:00Z",
      },
      {
        version: "v1.0.1",
        url: "https://example.com/2",
        body: "",
        publishedAt: "2026-01-18T11:00:00Z",
      },
    ];

    const result = applyMuteFilter(entries, muteWords);
    assertEquals(result[0].muted, true);
    assertEquals(result[0].mutedBy, "Glue");
    assertEquals(result[1].muted, undefined);
    assertEquals(result[1].mutedBy, undefined);
  });

  await t.step("ミュートワードが空の場合は何もしない", () => {
    const entries = [
      {
        title: "Amazon SageMaker update",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
      },
    ];

    const result = applyMuteFilter(entries, []);
    assertEquals(result[0].muted, undefined);
    assertEquals(result[0].mutedBy, undefined);
  });
});

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

Deno.test("normalizeUrl", async (t) => {
  await t.step("ドメインとパスの間の/が欠落している場合に修正する", () => {
    const result = normalizeUrl(
      "https://aws.amazon.comabout-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("正常なURLはそのまま返す", () => {
    const result = normalizeUrl(
      "https://aws.amazon.com/about-aws/whats-new/test",
    );
    assertEquals(result, "https://aws.amazon.com/about-aws/whats-new/test");
  });

  await t.step("httpプロトコルも処理できる", () => {
    const result = normalizeUrl("http://example.compath/to/page");
    assertEquals(result, "http://example.com/path/to/page");
  });

  await t.step("空文字はそのまま返す", () => {
    const result = normalizeUrl("");
    assertEquals(result, "");
  });

  await t.step("パスがない場合はそのまま返す", () => {
    const result = normalizeUrl("https://example.com");
    assertEquals(result, "https://example.com");
  });

  await t.step("パスが/のみの場合はそのまま返す", () => {
    const result = normalizeUrl("https://example.com/");
    assertEquals(result, "https://example.com/");
  });
});
