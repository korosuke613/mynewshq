# Discussion投稿にメンションを追加する

## 概要
GitHub Discussionsが作成されてもモバイル通知が来ないため、投稿本文に `@korosuke613` メンションを追加して通知を受け取れるようにする。

## 変更対象ファイル
- `scripts/create-discussion.ts`
- `scripts/preview-discussion.ts`
- `deno.json`

## 実装内容

### scripts/create-discussion.ts

```typescript
// 変更前
const body = summary || generateDefaultBody(changelogData);

// 変更後
const mentionUser = Deno.env.get("MENTION_USER") || "korosuke613";
const mention = `\n\n---\ncc: @${mentionUser}`;
const body = (summary || generateDefaultBody(changelogData)) + mention;
```

### scripts/preview-discussion.ts

```typescript
// デフォルトボディを生成
const body = generateDefaultBody(data);
const mentionUser = Deno.env.get("MENTION_USER") || "korosuke613";
const mention = `\n\n---\ncc: @${mentionUser}`;
const bodyWithMention = body + mention;
```

### deno.json

```json
"preview": "deno run --allow-read --allow-write --allow-env scripts/preview-discussion.ts"
```

### フォーマットの説明
- `\n\n---\n` で視覚的な区切りを入れ、要約本文とメンションを分離
- `cc:` プレフィックスで通知目的のメンションであることを明示
- 環境変数 `MENTION_USER` でメンション先をカスタマイズ可能（デフォルト: korosuke613）

## 検証手順
1. `deno task test` - 既存テストが通ることを確認
2. `deno fmt --check` - フォーマットチェック
3. `deno lint` - Lintチェック
4. `deno task preview` - プレビューで出力を目視確認（メンションが末尾に追加されていること）
