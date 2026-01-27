# 週次Changelog仕様変更計画

## 概要

週次changelog（weekly-changelog）を**プロバイダーごとに別々のDiscussion**として投稿する形式に変更する。各Discussionはカテゴリ（ラベル/プロダクト）ごとに分類し、LLMがコメントを付ける。過去のDiscussionを参照して変更点や改善点も含める。

## 要件

1. **プロバイダーごとにDiscussionを分離**
   - `📰 Tech Changelog - Weekly [GitHub]`
   - `📰 Tech Changelog - Weekly [AWS]`
   - `📰 Tech Changelog - Weekly [Claude Code]`
   - `📰 Tech Changelog - Weekly [Linear]`

2. **カテゴリ分類**
   - GitHub: label（copilot, actions, security等）で分類
   - AWS: products（s3, lambda, ec2等）で分類
   - Claude Code, Linear: カテゴリ情報なし（まとめてコメント）

3. **過去Discussion参照**
   - 各プロバイダーの過去2回分のWeekly Discussionを参照
   - 過去と比較した変更や嬉しさをコメントに含める

4. **ハイライト維持**
   - 各プロバイダーDiscussion内にハイライト（1-2件）を含める

## 実装計画

### Phase 1: 仕様書作成

**新規ファイル**: `spec/weekly-changelog.md`

週次Changelog機能の仕様書を作成する。以下の内容を含める:

1. **機能概要**
   - 目的と背景
   - 対象プロバイダー

2. **Discussion構成**
   - タイトル形式
   - 各プロバイダーのDiscussion構造
   - Markdown出力形式サンプル

3. **カテゴリ分類ルール**
   - GitHub: labelベースの分類
   - AWS: productsベースの分類
   - Claude Code/Linear: カテゴリなし

4. **LLM生成コンテンツ**
   - ハイライト選定基準
   - カテゴリ別コメント
   - 過去との比較コメント
   - 傾向分析

5. **過去Discussion参照**
   - 参照範囲（過去2回分）
   - 利用方法

6. **データフロー**
   - 入力データ
   - 処理フロー
   - 出力形式

7. **型定義**
   - 必要な型の一覧と構造

---

### Phase 2: 型定義の拡張

**ファイル**: `scripts/domain/types.ts`

```typescript
// カテゴリグループ（GitHub/AWS用）
export interface CategoryGroup {
  category: string;              // "copilot", "s3" 等
  entries: Array<{
    url: string;
    title: string;
  }>;
  comment: string;               // LLMによるコメント
  historicalContext: string;     // 過去との比較コメント
}

// ハイライトエントリ（プロバイダー単位）
export interface ProviderHighlight {
  url: string;
  title: string;
  reason: string;                // 選定理由
  impact: string;                // 技術者への影響
}

// プロバイダー単位の週次要約
export interface ProviderWeeklySummary {
  providerId: string;            // "github", "aws", "claudeCode", "linear"
  highlights: ProviderHighlight[]; // 1-2件
  categories: CategoryGroup[];    // カテゴリ別詳細（GitHub/AWS）
  entries?: Array<{              // カテゴリなしの場合（Claude Code/Linear）
    url: string;
    title: string;
  }>;
  overallComment?: string;       // カテゴリなしプロバイダー用コメント
  historicalContext?: string;    // カテゴリなしプロバイダー用過去比較
  trendAnalysis: string;         // プロバイダー全体の傾向分析
}

// 全プロバイダーの週次要約
export interface WeeklySummaryDataV2 {
  github: ProviderWeeklySummary;
  aws: ProviderWeeklySummary;
  claudeCode: ProviderWeeklySummary;
  linear: ProviderWeeklySummary;
}

// 過去のDiscussion内容（プロバイダー別）
export interface PastWeeklyDiscussion {
  providerId: string;
  date: string;
  url: string;
  body: string;
}
```

---

### Phase 3: 過去Discussion取得機能

**ファイル**: `scripts/create-discussion.ts`

```typescript
// プロバイダー別に過去のWeekly Discussionを取得
export async function fetchPastWeeklyDiscussionsByProvider(
  token: string,
  owner: string,
  repo: string,
  providerId: string,           // "github", "aws" 等
  limit: number = 2,
): Promise<PastWeeklyDiscussion[]>
```

**新規ファイル**: `scripts/fetch-past-discussions.ts`

全プロバイダーの過去Discussionを取得してJSON出力するスクリプト。

---

### Phase 4: Markdown生成の更新

**ファイル**: `scripts/presentation/markdown/weekly-generator.ts`

```typescript
// プロバイダー単位のMarkdown生成
export function generateProviderWeeklyBody(
  providerId: string,
  providerData: ChangelogEntry[] | ReleaseEntry[],
  summary: ProviderWeeklySummary,
  startDate: string,
  endDate: string,
): string
```

---

### Phase 5: Discussion投稿の更新

**ファイル**: `scripts/create-discussion.ts`

```typescript
// プロバイダー単位でDiscussionを作成
export async function createProviderWeeklyDiscussion(
  token: string,
  owner: string,
  repo: string,
  providerId: string,
  summary: ProviderWeeklySummary,
  data: ChangelogEntry[] | ReleaseEntry[],
  startDate: string,
  endDate: string,
): Promise<{ id: string; url: string }>
```

---

### Phase 6: GitHub Actions Workflowの更新

**ファイル**: `.github/workflows/weekly-changelog.yml`

ワークフロー全体を再構成。

---

### Phase 7: 新規タスクの追加

**ファイル**: `deno.json`

```json
{
  "tasks": {
    "fetch-past-discussions": "...",
    "post-weekly-provider": "..."
  }
}
```

**新規ファイル**: `scripts/post-weekly-provider.ts`

---

## 出力形式イメージ

### 📰 Tech Changelog - Weekly [GitHub]

```markdown
# 📰 Tech Changelog - Weekly [GitHub]

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

### [Copilot SDK in Technical Preview](URL)

**選定理由**: AIアシスタントの開発がより身近になる重要なSDKリリース...

**技術者への影響**: 自社プロダクトへのAI支援機能の組み込みが容易に...

## 📊 カテゴリ別詳細

### copilot (3件)
- [Copilot SDK in Technical Preview](URL)
- [Copilot Chat improvements](URL)
- [Copilot code review](URL)

**コメント**: 今週はCopilot関連の機能が大幅に強化されました...

**過去との比較**: 前週に続きCopilotへの投資が継続...

---

### actions (2件)
- [Actions runner improvements](URL)
- [New workflow triggers](URL)

**コメント**: GitHub Actionsの実行環境が改善され...

## 🔮 傾向分析

今週のGitHub全体の動向として、AI支援開発ツールへの投資が継続...
```

### 📰 Tech Changelog - Weekly [AWS]

```markdown
# 📰 Tech Changelog - Weekly [AWS]

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

### [Amazon S3 Express One Zone](URL)

**選定理由**: 低レイテンシーストレージの新オプション...

## 📊 カテゴリ別詳細

### ec2 (3件)
- [EC2 M4 Max Mac instances](URL)
- ...

**コメント**: ...

## 🔮 傾向分析

今週のAWS全体の動向として...
```

### 📰 Tech Changelog - Weekly [Claude Code]

```markdown
# 📰 Tech Changelog - Weekly [Claude Code]

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

### [v2.1.19](URL)

**選定理由**: セッション管理機能の大幅改善...

## 📊 リリース一覧

- [v2.1.14](URL)
- [v2.1.19](URL)

**コメント**: 今週は2つのリリースがあり...

**過去との比較**: VSCode向け機能の追加が増加傾向...

## 🔮 傾向分析

Claude Codeは継続的にリリースを重ねており...
```

---

## 変更対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `spec/weekly-changelog.md` | **新規作成**: 週次Changelog機能の仕様書 |
| `scripts/domain/types.ts` | 新しい型定義（WeeklySummaryDataV2等）の追加 |
| `scripts/create-discussion.ts` | 過去Discussion取得・投稿関数追加 |
| `scripts/presentation/markdown/weekly-generator.ts` | プロバイダー単位Markdown生成関数追加 |
| `.github/workflows/weekly-changelog.yml` | ワークフロー全体の再構成 |
| `deno.json` | 新規タスク追加 |
| `scripts/fetch-past-discussions.ts` | 新規作成 |
| `scripts/post-weekly-provider.ts` | 新規作成 |

---

## 検証方法

1. **ローカルテスト**
   ```bash
   # 過去Discussion取得のテスト
   GITHUB_TOKEN=$(gh auth token) deno task fetch-past-discussions

   # 週次データ取得
   GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly

   # プロバイダー単位でプレビュー
   deno task preview-weekly --provider=github
   deno task preview-weekly --provider=aws

   # プロバイダー単位で投稿（テスト）
   GITHUB_TOKEN=$(gh auth token) deno task post-weekly-provider --provider=github --dry-run
   ```

2. **型チェック・リント**
   ```bash
   deno check scripts/*.ts scripts/**/*.ts
   deno lint
   deno fmt --check
   ```

3. **テスト実行**
   ```bash
   deno task test
   ```

---

## TODO

- [ ] Phase 1: 仕様書作成（spec/weekly-changelog.md）
- [ ] Phase 2: 型定義の拡張（types.ts）
- [ ] Phase 3: 過去Discussion取得機能（create-discussion.ts, fetch-past-discussions.ts）
- [ ] Phase 4: Markdown生成の更新（weekly-generator.ts）
- [ ] Phase 5: Discussion投稿の更新（create-discussion.ts）
- [ ] Phase 6: GitHub Actions Workflow更新（weekly-changelog.yml）
- [ ] Phase 7: deno.jsonにタスク追加、post-weekly-provider.ts作成
- [ ] テストの追加・更新
- [ ] ローカルでの動作確認
- [ ] プランファイルのリネーム（plans/YYYY-MM-DD-weekly-changelog-v2.md）
