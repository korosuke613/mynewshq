# isRecent() 関数のバグ修正

## 問題

`--date=2026-01-10` を指定しても50件のエントリが取得される。

### 原因

`isRecent()` 関数が「指定日の24時間前以降のすべて」を返している：

```typescript
// 現在の実装
return date >= dayAgo;  // 上限がない！
```

例：`--date=2026-01-10` の場合
- `now` = 2026-01-10 23:59:59 UTC
- `dayAgo` = 2026-01-09 23:59:59 UTC
- RSSフィードの記事（2026-01-18付近）は全て `dayAgo` より後 → 全部マッチ

## 修正

`scripts/fetch-changelogs.ts:42` の `isRecent()` 関数に上限チェックを追加：

```typescript
// 修正後
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return date >= dayAgo && date <= now;  // 上限も追加
}
```

## 検証

```bash
# 過去の日付で実行し、件数が妥当か確認
deno task fetch -- --date=2026-01-10

# 今日の日付でも正常動作を確認
deno task fetch
```
