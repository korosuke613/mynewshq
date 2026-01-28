// 基底アダプタ
// 各プロバイダーアダプタで共通の処理を実装

import { graphql } from "@octokit/graphql";
import type {
  ChangelogData,
  ChangelogEntry,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../../types.ts";
import { determineLabels } from "../../label-extractor.ts";
import { getProviderDisplayName } from "../../providers/index.ts";
import {
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
} from "../../../presentation/markdown/weekly-generator.ts";
import { generateMention } from "../../../presentation/markdown/helpers.ts";
import type {
  PostDiscussionData,
  SummarizeConfig,
  WeeklyPipeline,
} from "../pipeline.ts";
import type { PipelineResult, WeeklyContext } from "../types.ts";

// GraphQL API用の内部型定義
interface DiscussionCategory {
  id: string;
  name: string;
}

interface Label {
  id: string;
  name: string;
}

interface RepositoryData {
  repository: {
    id: string;
    discussionCategories: {
      nodes: DiscussionCategory[];
    };
    labels: {
      nodes: Label[];
    };
  };
}

interface DiscussionNode {
  title: string;
  url: string;
  body: string;
  createdAt: string;
}

interface DiscussionSearchResult {
  repository: {
    discussions: {
      nodes: DiscussionNode[];
    };
  };
}

interface CreateDiscussionResult {
  createDiscussion: {
    discussion: {
      id: string;
      url: string;
    };
  };
}

// ランダムな16進数の色を生成（アクセシブルな色のリストから選択）
const ACCESSIBLE_LABEL_COLORS: string[] = [
  "0e8a16", // green
  "1d76db", // blue
  "d93f0b", // orange
  "6f42c1", // purple
  "0052cc", // dark blue
  "b60205", // dark red
  "5319e7", // indigo
  "0366d6", // bright blue
  "22863a", // dark green
  "b31d28", // dark crimson
];

function getRandomHexColor(): string {
  const index = Math.floor(Math.random() * ACCESSIBLE_LABEL_COLORS.length);
  return ACCESSIBLE_LABEL_COLORS[index];
}

// 新しいラベルを作成し、そのIDを返す
async function createNewLabel(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  name: string,
): Promise<string> {
  const { createLabel } = await graphqlWithAuth<{
    createLabel: { label: { id: string } };
  }>(
    `
    mutation($repositoryId: ID!, $name: String!, $color: String!) {
      createLabel(input: {
        repositoryId: $repositoryId
        name: $name
        color: $color
      }) {
        label {
          id
        }
      }
    }
  `,
    {
      repositoryId,
      name,
      color: getRandomHexColor(),
    },
  );
  return createLabel.label.id;
}

// DiscussionにラベルIDsを追加
async function addLabelsToDiscussion(
  graphqlWithAuth: typeof graphql,
  discussionId: string,
  labelIds: string[],
): Promise<void> {
  if (labelIds.length === 0) {
    return;
  }

  await graphqlWithAuth(
    `
    mutation($labelableId: ID!, $labelIds: [ID!]!) {
      addLabelsToLabelable(input: {
        labelableId: $labelableId
        labelIds: $labelIds
      }) {
        labelable {
          ... on Discussion {
            id
          }
        }
      }
    }
  `,
    {
      labelableId: discussionId,
      labelIds,
    },
  );
}

/**
 * 基底アダプタ抽象クラス
 * 共通処理を実装し、プロバイダー固有の部分は派生クラスでオーバーライド
 */
export abstract class BaseAdapter implements WeeklyPipeline {
  abstract readonly providerId: string;

  /**
   * 過去のDiscussionを取得
   * 共通実装：GraphQL APIでDiscussionを検索
   */
  async fetchPastDiscussions(
    ctx: WeeklyContext,
    limit: number = 2,
  ): Promise<PipelineResult<PastWeeklyDiscussion[]>> {
    try {
      const graphqlWithAuth = graphql.defaults({
        headers: {
          authorization: `token ${ctx.token}`,
        },
      });

      const displayName = getProviderDisplayName(this.providerId);
      if (displayName === this.providerId) {
        return {
          success: false,
          error: `Unknown provider ID: ${this.providerId}`,
        };
      }

      const result = await graphqlWithAuth<DiscussionSearchResult>(
        `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            discussions(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title
                url
                body
                createdAt
              }
            }
          }
        }
      `,
        { owner: ctx.owner, repo: ctx.repo },
      );

      const discussions = result.repository.discussions.nodes;
      const pastDiscussions: PastWeeklyDiscussion[] = [];

      // "📰 Tech Changelog - Weekly [プロバイダー名] (YYYY-MM-DD)" 形式のタイトルをパース
      const weeklyTitlePattern = new RegExp(
        `📰 Tech Changelog - Weekly \\[${displayName}\\] \\((\\d{4}-\\d{2}-\\d{2})\\)$`,
      );

      for (const discussion of discussions) {
        if (pastDiscussions.length >= limit) {
          break;
        }

        const match = discussion.title.match(weeklyTitlePattern);
        if (match) {
          const date = match[1];
          pastDiscussions.push({
            providerId: this.providerId,
            date,
            url: discussion.url,
            body: discussion.body,
          });
        }
      }

      return { success: true, data: pastDiscussions };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to fetch past discussions: ${message}`,
      };
    }
  }

  /**
   * 要約生成用の設定を取得
   * 派生クラスでオーバーライドして固有のスキーマとプロンプトを返す
   */
  abstract getSummarizeConfig(): SummarizeConfig;

  /**
   * Markdownを生成
   * 共通実装：weekly-generator.tsの関数を使用
   */
  generateMarkdown(
    data: ChangelogEntry[] | ReleaseEntry[],
    summary: ProviderWeeklySummary,
    ctx: WeeklyContext,
  ): string {
    const body = generateProviderWeeklyBody(
      this.providerId,
      data,
      summary,
      ctx.startDate,
      ctx.endDate,
    );
    return body + generateMention();
  }

  /**
   * Discussionを投稿
   * 共通実装：GraphQL APIでDiscussionを作成
   */
  async postDiscussion(
    markdown: string,
    ctx: WeeklyContext,
    providerData: ChangelogEntry[] | ReleaseEntry[],
  ): Promise<PipelineResult<PostDiscussionData>> {
    if (ctx.dryRun) {
      const title = generateProviderWeeklyTitle(this.providerId, ctx.endDate);
      return {
        success: true,
        data: {
          id: "(dry-run)",
          url: `(dry-run) ${title}`,
          title,
        },
      };
    }

    try {
      const graphqlWithAuth = graphql.defaults({
        headers: {
          authorization: `token ${ctx.token}`,
        },
      });

      // リポジトリIDとカテゴリID、ラベル一覧を取得
      const repoData = await graphqlWithAuth<RepositoryData>(
        `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
            discussionCategories(first: 10) {
              nodes {
                id
                name
              }
            }
            labels(first: 100) {
              nodes {
                id
                name
              }
            }
          }
        }
      `,
        { owner: ctx.owner, repo: ctx.repo },
      );

      const repositoryId = repoData.repository.id;
      const category = repoData.repository.discussionCategories.nodes.find(
        (c) => c.name === ctx.categoryName,
      );

      if (!category) {
        return {
          success: false,
          error: `Category "${ctx.categoryName}" not found. Available: ${
            repoData.repository.discussionCategories.nodes
              .map((c) => c.name)
              .join(", ")
          }`,
        };
      }

      const title = generateProviderWeeklyTitle(this.providerId, ctx.endDate);

      // Discussion作成
      const result = await graphqlWithAuth<CreateDiscussionResult>(
        `
        mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: {
            repositoryId: $repositoryId
            categoryId: $categoryId
            title: $title
            body: $body
          }) {
            discussion {
              id
              url
            }
          }
        }
      `,
        {
          repositoryId,
          categoryId: category.id,
          title,
          body: markdown,
        },
      );

      const discussionId = result.createDiscussion.discussion.id;
      const discussionUrl = result.createDiscussion.discussion.url;

      console.log(`Created discussion: ${title}`);
      console.log(`URL: ${discussionUrl}`);

      // ラベル付与（元データから抽出）
      await this.addLabels(
        graphqlWithAuth,
        repositoryId,
        discussionId,
        repoData.repository.labels.nodes,
        providerData,
        ctx,
      );

      return {
        success: true,
        data: {
          id: discussionId,
          url: discussionUrl,
          title,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to post discussion: ${message}` };
    }
  }

  /**
   * ラベルを追加
   * 元データから直接ChangelogDataを構築してdetermineLabelsを使用
   */
  protected async addLabels(
    graphqlWithAuth: typeof graphql,
    repositoryId: string,
    discussionId: string,
    existingLabelsNodes: Label[],
    providerData: ChangelogEntry[] | ReleaseEntry[],
    ctx: WeeklyContext,
  ): Promise<void> {
    // 元データからChangelogDataを構築
    const changelogData = this.buildChangelogDataFromProviderData(
      providerData,
      ctx,
    );
    const labelNames = determineLabels(changelogData, {
      serviceOnly: false,
    });

    if (labelNames.length === 0) {
      return;
    }

    const existingLabels = new Map(
      existingLabelsNodes.map((l) => [l.name, l.id]),
    );

    const labelIdPromises = labelNames.map(async (name) => {
      if (existingLabels.has(name)) {
        return existingLabels.get(name)!;
      } else {
        try {
          console.log(`Label "${name}" not found. Creating it...`);
          const newLabelId = await createNewLabel(
            graphqlWithAuth,
            repositoryId,
            name,
          );
          existingLabels.set(name, newLabelId);
          return newLabelId;
        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : String(error);
          console.warn(`Warning: Failed to create label "${name}": ${message}`);
          return null;
        }
      }
    });

    const labelIdResults = await Promise.all(labelIdPromises);
    const labelIds = labelIdResults.filter((id): id is string => id !== null);

    if (labelIds.length > 0) {
      try {
        await addLabelsToDiscussion(graphqlWithAuth, discussionId, labelIds);
        console.log(`Labels added: ${labelNames.join(", ")}`);
      } catch (error) {
        console.error(
          `Failed to add labels to discussion ${discussionId}:`,
          error,
        );
      }
    }
  }

  /**
   * 元データからChangelogDataを構築
   * 派生クラスでオーバーライドしてプロバイダー固有のフィールドに設定
   */
  protected abstract buildChangelogDataFromProviderData(
    providerData: ChangelogEntry[] | ReleaseEntry[],
    ctx: WeeklyContext,
  ): ChangelogData;
}
