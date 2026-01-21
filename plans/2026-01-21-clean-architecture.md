# クリーンアーキテクチャ適用によるコードベースリファクタリング

## 目的
責務の分離、依存関係の整理、テスタビリティの向上を目的としたアーキテクチャ改善

## 現状の問題点

| 問題 | 詳細 |
|------|------|
| 型定義の重複 | `ChangelogEntry`, `ReleaseEntry`, `ChangelogData` が3ファイルで重複 |
| 責務の混在 | fetch-changelogs.ts (515行)、create-discussion.ts (979行) に複数責務 |
| 外部依存の強結合 | Octokit, rss-parser, graphql が直接使用されテストしにくい |

## 推奨ディレクトリ構造

```
scripts/
├── domain/                     # ドメイン層（ビジネスロジック・型定義）
│   ├── types.ts               # 共通型定義
│   ├── date-filter.ts         # 日付フィルタリング
│   ├── mute-filter.ts         # ミュートフィルタリング
│   ├── label-extractor.ts     # ラベル抽出
│   └── url-normalizer.ts      # URL正規化
│
├── presentation/               # プレゼンテーション層
│   └── markdown/
│       ├── daily-generator.ts       # 日次Markdown生成
│       ├── weekly-generator.ts      # 週次Markdown生成
│       ├── muted-section.ts         # ミュートセクション
│       └── helpers.ts               # ユーティリティ
│
├── fetch-changelogs.ts        # エントリポイント
├── create-discussion.ts       # エントリポイント
└── preview-discussion.ts      # エントリポイント
```

## 段階的移行計画

### Phase 1: 型定義の統合（低リスク）

**作業内容**:
1. `scripts/domain/types.ts` を作成
2. 重複型定義を移動:
   - `ChangelogEntry`, `ReleaseEntry`, `ChangelogData`
   - `SummaryData`, `WeeklySummaryData`, `DailyLink`
   - `XmlCategory` などの内部型
3. 各ファイルで import に変更
4. `preview-discussion.ts` のインライン型定義を削除

**対象ファイル**:
- `scripts/domain/types.ts` (新規作成)
- `scripts/fetch-changelogs.ts`
- `scripts/create-discussion.ts`
- `scripts/preview-discussion.ts`

### Phase 2: 純粋関数のDomain層への移動（低リスク）

**作業内容**:
1. `scripts/domain/date-filter.ts` を作成
   - `isRecent()`, `isWithinDays()` を移動
2. `scripts/domain/mute-filter.ts` を作成
   - `parseMuteWords()`, `isMuted()`, `applyMuteFilter()` を移動
3. `scripts/domain/label-extractor.ts` を作成
   - `extractLabelsFromCategories()`, `extractLabelsFromAWSCategory()`
   - `determineLabels()`, `stripAwsPrefix()` を移動
4. `scripts/domain/url-normalizer.ts` を作成
   - `normalizeUrl()` を移動
5. 元ファイルで再エクスポート（後方互換性）
6. テストファイルのimportパス更新

**対象ファイル**:
- `scripts/domain/date-filter.ts` (新規)
- `scripts/domain/mute-filter.ts` (新規)
- `scripts/domain/label-extractor.ts` (新規)
- `scripts/domain/url-normalizer.ts` (新規)
- `scripts/fetch-changelogs.ts`
- `scripts/create-discussion.ts`
- `scripts/fetch-changelogs_test.ts`
- `scripts/create-discussion_test.ts`

### Phase 3: Markdown生成のPresentation層への移動（中リスク）

**作業内容**:
1. `scripts/presentation/markdown/daily-generator.ts` を作成
   - `generateDefaultBody()`, `generateBodyWithSummaries()`
   - `generateCoveragePeriod()`, `generateTitle()` を移動
2. `scripts/presentation/markdown/weekly-generator.ts` を作成
   - `generateWeeklyBodyWithSummaries()`, `generateWeeklyCoveragePeriod()` を移動
3. `scripts/presentation/markdown/muted-section.ts` を作成
   - `generateMutedSection()` を移動
4. `scripts/presentation/markdown/helpers.ts` を作成
   - `getCategoryEmoji()`, `formatLabelsString()`, `generateMention()` を移動
5. 元ファイルで再エクスポート（後方互換性）

**対象ファイル**:
- `scripts/presentation/markdown/` (新規ディレクトリ)
- `scripts/create-discussion.ts`
- `scripts/preview-discussion.ts`
- `scripts/create-discussion_test.ts`

### Phase 4: モジュール別テストファイルの追加

**作業内容**:
1. `scripts/domain/date-filter_test.ts` を作成
   - `isRecent()`, `isWithinDays()` のテスト
2. `scripts/domain/mute-filter_test.ts` を作成
   - `parseMuteWords()`, `isMuted()`, `applyMuteFilter()` のテスト
3. `scripts/domain/label-extractor_test.ts` を作成
   - `extractLabelsFromCategories()`, `extractLabelsFromAWSCategory()`
   - `determineLabels()`, `stripAwsPrefix()` のテスト
4. `scripts/domain/url-normalizer_test.ts` を作成
   - `normalizeUrl()` のテスト
5. `scripts/presentation/markdown/helpers_test.ts` を作成
   - `getCategoryEmoji()`, `formatLabelsString()`, `getEntryTitle()` のテスト

**対象ファイル**:
- `scripts/domain/date-filter_test.ts` (新規)
- `scripts/domain/mute-filter_test.ts` (新規)
- `scripts/domain/label-extractor_test.ts` (新規)
- `scripts/domain/url-normalizer_test.ts` (新規)
- `scripts/presentation/markdown/helpers_test.ts` (新規)

### Phase 5: Infrastructure層の抽象化（今回はスコープ外）

> 今回は Phase 4 までを実施。Phase 5 は将来の拡張時に検討。

## 検証方法

各Phase完了後に以下を実行:

```bash
# 型チェック
deno check scripts/*.ts

# リントチェック
deno lint

# テスト実行（35テスト、185ステップが通ること）
deno test

# 動作確認（ネットワーク環境がある場合）
deno task fetch
```

## 最終作業

- [x] Phase 1: 型定義の統合
- [x] Phase 2: 純粋関数のDomain層への移動
- [x] Phase 3: Markdown生成のPresentation層への移動
- [x] Phase 4: モジュール別テストファイルの追加
- [x] dev-standards skill を実行してチェック
- [x] コミット作成
- [x] プランファイルを `./plans/2026-01-21-clean-architecture.md` にリネーム

## 備考

- 後方互換性のため、元ファイルから再エクスポートを行う
- Denoの制約により、相対パス + `.ts` 拡張子でインポートする
- Phase 5 は将来の拡張時に検討
