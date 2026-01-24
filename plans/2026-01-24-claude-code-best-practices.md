# Claude Code ベストプラクティス改善計画

## 概要

[Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) を参考に、本リポジトリの Claude Code 設定を改善する。

## 現状の良い点

- CLAUDE.md が存在し、基本的な構造が整っている
- `git add` 前の `deno fmt` フックが設定済み
- `dev-standards`, `github` プラグインが有効
- `./plans` ディレクトリが設定済み
- 適切な権限許可設定

## 改善項目

### 1. [高優先度] `.claudeignore` の作成

**理由**: 不要なファイルをコンテキストから除外し、効率を向上

**ファイル**: `.claudeignore`

```
# データファイル（大量のJSON）
data/

# 依存関係ロックファイル
deno.lock

# Git
.git/
```

---

### 2. [高優先度] CLAUDE.md の整理

**理由**: ベストプラクティスでは「Claude が推測できないことだけを書く」「冗長だと無視される」

**変更内容**:
- Provider Pattern の手順 → Skills に移動（項目4参照）
- アーキテクチャ図 → 維持（クイックリファレンスとして有用）
- 開発コマンド → `GITHUB_TOKEN` 設定が推測困難なので維持

---

### 3. [中優先度] Skills の作成

#### Provider 追加用 Skill

**ファイル**: `.claude/skills/add-provider/SKILL.md`

```markdown
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
```

> **Note**: `summarize-changelog` スキルは作成しない。要約ルールは CLAUDE.md に維持し、GitHub Actions での動作を確実にする。

---

### 4. [低優先度] Subagents の作成

#### 4.1 コードレビュー用 Subagent

**ファイル**: `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: コード変更をレビューし、品質・セキュリティをチェック
tools: Read, Grep, Glob
model: sonnet
---

Deno プロジェクトのコードレビュースペシャリスト。

## レビューポイント
- TypeScript の型安全性（any の使用禁止）
- テストの有無と品質
- Provider Pattern への準拠
- エラーハンドリング

## 出力形式
- 必須修正: [問題点]
- 推奨修正: [提案]
- 良い点: [評価]
```

---

## 修正対象ファイル

| ファイル | 操作 |
|---------|-----|
| `.claudeignore` | 新規作成 |
| `.claude/skills/add-provider/SKILL.md` | 新規作成 |
| `.claude/agents/code-reviewer.md` | 新規作成 |
| `CLAUDE.md` | Provider Pattern 手順を削除（Skills に移動） |

---

## 検証方法

1. `.claudeignore` が機能しているか確認
   - `data/` ディレクトリのファイルがコンテキストに読み込まれないことを確認

2. Skills の動作確認
   - `/add-provider test` を実行し、手順が表示されることを確認

3. Subagent の動作確認
   - 「code-reviewer を使ってレビューして」と指示し、レビューが実行されることを確認

---

## TODO

- [ ] `.claudeignore` を作成
- [ ] `.claude/skills/add-provider/SKILL.md` を作成
- [ ] `.claude/agents/code-reviewer.md` を作成
- [ ] `CLAUDE.md` から Provider Pattern 手順を削除
- [ ] プランファイルを `./plans/2026-01-24-claude-code-best-practices.md` にリネーム
