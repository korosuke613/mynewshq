// データローダーユーティリティ
// ChangelogData と BlogData の読み込みパターンを共通化

import type { BlogData, ChangelogData } from "../domain/types.ts";

/**
 * ChangelogData を指定した日付・モードで読み込む
 * @param date - YYYY-MM-DD 形式の日付文字列
 * @param weekly - 週次モードかどうか（デフォルト: false = 日次）
 * @returns ChangelogData オブジェクト
 * @throws ファイル読み込みまたはJSONパースに失敗した場合はエラーを出力して終了
 */
export async function loadChangelogData(
  date: string,
  weekly: boolean = false,
): Promise<ChangelogData> {
  const subDir = weekly ? "weekly" : "daily";
  const changelogPath = `data/changelogs/${subDir}/${date}.json`;

  try {
    const content = await Deno.readTextFile(changelogPath);
    return JSON.parse(content) as ChangelogData;
  } catch (error) {
    console.error(`Failed to read ${changelogPath}:`, error);
    Deno.exit(1);
  }
}

/**
 * BlogData を指定した日付・モードで読み込む
 * @param date - YYYY-MM-DD 形式の日付文字列
 * @param weekly - 週次モードかどうか（デフォルト: false = 日次）
 * @returns BlogData オブジェクト
 * @throws ファイル読み込みまたはJSONパースに失敗した場合はエラーを出力して終了
 */
export async function loadBlogData(
  date: string,
  weekly: boolean = false,
): Promise<BlogData> {
  const subDir = weekly ? "weekly" : "daily";
  const blogPath = `data/blogs/${subDir}/${date}.json`;

  try {
    const content = await Deno.readTextFile(blogPath);
    return JSON.parse(content) as BlogData;
  } catch (error) {
    console.error(`Failed to read ${blogPath}:`, error);
    Deno.exit(1);
  }
}

/**
 * 任意のJSONファイルを読み込む
 * @param filePath - JSONファイルのパス
 * @returns パースされたオブジェクト
 * @throws ファイル読み込みまたはJSONパースに失敗した場合はエラーを出力して終了
 */
export async function loadJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    Deno.exit(1);
  }
}
