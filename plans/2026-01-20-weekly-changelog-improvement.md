# Weekly Changelog 改善計画

## 概要
週次ニュースをdailyと差別化し、カテゴリごとの総括・トレンド分析を行う形式に改善する。

## 要件
- **出力形式**: ハイブリッド形式（ハイライト → カテゴリ別総括 → Dailyリンク）
- **分析深度**: 詳細分析（傾向＋考察＋クロスカテゴリの関連性分析）
- **Dailyリンク**: GitHub GraphQL APIで期間内のDaily Discussionを検索して取得

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `scripts/create-discussion.ts` | 週次用の型定義・Markdown生成関数を追加、週次モードで`--summaries-json`必須化 |
| `scripts/preview-discussion.ts` | 週次用`WeeklySummaryData`対応、ダミーデータ内蔵 |
| `.github/workflows/weekly-changelog.yml` | プロンプト・JSON schemaを週次用に変更 |
| `scripts/create-discussion_test.ts` | 新機能のテスト追加 |

---

## 実装手順

### Step 1: 週次用の型定義を追加 (`scripts/create-discussion.ts`)

既存の`SummaryData`とは別に、週次専用の型を追加：

```typescript
// 週次ハイライトエントリの型
interface WeeklyHighlight {
  url: string;
  title: string;
  category: string;  // "github" | "aws" | "claudeCode" | "linear"
  reason: string;    // 選定理由
  impact: string;    // 技術者への影響
}

// カテゴリ別総括の型
interface CategorySummaries {
  github: string;
  aws: string;
  claudeCode: string;
  linear: string;
}

// 傾向分析の型
interface TrendAnalysis {
  overallTrend: string;          // 今週の技術動向
  crossCategoryInsights: string; // クロスカテゴリの洞察
  futureImplications: string;    // 今後の展望
}

// 週次要約データの型
export interface WeeklySummaryData {
  weeklyHighlights: WeeklyHighlight[];
  categorySummaries: CategorySummaries;
  trendAnalysis: TrendAnalysis;
}
```

### Step 2: 週次用Markdown生成関数を追加 (`scripts/create-discussion.ts`)

新規関数`generateWeeklyBodyWithSummaries()`を実装：

```typescript
export function generateWeeklyBodyWithSummaries(
  data: ChangelogData,
  summaries: WeeklySummaryData,
  dailyLinks: DailyLink[],
): string {
  // 1. ヘッダー + 対象期間
  // 2. 🌟 今週のハイライト（3-5件）
  // 3. 🔮 傾向分析
  // 4. 📊 カテゴリ別総括
  // 5. 📅 Daily詳細（リンクリスト）
}
```

カテゴリ絵文字ヘルパー：
```typescript
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    github: "🐙",
    aws: "☁️",
    claudeCode: "🤖",
    linear: "📐",
  };
  return emojis[category] || "📌";
}
```

### Step 3: Dailyリンク取得関数を追加 (`scripts/create-discussion.ts`)

```typescript
interface DailyLink {
  date: string;
  url: string;
  title: string;
}

export async function fetchDailyDiscussionLinks(
  token: string,
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
): Promise<DailyLink[]> {
  // GraphQL APIでGeneralカテゴリのDiscussionを検索
  // タイトルに "Tech Changelog - YYYY-MM-DD" を含むものをフィルタ
  // 期間内のものを返す
}
```

### Step 4: main関数の週次処理を分岐 (`scripts/create-discussion.ts`)

週次モードでは`--summaries-json`を必須とし、指定がない場合はエラー終了する：

```typescript
// main関数内
if (weekly) {
  // 週次モード: WeeklySummaryData を使用（--summaries-json 必須）
  if (!summariesJson) {
    console.error("週次モードでは --summaries-json が必須です");
    Deno.exit(1);
  }
  const summaries: WeeklySummaryData = JSON.parse(summariesJson);
  const dailyLinks = await fetchDailyDiscussionLinks(token, owner, repo, startDate, endDate);
  body = generateWeeklyBodyWithSummaries(changelogData, summaries, dailyLinks) + generateMention();
} else if (summariesJson) {
  // 日次モード: 既存の SummaryData を使用（変更なし）
  const summaries: SummaryData = JSON.parse(summariesJson);
  body = generateBodyWithSummaries(changelogData, summaries) + generateMention();
}
```

### Step 5: ワークフローのJSON schema更新 (`weekly-changelog.yml`)

```yaml
claude_args: >-
  --json-schema '{
    "type": "object",
    "properties": {
      "weeklyHighlights": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "url": {"type": "string"},
            "title": {"type": "string"},
            "category": {"type": "string"},
            "reason": {"type": "string"},
            "impact": {"type": "string"}
          },
          "required": ["url", "title", "category", "reason", "impact"]
        },
        "minItems": 3,
        "maxItems": 5
      },
      "categorySummaries": {
        "type": "object",
        "properties": {
          "github": {"type": "string"},
          "aws": {"type": "string"},
          "claudeCode": {"type": "string"},
          "linear": {"type": "string"}
        },
        "required": ["github", "aws", "claudeCode", "linear"]
      },
      "trendAnalysis": {
        "type": "object",
        "properties": {
          "overallTrend": {"type": "string"},
          "crossCategoryInsights": {"type": "string"},
          "futureImplications": {"type": "string"}
        },
        "required": ["overallTrend", "crossCategoryInsights", "futureImplications"]
      }
    },
    "required": ["weeklyHighlights", "categorySummaries", "trendAnalysis"]
  }'
```

### Step 6: ワークフローのプロンプト更新 (`weekly-changelog.yml`)

```yaml
prompt: |
  data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}.json を読み込み、週次レポートを生成してください。

  ## タスク
  1週間分のChangelogを分析し、技術者向けの週次ニュースレターを生成します。

  ## ルール
  - `muted: true` のエントリはスキップしてください
  - 技術者にとって重要な変更を優先的に分析してください

  ## 出力構造

  ### 1. weeklyHighlights (注目のトップ3-5)
  今週最も重要・注目すべきエントリを3-5件選び、以下を含めてください:
  - url: エントリのURL
  - title: エントリのタイトル
  - category: カテゴリ（github/aws/claudeCode/linear）
  - reason: 選定理由（なぜ注目すべきか）2-3文
  - impact: 技術者への影響と活用ポイント 2-3文

  ### 2. categorySummaries (カテゴリ別総括)
  各カテゴリの週間動向を3-5文で総括してください:
  - github: GitHub Changelogの週間傾向
  - aws: AWS What's Newの週間傾向
  - claudeCode: Claude Codeの週間アップデート傾向
  - linear: Linear Changelogの週間傾向
  該当エントリがないカテゴリは「今週の更新はありませんでした」としてください。

  ### 3. trendAnalysis (傾向分析)
  - overallTrend: 今週の技術動向の全体傾向（2-3文）
  - crossCategoryInsights: カテゴリ横断の関連性分析（例: GitHubとAWS両方でAI関連の更新が多い等）2-3文
  - futureImplications: 今後の展望や技術者が注目すべきポイント 2-3文
```

### Step 7: テスト追加 (`scripts/create-discussion_test.ts`)

- `generateWeeklyBodyWithSummaries()` のユニットテスト
- `getCategoryEmoji()` のテスト
- `fetchDailyDiscussionLinks()` のモックテスト（可能であれば）

### Step 8: プレビュースクリプトの週次対応 (`scripts/preview-discussion.ts`)

週次プレビュー時の利便性を向上：

1. **インポート追加**: `WeeklySummaryData`, `generateWeeklyBodyWithSummaries`, `DailyLink` をインポート
2. **ダミーデータ内蔵**: `--summaries-json` がない場合に使用するサンプルデータを定義
3. **週次モード処理**: `--weekly` フラグ時は `WeeklySummaryData` 形式を使用

```typescript
// 週次プレビュー用のダミーデータ
const DUMMY_WEEKLY_SUMMARIES: WeeklySummaryData = {
  weeklyHighlights: [
    {
      url: "https://example.com/highlight1",
      title: "サンプルハイライト 1",
      category: "github",
      reason: "これはプレビュー用のダミーデータです。",
      impact: "これはプレビュー用のダミーデータです。",
    },
    // ...
  ],
  categorySummaries: {
    github: "【ダミー】GitHub Changelogの週間傾向がここに表示されます。",
    aws: "【ダミー】AWS What's Newの週間傾向がここに表示されます。",
    claudeCode: "【ダミー】Claude Codeの週間アップデート傾向がここに表示されます。",
    linear: "【ダミー】今週の更新はありませんでした。",
  },
  trendAnalysis: {
    overallTrend: "【ダミー】今週の技術動向の全体傾向がここに表示されます。",
    crossCategoryInsights: "【ダミー】カテゴリ横断の関連性分析がここに表示されます。",
    futureImplications: "【ダミー】今後の展望や技術者が注目すべきポイントがここに表示されます。",
  },
};
```

**使用方法**:
- `deno task preview-weekly` - ダミーデータでプレビュー
- `deno task preview-weekly --summaries-json='...'` - 指定JSONでプレビュー

### Step 9: プランファイルのリネーム

実装完了後、このプランファイルを `./plans/2026-01-20-weekly-changelog-improvement.md` にリネーム

---

## 出力例

```markdown
# 📰 Tech Changelog - Weekly

📅 **対象期間**: 2026-01-13 ~ 2026-01-20 (1週間)

## 🌟 今週のハイライト

### 🐙 [Agentic memory for GitHub Copilot is in public preview](https://github.blog/changelog/...)

**選定理由**: AIアシスタントの長期記憶機能という、開発者体験を大きく変える可能性を持つ機能のリリース。

**技術者への影響**: リポジトリ固有のコンテキストを自動学習し、継続的に支援品質が向上。チームでの知識共有にも貢献する可能性がある。

---

### ☁️ [Amazon S3 now supports...](https://aws.amazon.com/about-aws/whats-new/...)

**選定理由**: ...

**技術者への影響**: ...

---

## 🔮 傾向分析

### 今週の技術動向
AI支援開発ツールの進化が顕著で、特にGitHubのCopilot関連アップデートが集中しました。...

### クロスカテゴリの洞察
GitHubとAWSの両方で「開発者体験の向上」と「運用負荷の軽減」をテーマにした更新が多く見られました。...

### 今後の展望
Copilotのエコシステム拡大により、AI支援開発がIDEを超えてCI/CD、レビュー、運用まで広がる可能性があります。...

## 📊 カテゴリ別総括

### GitHub Changelog
今週はCopilot関連の更新が集中し、特にSDK公開、CLI強化、新モデル追加など開発者向けAI支援の進化が顕著でした。...

### AWS What's New
リージョン拡張とクロスアカウント機能が目立ちました。マルチアカウント・ハイブリッド環境向けの機能強化が進んでいます。

### Claude Code
v2.1.7からv2.1.12まで複数のマイナーリリースがあり、MCP関連の安定性向上とターミナル体験の改善が中心でした。

### Linear Changelog
今週の更新はありませんでした。

## 📅 Daily詳細

各日の詳細は以下のリンクからご確認ください:

- [2026-01-20](https://github.com/korosuke613/mynewshq/discussions/XX)
- [2026-01-17](https://github.com/korosuke613/mynewshq/discussions/XX)
- [2026-01-15](https://github.com/korosuke613/mynewshq/discussions/XX)
- ...

---
cc: @korosuke613
```

---

## 検証方法

1. **ローカルテスト**
   ```bash
   deno test scripts/create-discussion_test.ts
   ```

2. **プレビュー確認**
   ```bash
   # 週次データを取得
   deno task fetch --days=7 --weekly --date=2026-01-20

   # ダミーデータでプレビュー（フォーマット確認用）
   deno task preview-weekly --date=2026-01-20

   # 実際のJSONでプレビュー
   deno task preview-weekly --date=2026-01-20 --summaries-json='{"weeklyHighlights":...}'
   ```

3. **GitHub Actions での確認**
   - `workflow_dispatch` で手動実行し、生成されたDiscussionを確認
