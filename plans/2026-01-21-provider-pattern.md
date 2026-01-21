# Provider Pattern によるサービス抽象化

## 目的

AWS, GitHub, Claude Code, Linear といったサービスをプロバイダーとして抽象化し、新規サービス追加・既存サービス修正を容易にする。

**現状**: 新サービス追加に8+ファイルの変更が必要
**目標**: 3-4ファイルの変更で済むようにする

## 現状の問題点

| 問題 | 詳細 |
|------|------|
| サービス名のハードコード | 11箇所でサービス名が直接記述されている |
| ロジックの分散 | ラベル抽出、絵文字取得、タイトル取得がファイル別に実装 |
| 型の二重管理 | ChangelogEntry と ReleaseEntry の2種類が混在 |

### ハードコード箇所

1. `scripts/domain/types.ts` - ChangelogData の各サービスプロパティ
2. `scripts/domain/label-extractor.ts` - determineLabels() のサービスチェック
3. `scripts/presentation/markdown/helpers.ts` - getCategoryEmoji() のマッピング
4. `scripts/presentation/markdown/daily-generator.ts` - セクション名（"GitHub Changelog"等）
5. `scripts/presentation/markdown/weekly-generator.ts` - 週次セクション名
6. `scripts/fetch-changelogs.ts` - 各サービスのfetch関数

## 設計

### Phase 1: Provider設定の集約

**新規ファイル**: `scripts/domain/providers.ts`

```typescript
export interface ProviderConfig {
  id: string;                    // "github", "aws", "claudeCode", "linear"
  displayName: string;           // "GitHub Changelog", "AWS What's New"
  emoji: string;                 // "🐙", "☁️", "🤖", "📐"
  labelName: string;             // "github", "aws", "claude-code", "linear"
  labelPrefix?: string;          // "gh:", "aws:" (サブカテゴリラベル用)
  transformLabel?: (label: string) => string;  // AWS用のプレフィックス除去など
}

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "github",
    displayName: "GitHub Changelog",
    emoji: "🐙",
    labelName: "github",
    labelPrefix: "gh:",
  },
  {
    id: "aws",
    displayName: "AWS What's New",
    emoji: "☁️",
    labelName: "aws",
    labelPrefix: "aws:",
    transformLabel: (label) => label.replace(/^(amazon-|aws-)/, ""),
  },
  {
    id: "claudeCode",
    displayName: "Claude Code",
    emoji: "🤖",
    labelName: "claude-code",
  },
  {
    id: "linear",
    displayName: "Linear Changelog",
    emoji: "📐",
    labelName: "linear",
  },
];

// ヘルパー関数
export function getProviderConfig(id: string): ProviderConfig | undefined;
export function getProviderEmoji(id: string): string;
export function getProviderDisplayName(id: string): string;
```

### Phase 2: ラベル抽出のリファクタリング

`scripts/domain/label-extractor.ts` を更新:

```typescript
import { PROVIDER_CONFIGS, getProviderConfig } from "./providers.ts";

export function determineLabels(
  data: ChangelogData,
  options?: { serviceOnly?: boolean }
): string[] {
  const labels: string[] = [];

  for (const config of PROVIDER_CONFIGS) {
    const entries = data[config.id as keyof ChangelogData];
    if (entries && entries.length > 0) {
      labels.push(config.labelName);

      if (!options?.serviceOnly && config.labelPrefix) {
        // サブカテゴリラベルの抽出
        // ...
      }
    }
  }

  return [...new Set(labels)];
}
```

### Phase 3: Markdown生成のリファクタリング

`scripts/presentation/markdown/helpers.ts`:

```typescript
import { getProviderEmoji } from "../../domain/providers.ts";

export function getCategoryEmoji(category: string): string {
  return getProviderEmoji(category);
}
```

`scripts/presentation/markdown/daily-generator.ts`:

```typescript
import { PROVIDER_CONFIGS, getProviderConfig } from "../../domain/providers.ts";

// セクション生成をプロバイダー設定ベースに
function generateSection(config: ProviderConfig, entries: Entry[]): string {
  return `## ${config.emoji} ${config.displayName}\n\n...`;
}
```

### Phase 4: データ取得のProvider化（将来拡張）

> 今回は Phase 3 までを実施。Phase 4-5 は将来の拡張時に検討。

## 対象ファイル

### 新規作成
- `scripts/domain/providers.ts` - Provider設定定義
- `scripts/domain/providers_test.ts` - テスト

### 変更
- `scripts/domain/label-extractor.ts` - Provider設定を使用
- `scripts/presentation/markdown/helpers.ts` - getCategoryEmoji をProvider化
- `scripts/presentation/markdown/daily-generator.ts` - セクション生成をProvider化
- `scripts/presentation/markdown/weekly-generator.ts` - 週次生成をProvider化

## 段階的移行計画

### Phase 1: Provider設定ファイル作成（低リスク）
1. `scripts/domain/providers.ts` を新規作成
2. 4サービスの設定を定義
3. ヘルパー関数（getProviderConfig, getProviderEmoji等）を実装
4. テストファイル `scripts/domain/providers_test.ts` を作成

### Phase 2: ラベル抽出のリファクタリング（中リスク）
1. `label-extractor.ts` の `determineLabels()` をProvider設定ベースに変更
2. 既存テストが通ることを確認

### Phase 3: Markdown生成のリファクタリング（中リスク）
1. `helpers.ts` の `getCategoryEmoji()` をProvider設定から取得
2. `daily-generator.ts` のセクション生成をProvider設定ベースに
3. `weekly-generator.ts` も同様に変更
4. 既存テストが通ることを確認

## 検証方法

各Phase完了後に以下を実行:

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# リントチェック
deno lint

# テスト実行
deno test

# 動作確認（ネットワーク環境がある場合）
deno task fetch
deno task preview
```

## 期待される効果

| 項目 | 現状 | 改善後 |
|------|------|--------|
| 新サービス追加 | 8+ファイル変更 | 3-4ファイル変更 |
| 設定の一元管理 | なし | `providers.ts` で集約 |
| コードの重複 | 11箇所でハードコード | Provider設定を参照 |

## 最終作業

- [ ] Phase 1: Provider設定ファイル作成
- [ ] Phase 2: ラベル抽出のリファクタリング
- [ ] Phase 3: Markdown生成のリファクタリング
- [ ] dev-standards skill を実行してチェック
- [ ] コミット作成
- [ ] プランファイルを `./plans/2026-01-21-provider-pattern.md` にリネーム
