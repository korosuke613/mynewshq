import { assertEquals } from "@std/assert";
import { applyMuteFilter, isMuted, parseMuteWords } from "./mute-filter.ts";

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
