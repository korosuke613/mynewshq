# ワークフロートリガーをIssue Comment方式に変更

## 背景

GitHub Actionsの仕様により、`GITHUB_TOKEN`（actions
bot）によるコミットでは別のワークフローのpushトリガーが発火しない。このため、`fetch-changelog.yml`
→ `summarize-changelog.yml` の連携が動作していない。

## 解決策

**Issue Commentトリガー方式**を採用する。

1. トリガー用のIssueを1つ作成（手動）
2. `fetch-changelog.yml` がchangelog取得後、そのIssueにコメントを書き込む
3. `summarize-changelog.yml` が `issue_comment` イベントをトリガーに起動

## 実装手順

### Step 1: トリガー用Issueの作成（手動）

- タイトル: `[Automation] Daily Changelog Processing`
- ラベル: `automation`（任意）
- 本文: `このIssueはChangelog自動処理のトリガーとして使用されます。`

### Step 2: fetch-changelog.yml の変更

**ファイル**: `.github/workflows/fetch-changelog.yml`

変更点:

1. `permissions` に `issues: write` を追加
2. `check_changes` ステップで作成されたファイルパスを出力
3. コミット＆プッシュ後、Issueにコメントを書き込むステップを追加

```yaml
permissions:
  contents: write
  issues: write  # 追加

# check_changes ステップに追加
FILE=$(ls -t data/changelogs/*.json | head -1)
echo "changelog_file=$FILE" >> $GITHUB_OUTPUT

# 新規ステップ: Issueコメント
- name: Trigger summarize workflow via Issue comment
  if: steps.check_changes.outputs.has_changes == 'true'
  uses: actions/github-script@v7
  with:
    script: |
      const issueNumber = <ISSUE_NUMBER>;  // 作成したIssue番号
      const today = new Date().toISOString().split('T')[0];
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `📰 ${today}のChangelogを要約してください。`
      });
```

### Step 3: summarize-changelog.yml の変更

**ファイル**: `.github/workflows/summarize-changelog.yml`

変更点:

1. トリガーを `push` から `issue_comment` に変更
2. `permissions` に `issues: write` を追加
3. `if` 条件でフィルタリング（actions botからのコメントのみ処理）
4. `checkout` で `ref: main` を指定（最新のコミットを取得）

```yaml
on:
  issue_comment:
    types: [created]
  workflow_dispatch:

permissions:
  contents: write
  discussions: write
  pull-requests: write
  issues: write # 追加

jobs:
  summarize:
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'workflow_dispatch' ||
      (
        github.event_name == 'issue_comment' &&
        contains(github.event.comment.body, 'Changelogを要約してください') &&
        github.event.comment.user.login == 'github-actions[bot]'
      )

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main # 追加: 最新のmainを取得
```

## 修正対象ファイル

| ファイル                                    | 変更内容                  |
| ------------------------------------------- | ------------------------- |
| `.github/workflows/fetch-changelog.yml`     | Issue comment追加ステップ |
| `.github/workflows/summarize-changelog.yml` | トリガー条件変更          |

## 検証方法

1. トリガー用Issueを作成し、Issue番号をメモ
2. `fetch-changelog.yml` にIssue番号を設定
3. `workflow_dispatch` で `fetch-changelog.yml` を手動実行
4. 以下を確認:
   - Issueにコメントが追加される
   - `summarize-changelog.yml` が自動起動する
   - Claude Code ActionでDiscussionに投稿される
