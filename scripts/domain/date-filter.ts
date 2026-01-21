// 日付フィルタリング関連の純粋関数

// 1日のミリ秒数
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// 過去24時間以内かチェック
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - MILLISECONDS_PER_DAY);
  return date >= dayAgo && date <= now;
}

// 過去N日以内かチェック
export function isWithinDays(
  dateString: string,
  days: number,
  now: Date = new Date(),
): boolean {
  const date = new Date(dateString);
  const daysAgo = new Date(now.getTime() - days * MILLISECONDS_PER_DAY);
  return date >= daysAgo && date <= now;
}
