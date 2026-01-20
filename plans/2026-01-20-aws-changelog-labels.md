# AWS Changelog のタグ活用実装プラン

## 概要

AWS Changelog でも GitHub Changelog と同様に RSS の `<category>` タグからラベルを抽出・表示する。

### 表示形式

`general:products` 系のみを抽出して表示:
```markdown
### [Amazon Connect makes it easier...](URL) `amazon-connect` `aws-govcloud-us`
```

---

## AWS カテゴリの構造

```
marketing:marchitecture/analytics  → 無視
general:products/amazon-mwaa       → amazon-mwaa（抽出対象）
```

rss-parserはカテゴリをカンマ区切りの文字列として返す場合があるため、分割処理が必要。

---

## 実装内容

### 1. ラベル抽出関数の追加

**ファイル**: `scripts/fetch-changelogs.ts`

```typescript
// general:products系のみを抽出（marketing:marchitectureなどは除外）
// rss-parserはカテゴリをカンマ区切りの文字列として返す場合があるため、分割処理を行う
export function extractLabelsFromAWSCategory(
  categories?: string[],
): Record<string, string[]> {
  const labels: Record<string, string[]> = {};
  if (!categories) return labels;

  for (const rawCat of categories) {
    // カンマ区切りの場合は分割
    const splitCategories = rawCat.split(",").map((c) => c.trim());

    for (const cat of splitCategories) {
      // general:products/xxx のみを抽出
      const match = cat.match(/^general:products\/(.+)$/);
      if (match) {
        const [, value] = match;
        if (!labels["general:products"]) {
          labels["general:products"] = [];
        }
        labels["general:products"].push(value);
      }
    }
  }

  return labels;
}
```

### 2. `fetchAWSChangelog` の修正

**ファイル**: `scripts/fetch-changelogs.ts`

- `item.categories` から `extractLabelsFromAWSCategory()` でラベル抽出
- `ChangelogEntry.labels` に保存

### 3. ボディ生成関数の修正

**ファイル**: `scripts/create-discussion.ts`

- `generateDefaultBody()`: AWSセクションにラベル表示処理を追加
- `generateBodyWithSummaries()`: AWSセクションにラベル表示処理を追加

### 4. 型定義の修正

**ファイル**: `scripts/preview-discussion.ts`

- `github` と `aws` の型定義に `labels?: Record<string, string[]>` を追加

### 5. テスト追加

**ファイル**: `scripts/fetch-changelogs_test.ts`

- `extractLabelsFromAWSCategory()` のユニットテスト（8件）
  - general:products系の抽出
  - marketing:marchitecture系の無視
  - カンマ区切りの分割処理
  - 境界ケース（undefined、空配列など）

---

## 修正対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/fetch-changelogs.ts` | 関数追加 + `fetchAWSChangelog` 修正 |
| `scripts/fetch-changelogs_test.ts` | テスト追加 |
| `scripts/create-discussion.ts` | AWSセクションにラベル表示処理を追加 |
| `scripts/preview-discussion.ts` | 型定義に `labels` を追加 |

---

## 検証方法

1. `deno test` - ユニットテスト実行
2. `deno task fetch --date=YYYY-MM-DD` - 実際のフィード取得
3. `deno task preview --date=YYYY-MM-DD` - プレビュー確認
4. JSON ファイルで AWS エントリに `labels` が含まれることを確認
