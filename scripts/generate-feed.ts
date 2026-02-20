// GitHub Discussions から Atom フィードを生成するスクリプト
// 対象カテゴリの Discussion を取得し、軽量な Atom XML を出力する

import { createAuthenticatedGraphQLClient } from "./infrastructure/github/graphql-client.ts";
import {
  parseArgWithDefault,
  requireGitHubToken,
} from "./infrastructure/cli-parser.ts";
import { dirname } from "@std/path";
import { ensureDirSync } from "@std/fs";

export interface DiscussionNode {
  title: string;
  url: string;
  createdAt: string;
  category: { slug: string };
}

interface FetchDiscussionsResponse {
  repository: {
    discussions: {
      nodes: DiscussionNode[];
    };
  };
}

const TARGET_CATEGORY_SLUGS = [
  "daily-changelog",
  "daily-blog",
  "weekly-changelog",
  "weekly-blog",
];

export async function fetchDiscussions(
  token: string,
  owner: string,
  repo: string,
  limit: number,
): Promise<DiscussionNode[]> {
  const graphqlWithAuth = createAuthenticatedGraphQLClient(token);
  const result = await graphqlWithAuth<FetchDiscussionsResponse>(
    `
    query($owner: String!, $repo: String!, $limit: Int!) {
      repository(owner: $owner, name: $repo) {
        discussions(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            title
            url
            createdAt
            category { slug }
          }
        }
      }
    }
  `,
    { owner, repo, limit },
  );
  return result.repository.discussions.nodes;
}

export function filterByCategories(
  nodes: DiscussionNode[],
  slugs: string[],
): DiscussionNode[] {
  return nodes.filter((node) => slugs.includes(node.category.slug));
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateAtomFeed(
  nodes: DiscussionNode[],
  feedUrl: string,
  siteUrl: string,
): string {
  const updated = nodes.length > 0
    ? nodes[0].createdAt
    : new Date().toISOString();

  const entries = nodes
    .map(
      (node) =>
        `  <entry>
    <title>${escapeXml(node.title)}</title>
    <link href="${escapeXml(node.url)}" rel="alternate" type="text/html"/>
    <id>${escapeXml(node.url)}</id>
    <published>${node.createdAt}</published>
    <updated>${node.createdAt}</updated>
    <category term="${escapeXml(node.category.slug)}"/>
  </entry>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>mynewshq Discussions Feed</title>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>
  <link href="${escapeXml(siteUrl)}" rel="alternate" type="text/html"/>
  <id>https://github.com/korosuke613/mynewshq</id>
  <updated>${updated}</updated>
${entries}
</feed>
`;
}

export async function main() {
  const token = requireGitHubToken();
  const args = Deno.args;

  const output = parseArgWithDefault(args, "output", "feed.xml");
  const owner = parseArgWithDefault(args, "owner", "korosuke613");
  const repo = parseArgWithDefault(args, "repo", "mynewshq");
  const defaultLimit = 50;
  const limit = Number.parseInt(parseArgWithDefault(args, "limit", "50"), 10);
  const safeLimit = Number.isNaN(limit) ? defaultLimit : limit;

  const feedUrl = "https://korosuke613.github.io/mynewshq/feed.xml";
  const siteUrl = "https://github.com/korosuke613/mynewshq/discussions";

  const nodes = await fetchDiscussions(token, owner, repo, safeLimit);
  const filtered = filterByCategories(nodes, TARGET_CATEGORY_SLUGS);
  const entries = filtered.slice(0, 15);
  const xml = generateAtomFeed(entries, feedUrl, siteUrl);

  const dir = dirname(output);
  if (dir && dir !== ".") {
    ensureDirSync(dir);
  }
  Deno.writeTextFileSync(output, xml);

  console.log(`Feed generated: ${output} (${entries.length} entries)`);
}

if (import.meta.main) {
  await main();
}
