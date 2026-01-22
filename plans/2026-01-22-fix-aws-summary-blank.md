# AWS要約空白問題の修正計画

## 問題概要
Discussion #46で、一部のAWSエントリの要約が空白になっている。

**空白のエントリ（URL末尾に`/`あり）:**
- `amazon-connect-automatically-select-random-contacts-evaluation/`
- `additional-policy-details-access-denied-error/`
- `instance-scheduler-adds-enhanced-scaling/`

**要約があるエントリ（URL末尾に`/`なし）:**
- `amazon-emr-serverless-aws-kms-customer-managed`

## 根本原因
1. AWS RSSフィードのURLの末尾スラッシュは不安定（あったりなかったり）
2. Claude Code ActionがJSON出力時のURLと、データファイルのURLが不一致
3. `daily-generator.ts`で`summaries.aws?.[item.url]`とURLを直接キーとして使用

## 修正方針
1. **URL正規化の強化**: 末尾スラッシュを統一的に削除
2. **柔軟なマッチング**: 防御的対策として複数パターンで検索

---

## 実装内容

### `url-normalizer.ts` の最終構成
```typescript
function repairBrokenUrl(url: string): string { ... }     // 内部: 破損URL修復
export function normalizeTrailingSlash(url: string): string { ... }  // 末尾スラッシュ削除
export function normalizeUrl(url: string): string {       // 完全な正規化
  return normalizeTrailingSlash(repairBrokenUrl(url));
}
```

### `daily-generator.ts` に `findSummary` ヘルパー追加
- 完全一致 → 正規化URL → 末尾スラッシュ追加の順で検索
- 4箇所（github, aws, claudeCode, linear）に適用

---

## 対象ファイル
1. `scripts/domain/url-normalizer.ts` - 関数追加・リネーム
2. `scripts/domain/url-normalizer_test.ts` - テスト追加・整理
3. `scripts/domain/providers/aws-provider.ts` - `normalizeUrl`を使用
4. `scripts/presentation/markdown/daily-generator.ts` - `findSummary`追加

---

## 追加リファクタリング

### 不要コードの削除
- `fetch-changelogs.ts`: `normalizeUrl` の再エクスポートを削除
- `fetch-changelogs_test.ts`: 重複テストを削除

### 関数名の改善
- `normalizeUrl` → `repairBrokenUrl` (内部関数化)
- `normalizeUrlFull` → `normalizeUrl` (シンプルな名前に)

---

## 完了したTODO
- [x] `url-normalizer.ts`に`normalizeTrailingSlash`と`normalizeUrl`を追加
- [x] `url-normalizer_test.ts`にテストケースを追加
- [x] テスト実行して新関数の動作確認
- [x] `aws-provider.ts`で`normalizeUrl`を使用
- [x] `daily-generator.ts`に`findSummary`ヘルパーを追加
- [x] 全テスト・lint・formatを実行
- [x] プランファイルをリネーム
- [x] 不要な再エクスポート・重複テストを削除
- [x] 関数名をより明確に改善
