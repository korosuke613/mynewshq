# AWS Discussionラベルのプレフィックス省略対応

## 概要

AWS Changelogの個別サービスラベル（`amazon-vpc`、`aws-iot-device-management`等）をGitHub Discussionラベルに追加する際、`amazon-`/`aws-`プレフィックスを省略する。

- **Markdown本文**: `amazon-vpc` のまま維持
- **Discussionラベル**: `aws:vpc` に変換（プレフィックス省略）

## 現状の動作

`determineLabels` 関数（`scripts/create-discussion.ts:87-111`）:
- GitHub: 個別ラベルに `gh:` プレフィックス付与（例: `gh:copilot`）
- AWS: `aws` というサービス名ラベルのみ（個別ラベルなし）

## 変更内容

### 1. プレフィックス省略関数の追加

```typescript
// amazon- または aws- プレフィックスを省略する
export function stripAwsPrefix(label: string): string {
  return label.replace(/^(amazon-|aws-)/, "");
}
```

### 2. `determineLabels` 関数の修正

```typescript
if (data.aws && data.aws.length > 0) {
  labels.add("aws");
  for (const entry of data.aws) {
    if (entry.labels) {
      Object.values(entry.labels).flat().forEach((label) =>
        labels.add(`aws:${stripAwsPrefix(label)}`)
      );
    }
  }
}
```

---

## 修正対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/create-discussion.ts` | `stripAwsPrefix`関数追加、`determineLabels`修正 |
| `scripts/create-discussion_test.ts` | 新機能のテスト追加 |

---

## 変換例

| 元のラベル | Markdown本文 | Discussionラベル |
|-----------|-------------|-----------------|
| `amazon-vpc` | `amazon-vpc` | `aws:vpc` |
| `aws-govcloud-us` | `aws-govcloud-us` | `aws:govcloud-us` |
| `amazon-bedrock` | `amazon-bedrock` | `aws:bedrock` |

---

## 検証方法

1. `deno test` - テストが通ることを確認
2. `deno task preview --date=2026-01-15` - 実データでプレビュー確認
