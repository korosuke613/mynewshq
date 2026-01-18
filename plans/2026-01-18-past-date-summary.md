# 過去の日付のサマリー作成機能

## 要件

- 過去の日付でデータ収集（fetch）とサマリー生成・投稿の両方を実行可能にする
- GitHub Actions手動実行とローカルCLIの両方で日付指定をサポート

## 実装方針

**オプション引数（フラグ方式）を採用**

理由：
- `create-discussion.ts`は既に4つの位置引数を使用しており、追加すると複雑化
- `--date=YYYY-MM-DD` のようなフラグは明示的で可読性が高い
- 既存の呼び出しとの後方互換性を維持

## 変更対象ファイル

### 1. scripts/fetch-changelogs.ts

**変更内容:**
- `parseArgs()` で `--date=YYYY-MM-DD` をパース
- `targetDate` を各fetch関数に渡す
- `isRecent()` の `now` 引数に `targetDate` の翌日を渡す（指定日から24時間以内を取得）
- 出力ファイル名に `targetDate` を使用

```typescript
// 追加する関数
function parseDate(args: string[]): Date {
  const dateArg = args.find(arg => arg.startsWith("--date="));
  if (dateArg) {
    const dateStr = dateArg.split("=")[1];
    return new Date(dateStr + "T23:59:59Z"); // 指定日の終わりを基準に
  }
  return new Date();
}
```

### 2. scripts/create-discussion.ts

**変更内容:**
- `--date=YYYY-MM-DD` をパースして日付を取得
- 指定された日付の changelog JSON を読み込む
- 既存の位置引数の順序は維持

```typescript
// 変更箇所
function getTargetDate(args: string[]): string {
  const dateArg = args.find(arg => arg.startsWith("--date="));
  if (dateArg) {
    return dateArg.split("=")[1];
  }
  return new Date().toISOString().split("T")[0];
}

// main()内で
const targetDate = getTargetDate(Deno.args);
const changelogPath = `data/changelogs/${targetDate}.json`;
```

### 3. .github/workflows/daily-changelog.yml

**変更内容:**
- `workflow_dispatch` に `inputs.date` を追加
- スクリプト呼び出し時に `--date` 引数を渡す
- プロンプトで日付を指定

```yaml
on:
  workflow_dispatch:
    inputs:
      date:
        description: '対象日付 (YYYY-MM-DD形式、空欄で今日)'
        required: false
        type: string
```

### 4. deno.json（変更不要）

タスク定義はそのまま。引数は呼び出し側で渡す：
```bash
deno task fetch -- --date=2026-01-15
deno task post -- --date=2026-01-15 korosuke613 mynewshq General "要約"
```

## 使用例

### ローカルCLI
```bash
# 今日（既存動作、後方互換）
deno task fetch
deno task post korosuke613 mynewshq General "$(cat summary.md)"

# 過去の日付
deno task fetch -- --date=2026-01-15
deno task post -- --date=2026-01-15 korosuke613 mynewshq General "$(cat summary.md)"
```

### GitHub Actions手動実行
1. Actions → Daily Changelog → Run workflow
2. 「対象日付」に `2026-01-15` を入力
3. Run workflow

## 注意事項

⚠️ **RSSフィードの制限**: RSSフィードは最新のエントリのみを含むため、過去の日付でfetchしても新しい記事しか取得できない。GitHub Releasesは過去データも取得可能。

## 検証方法

1. ローカルで `deno task fetch -- --date=2026-01-17` を実行
2. `data/changelogs/2026-01-17.json` が生成されることを確認
3. `deno task post -- --date=2026-01-17 ...` でDiscussion投稿を確認
4. GitHub Actionsで手動実行し、日付指定が機能することを確認
