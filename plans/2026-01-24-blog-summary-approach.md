# Blog カテゴリの要約アプローチ変更計画

## 概要

blogカテゴリでは、changelog と異なるアプローチで要約を生成する。
個別エントリの要約ではなく、LLMが開発者向けトピックを選定し、まとめて解説する。

## 要件

- **トピック数**: 上限なし（関連するものは全て含める）
- **選定基準**: 開発者向け全般
  - 開発生産性、GitHub、AWS、Claude
  - プログラミング全般、DevOps、AI/ML など

---

## 設計

### 要約データ構造

```typescript
// scripts/domain/types.ts に追加

interface SelectedBlogTopic {
  url: string;
  title: string;
  reason: string;  // なぜこのトピックを選定したか
}

interface BlogSummaryData {
  hatenaBookmark: {
    selectedTopics: SelectedBlogTopic[];  // 選定されたトピック（上限なし）
    overview: string;                      // 全体の解説
  };
}
```

### Markdown 出力フォーマット

```markdown
## Hatena Bookmark

本日のはてなブックマークから、開発者向けの注目記事をピックアップしました。

### 注目トピック

- [記事タイトル1](URL1) - 選定理由
- [記事タイトル2](URL2) - 選定理由
- [記事タイトル3](URL3) - 選定理由
（関連記事は全て含める）

### 解説

{全体的な解説・トレンド分析}
```

---

## 変更対象ファイル

### 1. 型定義
**ファイル**: `scripts/domain/types.ts`
- `SelectedBlogTopic` インターフェース追加
- 既存の `BlogSummaryData` は `scripts/presentation/markdown/blog-generator.ts` にあるので、types.ts に移動

### 2. Markdown生成
**ファイル**: `scripts/presentation/markdown/blog-generator.ts`
- `BlogSummaryData` 型を types.ts からインポートに変更
- `generateBlogBodyWithSummaries()` を新しいフォーマットに対応

### 3. ワークフロー
**ファイル**: `.github/workflows/daily-changelog.yml`
- Claude Code への JSON スキーマを更新
- プロンプトを更新：トピック選定 + 全体解説を依頼

---

## 実装手順

1. `scripts/domain/types.ts` に `SelectedBlogTopic` と `BlogSummaryData` を追加
2. `blog-generator.ts` の型インポートを変更
3. `generateBlogBodyWithSummaries()` を新しいフォーマットに更新
4. `generateDefaultBlogBody()` も整合性のために更新（要約なし時のフォーマット）
5. ワークフローの JSON スキーマとプロンプトを更新
6. テスト実行、プレビュー確認

---

## 検証方法

```bash
# 型チェック
deno check scripts/*.ts scripts/**/*.ts

# テスト実行
deno task test

# lint/format
deno lint && deno fmt --check

# blogデータ取得（手動テスト）
GITHUB_TOKEN=$(gh auth token) deno task fetch-blog

# プレビュー確認
deno task preview-blog
```
