# 週次Changelog機能仕様書

## 1. 機能概要

### 目的と背景

週次Changelog機能は、1週間分の技術系Changelogデータを**プロバイダーごとに別々のDiscussion**として投稿し、技術者向けの週次ニュースレターを生成するシステムです。

従来の単一Discussion形式から、プロバイダー単位の分離形式に変更することで以下のメリットを実現します：

- **関心の分離**: 各プロバイダーに興味のあるユーザーが該当Discussionのみをフォロー可能
- **カテゴリ分類**: プロバイダー内でラベル/プロダクトごとに分類し、詳細な分析を提供
- **過去との比較**: 過去のDiscussionを参照し、変更点や改善点の考察を含める

### 対象プロバイダー

| プロバイダーID | 表示名 | カテゴリ分類基準 |
|---------------|--------|-----------------|
| `github` | GitHub Changelog | `labels`（copilot, actions, security等） |
| `aws` | AWS What's New | `products`（s3, lambda, ec2等） |
| `claudeCode` | Claude Code | なし（バージョン一覧） |
| `linear` | Linear Changelog | なし（エントリ一覧） |

---

## 2. ワークフロートリガー

### スケジュール実行

- **実行時刻**: 毎週水曜日 10:00 JST（UTC 1:00）
- **投稿先カテゴリ**: `Weekly`

### 手動実行

- **パラメータ**: 終了日（YYYY-MM-DD形式、省略時は当日）
- **投稿先カテゴリ**: `manual trigger`

---

## 3. Discussion構成

### タイトル形式

各プロバイダーDiscussionのタイトルは以下の形式を使用：

```
📰 Tech Changelog - Weekly [プロバイダー名] (YYYY-MM-DD)
```

例：
- `📰 Tech Changelog - Weekly [GitHub] (2026-01-20)`
- `📰 Tech Changelog - Weekly [AWS] (2026-01-20)`
- `📰 Tech Changelog - Weekly [Claude Code] (2026-01-20)`
- `📰 Tech Changelog - Weekly [Linear] (2026-01-20)`

### Discussion構造

各Discussionは以下のセクションで構成されます：

1. **ヘッダー**: タイトルと対象期間
2. **今週のハイライト**: 3-5行の箇条書きでプロバイダー全体の重要な変更点をまとめる
3. **カテゴリ別詳細**（GitHub/AWS）またはリリース一覧（Claude Code/Linear）

---

## 4. カテゴリ分類ルール

### GitHub（labelベースの分類）

GitHubのエントリは`labels`フィールドを使用して分類します：

```json
{
  "labels": {
    "changelog-type": ["Improvement"],
    "changelog-label": ["copilot", "actions"]
  }
}
```

分類ルール：
1. `changelog-label`フィールドの値をカテゴリとして使用
2. 複数ラベルがある場合は、各カテゴリに重複登録
3. ラベルがない場合は「その他」に分類

主なカテゴリ例：
- `copilot`: GitHub Copilot関連
- `actions`: GitHub Actions関連
- `security`: セキュリティ関連
- `code-search`: コード検索関連
- `issues`: Issues関連
- `pull-requests`: Pull Request関連

### AWS（productsベースの分類）

AWSのエントリは`labels`フィールドの`products`を使用して分類します：

```json
{
  "labels": {
    "products": ["Amazon S3", "AWS Lambda"]
  }
}
```

分類ルール：
1. `products`フィールドの値をカテゴリとして使用
2. プレフィックス（"Amazon "、"AWS "等）を除去して短縮形を表示
3. 複数プロダクトがある場合は、各カテゴリに重複登録
4. プロダクト情報がない場合は「その他」に分類

### Claude Code / Linear（カテゴリなし）

これらのプロバイダーにはカテゴリ情報がないため、エントリを単純にリスト化し、全体としてのコメントを付与します。

---

## 5. LLM生成コンテンツ

### ハイライト

各プロバイダーDiscussionに3-5行のハイライトを箇条書きで含めます。

ハイライトの内容：
- プロバイダー全体の重要な変更点や傾向
- 技術者に影響のある更新のポイント
- 注目すべき新機能やセキュリティ更新

選定基準：
1. **技術的インパクト**: 開発者の日常業務に影響を与える変更
2. **新機能**: これまでできなかったことが可能になる機能
3. **セキュリティ**: セキュリティに関する重要な更新
4. **GA/Preview移行**: Public PreviewからGAへの移行など節目の更新

### カテゴリ別コメント

GitHub/AWSでは各カテゴリに対してコメントを生成します：

- **コメント**: そのカテゴリの更新の概要と重要ポイント（2-3文）
- **過去との比較**: 前週との比較や傾向の変化（1-2文）

### 過去との比較コメント

過去のDiscussionを参照し、以下の観点で比較コメントを生成：

- 前週からの継続傾向（例：「先週に続きCopilot関連の更新が活発」）
- 新しい動き（例：「今週はセキュリティ関連の更新が増加」）
- 注目すべき変化（例：「3週連続でActions関連の改善が続いている」）

---

## 6. 過去Discussion参照

### 参照範囲

各プロバイダーの過去2回分のWeekly Discussionを参照します。

### 取得方法

```typescript
// プロバイダー別に過去のWeekly Discussionを取得
export async function fetchPastWeeklyDiscussionsByProvider(
  token: string,
  owner: string,
  repo: string,
  providerId: string,
  limit: number = 2,
): Promise<PastWeeklyDiscussion[]>
```

タイトル形式でフィルタリング：
```
📰 Tech Changelog - Weekly [プロバイダー名]
```

### 利用方法

1. LLMプロンプトに過去Discussionの本文を含める
2. LLMが過去の内容を参照し、比較コメントを生成

---

## 7. データフロー

### 入力データ

1. **週次Changelogデータ**: `data/changelogs/weekly/{date}.json`
2. **過去Discussion**: GitHub GraphQL APIから取得

### 処理フロー

```
1. 週次データ取得（fetch-changelogs.ts --weekly）
   ↓
2. 過去Discussion取得（fetch-past-discussions.ts）
   ↓
3. LLMによる要約生成（Claude Code Action）
   - プロバイダーごとに ProviderWeeklySummary を生成
   ↓
4. プロバイダーごとにDiscussion投稿（post-weekly-provider.ts）
   - generateProviderWeeklyBody() でMarkdown生成
   - createProviderWeeklyDiscussion() で投稿
```

### 出力形式

各プロバイダーのDiscussion本文（Markdown）を生成。

---

## 8. 型定義

### CategoryGroup（GitHub/AWS用）

カテゴリごとのエントリグループとLLMコメント。

```typescript
export interface CategoryGroup {
  /** カテゴリ名（"copilot", "s3"等） */
  category: string;
  /** カテゴリに属するエントリ */
  entries: Array<{
    url: string;
    title: string;
  }>;
  /** LLMによるコメント（2-3文） */
  comment: string;
  /** 過去との比較コメント（1-2文） */
  historicalContext: string;
}
```

### ProviderWeeklySummary

プロバイダー単位の週次要約。

```typescript
export interface ProviderWeeklySummary {
  /** プロバイダーID（"github", "aws", "claudeCode", "linear"） */
  providerId: string;
  /** ハイライト（3-5行の箇条書き文） */
  highlights: string[];
  /** カテゴリ別詳細（GitHub/AWS用） */
  categories?: CategoryGroup[];
  /** エントリ一覧（Claude Code/Linear用、カテゴリなしの場合） */
  entries?: Array<{
    url: string;
    title: string;
  }>;
  /** 全体コメント（カテゴリなしプロバイダー用） */
  overallComment?: string;
  /** 過去比較コメント（カテゴリなしプロバイダー用） */
  historicalContext?: string;
}
```

### WeeklySummaryDataV2

全プロバイダーの週次要約（新形式）。

```typescript
export interface WeeklySummaryDataV2 {
  github: ProviderWeeklySummary;
  aws: ProviderWeeklySummary;
  claudeCode: ProviderWeeklySummary;
  linear: ProviderWeeklySummary;
}
```

### PastWeeklyDiscussion

過去のDiscussion内容。

```typescript
export interface PastWeeklyDiscussion {
  /** プロバイダーID */
  providerId: string;
  /** Discussion作成日 */
  date: string;
  /** DiscussionのURL */
  url: string;
  /** Discussion本文 */
  body: string;
}
```

---

## 9. Markdown出力形式

### GitHub/AWS（カテゴリありプロバイダー）

```markdown
# 📰 Tech Changelog - Weekly [GitHub]

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

- Copilot SDKがTechnical Previewで公開され、AIアシスタント開発が身近に
- GitHub Actionsの実行環境が改善され、CI/CDパイプラインの効率が向上
- AI支援開発ツールへの継続的な投資が見られる

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

**過去との比較**: Actions関連は安定した更新ペースを維持...
```

### Claude Code/Linear（カテゴリなしプロバイダー）

```markdown
# 📰 Tech Changelog - Weekly [Claude Code]

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

- v2.1.19でセッション管理機能が大幅に改善され、長時間作業が快適に
- 今週は2つのリリースがあり、UI改善とバグ修正が中心
- VSCode向け機能の追加が増加傾向

## 📊 リリース一覧

- [v2.1.14](URL)
- [v2.1.19](URL)

**コメント**: 今週は2つのリリースがあり、主にUI改善とバグ修正が中心...

**過去との比較**: VSCode向け機能の追加が増加傾向にあります...
```

---

## 10. 実装ファイル一覧

| ファイル | 役割 |
|---------|------|
| `scripts/domain/types.ts` | 新しい型定義を追加 |
| `scripts/create-discussion.ts` | `fetchPastWeeklyDiscussionsByProvider()`, `createProviderWeeklyDiscussion()` |
| `scripts/fetch-past-discussions.ts` | 過去Discussion取得スクリプト（新規） |
| `scripts/post-weekly-provider.ts` | プロバイダー単位投稿スクリプト（新規） |
| `scripts/presentation/markdown/weekly-generator.ts` | `generateProviderWeeklyBody()` |
| `.github/workflows/weekly-changelog.yml` | ワークフロー更新 |
| `deno.json` | 新規タスク追加 |

---

## 11. コマンド一覧

```bash
# 過去Discussion取得
GITHUB_TOKEN=$(gh auth token) deno task fetch-past-discussions

# 週次データ取得（既存）
GITHUB_TOKEN=$(gh auth token) deno task fetch-weekly

# プロバイダー単位でプレビュー
deno task preview-weekly --provider=github
deno task preview-weekly --provider=aws

# プロバイダー単位で投稿
GITHUB_TOKEN=$(gh auth token) deno task post-weekly-provider --provider=github
GITHUB_TOKEN=$(gh auth token) deno task post-weekly-provider --provider=aws

# 全プロバイダーを順次投稿
GITHUB_TOKEN=$(gh auth token) deno task post-weekly-all
```
