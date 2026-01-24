---
name: add-provider
description: 新しいChangelogプロバイダーを追加する手順
disable-model-invocation: true
---

# Provider 追加手順

$ARGUMENTS のプロバイダーを追加します。

## 手順

1. `scripts/domain/providers/{name}-provider.ts` を作成
   - 既存プロバイダーをテンプレートとして使用
   - `ProviderConfig` インターフェースに準拠

2. `scripts/domain/providers/index.ts` を更新
   - `PROVIDER_CONFIGS` 配列に追加
   - `toChangelogData()` 関数を更新

3. `scripts/domain/types.ts` を更新
   - `ChangelogData` 型に新しいフィールドを追加

4. テストを作成
   - `scripts/domain/providers/{name}-provider_test.ts`

5. 動作確認
   - `deno task test`
   - `deno task fetch`
