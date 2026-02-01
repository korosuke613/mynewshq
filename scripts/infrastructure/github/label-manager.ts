// GitHub ラベル管理ユーティリティ
// ラベル作成とDiscussionへのラベル追加を提供

import { graphql } from "@octokit/graphql";

// アクセシブルなラベル色のリスト
export const ACCESSIBLE_LABEL_COLORS: string[] = [
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

/**
 * ランダムなアクセシブルカラーを取得
 * @returns 16進数カラーコード
 */
export function getRandomAccessibleColor(): string {
  const index = Math.floor(Math.random() * ACCESSIBLE_LABEL_COLORS.length);
  return ACCESSIBLE_LABEL_COLORS[index];
}

/**
 * 新しいラベルを作成
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param repositoryId - リポジトリID
 * @param name - ラベル名
 * @param color - オプションのカラーコード（指定しない場合はランダム）
 * @returns 作成されたラベルのID
 */
export async function createLabel(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  name: string,
  color?: string,
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
      color: color ?? getRandomAccessibleColor(),
    },
  );
  return createLabel.label.id;
}

/**
 * Discussionにラベルを追加
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param discussionId - DiscussionID
 * @param labelIds - ラベルIDの配列
 */
export async function addLabelsToDiscussion(
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
 * 存在しないラベルを作成し、全てのラベルIDを取得
 * @param graphqlWithAuth - 認証済みGraphQLクライアント
 * @param repositoryId - リポジトリID
 * @param existingLabels - 既存ラベルのMap (name -> id)
 * @param labelNames - 必要なラベル名の配列
 * @returns ラベルIDの配列
 */
export async function ensureLabelsExist(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  existingLabels: Map<string, string>,
  labelNames: string[],
): Promise<string[]> {
  const labelIdPromises = labelNames.map(async (name) => {
    if (existingLabels.has(name)) {
      return existingLabels.get(name)!;
    } else {
      try {
        console.log(`Label "${name}" not found. Creating it...`);
        const newLabelId = await createLabel(
          graphqlWithAuth,
          repositoryId,
          name,
        );
        existingLabels.set(name, newLabelId);
        return newLabelId;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to create label "${name}": ${message}`);
        return null;
      }
    }
  });

  const labelIdResults = await Promise.all(labelIdPromises);
  return labelIdResults.filter((id): id is string => id !== null);
}
