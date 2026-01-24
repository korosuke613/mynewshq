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

// Blog要約用の型
export interface SelectedBlogTopic {
  url: string;
  title: string;
  reason: string; // なぜこのトピックを選定したか
}

// Blog要約データの型
export interface BlogSummaryData {
  hatenaBookmark: {
    selectedTopics: SelectedBlogTopic[]; // 選定されたトピック（上限なし）
    overview: string; // 全体の解説
  };
}
