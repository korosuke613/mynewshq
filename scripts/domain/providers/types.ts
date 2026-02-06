// Provider関連の型定義
// 各Providerの設定とフェッチ関数のシグネチャを定義

import type { BlogEntry, ChangelogEntry, ReleaseEntry } from "../types.ts";

/**
 * コンテンツカテゴリ
 * - changelog: 技術系Changelog（GitHub, AWS, Claude Code, Linear等）
 * - blog: 技術ブログ記事（はてなブックマーク等）
 */
export type ContentCategory = "changelog" | "blog";

/**
 * 統一Entry型（ChangelogEntry, ReleaseEntry, または BlogEntry）
 */
export type AnyEntry = ChangelogEntry | ReleaseEntry | BlogEntry;

/**
 * Fetcherシグネチャ
 * データ取得関数の型定義
 */
export type FetcherFn<T extends AnyEntry = AnyEntry> = (
  targetDate: Date,
  days?: number,
) => Promise<T[]>;

/**
 * 統合Provider設定
 * 設定とデータ取得ロジックを1ファイルに統合するための型
 */
export interface ProviderConfig<T extends AnyEntry = AnyEntry> {
  /** 内部ID（ChangelogDataのキーと一致） */
  id: string;
  /** 表示名（Markdown見出し用） */
  displayName: string;
  /** 絵文字（カテゴリ表示用） */
  emoji: string;
  /** ラベル名（Discussion用） */
  labelName: string;
  /** コンテンツカテゴリ（changelog または blog） */
  category: ContentCategory;
  /** 固定カテゴリ名（設定すると全エントリにこのカテゴリが付与される） */
  fixedCategory?: string;
  /** サブカテゴリラベルのプレフィックス（例: "gh:", "aws:"） */
  labelPrefix?: string;
  /** ラベル変換関数（例: AWS用のプレフィックス除去） */
  transformLabel?: (label: string) => string;
  /** エントリのタイトル取得方法（"title" または "version"） */
  titleField: "title" | "version";
  /** 公開日フィールド名 */
  pubDateField: "pubDate" | "publishedAt";
  /** データ取得関数 */
  fetch: FetcherFn<T>;
}
