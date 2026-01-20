# ラベル表示位置の変更プラン

## 概要

現在、見出し行の直後にラベルが表示されているが、見出しにラベルが含まれると文字が大きすぎて見づらい。見出しの改行直後にラベルを表示するように変更する。

## 現在の表示形式

```markdown
### [タイトル](URL) `label1` `label2`
*Published: ...*
```

## 変更後の表示形式

```markdown
### [タイトル](URL)
`label1` `label2`

*Published: ...*
```

---

## 修正対象

**ファイル**: `scripts/create-discussion.ts`

### 修正箇所（4箇所）

1. **generateDefaultBody - GitHub セクション** (518-520行付近)
2. **generateDefaultBody - AWS セクション** (542-544行付近)
3. **generateBodyWithSummaries - GitHub セクション** (607-609行付近)
4. **generateBodyWithSummaries - AWS セクション** (634-636行付近)

### 変更内容

```typescript
// Before
body += `### [${item.title}](${item.url})${
  labelsString ? " " + labelsString : ""
}\n`;

// After
body += `### [${item.title}](${item.url})\n`;
if (labelsString) {
  body += `${labelsString}\n`;
}
```

---

## 検証方法

1. `deno test` - 既存テストが通ることを確認
2. `deno task preview --date=YYYY-MM-DD` - プレビューで表示を確認
