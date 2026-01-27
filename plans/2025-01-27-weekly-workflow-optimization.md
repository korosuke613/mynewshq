# 週次Changelogワークフロー効率化計画

## 問題点

現在の実装では `steps.fetch.outputs.has_data == 'true'` という条件で全てのClaude Code Actionを実行している。これは「全体としてデータがあるか」をチェックしているだけで、各プロバイダーごとにデータがあるかをチェックしていない。

**例：**
- GitHubに5件、AWSに3件、Claude Codeに0件、Linearに0件
- 現状：4つ全てのClaude Code Actionが実行される
- Claude CodeとLinearの要約生成は**無駄なAPI呼び出し**

## 解決策

`fetch-changelogs.ts`を改修し、GitHub Actionsの出力（`GITHUB_OUTPUT`）にプロバイダーごとのデータ有無を書き込む。

## 実装計画

### 変更ファイル

1. `scripts/fetch-changelogs.ts` - プロバイダーごとのデータ有無を出力
2. `.github/workflows/weekly-changelog.yml` - 条件分岐を更新

---

### Phase 1: fetch-changelogs.ts の改修

#### 1.1 GitHub Actions出力ヘルパー関数を追加

```typescript
// GitHub Actions用の出力を書き込む
function writeGitHubOutput(key: string, value: string): void {
  const outputFile = Deno.env.get("GITHUB_OUTPUT");
  if (outputFile) {
    Deno.writeTextFileSync(outputFile, `${key}=${value}\n`, { append: true });
  }
}
```

#### 1.2 processChangelog関数の最後にプロバイダーごとの出力を追加（行186付近）

```typescript
// 既存コードの後に追加
// GitHub Actions向けにプロバイダーごとのデータ有無を出力
for (const config of getProvidersByCategory("changelog")) {
  const entries = results[config.id] ?? [];
  // muted: true を除いたアクティブエントリ数をカウント
  const activeCount = entries.filter((e) => !e.muted).length;
  const hasData = activeCount > 0;
  writeGitHubOutput(`has_${config.id}`, String(hasData));
  console.log(`- ${getProviderDisplayName(config.id)}: ${activeCount} active entries (has_${config.id}=${hasData})`);
}
```

#### 1.3 更新がない場合もfalseを出力（行161-164付近）

```typescript
// 更新がない場合はスキップ
if (hasNoEntries(results)) {
  console.log(`No changelog updates found in the last ${days} day(s).`);
  // GitHub Actions向けに全プロバイダーfalseを出力
  for (const config of getProvidersByCategory("changelog")) {
    writeGitHubOutput(`has_${config.id}`, "false");
  }
  return;
}
```

---

### Phase 2: ワークフローの条件分岐を更新

#### 2.1 fetchステップを簡素化

```yaml
- name: Fetch changelogs (7 days)
  id: fetch
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app-fetch.outputs.token }}
    MUTE_WORDS_ISSUE_NUMBER: "1"
  run: |
    deno task fetch --days=7 --weekly --date=${{ steps.target-date.outputs.end_date }}

    # ファイル存在確認（後方互換性のため維持）
    if [ -f "data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}.json" ]; then
      echo "has_data=true" >> $GITHUB_OUTPUT
      echo "Data file created"
    else
      echo "has_data=false" >> $GITHUB_OUTPUT
      echo "No data file created (no updates found)"
    fi
    # 注: has_github, has_aws, has_claudeCode, has_linear は
    # fetch-changelogs.ts から直接 GITHUB_OUTPUT に書き込まれる
```

#### 2.2 各Claude Code Actionの条件を変更

| ステップ | 変更前 | 変更後 |
|---------|--------|--------|
| Generate GitHub summaries | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_github == 'true'` |
| Generate AWS summaries | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_aws == 'true'` |
| Generate Claude Code summaries | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_claudeCode == 'true'` |
| Generate Linear summaries | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_linear == 'true'` |

#### 2.3 各Discussion投稿ステップの条件も変更

| ステップ | 変更前 | 変更後 |
|---------|--------|--------|
| Post GitHub Discussion | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_github == 'true'` |
| Post AWS Discussion | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_aws == 'true'` |
| Post Claude Code Discussion | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_claudeCode == 'true'` |
| Post Linear Discussion | `steps.fetch.outputs.has_data == 'true'` | `steps.fetch.outputs.has_linear == 'true'` |

---

## 変更のメリット

1. **コスト削減**: 不要なClaude Code Action呼び出しを削減
2. **実行時間短縮**: データがないプロバイダーはスキップ
3. **テスト可能**: TypeScript側でロジックをテストできる
4. **保守性向上**: ロジックがTypeScriptに集約される
5. **ローカル動作**: `GITHUB_OUTPUT`がない場合は通常のログ出力のみ

---

## 検証方法

1. ローカルで週次データを取得してログを確認
   ```bash
   GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly
   ```
   出力例：
   ```
   - GitHub Changelog: 5 active entries (has_github=true)
   - AWS What's New: 3 active entries (has_aws=true)
   - Claude Code: 0 active entries (has_claudeCode=false)
   - Linear Changelog: 0 active entries (has_linear=false)
   ```

2. テストを追加して`writeGitHubOutput`の動作を確認

3. GitHub Actionsでワークフローを手動実行し、条件分岐が正しく動作することを確認

---

## TODO

- [x] `scripts/fetch-changelogs.ts` に`writeGitHubOutput`ヘルパー関数を追加
- [x] `processChangelog`関数でプロバイダーごとのデータ有無を出力
- [x] 更新がない場合もfalseを出力するよう修正
- [x] `.github/workflows/weekly-changelog.yml` の条件分岐を更新
- [x] テストを追加
- [x] プランファイルをリネーム（plans/2025-01-27-weekly-workflow-optimization.md）
