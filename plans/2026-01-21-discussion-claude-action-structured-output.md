# Discussion Claude Action: Structured Output方式への変更

## 背景・問題

GitHub Actions run #21115881102, #21200229923 で、Discussion回答機能が動作しなかった。

### 原因分析

Claude Code Actionの許可設定 `Bash(deno task reply-discussion *)` が、以下のコマンドパターンにマッチしなかった：

1. `deno task reply-discussion 9 "$(cat claude_answer.md)"` - サブシェル展開 `$(...)` が問題
2. `cat > claude_answer.md << 'EOF'...EOF` - ヒアドキュメントが問題
3. `deno run --allow-net --allow-env scripts/reply-discussion.ts ...` - `deno task` ではない

許可パターンを `Bash(cat *)` に拡張しても、シェルの特殊構文（サブシェル展開、パイプなど）を含むコマンドはマッチしない。

## 解決策

daily-changelog / weekly-changelog ワークフローと同じ方式に変更：

1. **Claude Code Action**: Bashコマンドを実行せず、structured output (`--json-schema`) で回答を生成
2. **次のステップ**: その出力を使って `deno task reply-discussion` を実行

この方式なら、Claude Code Actionに特別なBash許可を与える必要がない。

## 変更内容

### `.github/workflows/discussion-claude-answer.yml`

#### Before
```yaml
- name: Answer with Claude Code
  uses: anthropics/claude-code-action@v1
  with:
    settings: |
      {
        "permissions": {
          "allow": ["Bash(deno task reply-discussion *)", "Bash(cat *)", "Read", "Write", "WebFetch", "WebSearch"]
        }
      }
    prompt: |
      ...
      必ず最後のコマンドを実行して回答を投稿してください。
```

#### After
```yaml
- name: Answer with Claude Code
  id: answer
  uses: anthropics/claude-code-action@v1
  with:
    settings: |
      {
        "permissions": {
          "allow": ["Read", "WebFetch", "WebSearch"]
        }
      }
    claude_args: >-
      --json-schema '{"type":"object","properties":{"answer":{"type":"string"}},"required":["answer"]}'
    prompt: |
      ...
      回答を `answer` フィールドに格納してください。

- name: Post reply to Discussion
  run: |
    ANSWER='${{ steps.answer.outputs.structured_output }}'
    BODY=$(echo "$ANSWER" | jq -r '.answer')
    deno task reply-discussion ${{ inputs.discussion_number }} "$BODY"
```

### `scripts/reply-discussion.ts`

引数チェックのバグ修正（前回のPRでマージ済み）：
- `args.length < 3` → `args.length !== 2 && args.length !== 4`
- 2引数パターン `<discussion-number> <body>` を正しく受け入れる

## 許可するツール

- `Read` - リポジトリ内のファイル読み込み（changelogs等）
- `WebFetch` - 外部URLの内容取得
- `WebSearch` - Web検索

Bashコマンドは許可しない（次ステップで実行するため不要）。

## テスト方法

1. PRをマージ
2. Discussionで `@claude` メンションして質問
3. 回答がDiscussionに投稿されることを確認
