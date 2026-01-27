// Weekly Orchestrator
// 全プロバイダーの週次処理を統括し、並列実行を制御

import type {
  ChangelogData,
  ChangelogEntry,
  PastWeeklyDiscussion,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../types.ts";
import type { WeeklyPipeline } from "./pipeline.ts";
import type {
  OrchestratorResult,
  PipelineResult,
  SummarizeRequest,
  WeeklyContext,
} from "./types.ts";
import { WEEKLY_PROVIDER_IDS } from "./types.ts";
import { getCategorizedAdapter } from "./adapters/categorized-adapter.ts";
import { getSimpleAdapter } from "./adapters/simple-adapter.ts";

/**
 * プロバイダーIDからアダプタを取得
 */
export function getAdapter(providerId: string): WeeklyPipeline | undefined {
  return getCategorizedAdapter(providerId) ?? getSimpleAdapter(providerId);
}

/**
 * 全プロバイダーのアダプタを取得
 */
export function getAllAdapters(): Map<string, WeeklyPipeline> {
  const adapters = new Map<string, WeeklyPipeline>();
  for (const providerId of WEEKLY_PROVIDER_IDS) {
    const adapter = getAdapter(providerId);
    if (adapter) {
      adapters.set(providerId, adapter);
    }
  }
  return adapters;
}

/**
 * ChangelogDataから特定プロバイダーのデータを取得するユーティリティ関数
 */
export function getProviderDataFromChangelog(
  changelogData: ChangelogData,
  providerId: string,
): ChangelogEntry[] | ReleaseEntry[] {
  switch (providerId) {
    case "github":
      return changelogData.github;
    case "aws":
      return changelogData.aws;
    case "claudeCode":
      return changelogData.claudeCode;
    case "linear":
      return changelogData.linear;
    default:
      return [];
  }
}

/**
 * mutedエントリを除外するユーティリティ関数
 */
export function filterMutedEntries<T extends Array<{ muted?: boolean }>>(
  data: T,
): T {
  return data.filter((entry) => !entry.muted) as T;
}

/**
 * Weekly Orchestrator
 * 全プロバイダーの週次処理を統括
 */
export class WeeklyOrchestrator {
  private adapters: Map<string, WeeklyPipeline>;

  constructor(adapters?: Map<string, WeeklyPipeline>) {
    this.adapters = adapters ?? getAllAdapters();
  }

  /**
   * Phase 1: 全プロバイダーの過去Discussion取得（並列）
   * @param ctx 週次処理コンテキスト
   * @param limit 取得件数
   * @returns 各プロバイダーの過去Discussion
   */
  async fetchAllPastDiscussions(
    ctx: WeeklyContext,
    limit: number = 2,
  ): Promise<OrchestratorResult<PastWeeklyDiscussion[]>> {
    const results = await Promise.all(
      Array.from(this.adapters.entries()).map(async ([providerId, adapter]) => {
        const result = await adapter.fetchPastDiscussions(ctx, limit);
        return [providerId, result] as const;
      }),
    );

    const succeeded: Record<string, PastWeeklyDiscussion[]> = {};
    const failed: Record<string, string> = {};

    for (const [providerId, result] of results) {
      if (result.success) {
        succeeded[providerId] = result.data;
      } else {
        failed[providerId] = result.error;
      }
    }

    return { succeeded, failed };
  }

  /**
   * Phase 2: 要約生成リクエストを準備
   * @param changelogData Changelogデータ
   * @param pastDiscussions 過去Discussion（fetchAllPastDiscussionsの結果）
   * @returns 各プロバイダーの要約生成リクエスト
   */
  prepareSummarizeRequests(
    changelogData: ChangelogData,
    pastDiscussions: Record<string, PastWeeklyDiscussion[]>,
  ): SummarizeRequest[] {
    const requests: SummarizeRequest[] = [];

    for (const [providerId, adapter] of this.adapters.entries()) {
      const currentData = this.getProviderData(changelogData, providerId);

      // mutedエントリを除外
      const filteredData = filterMutedEntries(currentData);

      // データがない場合はスキップ
      if (filteredData.length === 0) {
        console.log(`Skipping ${providerId}: no entries`);
        continue;
      }

      const config = adapter.getSummarizeConfig();
      const past = pastDiscussions[providerId] ?? [];

      requests.push({
        providerId,
        currentData: filteredData,
        pastDiscussions: past,
        jsonSchema: config.jsonSchema,
        promptTemplate: config.promptTemplate,
      });
    }

    return requests;
  }

  /**
   * Phase 3: 全プロバイダーのDiscussion投稿（並列）
   * @param changelogData Changelogデータ
   * @param summaries 各プロバイダーの要約
   * @param ctx 週次処理コンテキスト
   * @returns 投稿結果
   */
  async postAllDiscussions(
    changelogData: ChangelogData,
    summaries: Record<string, ProviderWeeklySummary>,
    ctx: WeeklyContext,
  ): Promise<OrchestratorResult<{ url: string; title: string }>> {
    const results = await Promise.all(
      Object.entries(summaries).map(async ([providerId, summary]) => {
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
          return [
            providerId,
            {
              success: false,
              error: `Unknown provider: ${providerId}`,
            } as PipelineResult<{
              url: string;
              title: string;
            }>,
          ] as const;
        }

        const data = this.getProviderData(changelogData, providerId);
        const markdown = adapter.generateMarkdown(data, summary, ctx);
        const result = await adapter.postDiscussion(markdown, summary, ctx);

        return [providerId, result] as const;
      }),
    );

    const succeeded: Record<string, { url: string; title: string }> = {};
    const failed: Record<string, string> = {};

    for (const [providerId, result] of results) {
      if (result.success) {
        succeeded[providerId] = result.data;
      } else {
        failed[providerId] = result.error;
      }
    }

    return { succeeded, failed };
  }

  /**
   * ChangelogDataから特定プロバイダーのデータを取得
   */
  getProviderData(
    changelogData: ChangelogData,
    providerId: string,
  ): ChangelogEntry[] | ReleaseEntry[] {
    return getProviderDataFromChangelog(changelogData, providerId);
  }

  /**
   * 単一プロバイダーの全処理を実行
   * （デバッグ・テスト用）
   */
  async runSingleProvider(
    providerId: string,
    changelogData: ChangelogData,
    summary: ProviderWeeklySummary,
    ctx: WeeklyContext,
  ): Promise<PipelineResult<{ url: string; title: string }>> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      return { success: false, error: `Unknown provider: ${providerId}` };
    }

    const data = this.getProviderData(changelogData, providerId);
    const markdown = adapter.generateMarkdown(data, summary, ctx);
    return await adapter.postDiscussion(markdown, summary, ctx);
  }
}

/**
 * デフォルトのOrchestratorインスタンスを作成
 */
export function createOrchestrator(): WeeklyOrchestrator {
  return new WeeklyOrchestrator();
}
