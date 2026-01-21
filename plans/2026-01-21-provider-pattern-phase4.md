# Phase 4: データ取得のProvider化（統合アプローチ）

## 目的

設定とデータ取得ロジックをサービスごとに1ファイルに統合し、新サービス追加時の変更箇所を最小化する。

## 現状の問題

1. サービス設定が `providers.ts` にある
2. フェッチ関数が `fetch-changelogs.ts` にある
3. 新サービス追加時に複数ファイルを変更する必要がある

## 設計方針

**統合Providerパターン**を採用：
- 各サービスの設定とフェッチ関数を1ファイルに統合
- `providers/` ディレクトリで一元管理
- 新サービス追加 = 1ファイル追加 + レジストリ登録

## 新規ファイル構造

```
scripts/domain/providers/
├── types.ts              # Provider関連の型定義
├── index.ts              # レジストリ、fetchAll()、ヘルパー関数
├── github-provider.ts    # GitHub設定 + フェッチ
├── aws-provider.ts       # AWS設定 + フェッチ
├── claude-code-provider.ts # Claude Code設定 + フェッチ
├── linear-provider.ts    # Linear設定 + フェッチ
└── providers_test.ts     # テスト
```

既存の `scripts/domain/providers.ts` は `providers/index.ts` に移行。

## 型設計

### scripts/domain/providers/types.ts

```typescript
import type { ChangelogEntry, ReleaseEntry } from "../types.ts";

/** 統一Entry型 */
export type AnyEntry = ChangelogEntry | ReleaseEntry;

/** Fetcherシグネチャ */
export type FetcherFn<T extends AnyEntry = AnyEntry> = (
  targetDate: Date,
  days?: number,
) => Promise<T[]>;

/** 統合Provider設定 */
export interface ProviderConfig<T extends AnyEntry = AnyEntry> {
  /** 内部ID（ChangelogDataのキーと一致） */
  id: string;
  /** 表示名（Markdown見出し用） */
  displayName: string;
  /** 絵文字（カテゴリ表示用） */
  emoji: string;
  /** ラベル名（Discussion用） */
  labelName: string;
  /** サブカテゴリラベルのプレフィックス */
  labelPrefix?: string;
  /** ラベル変換関数 */
  transformLabel?: (label: string) => string;
  /** データ取得関数 */
  fetch: FetcherFn<T>;
}
```

### scripts/domain/providers/index.ts

```typescript
// 全Providerをレジストリに登録
export const PROVIDER_REGISTRY: Map<string, ProviderConfig> = new Map([...]);

// ヘルパー関数（既存のproviders.tsから移行）
export function getProviderConfig(id: string): ProviderConfig | undefined;
export function getProviderEmoji(id: string): string;
export function getProviderDisplayName(id: string): string;
export function getProviderLabelName(id: string): string;
export function getProviderIds(): string[];

// 全Providerを並列実行
export async function fetchAll(
  targetDate: Date,
  days?: number,
): Promise<Record<string, AnyEntry[]>>;
```

### 各Providerファイルの例（github-provider.ts）

```typescript
import type { ChangelogEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
// ... 必要なインポート

async function fetchGitHubChangelog(
  targetDate: Date,
  days: number = 1,
): Promise<ChangelogEntry[]> {
  // 既存実装
}

export const githubProvider: ProviderConfig<ChangelogEntry> = {
  id: "github",
  displayName: "GitHub Changelog",
  emoji: "🐙",
  labelName: "github",
  labelPrefix: "gh:",
  fetch: fetchGitHubChangelog,
};
```

## 実装手順

### Step 1: 型定義の作成
- `scripts/domain/providers/types.ts` を新規作成
- `AnyEntry`, `FetcherFn`, `ProviderConfig` を定義

### Step 2: 各Providerファイルの作成
- 既存の `providers.ts` の設定と `fetch-changelogs.ts` のフェッチ関数を統合
- `github-provider.ts`, `aws-provider.ts`, `claude-code-provider.ts`, `linear-provider.ts` を作成

### Step 3: providers/index.ts の作成
- レジストリ（`PROVIDER_REGISTRY`）を作成
- ヘルパー関数を移行（`getProviderEmoji` など）
- `fetchAll()` を実装

### Step 4: 既存ファイルの更新
- `scripts/domain/providers.ts` を削除（providers/index.ts に移行）
- `scripts/fetch-changelogs.ts` のフェッチ関数を削除、`fetchAll()` を使用
- インポートパスを更新（providers.ts → providers/index.ts）

### Step 5: テストの追加・移行
- `scripts/domain/providers/providers_test.ts` を作成
- 既存の `providers_test.ts` のテストを移行
- 新しいテスト（レジストリ、fetchAll）を追加

## 変更対象ファイル

### 新規作成
- `scripts/domain/providers/types.ts`
- `scripts/domain/providers/index.ts`
- `scripts/domain/providers/github-provider.ts`
- `scripts/domain/providers/aws-provider.ts`
- `scripts/domain/providers/claude-code-provider.ts`
- `scripts/domain/providers/linear-provider.ts`
- `scripts/domain/providers/providers_test.ts`

### 削除
- `scripts/domain/providers.ts` → providers/index.ts に移行
- `scripts/domain/providers_test.ts` → providers/providers_test.ts に移行

### 変更
- `scripts/fetch-changelogs.ts` - フェッチ関数削除、fetchAll()使用
- `scripts/domain/label-extractor.ts` - インポートパス更新
- `scripts/presentation/markdown/helpers.ts` - インポートパス更新
- `scripts/presentation/markdown/daily-generator.ts` - インポートパス更新
- `scripts/presentation/markdown/weekly-generator.ts` - インポートパス更新

## 新サービス追加時の変更箇所（改善後）

| Before（現状） | After（Phase 4後） |
|----------------|-------------------|
| `fetch-changelogs.ts`にfetch関数追加 | ― |
| `fetch-changelogs.ts`のPromise.allに追加 | ― |
| `domain/providers.ts`に設定追加 | `providers/xxx-provider.ts`を新規作成 |
| ― | `providers/index.ts`にレジストリ登録 |
| `domain/types.ts`のChangelogDataに追加 | （同じ） |
| `presentation/markdown/*.ts`に表示ロジック追加 | （同じ） |

**改善点**:
- 設定とフェッチが1ファイルにまとまる
- `fetch-changelogs.ts`のmain()を変更不要

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

- [ ] Step 1: 型定義の作成
- [ ] Step 2: 各Providerファイルの作成（4ファイル）
- [ ] Step 3: providers/index.ts の作成
- [ ] Step 4: 既存ファイルの更新
- [ ] Step 5: テストの追加・移行
- [ ] dev-standards skill を実行してチェック
- [ ] コミット作成
- [ ] プランファイルを `./plans/2026-01-21-provider-pattern-phase4.md` にリネーム
