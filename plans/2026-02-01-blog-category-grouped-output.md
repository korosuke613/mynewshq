# Blog出力フォーマット変更: カテゴリごとグループ化

## 目的

Blog Discussionの出力形式を「注目トピック選定」から「カテゴリごとのグループ化」に変更し、各カテゴリにまとめコメントを付ける。

## 現状 → 変更後

### Before（現在）
```markdown
### 注目トピック
- [タイトル1](URL1) - 選定理由1
- [タイトル2](URL2) - 選定理由2

### 解説
全体のoverview解説...
```

### After（変更後）
```markdown
## AWS (3件)

- [AWS Lambda新機能](url) - サーバーレス開発が便利に
- [S3コスト削減](url) - ストレージ最適化のベストプラクティス

**今日のAWS**: インフラ・コスト最適化系の記事が多く、効率的なクラウド運用への関心が高まっています。

---

## GitHub (2件)

- [GitHub Copilot活用](url) - AI支援による開発効率化
- [Actions最新機能](url) - CI/CDパイプラインの改善

**今日のGitHub**: AI支援開発とCI/CDの高度化がトレンドです。
```

## 設計決定事項

| 項目 | 決定 |
|------|------|
| 複数カテゴリマッチ | **全てのカテゴリに重複表示** |
| カテゴリ順序 | **Issue #118のキーワード順** |
| コメント生成 | LLMに任せる |
| 「その他」カテゴリ | なし（カテゴリフィルタで既に除外済み） |

## 変更対象ファイル

### 1. `scripts/domain/types.ts`
型定義の変更:
```typescript
// 新しい型を追加
export interface BlogCategoryEntry {
  url: string;
  title: string;
  comment: string;
}

export interface BlogCategoryGroup {
  category: string;
  entries: BlogCategoryEntry[];
  categoryComment: string;
}

// BlogSummaryDataを更新（既存のSelectedBlogTopicは削除）
export interface BlogSummaryData {
  hatenaBookmark: {
    categories: BlogCategoryGroup[];
  };
}
```

### 2. `scripts/presentation/markdown/blog-generator.ts`
Markdown生成ロジックの変更:
- `generateBlogBodyWithSummaries()` 関数を新形式に対応
- カテゴリごとにセクションを生成
- 各記事にコメント付き
- カテゴリごとにまとめコメント

### 3. `.github/workflows/daily-changelog.yml`
JSON SchemaとPromptの変更:
```yaml
# JSON Schema（新形式）
--json-schema '{
  "type":"object",
  "properties":{
    "hatenaBookmark":{
      "type":"object",
      "properties":{
        "categories":{
          "type":"array",
          "items":{
            "type":"object",
            "properties":{
              "category":{"type":"string"},
              "entries":{
                "type":"array",
                "items":{
                  "type":"object",
                  "properties":{
                    "url":{"type":"string"},
                    "title":{"type":"string"},
                    "comment":{"type":"string"}
                  },
                  "required":["url","title","comment"]
                }
              },
              "categoryComment":{"type":"string"}
            },
            "required":["category","entries","categoryComment"]
          }
        }
      },
      "required":["categories"]
    }
  },
  "required":["hatenaBookmark"]
}'
```

Prompt更新:
- カテゴリごとにグループ化するよう指示
- `matchedCategories` フィールドを参照するよう指示
- 複数カテゴリにマッチする場合は全てに表示
- カテゴリ順序はIssue #118のキーワード順

### 4. `scripts/preview-discussion.ts`
プレビュー用ダミーデータを新形式に更新

### 5. `spec/daily-changelog.md`
仕様書のBlog Discussion構造セクションを更新

## 実装順序

1. **型定義の変更** (`types.ts`)
   - BlogCategoryEntry, BlogCategoryGroup 型追加
   - BlogSummaryData 型更新

2. **Markdown生成ロジック** (`blog-generator.ts`)
   - generateBlogBodyWithSummaries() を新形式に対応
   - テストを追加

3. **ワークフロー更新** (`daily-changelog.yml`)
   - JSON Schema更新
   - Prompt更新

4. **プレビュー機能更新** (`preview-discussion.ts`)
   - ダミーデータを新形式に

5. **仕様書更新** (`spec/daily-changelog.md`)
   - Blog Discussion構造を新形式に更新

## 検証方法

1. **単体テスト**
   ```bash
   deno test scripts/presentation/markdown/blog-generator_test.ts
   ```

2. **プレビューテスト**
   ```bash
   deno task preview-blog
   ```

3. **統合テスト（手動）**
   - 実際のBlogデータで `deno task fetch-blog` を実行
   - 出力されたJSONの `matchedCategories` を確認
   - プレビューで出力形式を確認

4. **全テスト実行**
   ```bash
   deno task test
   ```

## プランファイルのリネーム

実装完了後: `plans/2026-02-01-blog-category-grouped-output.md`
