# 週次（Weekly）ニュース投稿機能の追加

## 概要

毎週月曜日 03:00 UTC に過去1週間分のchangelogをまとめてDiscussionに投稿する機能を追加する。

## 重要な制約

GitHub Actions上ではJSONファイルは一時的なものであり、過去のJSONファイルは存在しない。
そのため、週次実行時にはRSSフィードから直接7日分のデータを取得する必要がある。

## 実装内容

### 1. fetch-changelogs.ts の拡張

**変更内容**:
- `--days=N` オプション追加（デフォルト: 1）
- `isRecent()` 関数を `isWithinDays(dateString, days, now)` に拡張
- 週次用: `--days=7` で過去7日分を取得

```typescript
// 現在: 過去24時間のみ
export function isRecent(dateString: string, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return date >= dayAgo && date <= now;
}

// 拡張: 過去N日分を取得
export function isWithinDays(dateString: string, days: number, now: Date = new Date()): boolean {
  const date = new Date(dateString);
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= daysAgo && date <= now;
}
```

### 2. データファイル構造の変更

```
data/changelogs/
├── daily/
│   └── YYYY-MM-DD.json    # 日次データ
└── weekly/
    └── YYYY-MM-DD.json    # 週次データ（終了日を基準）
```

**ChangelogDataインターフェースの拡張**:
```typescript
interface ChangelogData {
  date: string;        // 単一日の場合
  startDate?: string;  // 週次の場合の開始日
  endDate?: string;    // 週次の場合の終了日
  github: ChangelogEntry[];
  aws: ChangelogEntry[];
  claudeCode: ReleaseEntry[];
  linear: ChangelogEntry[];
}
```

**変更内容**:
- `--weekly` オプション追加
- `generateWeeklyCoveragePeriod(startDate, endDate)` 関数追加
- タイトル生成の週次対応

**カテゴリ分け**:
- daily → `Daily` カテゴリ（新規作成）
- weekly → `Weekly` カテゴリ（新規作成）

※ ラベルではなくCategoryで分類

**ファイル**: `.github/workflows/weekly-changelog.yml`

```yaml
on:
  schedule:
    - cron: "0 3 * * 1"  # 毎週月曜日 03:00 UTC
  workflow_dispatch:
    inputs:
      end_date:
        description: "終了日 (YYYY-MM-DD形式、空欄で今日)"
```

ステップ:
1. 日付範囲の計算（終了日から7日前を開始日に）
2. `fetch-changelogs.ts --days=7` で7日分のデータ取得
3. Claude Code Action で要約生成
4. `create-discussion.ts --weekly korosuke613 mynewshq Weekly` でWeeklyカテゴリにDiscussion投稿

**事前準備**: GitHub DiscussionsにWeeklyカテゴリを手動で作成

### 5. deno.json のタスク追加

```json
{
  "tasks": {
    "fetch-weekly": "deno run --allow-net --allow-read --allow-write --allow-env scripts/fetch-changelogs.ts --days=7",
    "preview-weekly": "deno run --allow-read --allow-write --allow-env scripts/preview-discussion.ts --weekly"
  }
}
```

---

## Discussion形式

**タイトル**: `📰 Tech Changelog - Weekly (2026-01-13 ~ 2026-01-20)`

**ボディ**:
```markdown
# 📰 Tech Changelog - Weekly

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## GitHub Changelog
### [タイトル](URL)
`label1` `label2`
**要約**: ...

## AWS What's New
...

## Claude Code
...

## Linear Changelog
...

<details>
<summary>ミュートされたエントリ (N件)</summary>
...
</details>

---
cc: @korosuke613
```

**カテゴリ**: `Weekly`（新規作成）
**ラベル**: `github`, `aws`, `claude-code`, `linear` + サブカテゴリラベル

---

## 修正対象ファイル

| ファイル | 変更 |
|---------|------|
| `scripts/fetch-changelogs.ts` | `--days=N` オプション追加、`isWithinDays()` 関数追加 |
| `scripts/fetch-changelogs_test.ts` | `isWithinDays()` テスト追加 |
| `scripts/create-discussion.ts` | 週次対応を追加 |
| `scripts/create-discussion_test.ts` | 週次テスト追加 |
| `scripts/preview-discussion.ts` | 週次プレビュー対応 |
| `.github/workflows/daily-changelog.yml` | カテゴリを `General` → `Daily` に変更、ファイルパスを `daily/` に変更 |
| `.github/workflows/weekly-changelog.yml` | 新規作成 |
| `deno.json` | タスク追加 |

## 事前準備（完了済み）

GitHub Discussionsに以下のカテゴリを作成済み:
- `Daily` - 日次changelog用
- `Weekly` - 週次changelog用

---

## 検証方法

1. `deno test` - 全テストパス確認
2. `deno task fetch --days=7` - 7日分のデータ取得確認
3. `deno task preview-weekly` - 週次プレビュー確認
4. GitHub Actions の手動実行でワークフロー動作確認
