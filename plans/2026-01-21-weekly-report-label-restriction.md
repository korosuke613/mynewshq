# 週次レポートのDiscussionラベルをサービス名のみに制限する

## 背景
週次レポート作成時、**GitHubのDiscussionラベル機能**に付与されるラベルをサービス名（`github`, `aws`, `claude-code`, `linear`）のみにしたい。

**変更しないもの:**
- Markdown本文内のインラインタグ（`Improvement` `copilot` など）は引き続き表示

**変更するもの:**
- Discussionラベル: サブカテゴリラベル（`gh:Improvement`, `aws:s3` など）を週次では付与しない

## 現状分析
- `scripts/create-discussion.ts` の `determineLabels` 関数（143-174行目）でDiscussionラベルを決定
- 現在は日次・週次両方で同じロジックを使用
- 週次では1週間分のエントリを集約するため、サブカテゴリラベルが大量に付与されノイズになる

## 修正方針

### 変更ファイル
- `scripts/create-discussion.ts`
- `scripts/create-discussion_test.ts`

### 変更内容

#### 1. `determineLabels` 関数にオプションパラメータを追加（143行目付近）
```typescript
export function determineLabels(
  data: ChangelogData,
  options?: { serviceOnly?: boolean },
): string[]
```
- `serviceOnly: true` の場合、サービス名ラベルのみを返す
- デフォルトは `false`（後方互換性維持）

#### 2. `createDiscussion` 関数で週次モード判定を追加（418行目付近）
```typescript
// 変更前
const labelNames = determineLabels(changelogData);

// 変更後
const isWeekly = !!(changelogData.startDate && changelogData.endDate);
const labelNames = determineLabels(changelogData, { serviceOnly: isWeekly });
```

#### 3. テスト追加（`create-discussion_test.ts`）
- `serviceOnly: true` オプションのテストケースを追加
- サブカテゴリラベルが含まれないことを確認

## 検証方法
1. `deno task test` でテスト実行
2. `deno task preview-weekly` で週次レポートのラベルを確認（オプション）
