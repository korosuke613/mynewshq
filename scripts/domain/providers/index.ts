// Provider統合モジュール
// 全Providerの登録、ヘルパー関数、fetchAll()を提供

import type { AnyEntry, ProviderConfig } from "./types.ts";
import type { ChangelogData, ChangelogEntry, ReleaseEntry } from "../types.ts";
import { githubProvider } from "./github-provider.ts";
import { awsProvider } from "./aws-provider.ts";
import { claudeCodeProvider } from "./claude-code-provider.ts";
import { linearProvider } from "./linear-provider.ts";
import { applyMuteFilter } from "../mute-filter.ts";

// 型を再エクスポート
export type { AnyEntry, FetcherFn, ProviderConfig } from "./types.ts";

/**
 * Providerリスト（登録順序を保持）
 */
export const PROVIDER_CONFIGS: ProviderConfig[] = [
  githubProvider,
  awsProvider,
  claudeCodeProvider,
  linearProvider,
];

/**
 * Providerレジストリ（IDによる高速アクセス用）
 */
export const PROVIDER_REGISTRY: Map<string, ProviderConfig> = new Map(
  PROVIDER_CONFIGS.map((config) => [config.id, config]),
);

/**
 * IDからプロバイダー設定を取得
 * @param id プロバイダーID（例: "github", "aws"）
 */
export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDER_REGISTRY.get(id);
}

/**
 * IDからプロバイダーの絵文字を取得
 * @param id プロバイダーID
 * @returns 絵文字（見つからない場合はデフォルト "📌"）
 */
export function getProviderEmoji(id: string): string {
  const config = getProviderConfig(id);
  return config?.emoji ?? "\u{1F4CC}";
}

/**
 * IDからプロバイダーの表示名を取得
 * @param id プロバイダーID
 * @returns 表示名（見つからない場合はID自体を返す）
 */
export function getProviderDisplayName(id: string): string {
  const config = getProviderConfig(id);
  return config?.displayName ?? id;
}

/**
 * IDからプロバイダーのラベル名を取得
 * @param id プロバイダーID
 * @returns ラベル名（見つからない場合はID自体を返す）
 */
export function getProviderLabelName(id: string): string {
  const config = getProviderConfig(id);
  return config?.labelName ?? id;
}

/**
 * 全プロバイダーIDの配列を取得
 */
export function getProviderIds(): string[] {
  return PROVIDER_CONFIGS.map((config) => config.id);
}

/**
 * 全Providerを並列実行してデータを取得
 * @param targetDate 対象日
 * @param days 取得する日数（デフォルト: 1）
 * @returns 各ProviderのID → エントリ配列のマップ
 */
export async function fetchAll(
  targetDate: Date,
  days: number = 1,
): Promise<Record<string, AnyEntry[]>> {
  const results = await Promise.all(
    PROVIDER_CONFIGS.map(async (config) => {
      const entries = await config.fetch(targetDate, days);
      return [config.id, entries] as const;
    }),
  );

  return Object.fromEntries(results);
}

// =============================================================================
// 汎用ヘルパー関数（fetch-changelogs.ts の簡素化用）
// =============================================================================

/**
 * ミュートフィルタを全エントリに適用
 * @param results fetchAll()の結果
 * @param muteWords ミュートワードの配列
 * @returns フィルタ適用後の結果とミュートされたエントリ数
 */
export function applyMuteFilterToAll(
  results: Record<string, AnyEntry[]>,
  muteWords: string[],
): { filtered: Record<string, AnyEntry[]>; mutedCount: number } {
  const filtered: Record<string, AnyEntry[]> = {};
  let mutedCount = 0;

  for (const [key, entries] of Object.entries(results)) {
    const filteredEntries = applyMuteFilter(entries, muteWords);
    filtered[key] = filteredEntries;
    mutedCount += filteredEntries.filter((e) => e.muted).length;
  }

  return { filtered, mutedCount };
}

/**
 * fetchAll結果をChangelogData形式に変換
 * @param results fetchAll()の結果（ミュートフィルタ適用済み）
 * @param dateString 対象日（YYYY-MM-DD形式）
 * @param options オプション（週次の場合の開始日・終了日）
 */
export function toChangelogData(
  results: Record<string, AnyEntry[]>,
  dateString: string,
  options?: { startDate?: string; endDate?: string },
): ChangelogData {
  const base: ChangelogData = {
    date: dateString,
    github: (results.github ?? []) as ChangelogEntry[],
    aws: (results.aws ?? []) as ChangelogEntry[],
    claudeCode: (results.claudeCode ?? []) as ReleaseEntry[],
    linear: (results.linear ?? []) as ChangelogEntry[],
  };

  if (options?.startDate && options?.endDate) {
    return {
      ...base,
      startDate: options.startDate,
      endDate: options.endDate,
    };
  }

  return base;
}

/**
 * 全エントリの合計数を取得
 * @param results fetchAll()の結果
 */
export function getTotalEntryCount(
  results: Record<string, AnyEntry[]>,
): number {
  return Object.values(results).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
}

/**
 * エントリが空かどうかを判定
 * @param results fetchAll()の結果
 */
export function hasNoEntries(results: Record<string, AnyEntry[]>): boolean {
  return getTotalEntryCount(results) === 0;
}
