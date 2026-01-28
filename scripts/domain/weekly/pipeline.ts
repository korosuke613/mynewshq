// 週次処理パイプラインインターフェース
// 各プロバイダーアダプタが実装する共通インターフェースを定義

import type {
  ChangelogEntry,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../types.ts";
import type { PipelineResult, WeeklyContext } from "./types.ts";

/**
 * 週次処理パイプラインインターフェース
 * 各プロバイダーアダプタが実装すべきメソッドを定義
 */
export interface WeeklyPipeline {
  /**
   * プロバイダーID
   */
  readonly providerId: string;

  /**
   * 過去のDiscussionを取得
   * @param ctx 週次処理コンテキスト
   * @param limit 取得件数（デフォルト: 2）
   * @returns 過去Discussion配列のPipelineResult
   */
  fetchPastDiscussions(
    ctx: WeeklyContext,
    limit?: number,
  ): Promise<PipelineResult<PastWeeklyDiscussion[]>>;

  /**
   * 要約生成用の設定を取得
   * LLMに渡すJSONスキーマとプロンプトテンプレートを返す
   * @returns JSONスキーマとプロンプトテンプレート
   */
  getSummarizeConfig(): SummarizeConfig;

  /**
   * Markdownを生成
   * @param data 今週のChangelogデータ
   * @param summary LLMが生成した要約データ
   * @param ctx 週次処理コンテキスト
   * @returns Markdown文字列
   */
  generateMarkdown(
    data: ChangelogEntry[] | ReleaseEntry[],
    summary: ProviderWeeklySummary,
    ctx: WeeklyContext,
  ): string;

  /**
   * Discussionを投稿
   * @param markdown 投稿するMarkdown
   * @param ctx 週次処理コンテキスト
   * @param providerData 元データ（ラベル抽出に使用）
   * @returns 投稿結果（URL等）のPipelineResult
   */
  postDiscussion(
    markdown: string,
    ctx: WeeklyContext,
    providerData: ChangelogEntry[] | ReleaseEntry[],
  ): Promise<PipelineResult<PostDiscussionData>>;
}

/**
 * 要約生成設定
 */
export interface SummarizeConfig {
  /** LLM出力のJSONスキーマ */
  jsonSchema: object;
  /** プロンプトテンプレート（{currentData}, {pastDiscussions}, {providerId}をプレースホルダとして使用） */
  promptTemplate: string;
}

/**
 * Discussion投稿結果
 */
export interface PostDiscussionData {
  /** DiscussionのNode ID */
  id: string;
  /** DiscussionのURL */
  url: string;
  /** Discussionのタイトル */
  title: string;
}

/**
 * プロンプトテンプレートを実データで置換
 * @param template プロンプトテンプレート
 * @param providerId プロバイダーID
 * @param currentData 今週のデータ（JSON文字列に変換）
 * @param pastDiscussions 過去のDiscussion（JSON文字列に変換）
 */
export function renderPromptTemplate(
  template: string,
  providerId: string,
  currentData: ChangelogEntry[] | ReleaseEntry[],
  pastDiscussions: PastWeeklyDiscussion[],
): string {
  return template
    .replace("{providerId}", providerId)
    .replace("{currentData}", JSON.stringify(currentData, null, 2))
    .replace("{pastDiscussions}", JSON.stringify(pastDiscussions, null, 2));
}
