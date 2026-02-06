# ローカル環境での完全な投稿前確認機能

## 目的

ローカル環境でDiscussion投稿の直前まで動作確認できるようにする。
GITHUB_TOKENなしでも以下が確認できるべき：
- Markdown生成（タイトル、本文）
- ラベル抽出結果
- 投稿先カテゴリ名
- 統計情報

## 現状の課題

| 機能 | preview-discussion.ts | create-discussion.ts | post-weekly-provider.ts |
|------|----------------------|---------------------|------------------------|
| Markdown生成 | ✅ OK | - | - |
| ラベル表示 | ❌ なし | - | - |
| カテゴリ表示 | ❌ なし | ✅（API依存） | ✅（API依存） |
| dry-runモード | - | ❌ なし | ✅ OK（ただしトークン必須） |
| トークン不要 | ✅ OK | ❌ NG | ❌ NG |

## 改善計画

### Phase 1: preview-discussion.tsの強化

ラベル抽出結果とカテゴリ名をプレビューに追加。

**変更ファイル**: `scripts/preview-discussion.ts`

**変更内容**:
1. `determineLabels()`をimportしてラベル名を計算・表示
2. `DEFAULT_CATEGORY_CONFIG`と`getCategoryName()`をimportしてカテゴリ名を表示
3. previewChangelog関数で統計情報の後にラベルとカテゴリを表示

**出力例**:
```
📊 データ統計 (2026-02-02)
---
GitHub: 10 件 (ミュート: 2 件)
AWS: 5 件 (ミュート: 1 件)
...
合計: 20 件 (ミュート: 5 件)

🏷️ 付与予定ラベル:
---
github, gh:copilot, gh:actions, aws, aws:ec2, aws:lambda

📁 投稿先カテゴリ: Daily
   (トリガー: schedule, 週次: false)
```

**注意**: Blogカテゴリはラベル付与なしのため、ラベル表示はChangelogのみ

### Phase 2: post-weekly-provider.tsのdry-runモード改善

トークンなしでもdry-runが動作するようにする。

**変更ファイル**: `scripts/post-weekly-provider.ts`

**変更内容**:
1. dry-runフラグの判定を`requireGitHubToken()`呼び出しの前に移動
2. dry-run時はトークンを空文字列に設定
3. `getCategoryNameFromEnv()`呼び出し時、dry-runなら`CATEGORY_CONFIG_ISSUE_NUMBER`を無視してデフォルト設定を使用

```typescript
// Before (67行目付近)
const token = requireGitHubToken();
const dryRun = hasFlag(args, "dry-run");

// After
const dryRun = hasFlag(args, "dry-run");
const token = dryRun ? "" : requireGitHubToken();
```

### Phase 3: create-discussion.tsにdry-runモード追加

日次Discussion投稿にもdry-runモードを追加。

**変更ファイル**: `scripts/create-discussion.ts`

**変更内容**:

1. `parseArgs()`に`dryRun`を追加（`hasFlag(args, "dry-run")`）
2. main関数でdry-run時はトークン不要に:
   ```typescript
   const dryRun = parsed.dryRun;
   const token = dryRun ? "" : requireGitHubToken();
   ```
3. dry-run時は`getCategoryNameFromEnv()`を呼ばずにデフォルト設定を使用
4. `createChangelogDiscussion`と`createBlogDiscussion`に`dryRun`パラメータを追加
5. dry-run時は実際の投稿をスキップし、以下を表示:
   - タイトル
   - 本文（Markdown）
   - 付与されるラベル一覧
   - 投稿先カテゴリ

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/preview-discussion.ts` | ラベル・カテゴリ表示追加 |
| `scripts/post-weekly-provider.ts` | dry-runでトークン不要に |
| `scripts/create-discussion.ts` | dry-runモード追加 |

## 検証方法

```bash
# Phase 1: プレビューでラベル・カテゴリ確認
deno task preview --date=2026-02-02
# 期待: ラベル一覧とカテゴリ名が表示される

# Phase 2: トークンなしで週次dry-run
unset GITHUB_TOKEN
deno run --allow-read --allow-env scripts/post-weekly-provider.ts --provider=github --dry-run
# 期待: エラーなく投稿内容が表示される

# Phase 3: 日次投稿のdry-run
unset GITHUB_TOKEN
deno run --allow-read --allow-env scripts/create-discussion.ts --dry-run
# 期待: エラーなく投稿内容が表示される

# 全テスト実行
deno task test
```

## TODO

- [ ] Phase 1: preview-discussion.tsにラベル・カテゴリ表示追加
- [ ] Phase 2: post-weekly-provider.tsのdry-runでトークン不要に
- [ ] Phase 3: create-discussion.tsにdry-runモード追加
- [ ] テスト実行で動作確認
- [ ] プランファイルを `./plans/2026-02-02-local-preview.md` にリネーム
