# DiscussionカテゴリのIssue管理機能

## 概要

Discussionの投稿先カテゴリ名をGitHub Issueで管理できるようにする。
ミュートワード機能（Issue #1）と同様のパターンで実装。

## 現状

### カテゴリ名のハードコード箇所

| ファイル | 行 | 値 |
|---------|----|----|
| `.github/workflows/daily-changelog.yml` | 122, 172 | `Daily` / `manual trigger` |
| `scripts/create-discussion.ts` | 982 | `General` |
| `scripts/weekly-orchestrator.ts` | 52 | `General` |
| `scripts/post-weekly-provider.ts` | 58 | `Weekly` |

### 現在の動作
**Changelog:**
- 日次スケジュール → `Daily` カテゴリ
- 日次手動実行 → `manual trigger` カテゴリ
- 週次スケジュール → `Weekly` カテゴリ
- 週次手動実行 → `manual trigger` カテゴリ

**Blog:**
- 日次スケジュール → `Daily` カテゴリ
- 日次手動実行 → `manual trigger` カテゴリ

**デフォルト:** `General` カテゴリ

## 実装計画

### Issue本文フォーマット（Issue #2 想定）

```markdown
# Discussion カテゴリ設定

## Changelog カテゴリ
- changelog_daily: Daily
- changelog_weekly: Weekly
- changelog_manual: manual trigger

## Blog カテゴリ
- blog_daily: Daily
- blog_manual: manual trigger

## デフォルト
- default: General
```

※ `*_manual` は手動実行時に使用

### Step 1: パーサー関数の追加

**ファイル**: `scripts/domain/category-config.ts`（新規）

```typescript
export interface CategoryConfig {
  // Changelog用
  changelogDaily: string;
  changelogWeekly: string;
  changelogManual: string;
  // Blog用
  blogDaily: string;
  blogManual: string;
  // 共通デフォルト
  default: string;
}

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  changelogDaily: "Daily",
  changelogWeekly: "Weekly",
  changelogManual: "manual trigger",
  blogDaily: "Daily",
  blogManual: "manual trigger",
  default: "General",
};

export function parseCategoryConfig(issueBody: string): CategoryConfig {
  const config = { ...DEFAULT_CATEGORY_CONFIG };
  const lines = issueBody.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const match = trimmed.match(/^- ([\w_]+): (.+)$/);
      if (match) {
        const [, key, value] = match;
        switch (key) {
          case "changelog_daily": config.changelogDaily = value.trim(); break;
          case "changelog_weekly": config.changelogWeekly = value.trim(); break;
          case "changelog_manual": config.changelogManual = value.trim(); break;
          case "blog_daily": config.blogDaily = value.trim(); break;
          case "blog_manual": config.blogManual = value.trim(); break;
          case "default": config.default = value.trim(); break;
        }
      }
    }
  }
  return config;
}

// カテゴリタイプとトリガーに基づいてカテゴリ名を取得
export function getCategoryName(
  config: CategoryConfig,
  categoryType: "changelog" | "blog",
  trigger: "schedule" | "workflow_dispatch",
  isWeekly: boolean = false,
): string {
  if (trigger === "workflow_dispatch") {
    return categoryType === "blog" ? config.blogManual : config.changelogManual;
  }

  if (categoryType === "blog") {
    return config.blogDaily;
  }

  return isWeekly ? config.changelogWeekly : config.changelogDaily;
}
```

### Step 2: Issueから設定を取得する関数

**ファイル**: `scripts/domain/category-config.ts`（続き）

```typescript
export async function fetchCategoryConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<CategoryConfig> {
  try {
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    if (!issue.body) {
      console.warn(`Issue #${issueNumber} has no body, using defaults`);
      return DEFAULT_CATEGORY_CONFIG;
    }

    const config = parseCategoryConfig(issue.body);
    console.log(`Loaded category config from issue #${issueNumber}`);
    return config;
  } catch (error) {
    console.warn(`Failed to fetch category config: ${error}`);
    return DEFAULT_CATEGORY_CONFIG;
  }
}
```

### Step 3: ワークフローの更新

**ファイル**: `.github/workflows/daily-changelog.yml`

```yaml
env:
  CATEGORY_CONFIG_ISSUE_NUMBER: "2"

# 投稿時
- name: Post Changelog
  env:
    CATEGORY_CONFIG_ISSUE_NUMBER: ${{ env.CATEGORY_CONFIG_ISSUE_NUMBER }}
    WORKFLOW_TRIGGER: ${{ github.event_name }}
  run: |
    deno task post --category=changelog ...
```

### Step 4: 投稿スクリプトの更新

**ファイル**: `scripts/create-discussion.ts`

- `fetchCategoryConfig()` を呼び出し
- `WORKFLOW_TRIGGER` 環境変数と `--category` 引数（changelog/blog）に応じてカテゴリを選択
- `getCategoryName()` ヘルパー関数を使用

### 修正対象ファイル

1. `scripts/domain/category-config.ts` - 新規作成
2. `scripts/domain/category-config_test.ts` - テスト
3. `scripts/create-discussion.ts` - 設定読み込み追加
4. `scripts/weekly-orchestrator.ts` - 設定読み込み追加
5. `scripts/post-weekly-provider.ts` - 設定読み込み追加
6. `.github/workflows/daily-changelog.yml` - 環境変数追加
7. `.github/workflows/weekly-changelog.yml` - 環境変数追加

## 検証方法

1. Issue #2 を作成してカテゴリ設定を記述
2. `deno task test` でテスト実行
3. ローカルでプレビュー実行して設定が読み込まれることを確認
4. 手動ワークフロー実行でDiscussionが正しいカテゴリに投稿されることを確認

## 備考

- Issue取得失敗時はデフォルト値にフォールバック
- ミュートワードと同様、ワークフロー実行ごとにIssueを取得
