# Discussion作成時の自動ラベル付与機能

## 概要

changelogデータの内容に応じて、Discussion作成時に適切なラベル（`github`, `aws`, `claude-code`）を自動付与する。

## 背景

- `createDiscussion` mutationはラベルを直接指定できない（GitHub API制限）
- Discussion作成後に `addLabelsToLabelable` mutationでラベルを追加する2段階プロセスが必要

## 実装計画

### 1. インターフェース追加 (`scripts/create-discussion.ts:15-30`)

```typescript
interface Label {
  id: string;
  name: string;
}
```

`RepositoryData`インターフェースに`labels`フィールドを追加。
`CreateDiscussionResult`に`id`フィールドを追加。

### 2. リポジトリ情報取得クエリ更新 (`scripts/create-discussion.ts:70-84`)

既存クエリに`labels(first: 100)`を追加してラベル一覧を取得。

### 3. ラベル判定関数追加

```typescript
export function determineLabels(data: ChangelogData): string[] {
  const labels: string[] = [];
  if (data.github?.length > 0) labels.push("github");
  if (data.aws?.length > 0) labels.push("aws");
  if (data.claudeCode?.length > 0) labels.push("claude-code");
  return labels;
}
```

### 4. ラベル付与関数追加

`addLabelsToDiscussion`関数を追加し、`addLabelsToLabelable` mutationを実行。

### 5. createDiscussion関数更新 (`scripts/create-discussion.ts:54-126`)

- 引数に`changelogData?: ChangelogData`を追加
- Discussion作成後にIDを取得
- `determineLabels`でラベル名を決定
- ラベルIDにマッピングしてラベル付与

### 6. main関数更新 (`scripts/create-discussion.ts:177-184`)

`createDiscussion`呼び出し時に`changelogData`を渡す。

### 7. テスト追加 (`scripts/create-discussion_test.ts`)

`determineLabels`関数のテストを追加。

## 変更対象ファイル

- `scripts/create-discussion.ts` - メイン実装
- `scripts/create-discussion_test.ts` - テスト追加

## 検証方法

1. `deno task test` でテスト実行
2. `deno task lint` と `deno task fmt:check` で品質チェック
3. 実際にDiscussion作成して動作確認（手動）
