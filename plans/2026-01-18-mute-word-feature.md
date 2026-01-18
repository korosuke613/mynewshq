# ミュートワード機能の実装計画

## 概要

Changelogのタイトルにミュートワードが含まれる場合、AI要約の対象外とし、Discussionには折りたたみでタイトルとリンクのみ表示する機能を追加する。

## 要件

- **ミュートワード設定**: 固定Issue番号の本文から箇条書き（`- xxx`）で取得
- **マッチ方式**: 部分一致（大文字小文字無視）
- **AI要約対象外**: ミュートされたエントリは要約しない
- **折りたたみ表示**: `<details>` タグでタイトルとリンクのみ表示

## 実装方針

### データ構造の変更

各エントリに `muted` と `mutedBy` フィールドを追加:

```typescript
interface ChangelogEntry {
  title: string;
  url: string;
  content: string;
  pubDate: string;
  muted?: boolean;      // ミュートされているか
  mutedBy?: string;     // マッチしたミュートワード
}
```

### 処理フロー

```
[fetch-changelogs.ts]
  ↓ Issueからミュートワード取得
  ↓ 各エントリにmutedフラグ付与
  ↓ JSON保存
[Claude Code Action]
  ↓ muted: true のエントリは要約スキップ
  ↓ 折りたたみ形式で出力
[create-discussion.ts]
  ↓ generateDefaultBodyでも折りたたみ対応
```

## 変更ファイル

### 1. `scripts/fetch-changelogs.ts`

**追加する関数**:

- `parseMuteWords(issueBody: string): string[]` - Issue本文から箇条書きを抽出
- `fetchMuteWords(octokit: Octokit): Promise<string[]>` - Issue APIでミュートワード取得
- `isMuted(title: string, muteWords: string[]): string | null` - 部分一致チェック
- `applyMuteFilter<T>(entries: T[], muteWords: string[]): T[]` - エントリにフラグ付与

**main()の変更**:

1. `GITHUB_TOKEN` があれば認証付きOctokitを作成
2. `MUTE_WORDS_ISSUE_NUMBER` があればミュートワード取得
3. 各fetch結果にミュートフィルタ適用

### 2. `scripts/create-discussion.ts`

**追加する関数**:

- `generateMutedSection(entries): string` - 折りたたみ形式の生成

**generateDefaultBody()の変更**:

- 各セクションでアクティブ/ミュートを分離
- ミュートエントリは折りたたみ表示

### 3. `.github/workflows/daily-changelog.yml`

**環境変数追加**:

```yaml
env:
  GITHUB_TOKEN: ${{ steps.login-gh-app.outputs.token }}
  MUTE_WORDS_ISSUE_NUMBER: "1"  # 設定用Issue番号
```

**プロンプト変更**:

```
- `muted: true` のエントリはAI要約の対象外とする
- ミュートされたエントリは以下の形式で折りたたみ表示：
  <details>
  <summary>ミュートされたエントリ (N件)</summary>
  - [タイトル](URL) *(ミュートワード: xxx)*
  </details>
```

### 4. テストファイル

- `scripts/fetch-changelogs_test.ts` - 新規関数のテスト追加
- `scripts/create-discussion_test.ts` - 折りたたみ生成のテスト追加

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `MUTE_WORDS_ISSUE_NUMBER` | No | ミュートワード取得元のIssue番号 |
| `GITHUB_TOKEN` | No* | Issue取得に必要 |

*ミュートワード機能使用時のみ必要

## エラーハンドリング

- Issue取得失敗: 警告ログを出力し、ミュートなしで続行
- Issue本文に箇条書きなし: 空配列を返す（正常動作）
- 環境変数未設定: ミュートワード機能を無効化

## Issue本文のフォーマット例

```markdown
## ミュートワード

以下のワードを含むエントリは自動でミュートされます。

- Amazon SageMaker
- AWS Glue
- Generative AI
```

## 検証方法

1. **ユニットテスト**: `deno task test`
2. **ローカル実行**:
   ```bash
   export GITHUB_TOKEN=xxx
   export MUTE_WORDS_ISSUE_NUMBER=1
   deno task fetch
   # data/changelogs/*.json にmutedフラグが付いているか確認
   ```
3. **CI**: 既存のquality-checkワークフローが通ることを確認

## 実装状況

- [x] データ構造の変更
- [x] fetch-changelogs.tsにミュートワード機能を実装
- [x] create-discussion.tsに折りたたみ表示機能を実装
- [x] daily-changelog.ymlに環境変数とプロンプト変更を追加
- [x] テストコードを追加（34ステップすべて合格）
- [x] コード品質チェック（lint, format, type check）
