# Blog記事のカテゴリフィルタリング機能

## 目的

ブログ機能で収集される記事がトピック散らばっており、設定したカテゴリ（aws, github, ...）ごとにトピックをまとめ、関係ないものは表示しないようにする。

## 実装内容

### 1. カテゴリフィルタリング機能の実装 (`scripts/domain/category-filter.ts`)

新規作成。以下の関数を実装:

- **`parseCategoryKeywords(issueBody: string): string[]`**
  - GitHub Issueの本文から箇条書き（`- keyword`）形式でカテゴリキーワードを抽出
  - 空白や非箇条書き行は無視

- **`matchesCategory(text: string, categoryKeywords: string[]): string | null`**
  - テキストがカテゴリキーワードに部分一致するかチェック（大文字小文字無視）
  - マッチしたキーワードを返す（マッチしない場合は `null`）

- **`findMatchedCategories(entry, categoryKeywords: string[]): string[]`**
  - エントリのタイトル、タグ、説明文を順にチェック
  - マッチしたカテゴリを全て返す（重複なし）

- **`applyCategoryFilter<T>(entries: T[], categoryKeywords: string[]): { filtered, excludedCount }`**
  - エントリ配列にカテゴリフィルターを適用
  - マッチしたエントリのみを返し、`matchedCategories` フィールドを付与
  - カテゴリキーワードが空の場合はフィルタリングなし（全エントリを返す）

### 2. テストの追加 (`scripts/domain/category-filter_test.ts`)

新規作成。以下のテストケースを実装:

- `parseCategoryKeywords`: 箇条書き解析、空行処理、空ボディ処理
- `matchesCategory`: 大文字小文字無視、部分一致、マッチなし
- `findMatchedCategories`: タイトル/タグ/説明文からの検出、複数カテゴリマッチ
- `applyCategoryFilter`: フィルタリング動作、キーワード空の場合、全除外ケース

### 3. 型定義の拡張 (`scripts/domain/types.ts`)

`BlogEntry` 型に以下を追加:
```typescript
matchedCategories?: string[]; // カテゴリフィルターでマッチしたカテゴリ
```

### 4. メイン処理の更新 (`scripts/fetch-changelogs.ts`)

**新規関数**:
- **`fetchCategoryKeywords(octokit, owner, repo, issueNumber): Promise<string[]>`**
  - GitHub Issueからカテゴリキーワードリストを取得
  - Issue本文をパースして箇条書きキーワードを抽出
  - 最初の5個のキーワードをログ表示（5個以上ある場合は `...` を付ける）

**`processBlog` 関数の更新**:
- カテゴリキーワードのパラメータを追加
- ミュートフィルタの後にカテゴリフィルタを適用
- マッチしないエントリを除外し、除外数をログ表示

**`main` 関数の更新**:
- 環境変数 `CATEGORY_FILTER_ISSUE_NUMBER` を読み込み
- 設定されている場合のみ `fetchCategoryKeywords` を呼び出し
- `processBlog` にカテゴリキーワードを渡す

## フィルタリングの仕様

### 対象フィールド
カテゴリマッチングは以下のフィールドで順に実行:
1. `title` (タイトル)
2. `tags` (タグ配列)
3. `description` (説明文)

### マッチング条件
- 部分一致（`includes`）
- 大文字小文字を区別しない
- 複数のカテゴリにマッチする場合は全てを記録

### フィルタリング動作
- カテゴリキーワードが設定されている場合: マッチしたエントリのみ保持
- カテゴリキーワードが空の場合: 全てのエントリを保持（フィルタリングなし）

## 使用方法

### 環境変数の設定
```bash
export CATEGORY_FILTER_ISSUE_NUMBER=<issue番号>
```

### Issue本文のフォーマット
箇条書きでカテゴリキーワードを列挙:
```markdown
- aws
- github
- kubernetes
- terraform
```

### 実行例
```bash
GITHUB_TOKEN=$(gh auth token) CATEGORY_FILTER_ISSUE_NUMBER=123 deno task fetch-blog
```

## ログ出力

### カテゴリキーワード読み込み時
```
Loaded 7 category keywords from issue #123: aws, github, kubernetes, terraform, docker...
```

### フィルタリング実行後
```
Filtered out 15 hatenaBookmark entries (not matching categories: aws, github, kubernetes, terraform, docker...)
```

## 処理フロー

```
1. 環境変数から CATEGORY_FILTER_ISSUE_NUMBER を読み込み
2. GitHub Issueから箇条書きのカテゴリキーワードを取得
3. Blog記事を収集
4. ミュートフィルタを適用（既存機能）
5. カテゴリフィルタを適用
   - タイトル/タグ/説明文でキーワードマッチング
   - マッチしたエントリのみ保持
   - matchedCategories フィールドを付与
6. JSON保存・Markdown生成
```

## 実装の特徴

- **純粋関数**: `category-filter.ts` は副作用のない純粋関数のみ
- **テスト可能**: 各関数を独立してテスト可能
- **後方互換性**: カテゴリキーワードが空の場合は既存動作（フィルタリングなし）を維持
- **ログ表示の制限**: キーワードが5個以上ある場合は最初の5個のみ表示して `...` を付ける

## コミット履歴

1. `e7d1a88` - feat: Blog記事をカテゴリでフィルタリング可能に
2. `24f5c2c` - fix: ログ出力のキーワード表示を最初の5個に制限
3. `ee860d2` - fix: 型エラーを修正（BlogEntry型アサーション追加）

## 次のステップ

- GitHub Actions ワークフローに `CATEGORY_FILTER_ISSUE_NUMBER` 環境変数を追加
- Issue を作成してカテゴリキーワードを管理
- 週次ワークフローにも同様の機能を適用（必要に応じて）
