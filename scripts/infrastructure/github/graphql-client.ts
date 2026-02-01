// GitHub GraphQL クライアントユーティリティ
// GraphQL型定義と共通操作を提供

import { graphql } from "@octokit/graphql";

// GraphQL API用の型定義

export interface DiscussionCategory {
  id: string;
  name: string;
}

export interface Label {
  id: string;
  name: string;
}

export interface RepositoryData {
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

export interface CreateDiscussionResult {
  createDiscussion: {
    discussion: {
      id: string;
      url: string;
    };
  };
}

export interface AddLabelsResult {
  addLabelsToLabelable: {
    labelable: {
      labels: {
        nodes: Label[];
      };
    };
  };
}

export interface CloseDiscussionResult {
  closeDiscussion: {
    discussion: {
      id: string;
      closed: boolean;
    };
  };
}

/**
 * 認証済みGraphQLクライアントを作成
 * @param token - GitHub Personal Access Token
 * @returns 認証済みgraphql関数
 */
export function createAuthenticatedGraphQLClient(
  token: string,
): typeof graphql {
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}

/**
 * リポジトリ情報（ID、カテゴリ、ラベル）を取得
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @returns RepositoryData
 */
export async function fetchRepositoryData(
  graphqlWithAuth: typeof graphql,
  owner: string,
  repo: string,
): Promise<RepositoryData> {
  return await graphqlWithAuth<RepositoryData>(
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
    { owner, repo },
  );
}

/**
 * Discussionを作成
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param repositoryId - リポジトリID
 * @param categoryId - カテゴリID
 * @param title - Discussionタイトル
 * @param body - Discussion本文
 * @returns CreateDiscussionResult
 */
export async function createDiscussion(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  categoryId: string,
  title: string,
  body: string,
): Promise<CreateDiscussionResult> {
  return await graphqlWithAuth<CreateDiscussionResult>(
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
    { repositoryId, categoryId, title, body },
  );
}

/**
 * Discussionをクローズ
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param discussionId - DiscussionID
 * @returns CloseDiscussionResult
 */
export async function closeDiscussion(
  graphqlWithAuth: typeof graphql,
  discussionId: string,
): Promise<CloseDiscussionResult> {
  return await graphqlWithAuth<CloseDiscussionResult>(
    `
    mutation($discussionId: ID!) {
      closeDiscussion(input: { discussionId: $discussionId }) {
        discussion {
          id
          closed
        }
      }
    }
  `,
    { discussionId },
  );
}
