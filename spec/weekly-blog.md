# 週次Blog機能仕様書

## 1. 機能概要

### 目的と背景

週次Blog機能は、1週間分の技術系ブログ記事を自動収集し、カテゴリ別にグループ化してGitHub Discussionsに投稿するシステムです。

日次Blog機能と同様に、はてなブックマークから技術記事を収集し、AI要約を付与して週次ニュースレターとして提供します。

### 対象サービス

| プロバイダーID | 表示名 | データソース |
|---------------|--------|-------------|
| `hatenaBookmark` | はてなブックマーク | はてなブックマーク（テクノロジーカテゴリ） |

---

## 2. ワークフロートリガー

### スケジュール実行

- **実行時刻**: 毎週水曜日 10:00 JST（UTC 1:00）
- **投稿先カテゴリ**: `Weekly`

### 手動実行

- **パラメータ**: 終了日（YYYY-MM-DD形式、省略時は当日）
- **投稿先カテゴリ**: `Weekly`

---

## 3. Discussion構成

### タイトル形式

```
📰 Tech Blog - Weekly (YYYY-MM-DD)
```

例：
- `📰 Tech Blog - Weekly (2026-02-01)`

### Discussion構造

Discussionは以下のセクションで構成されます：

1. **ヘッダー**: タイトルと対象期間
2. **今週のハイライト**: 3-5行の箇条書きで今週の重要なトピックをまとめる
3. **カテゴリ別詳細**: 技術カテゴリごとにグループ化した記事リスト

### Discussionラベル

各Discussionには以下のラベルが自動付与されます：

1. **プロバイダーラベル**: `Blog`
2. **サブカテゴリラベル**: 元データの`matchedCategories`フィールドから抽出
   - 例: `blog:aws`, `blog:git`, `blog:github`, `blog:docker`, `blog:claude code`

ラベル生成ルールは日次と同じです（`spec/daily-changelog.md` 参照）。

---

## 4. カテゴリ分類ルール

### はてなブックマーク（matchedCategoriesベースの分類）

はてなブックマークのエントリは`matchedCategories`フィールドを使用して分類します：

```json
{
  "matchedCategories": ["aws", "docker"]
}
```

分類ルール：
1. `matchedCategories`フィールドの値をカテゴリとして使用
2. 複数カテゴリにマッチする記事は、各カテゴリに重複登録
3. `matchedCategories`が空の記事はスキップ（週次要約には含めない）

主なカテゴリ例：
- `aws`: AWS関連
- `git`: Git関連
- `github`: GitHub関連
- `docker`: Docker関連
- `claude code`: Claude Code関連
- `typescript`: TypeScript関連
- `rust`: Rust関連

---

## 5. LLM生成コンテンツ

### ハイライト

Discussion冒頭に3-5行のハイライトを箇条書きで含めます。

ハイライトの内容：
- 今週の技術トレンドや注目記事
- 技術者に影響のあるトピック
- 複数のカテゴリで言及されている共通テーマ

選定基準：
1. **技術的インパクト**: 開発者コミュニティで話題になっているトピック
2. **新技術・新サービス**: 新しくリリースされた技術やサービス
3. **ベストプラクティス**: 実践的な技術記事
4. **トレンド**: 複数の記事で言及されている技術動向

### カテゴリ別コメント

各カテゴリに対してコメントを生成します：

- **記事コメント**: 各記事の技術的なポイントを1文で簡潔に説明
- **カテゴリコメント**: カテゴリ全体のトレンドや傾向を1-2文で説明

---

## 6. データフロー

### 入力データ

1. **週次Blogデータ**: `data/blogs/weekly/{date}.json`
2. **フィルタ済みデータ**: `data/blogs/weekly/{date}-filtered.json`（ミュート適用後）

### 処理フロー

```
1. 週次データ取得（fetch-changelogs.ts --weekly --category=blog）
   ↓
2. ミュートフィルタ適用（filter-muted）
   ↓
3. LLMによる要約生成（Claude Code Action）
   - hatenaBookmark用の WeeklySummary を生成
   ↓
4. Discussion投稿（create-discussion.ts）
   - generateWeeklyBlogBody() でMarkdown生成
   - createDiscussion() で投稿
```

### 出力形式

Discussion本文（Markdown）を生成。

---

## 7. 型定義

### WeeklySummary（Blog用）

```typescript
export interface WeeklySummary {
  /** ハイライト（3-5行の箇条書き文） */
  highlights: string[];
  /** カテゴリ別詳細 */
  categories: Array<{
    /** カテゴリ名（matchedCategoriesの値） */
    category: string;
    /** カテゴリに属する記事 */
    entries: Array<{
      url: string;
      title: string;
      /** 記事へのコメント（1文） */
      comment: string;
    }>;
    /** カテゴリ全体のまとめコメント（1-2文） */
    categoryComment: string;
  }>;
}
```

---

## 8. Markdown出力形式

```markdown
# 📰 Tech Blog - Weekly

📅 **対象期間**: 2026-01-25 ~ 2026-02-01 (1週間)

## 🌟 今週のハイライト

- AWSの新サービス発表が相次ぎ、クラウドインフラのトレンドが明確に
- Rust言語の採用事例が増加し、パフォーマンス重視の開発が加速
- AI開発ツールに関する記事が多数投稿され、開発体験向上への関心が高まる

## 📊 カテゴリ別詳細

### aws (5件)

- [AWS Lambda の新機能が発表されました](https://example.com/1)
  - サーバーレスアーキテクチャの効率化に貢献する新機能

- [S3のコスト最適化テクニック](https://example.com/2)
  - ストレージコストを削減するための実践的な方法

**カテゴリコメント**: 今週はAWSの新機能発表が目立ち、特にLambdaとS3周りの改善が注目されています。

---

### docker (3件)

- [Dockerコンテナのセキュリティベストプラクティス](https://example.com/3)
  - プロダクション環境での安全なコンテナ運用方法

**カテゴリコメント**: コンテナセキュリティに関する記事が増加し、本番環境での運用ノウハウが共有されています。
```

---

## 9. 実装ファイル一覧

| ファイル | 役割 |
|---------|------|
| `scripts/fetch-changelogs.ts` | 週次データ取得（既存、`--weekly --category=blog`対応済み） |
| `scripts/create-discussion.ts` | Discussion投稿（既存、`--weekly --category=blog`対応済み） |
| `scripts/preview-discussion.ts` | プレビュー生成（既存、`--weekly --category=blog`対応済み） |
| `scripts/presentation/markdown/weekly-generator.ts` | Markdown生成（既存、Blog対応追加が必要な場合） |
| `.github/workflows/weekly-blog.yml` | ワークフロー（新規作成） |
| `deno.json` | タスク追加 |

---

## 10. コマンド一覧

```bash
# 週次Blogデータ取得
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly-blog
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly-blog --date=2026-02-01

# プレビュー
deno task preview-weekly-blog
deno task preview-weekly-blog --date=2026-02-01

# Discussion投稿
GITHUB_TOKEN=$(gh auth token) deno task post --weekly --category=blog
GITHUB_TOKEN=$(gh auth token) deno task post --weekly --category=blog --date=2026-02-01
```

---

## 11. 週次Changelogとの違い

| 項目 | 週次Changelog | 週次Blog |
|------|--------------|----------|
| プロバイダー数 | 4つ（GitHub, AWS, Claude Code, Linear） | 1つ（はてなブックマーク） |
| matrix戦略 | あり（並列処理） | なし（単一処理） |
| 過去Discussion参照 | あり | なし |
| カテゴリ分類 | labels/products | matchedCategories |
| 投稿数/実行 | プロバイダーごと | 1件 |
| Discussion構造 | プロバイダー別に分割 | 単一Discussion |
