// Provider設定定義
// サービス（GitHub, AWS, Claude Code, Linear）の設定を一元管理

/**
 * プロバイダー設定の型定義
 */
export interface ProviderConfig {
  /** 内部ID（ChangelogDataのキーと一致） */
  id: string;
  /** 表示名（Markdown見出し用） */
  displayName: string;
  /** 絵文字（カテゴリ表示用） */
  emoji: string;
  /** ラベル名（Discussion用） */
  labelName: string;
  /** サブカテゴリラベルのプレフィックス（例: "gh:", "aws:"） */
  labelPrefix?: string;
  /** ラベル変換関数（例: AWS用のプレフィックス除去） */
  transformLabel?: (label: string) => string;
  /** エントリのタイトル取得方法（"title" または "version"） */
  titleField: "title" | "version";
  /** 公開日フィールド名 */
  pubDateField: "pubDate" | "publishedAt";
}

/**
 * プロバイダー設定一覧
 */
export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "github",
    displayName: "GitHub Changelog",
    emoji: "🐙",
    labelName: "github",
    labelPrefix: "gh:",
    titleField: "title",
    pubDateField: "pubDate",
  },
  {
    id: "aws",
    displayName: "AWS What's New",
    emoji: "☁️",
    labelName: "aws",
    labelPrefix: "aws:",
    transformLabel: (label: string) => label.replace(/^(amazon-|aws-)/, ""),
    titleField: "title",
    pubDateField: "pubDate",
  },
  {
    id: "claudeCode",
    displayName: "Claude Code",
    emoji: "🤖",
    labelName: "claude-code",
    titleField: "version",
    pubDateField: "publishedAt",
  },
  {
    id: "linear",
    displayName: "Linear Changelog",
    emoji: "📐",
    labelName: "linear",
    titleField: "title",
    pubDateField: "pubDate",
  },
];

/**
 * IDからプロバイダー設定を取得
 * @param id プロバイダーID（例: "github", "aws"）
 */
export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find((config) => config.id === id);
}

/**
 * IDからプロバイダーの絵文字を取得
 * @param id プロバイダーID
 * @returns 絵文字（見つからない場合はデフォルト "📌"）
 */
export function getProviderEmoji(id: string): string {
  const config = getProviderConfig(id);
  return config?.emoji ?? "📌";
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
