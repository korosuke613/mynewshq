# workflow_dispatch改善：Discussion自動クローズとプロバイダー選択

## 概要

週次ワークフローのworkflow_dispatch（手動実行）を改善し、お試し実行を効率化する。

## 要件

1. **Discussion自動クローズ**: workflow_dispatch実行時はDiscussion投稿後に自動クローズ
2. **プロバイダー選択**: github, aws, claudeCode, linearから実行対象を選択可能に（プロンプト節約）

---

## 実装計画

### Step 1: workflow_dispatchのinputs拡張

**ファイル**: `.github/workflows/weekly-changelog.yml`

```yaml
workflow_dispatch:
  inputs:
    end_date:
      description: "終了日 (YYYY-MM-DD形式、空欄で今日)"
      required: false
      type: string
    run_github:
      description: "GitHub Changelogを実行"
      required: false
      type: boolean
      default: true
    run_aws:
      description: "AWS What's Newを実行"
      required: false
      type: boolean
      default: true
    run_claudeCode:
      description: "Claude Codeを実行"
      required: false
      type: boolean
      default: true
    run_linear:
      description: "Linear Changelogを実行"
      required: false
      type: boolean
      default: true
```

### Step 2: fetch-dataジョブにプロバイダーフラグ計算を追加

**ファイル**: `.github/workflows/weekly-changelog.yml`

fetch-dataジョブの最後に、workflow_dispatchの入力値を考慮した最終フラグを計算するステップを追加：

```yaml
- name: Calculate final provider flags
  id: provider-flags
  run: |
    # workflow_dispatchの場合は入力値を考慮
    if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
      # 入力値がtrueかつデータが存在する場合のみtrue
      HAS_GITHUB=${{ inputs.run_github == true && steps.fetch.outputs.has_github == 'true' }}
      HAS_AWS=${{ inputs.run_aws == true && steps.fetch.outputs.has_aws == 'true' }}
      HAS_CLAUDECODE=${{ inputs.run_claudeCode == true && steps.fetch.outputs.has_claudeCode == 'true' }}
      HAS_LINEAR=${{ inputs.run_linear == true && steps.fetch.outputs.has_linear == 'true' }}
    else
      # schedule実行の場合はfetchの結果をそのまま使用
      HAS_GITHUB=${{ steps.fetch.outputs.has_github }}
      HAS_AWS=${{ steps.fetch.outputs.has_aws }}
      HAS_CLAUDECODE=${{ steps.fetch.outputs.has_claudeCode }}
      HAS_LINEAR=${{ steps.fetch.outputs.has_linear }}
    fi
    echo "has_github=${HAS_GITHUB}" >> $GITHUB_OUTPUT
    echo "has_aws=${HAS_AWS}" >> $GITHUB_OUTPUT
    echo "has_claudeCode=${HAS_CLAUDECODE}" >> $GITHUB_OUTPUT
    echo "has_linear=${HAS_LINEAR}" >> $GITHUB_OUTPUT
```

ジョブのoutputsを更新して新しいステップを参照：

```yaml
outputs:
  has_github: ${{ steps.provider-flags.outputs.has_github }}
  has_aws: ${{ steps.provider-flags.outputs.has_aws }}
  has_claudeCode: ${{ steps.provider-flags.outputs.has_claudeCode }}
  has_linear: ${{ steps.provider-flags.outputs.has_linear }}
```

### Step 3: Discussionクローズ関数を追加

**ファイル**: `scripts/create-discussion.ts`

GraphQL APIでDiscussionをクローズする関数を追加：

```typescript
interface CloseDiscussionResult {
  closeDiscussion: {
    discussion: {
      id: string;
      closed: boolean;
    };
  };
}

export async function closeDiscussion(
  token: string,
  discussionId: string,
): Promise<void> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  await graphqlWithAuth<CloseDiscussionResult>(
    `
    mutation($discussionId: ID!) {
      closeDiscussion(input: {
        discussionId: $discussionId
        reason: RESOLVED
      }) {
        discussion {
          id
          closed
        }
      }
    }
  `,
    { discussionId },
  );

  console.log(`Discussion closed: ${discussionId}`);
}
```

### Step 4: weekly-orchestratorにautoCloseオプションを追加

**ファイル**: `scripts/weekly-orchestrator.ts`

1. parseArgsに`--auto-close`オプションを追加
2. postAll関数で投稿後にDiscussionをクローズ

```typescript
// parseArgsに追加
const autoClose = args.includes("--auto-close");

// postAll関数の引数に追加
async function postAll(options: {
  // ... 既存のオプション
  autoClose: boolean;
}): Promise<void> {
  // ... 既存の処理

  // 投稿成功後、autoCloseがtrueの場合はクローズ
  if (options.autoClose && Object.keys(result.succeeded).length > 0) {
    console.log("\nClosing discussions (auto-close enabled)...");
    for (const [providerId, data] of Object.entries(result.succeeded)) {
      try {
        await closeDiscussion(token, data.id);
        console.log(`  ${providerId}: closed`);
      } catch (error) {
        console.error(`  ${providerId}: failed to close - ${error}`);
      }
    }
  }
}
```

### Step 5: ワークフローでautoCloseフラグを渡す

**ファイル**: `.github/workflows/weekly-changelog.yml`

post-discussionsジョブの投稿コマンドを修正：

```yaml
- name: Merge summaries and post discussions
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app.outputs.token }}
  run: |
    # ... 既存の要約統合処理 ...

    # autoCloseフラグを設定
    AUTO_CLOSE_FLAG=""
    if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
      AUTO_CLOSE_FLAG="--auto-close"
    fi

    # Discussion投稿
    deno task post-weekly-all \
      --date=${{ needs.fetch-data.outputs.end_date }} \
      --changelog-file=data/changelogs/weekly/${{ needs.fetch-data.outputs.end_date }}.json \
      --summaries-file=/tmp/all-summaries.json \
      --category="${{ github.event_name == 'workflow_dispatch' && 'manual trigger' || 'Weekly' }}" \
      $AUTO_CLOSE_FLAG
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `.github/workflows/weekly-changelog.yml` | inputs拡張、プロバイダーフラグ計算、autoCloseフラグ追加 |
| `scripts/create-discussion.ts` | `closeDiscussion`関数を追加・export |
| `scripts/weekly-orchestrator.ts` | `--auto-close`オプション追加、投稿後クローズ処理 |

---

## 検証方法

1. **ローカルテスト**
   ```bash
   # closeDiscussion関数の型チェック
   deno check scripts/create-discussion.ts
   deno check scripts/weekly-orchestrator.ts
   ```

2. **ワークフロー実行テスト**
   - workflow_dispatchで実行
   - 単一プロバイダー（例：claudeCodeのみ）を選択して実行時間とプロンプト消費を確認
   - 投稿後のDiscussionがクローズされていることを確認

3. **schedule実行の確認**
   - 全プロバイダーが実行されること
   - Discussionがクローズされないこと（autoCloseなし）

---

## リネームタスク

- [ ] 完了後、このプランファイルを `./plans/2026-01-28-workflow-dispatch-improvements.md` にリネーム
