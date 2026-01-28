import { assertEquals } from "@std/assert";
import {
  filterMutedChangelogEntries,
  filterMutedFromChangelog,
  filterMutedReleaseEntries,
} from "./filter-muted-entries.ts";
import type {
  ChangelogData,
  ChangelogEntry,
  ReleaseEntry,
} from "./domain/types.ts";

Deno.test("filterMutedChangelogEntries", async (t) => {
  await t.step("muted: trueのエントリを除外する", () => {
    const entries: ChangelogEntry[] = [
      {
        title: "Active entry",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
      },
      {
        title: "Muted entry",
        url: "https://example.com/2",
        content: "",
        pubDate: "2026-01-18T11:00:00Z",
        muted: true,
        mutedBy: "SageMaker",
      },
      {
        title: "Another active",
        url: "https://example.com/3",
        content: "",
        pubDate: "2026-01-18T12:00:00Z",
      },
    ];

    const result = filterMutedChangelogEntries(entries);
    assertEquals(result.length, 2);
    assertEquals(result[0].title, "Active entry");
    assertEquals(result[1].title, "Another active");
  });

  await t.step("muted: falseのエントリは残す", () => {
    const entries: ChangelogEntry[] = [
      {
        title: "Entry with muted false",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
        muted: false,
      },
    ];

    const result = filterMutedChangelogEntries(entries);
    assertEquals(result.length, 1);
  });

  await t.step("空配列を処理できる", () => {
    const result = filterMutedChangelogEntries([]);
    assertEquals(result, []);
  });

  await t.step("全てミュートされた場合は空配列を返す", () => {
    const entries: ChangelogEntry[] = [
      {
        title: "Muted 1",
        url: "https://example.com/1",
        content: "",
        pubDate: "2026-01-18T10:00:00Z",
        muted: true,
        mutedBy: "keyword1",
      },
      {
        title: "Muted 2",
        url: "https://example.com/2",
        content: "",
        pubDate: "2026-01-18T11:00:00Z",
        muted: true,
        mutedBy: "keyword2",
      },
    ];

    const result = filterMutedChangelogEntries(entries);
    assertEquals(result.length, 0);
  });
});

Deno.test("filterMutedReleaseEntries", async (t) => {
  await t.step("muted: trueのリリースエントリを除外する", () => {
    const entries: ReleaseEntry[] = [
      {
        version: "v1.0.0",
        url: "https://example.com/1",
        body: "",
        publishedAt: "2026-01-18T10:00:00Z",
      },
      {
        version: "v1.0.1-muted",
        url: "https://example.com/2",
        body: "",
        publishedAt: "2026-01-18T11:00:00Z",
        muted: true,
        mutedBy: "muted",
      },
    ];

    const result = filterMutedReleaseEntries(entries);
    assertEquals(result.length, 1);
    assertEquals(result[0].version, "v1.0.0");
  });
});

Deno.test("filterMutedFromChangelog", async (t) => {
  await t.step("全プロバイダーからミュート済みエントリを除外する", () => {
    const data: ChangelogData = {
      date: "2026-01-21",
      startDate: "2026-01-14",
      endDate: "2026-01-21",
      github: [
        {
          title: "GitHub Active",
          url: "https://github.com/1",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
        },
        {
          title: "GitHub Muted",
          url: "https://github.com/2",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          muted: true,
          mutedBy: "keyword",
        },
      ],
      aws: [
        {
          title: "AWS Active",
          url: "https://aws.com/1",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
        },
        {
          title: "Amazon RDS for SQL Server",
          url: "https://aws.com/2",
          content: "",
          pubDate: "2026-01-18T11:00:00Z",
          muted: true,
          mutedBy: "RDS",
        },
      ],
      claudeCode: [
        {
          version: "v1.0.0",
          url: "https://claude.com/1",
          body: "",
          publishedAt: "2026-01-18T10:00:00Z",
        },
      ],
      linear: [
        {
          title: "Linear Muted",
          url: "https://linear.com/1",
          content: "",
          pubDate: "2026-01-18T10:00:00Z",
          muted: true,
          mutedBy: "keyword",
        },
      ],
    };

    const result = filterMutedFromChangelog(data);

    // メタデータは保持される
    assertEquals(result.date, "2026-01-21");
    assertEquals(result.startDate, "2026-01-14");
    assertEquals(result.endDate, "2026-01-21");

    // github: 1件残る
    assertEquals(result.github.length, 1);
    assertEquals(result.github[0].title, "GitHub Active");

    // aws: 1件残る（RDS記事は除外）
    assertEquals(result.aws.length, 1);
    assertEquals(result.aws[0].title, "AWS Active");

    // claudeCode: 1件残る（ミュートなし）
    assertEquals(result.claudeCode.length, 1);

    // linear: 0件（全てミュート）
    assertEquals(result.linear.length, 0);
  });

  await t.step("空のデータを処理できる", () => {
    const data: ChangelogData = {
      date: "2026-01-21",
      github: [],
      aws: [],
      claudeCode: [],
      linear: [],
    };

    const result = filterMutedFromChangelog(data);
    assertEquals(result.github, []);
    assertEquals(result.aws, []);
    assertEquals(result.claudeCode, []);
    assertEquals(result.linear, []);
  });
});
