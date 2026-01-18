# Discussion投稿にメンションを追加する

## 概要
GitHub Discussionsが作成されてもモバイル通知が来ないため、投稿本文に `@korosuke613` メンションを追加して通知を受け取れるようにする。

## 変更対象ファイル
- `scripts/create-discussion.ts`

## 実装内容

### 変更箇所: 289行目付近

```typescript
// 変更前
const body = summary || generateDefaultBody(changelogData);

// 変更後
const mention = "\n\n---\ncc: @korosuke613";
const body = (summary || generateDefaultBody(changelogData)) + mention;
```

### フォーマットの説明
- `\n\n---\n` で視覚的な区切りを入れ、要約本文とメンションを分離
- `cc:` プレフィックスで通知目的のメンションであることを明示

## 検証手順
1. `deno task test` - 既存テストが通ることを確認
2. `deno fmt --check` - フォーマットチェック
3. `deno lint` - Lintチェック
4. `deno task preview` - プレビューで出力を目視確認（メンションが末尾に追加されていること）
