// 日付ユーティリティ
// 日付フォーマットと対象期間生成を共通化

/**
 * 今日の日付を YYYY-MM-DD 形式の文字列で取得
 * @returns YYYY-MM-DD 形式の日付文字列
 * @example getTodayDateString() // "2026-02-02"
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 日付文字列から YYYY-MM-DD 形式を取得
 * @param date - Date オブジェクト
 * @returns YYYY-MM-DD 形式の日付文字列
 * @example formatDateString(new Date("2026-02-02")) // "2026-02-02"
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 対象期間の文字列を生成（UTC 3:00 基準の24時間ウィンドウ）
 * cronスケジュール（UTC 3:00）と同じ時刻を使用し、
 * その時刻から過去24時間のウィンドウを対象期間として表示
 * @param dateStr - YYYY-MM-DD 形式の日付文字列
 * @returns 対象期間の文字列（例: "📅 **対象期間**: 2026-02-01 03:00 UTC ~ 2026-02-02 03:00 UTC"）
 */
export function formatCoveragePeriod(dateStr: string): string {
  const endDate = new Date(dateStr + "T03:00:00Z");
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  const formatDateTime = (date: Date): string => {
    return date.toISOString().replace("T", " ").replace(":00.000Z", " UTC");
  };

  return `📅 **対象期間**: ${formatDateTime(startDate)} ~ ${
    formatDateTime(endDate)
  }`;
}

/**
 * 週次用の対象期間の文字列を生成
 * @param startDateStr - YYYY-MM-DD 形式の開始日
 * @param endDateStr - YYYY-MM-DD 形式の終了日
 * @returns 対象期間の文字列（例: "📅 **対象期間**: 2026-01-27 ~ 2026-02-02 (1週間)"）
 */
export function formatWeeklyCoveragePeriod(
  startDateStr: string,
  endDateStr: string,
): string {
  return `📅 **対象期間**: ${startDateStr} ~ ${endDateStr} (1週間)`;
}
