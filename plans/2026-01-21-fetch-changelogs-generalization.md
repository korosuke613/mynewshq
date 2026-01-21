# Phase 5: fetch-changelogs.tsの汎用化

## 目的

`fetch-changelogs.ts`の個別プロバイダー処理を汎用化し、新サービス追加時の変更箇所をさらに最小化する。

## 現状の問題

```typescript
// 各プロバイダーを個別に扱っている（新サービス追加時に変更が必要）
let github = results.github as ChangelogEntry[];
let aws = results.aws as ChangelogEntry[];
let claudeCode = results.claudeCode as ReleaseEntry[];
let linear = results.linear as ChangelogEntry[];

// ミュートフィルタも個別に適用
github = applyMuteFilter(github, muteWords);
aws = applyMuteFilter(aws, muteWords);
// ...
```

## 設計方針

**ハイブリッドアプローチ**を採用：
- `ChangelogData`型は固定のまま維持（型安全性・後方互換性）
- ヘルパー関数で汎用ロジックを集約
- 呼び出し側を簡潔化

## 実装内容

### Step 1: providers/index.ts にヘルパー関数を追加

```typescript
// ミュートフィルタを全エントリに適用
export function applyMuteFilterToAll(
  results: Record<string, AnyEntry[]>,
  muteWords: string[]
): { filtered: Record<string, AnyEntry[]>; mutedCount: number };

// fetchAll結果をChangelogData形式に変換
export function toChangelogData(
  results: Record<string, AnyEntry[]>,
  dateString: string,
  options?: { startDate?: string; endDate?: string }
): ChangelogData;

// 全エントリの合計数を取得
export function getTotalEntryCount(results: Record<string, AnyEntry[]>): number;

// エントリが空かどうかを判定
export function hasNoEntries(results: Record<string, AnyEntry[]>): boolean;
```

### Step 2: fetch-changelogs.ts の簡素化

**Before（約25行）:**
```typescript
let github = results.github as ChangelogEntry[];
// ... 4変数の定義
if (muteWords.length > 0) {
  github = applyMuteFilter(github, muteWords);
  // ... 4回の個別適用
}
if (github.length === 0 && aws.length === 0 && ...) { ... }
```

**After（約10行）:**
```typescript
let filtered = results;
if (muteWords.length > 0) {
  const result = applyMuteFilterToAll(results, muteWords);
  filtered = result.filtered;
  console.log(`Muted ${result.mutedCount} entries`);
}
if (hasNoEntries(filtered)) { ... }
const data = toChangelogData(filtered, dateString, weeklyOptions);
```

### Step 3: テストの追加

`providers/providers_test.ts` に以下のテストを追加：
- `applyMuteFilterToAll` のテスト
- `toChangelogData` のテスト
- `getTotalEntryCount` / `hasNoEntries` のテスト

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/domain/providers/index.ts` | ヘルパー関数を追加 |
| `scripts/fetch-changelogs.ts` | ヘルパー関数を使用して簡素化 |
| `scripts/domain/providers/providers_test.ts` | 新しいヘルパー関数のテストを追加 |

## 新サービス追加時の変更箇所（Phase 5後）

| 変更箇所 | Phase 4後 | Phase 5後 |
|---------|----------|----------|
| `xxx-provider.ts` 新規作成 | ✅ | ✅ |
| `providers/index.ts` レジストリ登録 | ✅ | ✅ |
| `providers/index.ts` の `toChangelogData` | ― | ✅ |
| `domain/types.ts` の `ChangelogData` | ✅ | ✅ |
| `fetch-changelogs.ts` | ― | ― |

**注**: `toChangelogData`と`ChangelogData`型は連動して変更が必要だが、1箇所（providers/）に集約される。

## 検証方法

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# リントチェック
deno lint

# テスト実行
deno test

# 動作確認
deno task fetch
deno task preview
```

## 最終作業

- [ ] Step 1: ヘルパー関数の追加
- [ ] Step 2: fetch-changelogs.ts の簡素化
- [ ] Step 3: テストの追加
- [ ] dev-standards skill を実行してチェック
- [ ] コミット作成
- [ ] プランファイルを `./plans/2026-01-21-fetch-changelogs-generalization.md` にリネーム
