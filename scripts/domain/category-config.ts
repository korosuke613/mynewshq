// Discussionカテゴリ設定の管理
// Issue本文からカテゴリ設定を読み取り、トリガーとカテゴリタイプに応じてカテゴリ名を返す

import { Octokit } from "@octokit/rest";

/**
 * Discussionカテゴリ設定
 */
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

/**
 * デフォルトのカテゴリ設定
 */
export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  changelogDaily: "Daily",
  changelogWeekly: "Weekly",
  changelogManual: "manual trigger",
  blogDaily: "Daily",
  blogManual: "manual trigger",
  default: "General",
};

/**
 * Issue本文からカテゴリ設定をパースする
 *
 * 期待されるフォーマット:
 * ```markdown
 * # Discussion カテゴリ設定
 *
 * ## Changelog カテゴリ
 * - changelog_daily: Daily
 * - changelog_weekly: Weekly
 * - changelog_manual: manual trigger
 *
 * ## Blog カテゴリ
 * - blog_daily: Daily
 * - blog_manual: manual trigger
 *
 * ## デフォルト
 * - default: General
 * ```
 */
export function parseCategoryConfig(issueBody: string): CategoryConfig {
  const config = { ...DEFAULT_CATEGORY_CONFIG };
  const lines = issueBody.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const match = trimmed.match(/^- ([\w_]+): (.+)$/);
      if (match) {
        const [, key, value] = match;
        const trimmedValue = value.trim();
        switch (key) {
          case "changelog_daily":
            config.changelogDaily = trimmedValue;
            break;
          case "changelog_weekly":
            config.changelogWeekly = trimmedValue;
            break;
          case "changelog_manual":
            config.changelogManual = trimmedValue;
            break;
          case "blog_daily":
            config.blogDaily = trimmedValue;
            break;
          case "blog_manual":
            config.blogManual = trimmedValue;
            break;
          case "default":
            config.default = trimmedValue;
            break;
        }
      }
    }
  }

  return config;
}

/**
 * カテゴリタイプ
 */
export type CategoryType = "changelog" | "blog";

/**
 * ワークフロートリガータイプ
 */
export type WorkflowTrigger = "schedule" | "workflow_dispatch";

/**
 * カテゴリタイプとトリガーに基づいてカテゴリ名を取得する
 *
 * @param config カテゴリ設定
 * @param categoryType "changelog" または "blog"
 * @param trigger "schedule" または "workflow_dispatch"
 * @param isWeekly 週次処理かどうか（changelogのみ影響）
 * @returns カテゴリ名
 */
export function getCategoryName(
  config: CategoryConfig,
  categoryType: CategoryType,
  trigger: WorkflowTrigger,
  isWeekly: boolean = false,
): string {
  // 手動実行の場合
  if (trigger === "workflow_dispatch") {
    return categoryType === "blog" ? config.blogManual : config.changelogManual;
  }

  // スケジュール実行の場合
  if (categoryType === "blog") {
    return config.blogDaily;
  }

  // Changelog: 週次か日次かで分岐
  return isWeekly ? config.changelogWeekly : config.changelogDaily;
}

/**
 * GitHubのIssueからカテゴリ設定を取得する
 *
 * @param octokit Octokit インスタンス
 * @param owner リポジトリオーナー
 * @param repo リポジトリ名
 * @param issueNumber Issue番号
 * @returns カテゴリ設定（取得失敗時はデフォルト値）
 */
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

/**
 * 環境変数から設定を読み込み、カテゴリ名を取得するヘルパー関数
 *
 * @param octokit Octokit インスタンス
 * @param owner リポジトリオーナー
 * @param repo リポジトリ名
 * @param categoryType "changelog" または "blog"
 * @param isWeekly 週次処理かどうか
 * @returns カテゴリ名
 */
export async function getCategoryNameFromEnv(
  octokit: Octokit,
  owner: string,
  repo: string,
  categoryType: CategoryType,
  isWeekly: boolean = false,
): Promise<string> {
  // 環境変数からIssue番号を取得
  const issueNumberStr = Deno.env.get("CATEGORY_CONFIG_ISSUE_NUMBER");

  // 環境変数からワークフロートリガーを取得
  const triggerStr = Deno.env.get("WORKFLOW_TRIGGER");
  const trigger: WorkflowTrigger = triggerStr === "workflow_dispatch"
    ? "workflow_dispatch"
    : "schedule";

  // Issue番号が設定されていない場合はデフォルト設定を使用
  if (!issueNumberStr) {
    console.log(
      "CATEGORY_CONFIG_ISSUE_NUMBER not set, using default category config",
    );
    return getCategoryName(
      DEFAULT_CATEGORY_CONFIG,
      categoryType,
      trigger,
      isWeekly,
    );
  }

  const issueNumber = parseInt(issueNumberStr, 10);
  if (isNaN(issueNumber)) {
    console.warn(
      `Invalid CATEGORY_CONFIG_ISSUE_NUMBER: ${issueNumberStr}, using defaults`,
    );
    return getCategoryName(
      DEFAULT_CATEGORY_CONFIG,
      categoryType,
      trigger,
      isWeekly,
    );
  }

  // Issueから設定を取得
  const config = await fetchCategoryConfig(octokit, owner, repo, issueNumber);
  return getCategoryName(config, categoryType, trigger, isWeekly);
}
