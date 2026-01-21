// Provider統合モジュール
// 全Providerの登録、ヘルパー関数、fetchAll()を提供

import type { AnyEntry, ProviderConfig } from "./types.ts";
import { githubProvider } from "./github-provider.ts";
import { awsProvider } from "./aws-provider.ts";
import { claudeCodeProvider } from "./claude-code-provider.ts";
import { linearProvider } from "./linear-provider.ts";

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
