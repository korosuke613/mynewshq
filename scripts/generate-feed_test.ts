import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  escapeXml,
  filterByCategories,
  generateAtomFeed,
} from "./generate-feed.ts";
import type { DiscussionNode } from "./generate-feed.ts";

// --- escapeXml ---

Deno.test("escapeXml", async (t) => {
  await t.step("& を &amp; にエスケープする", () => {
    assertEquals(escapeXml("foo & bar"), "foo &amp; bar");
  });

  await t.step("< を &lt; にエスケープする", () => {
    assertEquals(escapeXml("a < b"), "a &lt; b");
  });

  await t.step("> を &gt; にエスケープする", () => {
    assertEquals(escapeXml("a > b"), "a &gt; b");
  });

  await t.step('" を &quot; にエスケープする', () => {
    assertEquals(escapeXml('say "hello"'), "say &quot;hello&quot;");
  });

  await t.step("' を &apos; にエスケープする", () => {
    assertEquals(escapeXml("it's"), "it&apos;s");
  });

  await t.step("複数特殊文字を含む文字列をまとめてエスケープする", () => {
    assertEquals(
      escapeXml(`<a href="x">&'test'</a>`),
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;test&apos;&lt;/a&gt;",
    );
  });

  await t.step("特殊文字なしの文字列はそのまま返る", () => {
    assertEquals(escapeXml("hello world"), "hello world");
  });
});

// --- filterByCategories ---

Deno.test("filterByCategories", async (t) => {
  const nodes: DiscussionNode[] = [
    {
      title: "Daily 1",
      url: "https://example.com/1",
      createdAt: "2026-01-01T00:00:00Z",
      category: { slug: "daily-changelog" },
    },
    {
      title: "Weekly 1",
      url: "https://example.com/2",
      createdAt: "2026-01-02T00:00:00Z",
      category: { slug: "weekly-blog" },
    },
    {
      title: "Other",
      url: "https://example.com/3",
      createdAt: "2026-01-03T00:00:00Z",
      category: { slug: "general" },
    },
  ];

  await t.step("対象slugのノードだけ返る", () => {
    const result = filterByCategories(nodes, ["daily-changelog"]);
    assertEquals(result.length, 1);
    assertEquals(result[0].title, "Daily 1");
  });

  await t.step("対象外のslugは除外される", () => {
    const result = filterByCategories(nodes, [
      "daily-changelog",
      "weekly-blog",
    ]);
    assertEquals(result.length, 2);
    assertFalse(result.some((n) => n.category.slug === "general"));
  });

  await t.step("空配列を渡すと空配列が返る", () => {
    const result = filterByCategories(nodes, []);
    assertEquals(result, []);
  });

  await t.step("ノードが空の場合も空配列が返る", () => {
    const result = filterByCategories([], ["daily-changelog"]);
    assertEquals(result, []);
  });
});

// --- generateAtomFeed ---

Deno.test("generateAtomFeed", async (t) => {
  const feedUrl = "https://korosuke613.github.io/mynewshq/feed.xml";
  const siteUrl = "https://github.com/korosuke613/mynewshq/discussions";

  const sampleNodes: DiscussionNode[] = [
    {
      title: "Test Entry",
      url: "https://github.com/korosuke613/mynewshq/discussions/1",
      createdAt: "2026-01-15T12:00:00Z",
      category: { slug: "daily-changelog" },
    },
  ];

  await t.step("XML宣言が含まれる", () => {
    const xml = generateAtomFeed(sampleNodes, feedUrl, siteUrl);
    assertStringIncludes(xml, '<?xml version="1.0" encoding="UTF-8"?>');
  });

  await t.step("Atom名前空間が含まれる", () => {
    const xml = generateAtomFeed(sampleNodes, feedUrl, siteUrl);
    assertStringIncludes(xml, 'xmlns="http://www.w3.org/2005/Atom"');
  });

  await t.step(
    "エントリのtitle, link, id, published, updated, categoryが正しく生成される",
    () => {
      const xml = generateAtomFeed(sampleNodes, feedUrl, siteUrl);
      assertStringIncludes(xml, "<title>Test Entry</title>");
      assertStringIncludes(
        xml,
        'href="https://github.com/korosuke613/mynewshq/discussions/1"',
      );
      assertStringIncludes(
        xml,
        "<id>https://github.com/korosuke613/mynewshq/discussions/1</id>",
      );
      assertStringIncludes(
        xml,
        "<published>2026-01-15T12:00:00Z</published>",
      );
      assertStringIncludes(xml, "<updated>2026-01-15T12:00:00Z</updated>");
      assertStringIncludes(xml, 'term="daily-changelog"');
    },
  );

  await t.step("<content が含まれないこと", () => {
    const xml = generateAtomFeed(sampleNodes, feedUrl, siteUrl);
    assertFalse(xml.includes("<content"));
  });

  await t.step("<summary が含まれないこと", () => {
    const xml = generateAtomFeed(sampleNodes, feedUrl, siteUrl);
    assertFalse(xml.includes("<summary"));
  });

  await t.step("空配列の場合もvalidなfeedが生成される", () => {
    const xml = generateAtomFeed([], feedUrl, siteUrl);
    assertStringIncludes(xml, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(xml, "<feed");
    assertStringIncludes(xml, "</feed>");
    assertStringIncludes(xml, "<updated>");
  });

  await t.step("XMLの特殊文字がエスケープされる", () => {
    const nodesWithSpecialChars: DiscussionNode[] = [
      {
        title: 'Test <Special> & "Chars"',
        url: "https://example.com/1",
        createdAt: "2026-01-01T00:00:00Z",
        category: { slug: "daily-changelog" },
      },
    ];
    const xml = generateAtomFeed(nodesWithSpecialChars, feedUrl, siteUrl);
    assertStringIncludes(
      xml,
      "<title>Test &lt;Special&gt; &amp; &quot;Chars&quot;</title>",
    );
  });
});
