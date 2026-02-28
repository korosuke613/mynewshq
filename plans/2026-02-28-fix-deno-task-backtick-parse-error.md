# Fix: `deno task` バッククォートパースエラーの修正

## 問題

`discussion-claude-answer.yml` の `Post reply to Discussion` ステップで、Claudeの回答（Markdownバッククォート含む）を `deno task reply-discussion` のCLI引数として渡すと、Denoタスクランナーの内部シェルパーサーがバッククォートをコマンド置換として解釈しパースエラーが発生する。

```
error: Error parsing script 'reply-discussion'.
Caused by: Failed parsing backticks in double quoted string.
```

## 根本原因

- `deno task` は追加引数をタスクスクリプトに結合し、独自シェルパーサーで再パースする
- Bashの `"$BODY"` 展開ではバッククォートは再解釈されないが、Denoのパーサーでは解釈される
- Claudeの回答にMarkdownコードブロック（`` ` ``）が含まれると発生

## 修正方針

`deno task` を介さず `deno run` を直接使用し、Denoシェルパーサーの介在を排除する。

## 修正対象

### `.github/workflows/discussion-claude-answer.yml` (行 122-125)

変更前:
```yaml
deno task reply-discussion ${{ inputs.discussion_number }} "$BODY" "$COMMENT_ID"
# ...
deno task reply-discussion ${{ inputs.discussion_number }} "$BODY"
```

変更後:
```yaml
deno run --allow-net --allow-env scripts/reply-discussion.ts ${{ inputs.discussion_number }} "$BODY" "$COMMENT_ID"
# ...
deno run --allow-net --allow-env scripts/reply-discussion.ts ${{ inputs.discussion_number }} "$BODY"
```

## 修正不要の確認

- `discussion-claude-mention.yml`: `gh workflow run --field` 経由のため影響なし
- `scripts/reply-discussion.ts`: 引数受け取りロジック変更不要
- `deno.json`: タスク定義は残す（ローカル実行用）

## 検証

1. `deno check scripts/reply-discussion.ts` で型チェック
2. Discussionで `@claude` メンションし、バッククォート含む回答が正常に投稿されることを確認
