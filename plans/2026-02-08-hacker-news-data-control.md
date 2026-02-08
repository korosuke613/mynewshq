# Hacker Newsプロバイダー: 週次ブログ処理時のデータ量制御

## Context

Hacker Newsプロバイダー追加PR（`feat/add-hacker-news-provider`）において、週次ブログ実行時にHacker Newsの記事数が多すぎてプロンプト過多になる懸念がある。

**実データ分析（2026-02-06）:**
- 1日あたり約20件取得、JSONサイズ約10KB
- 「Show HN」投稿の `description` に全文が含まれ、1件で2.5KB超になるケースあり
- 週次集約（7日分）でHNだけで約70KB（≈17Kトークン）に達する可能性
- `getWeeklyBlogPrompt` にデータ件数・サイズの制限メカニズムが存在しない

## 方針

**Points順ソート + Top N件数上限 + description切り詰め** の複合アプローチを採用する。

## 実装ステップ

### Step 1: `hacker-news-provider.ts` にTop N制限を追加

**ファイル**: `scripts/domain/providers/hacker-news-provider.ts`

1. 定数 `MAX_ENTRIES_PER_FETCH = 5` を追加
2. 既存の日付フィルタ・title/linkチェック後に、`bookmarkCount`（= Points）降順でソート
3. 上位N件のみ返す（`entries.slice(0, MAX_ENTRIES_PER_FETCH)`）

```typescript
const MAX_ENTRIES_PER_FETCH = 5;

// ソート: Points降順（undefinedは最後に）
entries.sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0));

// 上位N件のみ返す
return entries.slice(0, MAX_ENTRIES_PER_FETCH);
```

**効果**: 週次最大35件（5件 × 7日）に制限。重要記事が優先的に残る。

### Step 2: `hacker-news-provider.ts` にdescription切り詰めを追加

**ファイル**: `scripts/domain/providers/hacker-news-provider.ts`

1. `truncateDescription()` 関数を追加（300文字上限）
2. エントリ作成時に適用
3. `extractPoints()` は切り詰め前の元データ（`item.contentSnippet`）から抽出するため影響なし

```typescript
const MAX_DESCRIPTION_LENGTH = 300;

export function truncateDescription(description: string): string {
  if (description.length <= MAX_DESCRIPTION_LENGTH) {
    return description;
  }
  return description.substring(0, MAX_DESCRIPTION_LENGTH) + "...";
}
```

**効果**: Show HN投稿の全文（2.5KB+）が300文字に収まる。

### Step 3: テスト追加

**ファイル**: `scripts/domain/providers/hacker-news-provider_test.ts`

- `truncateDescription` のテスト（短い文字列、長い文字列、空文字列）
- ソート順のテスト（Points降順、undefined時のハンドリング）
- 件数上限のテスト（N件超のデータ → N件に切り詰め）

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `scripts/domain/providers/hacker-news-provider.ts` | ソート、件数上限、description切り詰め追加 |
| `scripts/domain/providers/hacker-news-provider_test.ts` | テスト追加 |

## 想定効果

| 指標 | 変更前 | 変更後 |
|------|-------|-------|
| HN 1日あたり記事数 | 約20件 | 最大5件（Points上位） |
| HN 週次記事数 | 約140件 | 最大35件 |
| Show HN descriptionサイズ | 最大2.5KB+ | 最大300文字 |
| HN週次JSONサイズ | 約70KB | 約20-25KB（推計） |
| LLMトークン使用量（HN分） | 約17Kトークン | 約5-6Kトークン（推計） |

## 検証方法

```bash
# 1. テスト実行
deno test scripts/domain/providers/hacker-news-provider_test.ts

# 2. データ取得して件数確認
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog

# 3. 保存されたJSONでHN記事数が5件以下であることを確認
# 4. description長が300文字以下であることを確認

# 5. 週次プレビューで確認
./test-workflow.sh --weekly --category=blog --provider=hackerNews --skip-summarize
```
