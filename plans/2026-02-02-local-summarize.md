# ローカル要約生成用 deno task summarize の実装

## 目的

Claude Code CLIを使ってローカルで要約JSONを生成する専用タスクを追加し、GitHub Actionsを使わずに完全なワークフロー（データ取得→要約生成→プレビュー→投稿）をローカルで実行可能にする。

## コマンド仕様

```bash
# 日次Changelog要約
deno task summarize --date=2026-01-15

# 日次Blog要約
deno task summarize --date=2026-01-15 --category=blog

# 出力先指定
deno task summarize --date=2026-01-15 --output=/tmp/summaries.json

# ドライラン（CLIを呼び出さずプロンプト確認）
deno task summarize --date=2026-01-15 --dry-run
```

## 新規作成ファイル

### 1. `scripts/infrastructure/claude-cli.ts`
Claude Code CLI実行ユーティリティ

```typescript
// 主要な関数
export async function executeClaudeCli(options: {
  prompt: string;
  jsonSchema: object;
  timeout?: number;
}): Promise<{ success: boolean; output?: string; error?: string }>;

export async function isClaudeCliAvailable(): Promise<boolean>;
```

### 2. `scripts/domain/summarize/prompts.ts`
プロンプトとJSONスキーマ定義（GitHub Actionsワークフローから抽出）

```typescript
// 日次Changelog
export function getDailyChangelogPrompt(filePath: string): string;
export const DAILY_CHANGELOG_SCHEMA: object;

// 日次Blog
export function getDailyBlogPrompt(filePath: string): string;
export const DAILY_BLOG_SCHEMA: object;
```

### 3. `scripts/summarize.ts`
メインエントリポイント

**フロー**:
1. CLI引数パース（date, category, output, dry-run）
2. データファイル存在確認
3. dry-runならプロンプト表示して終了
4. Claude CLI利用可能性チェック
5. Claude CLI実行
6. 結果を標準出力またはファイルに出力

## 修正ファイル

### `deno.json`
```json
{
  "tasks": {
    "summarize": "deno run --allow-read --allow-write --allow-run --allow-env scripts/summarize.ts"
  }
}
```

## 使用例

```bash
# 1. データ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch --date=2026-01-15

# 2. 要約生成
deno task summarize --date=2026-01-15 --output=/tmp/summaries.json

# 3. プレビュー
deno task preview --date=2026-01-15 --summaries-file=/tmp/summaries.json

# 4. 投稿（dry-run）
deno run --allow-read --allow-env scripts/create-discussion.ts --date=2026-01-15 --summaries-file=/tmp/summaries.json --dry-run
```

## 実装スコープ

**Phase 1（今回）**: 日次のみ（`--category=changelog` / `--category=blog`）
**Phase 2（将来）**: 週次サポート（`--weekly --provider=xxx`）

週次は過去Discussion参照など複雑なため、日次の動作確認後に追加。

## エラーハンドリング

| エラー | メッセージ |
|--------|-----------|
| CLIなし | `Error: Claude Code CLI is not installed. Install: npm install -g @anthropics/claude-code` |
| データなし | `Error: Data file not found: ... Hint: Run 'deno task fetch --date=...' first` |
| タイムアウト | `Error: Claude Code CLI timed out after 5 minutes` |

## 検証方法

```bash
# 1. ドライラン確認
deno task summarize --date=2026-01-24 --dry-run

# 2. 実際の要約生成（Claude Code CLIが必要）
deno task summarize --date=2026-01-24 --output=/tmp/test.json

# 3. previewとの連携確認
deno task preview --date=2026-01-24 --summaries-file=/tmp/test.json

# 4. テスト実行
deno task test
```

## TODO

- [ ] `scripts/infrastructure/claude-cli.ts` を作成
- [ ] `scripts/domain/summarize/prompts.ts` を作成
- [ ] `scripts/summarize.ts` を作成
- [ ] `deno.json` にタスク追加
- [ ] ドライラン動作確認
- [ ] Claude Code CLI連携テスト
- [ ] プランファイルを `./plans/2026-02-02-local-summarize.md` にリネーム
