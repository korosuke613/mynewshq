# Discussion Claude Mention: 質問抽出ロジックの修正

## 問題

`@claude`の後に改行がある場合、質問が抽出されない。

**コメント例**:
```
@claude
G7e インスタンスのそれぞれのアルファベットの意味は？
```

**原因**: 現在のsedコマンドが行単位で処理するため、1行目の`@claude`の後ろ（空）だけを取得している。

```bash
# 現在のコード (22行目)
question=$(echo "$COMMENT_BODY" | sed -n 's/.*@claude[[:space:]]*\(.*\)/\1/p')
```

## 解決策

`@claude`を削除し、残りのテキスト全体を質問として扱う。

```bash
# @claude を削除して残りを質問として取得
question=$(echo "$COMMENT_BODY" | sed 's/@claude[[:space:]]*//')
# 前後の空白を削除
question=$(echo "$question" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
```

## 変更ファイル

- `.github/workflows/discussion-claude-mention.yml` (22-28行目)

## 検証方法

1. PRをマージ
2. Discussionで以下の形式でコメント:
   ```
   @claude
   質問内容
   ```
3. 質問が正しく抽出されてClaude Code Actionに渡されることを確認
