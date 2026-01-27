// 週次処理用の共通型定義
// Orchestrator + Pipeline ハイブリッドパターンで使用される型

import type {
  ChangelogEntry,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../types.ts";

/**
 * 週次処理のコンテキスト情報
 * 各処理ステップで共有される情報を保持
 */
export interface WeeklyContext {
  /** 対象期間の開始日（YYYY-MM-DD） */
  startDate: string;
  /** 対象期間の終了日（YYYY-MM-DD） */
  endDate: string;
  /** GitHubトークン */
  token: string;
  /** リポジトリオーナー */
  owner: string;
  /** リポジトリ名 */
  repo: string;
  /** Discussionカテゴリ名 */
  categoryName: string;
  /** ドライラン（投稿せずに結果を返す） */
  dryRun?: boolean;
}

/**
 * パイプライン処理の結果
 * 成功/失敗の状態とデータを保持
 */
export type PipelineResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * 過去Discussion取得の結果
 */
export interface FetchPastDiscussionsResult {
  providerId: string;
  discussions: PastWeeklyDiscussion[];
}

/**
 * 要約生成リクエスト
 * Claude Code Action（GitHub Actions）に渡す情報
 */
export interface SummarizeRequest {
  /** プロバイダーID */
  providerId: string;
  /** 今週のChangelogデータ */
  currentData: ChangelogEntry[] | ReleaseEntry[];
  /** 過去のDiscussion（最大2件） */
  pastDiscussions: PastWeeklyDiscussion[];
  /** JSONスキーマ（要約出力フォーマット） */
  jsonSchema: object;
  /** プロンプトテンプレート */
  promptTemplate: string;
}

/**
 * Discussion投稿の結果
 */
export interface PostDiscussionResult {
  providerId: string;
  url: string;
  title: string;
}

/**
 * Orchestratorの処理結果
 * 全プロバイダーの処理結果を集約
 */
export interface OrchestratorResult<T> {
  /** 成功したプロバイダーの結果 */
  succeeded: Record<string, T>;
  /** 失敗したプロバイダーとエラー */
  failed: Record<string, string>;
}

/**
 * プロバイダーの種類
 * - categorized: カテゴリ分類あり（GitHub, AWS）
 * - simple: カテゴリなし（Claude Code, Linear）
 */
export type ProviderType = "categorized" | "simple";

/**
 * プロバイダーごとの設定情報
 */
export interface WeeklyProviderConfig {
  /** プロバイダーID */
  providerId: string;
  /** プロバイダーの種類 */
  type: ProviderType;
  /** 表示名 */
  displayName: string;
}

/**
 * 週次処理対象のプロバイダー設定
 */
export const WEEKLY_PROVIDER_CONFIGS: WeeklyProviderConfig[] = [
  {
    providerId: "github",
    type: "categorized",
    displayName: "GitHub Changelog",
  },
  { providerId: "aws", type: "categorized", displayName: "AWS What's New" },
  { providerId: "claudeCode", type: "simple", displayName: "Claude Code" },
  { providerId: "linear", type: "simple", displayName: "Linear Changelog" },
];

/**
 * 週次処理対象のプロバイダーIDリスト
 */
export const WEEKLY_PROVIDER_IDS = WEEKLY_PROVIDER_CONFIGS.map((c) =>
  c.providerId
);

/**
 * プロバイダーIDから設定を取得
 */
export function getWeeklyProviderConfig(
  providerId: string,
): WeeklyProviderConfig | undefined {
  return WEEKLY_PROVIDER_CONFIGS.find((c) => c.providerId === providerId);
}

/**
 * カテゴリ別プロバイダーのJSONスキーマ（GitHub/AWS用）
 */
export const CATEGORIZED_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    providerId: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
      description: "今週のハイライト（3-5文の箇条書き）",
    },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: "string" },
              },
              required: ["url", "title"],
            },
          },
          comment: { type: "string", description: "2-3文のコメント" },
          historicalContext: {
            type: "string",
            description: "過去との比較（1-2文）",
          },
        },
        required: ["category", "entries", "comment", "historicalContext"],
      },
    },
  },
  required: ["providerId", "highlights", "categories"],
} as const;

/**
 * シンプルプロバイダーのJSONスキーマ（Claude Code/Linear用）
 */
export const SIMPLE_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    providerId: { type: "string" },
    highlights: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      description: "今週のハイライト（1-5文の箇条書き）",
    },
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
        },
        required: ["url", "title"],
      },
    },
    overallComment: { type: "string", description: "全体コメント（2-3文）" },
    historicalContext: { type: "string", description: "過去との比較（1-2文）" },
  },
  required: [
    "providerId",
    "highlights",
    "entries",
    "overallComment",
    "historicalContext",
  ],
} as const;

/**
 * 要約データをProviderWeeklySummaryに変換する型ガード
 */
export function isValidProviderWeeklySummary(
  data: unknown,
): data is ProviderWeeklySummary {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 必須フィールドのチェック
  if (typeof obj.providerId !== "string") {
    return false;
  }

  if (!Array.isArray(obj.highlights)) {
    return false;
  }

  // カテゴリありの場合
  if (obj.categories !== undefined) {
    if (!Array.isArray(obj.categories)) {
      return false;
    }
  }

  // エントリありの場合
  if (obj.entries !== undefined) {
    if (!Array.isArray(obj.entries)) {
      return false;
    }
  }

  return true;
}
