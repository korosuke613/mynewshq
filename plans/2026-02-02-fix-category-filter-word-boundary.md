# カテゴリフィルタの部分一致問題の修正

## 問題

週次Blog Discussion (#130) で、AWS記事が誤ったカテゴリに分類されている：
- 「Sovereign failover – Design for **digit**al sovereignty...」→「**git**」カテゴリ
- 「AWS CloudFormation 2025 Year In Review」→「**go**」カテゴリ

## 原因

`scripts/domain/category-filter.ts`の`findAllMatchedKeywords`関数が**部分一致**（`includes`）でマッチングしている：

```typescript
if (lowerText.includes(keyword.toLowerCase())) {
```

Issue #118のカテゴリキーワード「git」「go」が、記事タイトル/本文内の単語の一部にマッチ：
- "di**git**al" → "git"にマッチ
- "**go**als", "**go**od" → "go"にマッチ

## 修正方針

**単語境界マッチング**を導入し、キーワードが独立した単語としてのみマッチするようにする。

### 方針詳細

1. 正規表現の単語境界（`\b`）を使用
2. 大文字小文字は引き続き無視
3. 特殊なケースの考慮：
   - 「github actions」のような複数単語キーワードも正しく動作させる
   - URLやハイフン区切りの場合も考慮（例: `go-lang`）

## 修正対象ファイル

1. `scripts/domain/category-filter.ts` - マッチングロジックの修正
2. `scripts/domain/category-filter_test.ts` - テストケースの追加

## 実装計画

### Step 1: `findAllMatchedKeywords`関数の修正

```typescript
export function findAllMatchedKeywords(
  text: string,
  categoryKeywords: string[],
): string[] {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];
  for (const keyword of categoryKeywords) {
    // 単語境界でマッチング
    const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    if (regex.test(lowerText)) {
      matched.push(keyword);
    }
  }
  return matched;
}
```

### Step 2: `findFirstMatchedKeyword`関数も同様に修正

### Step 3: テストケースの追加

- 「digital」が「git」にマッチしないことを確認
- 「goals」が「go」にマッチしないことを確認
- 「GitHub Actions」が「github actions」にマッチすることを確認
- 既存のテストが引き続きパスすることを確認

## 検証方法

1. `deno test scripts/domain/category-filter_test.ts` でユニットテスト実行
2. `deno task preview-blog` で手動確認
3. 実際のデータに対して誤マッチがないことを確認

## 既存テストへの影響

既存テストは以下の理由で引き続きパスする見込み：
- 「GitHub Actions Update」→「github」: 単語境界あり（スペース区切り）✓
- 「github-actions-aws」タグ→「aws」「github」: ハイフンも単語境界として機能 ✓
- 「AWS Lambda Update」→「aws」: 単語境界あり（スペース区切り）✓

## 追加テストケース

```typescript
await t.step("should NOT match partial word (git in digital)", () => {
  const result = findAllMatchedKeywords("digital sovereignty", ["git"]);
  assertEquals(result, []);
});

await t.step("should NOT match partial word (go in goals)", () => {
  const result = findAllMatchedKeywords("our goals and objectives", ["go"]);
  assertEquals(result, []);
});

await t.step("should match git as standalone word", () => {
  const result = findAllMatchedKeywords("git repository management", ["git"]);
  assertEquals(result, ["git"]);
});

await t.step("should match Go language (capitalized)", () => {
  const result = findAllMatchedKeywords("Go programming language", ["go"]);
  assertEquals(result, ["go"]);
});
```

## リネームタスク

- [ ] 完了後、プランファイルを `./plans/2026-02-01-fix-category-filter-word-boundary.md` にリネーム
