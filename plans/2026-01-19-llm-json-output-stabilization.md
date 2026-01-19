# LLM 要約の JSON 出力化による出力安定化

## 問題

Discussion #19 で以下の問題が発生:
1. **GitHub Changelog のラベルが見出しについていない** - JSONにはラベル情報があるが、LLM生成の要約では表示されていない
2. **mute words が無視されている可能性** - `muted: true` のエントリがスキップされていない

**根本原因**: LLM に全体の Markdown 出力を任せているため、出力にブレが生じやすい

## 解決策

**Claude Code Action の `--json-schema` オプションで構造化出力を取得し、テンプレートへの埋め込みはコードで行う**

### 新しいフロー

```
[1] fetch-changelogs.ts → data/changelogs/YYYY-MM-DD.json
                              ↓
[2] Claude Code Action (--json-schema) → structured_output（要約JSON）
                              ↓
[3] deno task post --summaries-json='${{ steps.claude.outputs.structured_output }}'
                              ↓
    create-discussion.ts が changelog + 要約データを結合して Markdown 生成
```

**ポイント**: ファイル経由ではなく、GitHub Actions の outputs で直接 JSON を受け渡し

### 要約 JSON フォーマット

**キーには URL を使用**（タイトルだと LLM の出力ブレでマッチしない可能性があるため）

```json
{
  "github": {
    "https://github.blog/changelog/2026-01-14-copilot-sdk-in-technical-preview": "要約文...",
    "https://github.blog/changelog/2026-01-14-github-copilot-cli-...": "要約文..."
  },
  "aws": { "https://aws.amazon.com/...": "要約文..." },
  "claudeCode": { "https://github.com/.../releases/...": "要約文..." },
  "linear": { "https://linear.app/changelog/...": "要約文..." }
}
```

## 変更ファイル

### 1. `scripts/create-discussion.ts`

**変更内容:**
- `SummaryData` インターフェース追加（`Record<string, string>` 形式、キーは URL）
- `parseArgs()` に `--summaries-json` オプション追加（JSON 文字列を直接受け取る）
- `generateBodyWithSummaries(data, summaries)` 関数追加
- `main()` で要約 JSON パースと新関数の呼び出し

**ポイント:**
- ラベル処理・muted 処理は既存の `generateDefaultBody()` と同じロジックを使用
- 後方互換性のため従来の summary 引数も維持
- URL でマッチングするため、タイトルのブレに影響されない

### 2. `.github/workflows/daily-changelog.yml`

**2ステップ構成に変更:**

```yaml
- name: Generate summaries with Claude Code
  id: summarize
  uses: anthropics/claude-code-action@v1
  with:
    claude_args: |
      -p
      --json-schema '{"type":"object","properties":{"github":{"type":"object","additionalProperties":{"type":"string"}},"aws":{"type":"object","additionalProperties":{"type":"string"}},"claudeCode":{"type":"object","additionalProperties":{"type":"string"}},"linear":{"type":"object","additionalProperties":{"type":"string"}}}}'
    prompt: |
      data/changelogs/YYYY-MM-DD.json を読み込み、各エントリの要約を生成してください。
      - muted: true のエントリはスキップ
      - キーはエントリの URL
      - 値は2-3文の日本語要約

- name: Post to Discussion
  run: |
    deno task post --summaries-json='${{ steps.summarize.outputs.structured_output }}'
```

**ポイント:**
- Step 1: `--json-schema` で構造化出力を取得（`structured_output` に格納）
- Step 2: `deno task post` で Discussion 投稿（JSON を引数で渡す）

### 3. `scripts/create-discussion_test.ts`

**追加テスト:**
- 要約付き Markdown の正しい生成
- ラベルの表示確認（`\`Release\` \`copilot\`` 形式）
- muted エントリの除外確認
- URL によるマッチング確認

## 利点

| 観点 | 説明 |
|------|------|
| 出力の安定性 | Markdown 構造はコードで生成されるため、ラベルや muted 処理が確実 |
| 責務の分離 | LLM は「要約生成」、コードは「フォーマット」と役割が明確 |
| テスト可能性 | `generateBodyWithSummaries` を単体テストできる |
| 後方互換性 | 従来の summary 引数も引き続き動作 |

## 注意点

| 観点 | 対策 |
|------|------|
| JSON パースエラー | LLM が不正な JSON を出力した場合のエラーハンドリングを実装 |
| 要約の欠落 | 要約がないエントリは要約なしで表示（フォールバック） |
| URL の正規化 | `normalizeUrl()` 関数で破損URLを自動修正（下記参照） |

### URL 正規化機能

AWS RSSフィードで稀に発生するURL破損（`.com` の後の `/` が欠落）を自動修正する機能を実装。

**問題の例:**
- 破損URL: `https://aws.amazon.comabout-aws/whats-new/...`
- 正常URL: `https://aws.amazon.com/about-aws/whats-new/...`

**実装:**
- `scripts/fetch-changelogs.ts` に `normalizeUrl()` 関数を追加
- `fetchAWSChangelog()` でURL取得時に正規化を適用
- 正規表現 `/\.com([a-z])/i` で `.com` 直後のアルファベットを検出し `/` を挿入

## 検証方法

1. 単体テスト実行: `deno task test`
2. `workflow_dispatch` で手動実行
3. Discussion の出力を確認:
   - ラベルが `### [タイトル](URL) \`Release\` \`copilot\`` 形式で表示されているか
   - muted エントリが折りたたみセクションに表示されているか
   - 要約が `**要約**: ...` 形式で表示されているか
