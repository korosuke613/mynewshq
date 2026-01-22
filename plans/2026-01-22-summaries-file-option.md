# ワークフローJSON受け渡し問題の修正計画

## 問題

Daily/Weekly Changelog ワークフローで、Claude Code Action の `structured_output` をシェル変数経由で `deno task post` に渡すと、要約テキストに含まれる特殊文字（バッククォート、括弧など）が原因で `JSON.parse` が失敗することがある。

### 失敗例（Discussion #48）
```
Failed to parse summaries JSON: SyntaxError: Expected ',' or '}' after property value in JSON at position 1136
Falling back to default body generation
```

### 原因
```yaml
# シェル変数に代入（シングルクォート）
SUMMARIES_JSON='${{ steps.summarize.outputs.structured_output }}'

# ダブルクォートで展開して渡す
deno task post --summaries-json="$SUMMARIES_JSON"
```

要約テキストにバッククォート（`` `gh copilot` ``）などが含まれると、シェル展開時にJSONが壊れる。

## 解決策

JSONをファイル経由で渡すように変更する。

### 新しいフロー
```
Claude Code structured_output
→ JSONをファイルに書き出し
→ deno task post --summaries-file=/tmp/summaries.json
→ Deno.readTextFile() で読み込み
→ JSON.parse()
```

## 修正ファイル

### 1. scripts/create-discussion.ts
- `--summaries-file` オプションを追加
- ファイルからJSONを読み込む処理を追加

```typescript
// parseArgs に追加
const summariesFileArg = args.find((arg) =>
  arg.startsWith("--summaries-file=")
);
let summariesFile: string | undefined;
if (summariesFileArg) {
  summariesFile = summariesFileArg.substring("--summaries-file=".length);
}

// main 関数に追加
let summariesJson: string | undefined;
if (summariesFile) {
  summariesJson = await Deno.readTextFile(summariesFile);
}
```

### 2. .github/workflows/daily-changelog.yml
```yaml
- name: Post to Discussion
  run: |
    # JSONをファイルに書き出し
    echo '${{ steps.summarize.outputs.structured_output }}' > /tmp/summaries.json

    # ファイルパスで渡す
    if [ -s /tmp/summaries.json ] && [ "$(cat /tmp/summaries.json)" != "null" ]; then
      deno task post --date=${{ steps.fetch.outputs.target_date }} --summaries-file=/tmp/summaries.json korosuke613 mynewshq Daily
    else
      deno task post --date=${{ steps.fetch.outputs.target_date }} korosuke613 mynewshq Daily
    fi
```

### 3. .github/workflows/weekly-changelog.yml
同様の修正を適用。

## 実装手順

- [ ] 1. `scripts/create-discussion.ts` に `--summaries-file` オプションを追加
- [ ] 2. `deno.json` の post タスクに `--allow-read` が含まれていることを確認
- [ ] 3. `.github/workflows/daily-changelog.yml` を修正
- [ ] 4. `.github/workflows/weekly-changelog.yml` を修正
- [ ] 5. ローカルでテスト（プレビューコマンド）
- [ ] 6. コミット＆PR作成
- [ ] 7. プランファイルをリネーム

## 検証方法

### ローカルテスト
```bash
# テスト用のJSONファイルを作成
echo '{"github":{},"aws":{"https://example.com":"テスト `バッククォート` 含む"},"claudeCode":{},"linear":{}}' > /tmp/test-summaries.json

# --summaries-file オプションでプレビュー
deno task preview --date=2026-01-22 --summaries-file=/tmp/test-summaries.json
```

### CI確認
- PR作成後、Quality Check が通ることを確認
- マージ後、次回の Daily Changelog 実行で要約が正しく表示されることを確認

## 後方互換性

- `--summaries-json` オプションは引き続きサポート（既存のスクリプトとの互換性）
- `--summaries-file` が推奨オプションになる
