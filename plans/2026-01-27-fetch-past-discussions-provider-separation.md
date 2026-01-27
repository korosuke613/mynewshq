# Fetch past discussionsのプロバイダー別分離

## 問題点

現在の`Fetch past discussions`ステップは`has_data == 'true'`という全体条件で実行され、常に全4プロバイダーの過去Discussionを取得している。

**例：GitHubとAWSにのみデータがある場合**
- 現状：4プロバイダー全ての過去Discussionを取得（Claude Code、Linearは無駄）
- 理想：GitHubとAWSのみ取得

## 解決策

1. `fetch-past-discussions.ts`にプロバイダー指定オプション（`--provider`）を追加
2. ワークフローでプロバイダーごとにFetch past discussionsステップを分離

---

## 実装計画

### Phase 1: fetch-past-discussions.ts の改修

#### 1.1 引数パースに`--provider`オプションを追加

```typescript
interface FetchPastDiscussionsArgs {
  owner: string;
  repo: string;
  limit: number;
  outputFile: string | null;
  provider: string | null;  // 追加
}

function parseArgs(args: string[]): FetchPastDiscussionsArgs {
  // 既存コード...
  const providerArg = args.find((arg) => arg.startsWith("--provider="));

  return {
    // 既存フィールド...
    provider: providerArg ? providerArg.split("=")[1] : null,
  };
}
```

#### 1.2 main関数でプロバイダー指定時の処理を追加

```typescript
async function main() {
  const { owner, repo, limit, outputFile, provider } = parseArgs(Deno.args);

  let pastDiscussions: Record<string, PastWeeklyDiscussion[]>;

  if (provider) {
    // 単一プロバイダーのみ取得
    const discussions = await fetchPastWeeklyDiscussionsByProvider(
      token, owner, repo, provider, limit
    );
    pastDiscussions = { [provider]: discussions };
  } else {
    // 全プロバイダー取得（既存動作）
    pastDiscussions = await fetchAllPastWeeklyDiscussions(token, owner, repo, limit);
  }
  // ...
}
```

#### 1.3 fetchPastWeeklyDiscussionsByProviderをエクスポート

`create-discussion.ts`で`fetchPastWeeklyDiscussionsByProvider`をエクスポートする。

---

### Phase 2: ワークフローの変更

#### 2.1 既存のFetch past discussionsステップを削除

```yaml
# 削除
- name: Fetch past discussions
  id: fetch-past
  if: steps.fetch.outputs.has_data == 'true'
```

#### 2.2 プロバイダーごとのステップを追加

各Claude Code Actionの**前に**、対応するFetch past discussionsステップを追加：

```yaml
# GitHub用
- name: Fetch past discussions (GitHub)
  if: steps.fetch.outputs.has_github == 'true'
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app-fetch.outputs.token }}
  run: |
    deno task fetch-past-discussions --provider=github --output=/tmp/past-discussions-github.json

- name: Generate GitHub summaries with Claude Code
  if: steps.fetch.outputs.has_github == 'true'
  # ... prompt内のファイルパスを /tmp/past-discussions-github.json に変更
```

同様に AWS、Claude Code、Linear も追加。

#### 2.3 Claude Code Actionのプロンプト更新

各プロンプトで参照するファイルパスを変更：
- GitHub: `/tmp/past-discussions-github.json`
- AWS: `/tmp/past-discussions-aws.json`
- Claude Code: `/tmp/past-discussions-claudeCode.json`
- Linear: `/tmp/past-discussions-linear.json`

---

## 変更ファイル

1. `scripts/fetch-past-discussions.ts` - `--provider`オプション追加
2. `scripts/create-discussion.ts` - `fetchPastWeeklyDiscussionsByProvider`をエクスポート
3. `.github/workflows/weekly-changelog.yml` - ステップ分離とプロンプト更新

---

## 検証方法

1. ローカルで単一プロバイダー指定での動作確認
   ```bash
   GITHUB_TOKEN=$(gh auth token) deno task fetch-past-discussions --provider=github --output=/tmp/test.json
   cat /tmp/test.json
   ```

2. GitHub Actionsで手動実行し、データがないプロバイダーのFetch past discussionsがスキップされることを確認

---

## TODO

- [ ] `scripts/create-discussion.ts`で`fetchPastWeeklyDiscussionsByProvider`をエクスポート
- [ ] `scripts/fetch-past-discussions.ts`に`--provider`オプションを追加
- [ ] `.github/workflows/weekly-changelog.yml`のFetch past discussionsをプロバイダーごとに分離
- [ ] 各Claude Code Actionのプロンプトでファイルパスを更新
- [ ] プランファイルをリネーム
