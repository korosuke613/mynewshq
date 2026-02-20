# Glance向け軽量Atomフィード生成

## Context

GitHub Discussionsの標準Atomフィード（330KB/221KB）は、Raspberry Pi上のGlanceダッシュボード（HTTPタイムアウト5秒固定）で取得が間に合わずタイムアウトする。タイトル・URL・日時・カテゴリのみを含む軽量Atomフィード（目標10KB以下）をGitHub Actionsで生成し、GitHub Pagesにデプロイすることで解決する。

## 成果物

| ファイル | 説明 |
|---------|------|
| `scripts/generate-feed.ts` | フィード生成スクリプト（Deno） |
| `scripts/generate-feed_test.ts` | ユニットテスト |
| `.github/workflows/generate-feed.yml` | GitHub Actionsワークフロー |
| `deno.json` | タスク追加（既存ファイル編集） |

## 1. スクリプト: `scripts/generate-feed.ts`

### 再利用する既存コード

- `scripts/infrastructure/github/graphql-client.ts` → `createAuthenticatedGraphQLClient()`
- `scripts/infrastructure/cli-parser.ts` → `parseArgWithDefault()`, `requireGitHubToken()`

### GraphQLクエリ

```graphql
query($owner: String!, $repo: String!, $limit: Int!) {
  repository(owner: $owner, name: $repo) {
    discussions(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        title
        url
        createdAt
        category { slug }
      }
    }
  }
}
```

- `limit: 50` で取得し、対象カテゴリslugでクライアントサイドフィルタリング
- フィルタ後、先頭15件を使用

### 対象カテゴリslugs

```typescript
const TARGET_CATEGORY_SLUGS = [
  "daily-changelog",
  "daily-blog",
  "weekly-changelog",
  "weekly-blog",
];
```

### 関数構成

| 関数 | 責務 |
|------|------|
| `fetchDiscussions(token, owner, repo, limit)` | GraphQL APIでDiscussionノード取得 |
| `filterByCategories(nodes, slugs)` | カテゴリslugでフィルタ |
| `escapeXml(str)` | XML特殊文字エスケープ（`&<>"'`） |
| `generateAtomFeed(nodes, feedUrl, siteUrl)` | Atom XML生成（テンプレートリテラル） |
| `main()` | CLI引数解析→取得→フィルタ→生成→ファイル書き出し |

### Atom XML構造（本文なし）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>mynewshq Discussions Feed</title>
  <link href="https://korosuke613.github.io/mynewshq/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="https://github.com/korosuke613/mynewshq/discussions" rel="alternate" type="text/html"/>
  <id>https://github.com/korosuke613/mynewshq</id>
  <updated>{最新エントリのcreatedAt}</updated>
  <entry>
    <title>{タイトル}</title>
    <link href="{URL}" rel="alternate" type="text/html"/>
    <id>{URL}</id>
    <published>{createdAt}</published>
    <updated>{createdAt}</updated>
    <category term="{category.slug}"/>
  </entry>
  ...
</feed>
```

- `<content>` / `<summary>` は一切含めない（サイズ削減の核心）
- XML生成はテンプレートリテラルで構築（`xml`モジュールの`stringify`は名前空間属性の扱いが煩雑なため）
- 推定サイズ: ~400bytes/entry × 15 + ヘッダ ~400bytes ≈ 6.4KB

### CLIインターフェイス

```bash
deno task generate-feed --output=_site/feed.xml
```

- `--output`: 出力ファイルパス（デフォルト: `feed.xml`）

## 2. テスト: `scripts/generate-feed_test.ts`

テスト対象（純粋関数のみ）:
- `escapeXml`: 各特殊文字のエスケープ
- `filterByCategories`: slug一致/不一致/空配列
- `generateAtomFeed`: XML宣言、名前空間、エントリ構造、`<content>`非含有、空入力時の挙動

## 3. ワークフロー: `.github/workflows/generate-feed.yml`

```yaml
name: Generate Feed

on:
  schedule:
    - cron: '0 * * * *'  # 毎時
  discussion:
    types: [created, edited]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  generate-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x
      - name: Generate Atom feed
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          mkdir -p _site
          deno task generate-feed --output=_site/feed.xml
          ls -la _site/feed.xml
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '_site'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### ポイント

- `secrets.GITHUB_TOKEN` で十分（public repo）
- `concurrency: "pages"` で同時デプロイ防止
- `environment: github-pages` は `actions/deploy-pages` の要件

## 4. `deno.json` 変更

```json
"generate-feed": "deno run --allow-net --allow-read --allow-write --allow-env scripts/generate-feed.ts"
```

## 5. GitHub Pages 手動設定（1回のみ）

リポジトリ Settings → Pages → Source を **GitHub Actions** に変更する必要がある。

## 6. 検証手順

```bash
# ローカルでフィード生成
GITHUB_TOKEN=$(gh auth token) deno task generate-feed --output=/tmp/feed.xml

# サイズ確認（10KB以下であること）
wc -c /tmp/feed.xml

# XML妥当性チェック（xmllintがあれば）
xmllint --noout /tmp/feed.xml

# テスト実行
deno task test

# デプロイ後の確認
curl -s https://korosuke613.github.io/mynewshq/feed.xml | head -20
```

## 7. 実装順序

1. `scripts/generate-feed.ts` 作成
2. `scripts/generate-feed_test.ts` 作成
3. `deno.json` にタスク追加
4. テスト実行で動作確認
5. ローカルでフィード生成して出力確認
6. `.github/workflows/generate-feed.yml` 作成
