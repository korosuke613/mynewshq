# Fix: Discussion スレッド内コメントへの返信失敗を修正

## 問題

Discussion の Level 2 コメント（スレッド内返信）で `@claude` メンションすると、`reply-discussion.ts` がそのコメントの `node_id` を `replyToId` として使用し、GitHub GraphQL API が `"Parent comment is already in a thread, cannot reply to it"` エラーを返す。

GitHub Discussions は2階層のみサポート:
- Level 1: トップレベルコメント（スレッドルート）→ 返信可能
- Level 2: スレッド内返信 → これへの返信は API が拒否

## 修正方針

`reply-discussion.ts` に事前チェックロジックを追加。`replyToId` が Level 2 コメントの場合、親（Level 1）コメントの ID に自動解決する。ワークフロー側の変更は不要。

## 修正対象ファイル

### 1. `scripts/reply-discussion.ts`

#### a. GraphQL クエリ追加（47行目の後）

```graphql
query GetCommentParent($id: ID!) {
  node(id: $id) {
    ... on DiscussionComment {
      replyTo { id }
    }
  }
}
```

#### b. 型定義追加

```typescript
interface GetCommentParentResult {
  node: {
    replyTo: { id: string } | null;
  } | null;
}
```

#### c. `resolveReplyToId` 関数を新設・export

```typescript
export async function resolveReplyToId(
  graphqlWithAuth: typeof graphql,
  replyToId: string,
): Promise<string> {
  try {
    const result = await graphqlWithAuth<GetCommentParentResult>(
      GET_COMMENT_PARENT_QUERY,
      { id: replyToId },
    );
    if (result.node?.replyTo) {
      console.log(
        `Comment ${replyToId} is a threaded reply. Using parent comment ${result.node.replyTo.id} as replyToId.`,
      );
      return result.node.replyTo.id;
    }
    return replyToId;
  } catch (error) {
    console.warn(`Warning: Failed to resolve replyToId ${replyToId}, using original value:`, error);
    return replyToId;
  }
}
```

#### d. `replyToDiscussion` 関数内に呼び出しを追加（78行目の前）

```typescript
let resolvedReplyToId = replyToId;
if (replyToId) {
  resolvedReplyToId = await resolveReplyToId(graphqlWithAuth, replyToId);
}
```

以降 `replyToId` の代わりに `resolvedReplyToId` を使用。

### 2. `scripts/reply-discussion_test.ts`（新規作成）

`resolveReplyToId` のユニットテスト:
1. Level 1 コメント（`replyTo: null`）→ 元の ID を返す
2. Level 2 コメント（`replyTo.id` あり）→ 親の ID を返す
3. node が null → 元の ID を返す（フォールバック）
4. GraphQL エラー → 元の ID を返す（フォールバック）

## 変更不要の確認

| ファイル | 理由 |
|--------|------|
| `discussion-claude-mention.yml` | スクリプト側で解決 |
| `discussion-claude-answer.yml` | スクリプト側で解決 |
| `deno.json` | タスク定義変更不要 |

## 検証手順

1. `deno test scripts/reply-discussion_test.ts` — ユニットテスト実行
2. `deno check scripts/reply-discussion.ts` — 型チェック
3. `deno lint && deno fmt` — コード品質
4. Discussion の Level 1 コメントで `@claude` → 従来通りスレッドに返信
5. Discussion の Level 2 コメントで `@claude` → 親 Level 1 のスレッドに返信（修正後の動作）
