# 単一ワークフローへの統合

## 背景

現在の複雑な構造を廃止し、シンプルな単一ワークフローに統合する。

**現在の問題点:**

- 2つのワークフローに分割されており、トリガー連携が複雑
- `GITHUB_TOKEN`でのIssue commentは別ワークフローをトリガーしない
- Issue経由のデータ受け渡しは冗長

## 新しい設計

単一ワークフロー（`daily-changelog.yml`）で以下を実行：

1. **Changelogデータ取得** - `deno task fetch`
2. **AI要約生成** - Claude Code Action
3. **Discussion投稿** - `deno task post`

## 実装手順

### Step 1: 新しいワークフロー作成

**ファイル**: `.github/workflows/daily-changelog.yml`

````yaml
name: Daily Changelog

on:
  schedule:
    - cron: "0 0 * * *" # 毎日 9:00 JST
  workflow_dispatch:
    inputs:
      date:
        description: "対象日付 (YYYY-MM-DD形式、省略時は実行日)"
        required: false
        type: string

permissions:
  contents: read
  discussions: write
  pull-requests: write

jobs:
  changelog:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Fetch changelogs
        run: deno task fetch

      - name: Summarize and post with Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            data/changelogs/ ディレクトリにある最新のJSONファイルを読み込んで、
            日本語で要約を生成してください。

            要約のルール：
            1. GitHub Changelog、AWS What's New、Claude Codeの3つのセクションに分ける
            2. 各エントリについて、タイトルとURLをリンク形式で表示
            3. 内容を2-3文で簡潔に日本語で要約
            4. 技術者向けにわかりやすく、重要なポイントを強調
            5. 更新がないセクションは省略する

            要約が完成したら、以下のコマンドを実行してDiscussionに投稿してください：
            ```bash
            deno task post korosuke613 mynewshq General "$(cat summary.md)"
            ```

            summary.mdには生成した要約を保存してください。
````

### Step 2: 古いワークフローの削除

以下のファイルを削除：

- `.github/workflows/fetch-changelog.yml`
- `.github/workflows/summarize-changelog.yml`

### Step 3: スクリプトの変更

`scripts/fetch-changelogs.ts` から `--post-to-issue` 機能を削除：

- Issue投稿機能は不要になるため削除
- ローカルファイル保存のみに戻す

### Step 4: Issue #1のクローズ

トリガー用Issueは不要になるためクローズ。

## 修正対象ファイル

| ファイル                                    | 操作                |
| ------------------------------------------- | ------------------- |
| `.github/workflows/daily-changelog.yml`     | 新規作成            |
| `.github/workflows/fetch-changelog.yml`     | 削除                |
| `.github/workflows/summarize-changelog.yml` | 削除                |
| `scripts/fetch-changelogs.ts`               | Issue投稿機能を削除 |

## 検証方法

1. `workflow_dispatch`で`daily-changelog.yml`を手動実行
2. 以下を確認：
   - changelogデータがdata/changelogs/に作成される
   - Claude Code Actionが要約を生成
   - Discussionに要約が投稿される
