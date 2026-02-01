// 共通型定義
// このファイルはプロジェクト全体で使用される型を集約します

// XML パース用の型（RSSフィード解析用）
export interface XmlCategory {
  "@domain"?: string;
  "#text"?: string;
}

export interface XmlItem {
  title: string;
  link: string;
  pubDate: string;
  "content:encoded": string;
  description: string;
  category?: XmlCategory | XmlCategory[];
}

export interface RssChannel {
  item?: XmlItem[];
}

export interface RssFeed {
  rss: {
    channel: RssChannel;
  };
}

// Changelog エントリの型
export interface ChangelogEntry {
  title: string;
  url: string;
  content: string;
  pubDate: string;
  muted?: boolean;
  mutedBy?: string;
  labels?: Record<string, string[]>;
}

// リリースエントリの型（Claude Code用）
export interface ReleaseEntry {
  version: string;
  url: string;
  body: string;
  publishedAt: string;
  muted?: boolean;
  mutedBy?: string;
}

// ブログエントリの型（はてなブックマーク等）
export interface BlogEntry {
  title: string;
  url: string;
  description: string;
  pubDate: string;
  bookmarkCount?: number;
  tags?: string[];
  muted?: boolean;
  mutedBy?: string;
  matchedCategories?: string[]; // カテゴリフィルターでマッチしたカテゴリ
}

// Changelogデータの型（JSON保存形式）
export interface ChangelogData {
  date: string;
  startDate?: string; // 週次の場合の開始日
  endDate?: string; // 週次の場合の終了日
  github: ChangelogEntry[];
  aws: ChangelogEntry[];
  claudeCode: ReleaseEntry[];
  linear: ChangelogEntry[];
}

// Blogデータの型（JSON保存形式）
export interface BlogData {
  date: string;
  startDate?: string; // 週次の場合の開始日
  endDate?: string; // 週次の場合の終了日
  hatenaBookmark: BlogEntry[];
}

// 要約データの型（キーはURL、値は要約文）
export interface SummaryData {
  github: Record<string, string>;
  aws: Record<string, string>;
  claudeCode: Record<string, string>;
  linear: Record<string, string>;
}

// 週次ハイライトエントリの型
export interface WeeklyHighlight {
  url: string;
  title: string;
  category: string; // "github" | "aws" | "claudeCode" | "linear"
  reason: string; // 選定理由
  impact: string; // 技術者への影響
}

// カテゴリ別総括の型
export interface CategorySummaries {
  github: string;
  aws: string;
  claudeCode: string;
  linear: string;
}

// 傾向分析の型
export interface TrendAnalysis {
  overallTrend: string; // 今週の技術動向
  crossCategoryInsights: string; // クロスカテゴリの洞察
  futureImplications: string; // 今後の展望
}

// 週次要約データの型
export interface WeeklySummaryData {
  weeklyHighlights: WeeklyHighlight[];
  categorySummaries: CategorySummaries;
  trendAnalysis: TrendAnalysis;
}

// Dailyリンクの型
export interface DailyLink {
  date: string;
  url: string;
  title: string;
}

// determineLabels関数のオプション型
export interface DetermineLabelsOptions {
  serviceOnly?: boolean; // trueの場合、サービス名ラベルのみを返す（週次用）
}

// Blog要約用の型（新形式：カテゴリごとグループ化）
export interface BlogCategoryEntry {
  url: string;
  title: string;
  comment: string; // 各記事へのコメント
}

export interface BlogCategoryGroup {
  category: string; // カテゴリ名（例: "AWS", "GitHub"）
  entries: BlogCategoryEntry[]; // カテゴリに属する記事
  categoryComment: string; // カテゴリ全体へのまとめコメント
}

// Blog要約データの型（新形式）
export interface BlogSummaryData {
  hatenaBookmark: {
    categories: BlogCategoryGroup[]; // カテゴリごとにグループ化された記事
  };
}

// =============================================================================
// 週次Changelog V2（プロバイダー単位の新形式）
// =============================================================================

// カテゴリグループ（GitHub/AWS用）
export interface CategoryGroup {
  /** カテゴリ名（"copilot", "s3"等） */
  category: string;
  /** カテゴリに属するエントリ */
  entries: Array<{
    url: string;
    title: string;
  }>;
  /** LLMによるコメント（2-3文） */
  comment: string;
  /** 過去との比較コメント（1-2文） */
  historicalContext: string;
}

// プロバイダー単位の週次要約
export interface ProviderWeeklySummary {
  /** プロバイダーID（"github", "aws", "claudeCode", "linear"） */
  providerId: string;
  /** ハイライト（3-5行の箇条書き文） */
  highlights: string[];
  /** カテゴリ別詳細（GitHub/AWS用） */
  categories?: CategoryGroup[];
  /** エントリ一覧（Claude Code/Linear用、カテゴリなしの場合） */
  entries?: Array<{
    url: string;
    title: string;
  }>;
  /** 全体コメント（カテゴリなしプロバイダー用） */
  overallComment?: string;
  /** 過去比較コメント（カテゴリなしプロバイダー用） */
  historicalContext?: string;
}

// 全プロバイダーの週次要約（新形式）
export interface WeeklySummaryDataV2 {
  github: ProviderWeeklySummary;
  aws: ProviderWeeklySummary;
  claudeCode: ProviderWeeklySummary;
  linear: ProviderWeeklySummary;
}

// 過去のDiscussion内容（プロバイダー別）
export interface PastWeeklyDiscussion {
  /** プロバイダーID */
  providerId: string;
  /** Discussion作成日 */
  date: string;
  /** DiscussionのURL */
  url: string;
  /** Discussion本文 */
  body: string;
}
