# コードベースリファクタリング計画

## 概要

DRY原則とクリーンアーキテクチャに従い、重複コードの削減とレイヤー違反の修正を行う。

**実施範囲**: Phase 1-3（共通ユーティリティ抽出、GraphQL層抽出、レイヤー違反修正）

## 特定された問題

### 重複コード（高優先度）

| 問題 | 重複箇所 | 影響ファイル数 |
|------|---------|---------------|
| CLI引数解析 | `arg.startsWith("--key=")` パターン | 8 |
| GITHUB_TOKEN検証 | 同一コード | 8 |
| 日付フォーマット | `toISOString().split("T")[0]` | 10 |
| データ読み込み | ChangelogData読み込みパターン | 4 |
| generateCoveragePeriod | 完全重複 | 2 |
| generateWeeklyCoveragePeriod | 完全重複 | 2 |

### アーキテクチャ問題（高優先度）

- **レイヤー違反**: `domain/weekly/adapters/base-adapter.ts:14-18` が `presentation/markdown/` をインポート
- **責務過多**: `base-adapter.ts` (465行) にGraphQL型・ラベル管理・アダプター本体が混在

### ハードコード（中優先度）

- プロバイダーリスト: `["github", "aws", "claudeCode", "linear"]` が複数箇所
- デフォルトリポジトリ: `"korosuke613"`, `"mynewshq"` が3箇所

---

## 実装計画

### Phase 1: 共通ユーティリティの抽出

#### 1.1 CLI引数解析の共通化

**新規作成**: `scripts/infrastructure/cli-parser.ts`

```typescript
export function parseArg(args: string[], key: string): string | undefined;
export function parseArgWithDefault(args: string[], key: string, defaultValue: string): string;
export function hasFlag(args: string[], flag: string): boolean;
export function requireGitHubToken(): string;
```

**変更ファイル**:
- scripts/fetch-changelogs.ts
- scripts/create-discussion.ts
- scripts/preview-discussion.ts
- scripts/weekly-orchestrator.ts
- scripts/post-weekly-provider.ts
- scripts/preview-weekly-provider.ts
- scripts/fetch-past-discussions.ts
- scripts/filter-muted-entries.ts

#### 1.2 日付・対象期間ユーティリティの共通化

**新規作成**: `scripts/infrastructure/date-utils.ts`

```typescript
export function getTodayDateString(): string;
export function formatCoveragePeriod(dateStr: string): string;
export function formatWeeklyCoveragePeriod(startDate: string, endDate: string): string;
```

**変更ファイル**:
- scripts/presentation/markdown/daily-generator.ts（generateCoveragePeriod削除）
- scripts/presentation/markdown/blog-generator.ts（generateCoveragePeriod削除）

#### 1.3 データローダーの共通化

**新規作成**: `scripts/infrastructure/data-loader.ts`

```typescript
export async function loadChangelogData(date: string, weekly?: boolean): Promise<ChangelogData>;
export async function loadBlogData(date: string, weekly?: boolean): Promise<BlogData>;
```

**変更ファイル**:
- scripts/post-weekly-provider.ts
- scripts/preview-weekly-provider.ts
- scripts/preview-discussion.ts

---

### Phase 2: GraphQL層の抽出

#### 2.1 GitHub GraphQLクライアントの抽出

**新規作成**: `scripts/infrastructure/github/graphql-client.ts`

base-adapter.ts と create-discussion.ts から共通のGraphQL型と操作を抽出:
- DiscussionCategory, Label, RepositoryData 等の型
- createDiscussion, searchDiscussions 等の操作

#### 2.2 ラベル管理の抽出

**新規作成**: `scripts/infrastructure/github/label-manager.ts`

- createNewLabel, addLabelsToDiscussion の共通化
- ACCESSIBLE_LABEL_COLORS の一元管理

---

### Phase 3: レイヤー違反の修正

#### 3.1 BaseAdapterからpresentation依存を除去

**方針**: Dependency Inversion（依存性逆転）を適用

1. `scripts/domain/weekly/types.ts` にMarkdownGenerator インターフェース追加
2. `scripts/presentation/markdown/weekly-markdown-generator.ts` に実装クラス作成
3. `base-adapter.ts` はインターフェースのみに依存
4. `weekly-orchestrator.ts` で実装を注入

---

## 検証方法

各Phase完了後:

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# テスト
deno task test

# 統合テスト
deno task test:integration

# 動作確認
deno task preview
deno task preview-weekly-provider -- --provider=github
```

---

## ファイル構成（完了後）

```
scripts/
├── infrastructure/           # 新規: インフラ層
│   ├── cli-parser.ts        # CLI引数解析
│   ├── data-loader.ts       # データ読み込み
│   ├── date-utils.ts        # 日付ユーティリティ
│   └── github/
│       ├── graphql-client.ts # GraphQL操作
│       └── label-manager.ts  # ラベル管理
├── domain/                   # 既存: ドメイン層（presentation依存を除去）
└── presentation/             # 既存: プレゼンテーション層
    └── markdown/
        └── weekly-markdown-generator.ts  # 新規: DI用実装
```

---

## TODO（実装後）

- [ ] プランファイルを `./plans/YYYY-MM-DD-refactoring-dry-clean-architecture.md` にリネーム
