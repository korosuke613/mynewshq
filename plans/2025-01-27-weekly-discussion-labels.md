# 週次Discussionにラベルを付与する

## 問題点

`createProviderWeeklyDiscussion()` にはラベル付与処理が実装されていない。
日次の `createDiscussion()` にはラベル付与処理があり、正常に動作している（568-646行目）。

## 解決策

日次と同じ仕組みを再利用する。ラベル付与処理をヘルパー関数として抽出し、両方で使用する。

---

## 実装計画

### 変更ファイル

- `scripts/create-discussion.ts`

### 変更内容

#### 1. ラベル付与処理をヘルパー関数として抽出

`createDiscussion()`の568-646行目にあるラベル付与処理を新しい関数`applyLabelsToDiscussion()`として抽出。

```typescript
async function applyLabelsToDiscussion(
  graphqlWithAuth: typeof graphql,
  repositoryId: string,
  discussionId: string,
  existingLabels: Map<string, string>,
  labelNames: string[],
): Promise<void> {
  if (labelNames.length === 0) return;

  // 既存のラベル付与ロジック（568-646行目の処理）
  // ...
}
```

#### 2. `createDiscussion()`からヘルパーを呼び出し

```typescript
if (changelogData) {
  const isWeekly = !!(changelogData.startDate && changelogData.endDate);
  const labelNames = determineLabels(changelogData, { serviceOnly: isWeekly });
  const existingLabels = new Map(
    repoData.repository.labels.nodes.map((l) => [l.name, l.id])
  );
  await applyLabelsToDiscussion(
    graphqlWithAuth, repositoryId, discussionId, existingLabels, labelNames
  );
}
```

#### 3. `createProviderWeeklyDiscussion()`からヘルパーを呼び出し

- GraphQLクエリにラベル取得を追加
- 単一プロバイダー用の`ChangelogData`を構築し、`determineLabels()`を呼び出す
- サブカテゴリラベル（`gh:copilot`等）も含めるため`serviceOnly: false`で呼び出す

```typescript
// GraphQLクエリにlabels追加
labels(first: 100) { nodes { id, name } }

// Discussion作成後
// 単一プロバイダーのChangelogDataを構築
const singleProviderData: ChangelogData = {
  date: endDate,
  startDate,
  endDate,
  github: providerId === "github" ? providerData as ChangelogEntry[] : [],
  aws: providerId === "aws" ? providerData as ChangelogEntry[] : [],
  claudeCode: providerId === "claudeCode" ? providerData as ReleaseEntry[] : [],
  linear: providerId === "linear" ? providerData as ChangelogEntry[] : [],
};

// serviceOnly: false でサブカテゴリラベルも含める
const labelNames = determineLabels(singleProviderData, { serviceOnly: false });
const existingLabels = new Map(
  repoData.repository.labels.nodes.map((l) => [l.name, l.id])
);
await applyLabelsToDiscussion(
  graphqlWithAuth, repositoryId, discussionId, existingLabels, labelNames
);
```

**付与されるラベルの例:**
- GitHub週次: `["github", "gh:copilot", "gh:actions", ...]`
- AWS週次: `["aws", "aws:lambda", "aws:s3", ...]`
- Claude Code週次: `["claude-code"]`（サブカテゴリなし）
- Linear週次: `["linear"]`（サブカテゴリなし）

---

## TODO

- [ ] `createProviderWeeklyDiscussion`のGraphQLクエリにラベル取得を追加
- [ ] Discussion作成後にプロバイダーのラベルを付与する処理を追加
- [ ] プランファイルをリネーム

---

## 検証方法

1. ローカルでプレビュー実行して型エラーがないことを確認
   ```bash
   deno check scripts/*.ts scripts/**/*.ts
   ```

2. テスト実行
   ```bash
   deno task test
   ```

3. GitHub Actionsで週次ワークフローを手動実行し、Discussionにラベルが付与されることを確認
