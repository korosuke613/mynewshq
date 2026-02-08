/**
 * Claude Code CLI用プロンプトとJSONスキーマ定義
 *
 * GitHub Actionsワークフローから抽出したプロンプトとスキーマを管理
 */

/**
 * 日次Changelog要約用プロンプト
 */
export function getDailyChangelogPrompt(filePath: string): string {
  return `${filePath} を読み込み、各エントリの要約を生成してください。

## ルール
- \`muted: true\` のエントリはスキップしてください
- 各エントリについて、2-3文で簡潔に日本語で要約してください
- 技術者向けにわかりやすく、重要なポイントを強調してください

## 出力形式
各カテゴリ（github, aws, claudeCode, linear）について、エントリのURLをキー、要約文を値とするオブジェクトを返してください。
該当するエントリがないカテゴリは空オブジェクト \`{}\` としてください。`;
}

/**
 * 日次Changelog要約用JSONスキーマ
 */
export const DAILY_CHANGELOG_SCHEMA = {
  "type": "object",
  "properties": {
    "github": {
      "type": "object",
      "additionalProperties": { "type": "string" },
    },
    "aws": {
      "type": "object",
      "additionalProperties": { "type": "string" },
    },
    "claudeCode": {
      "type": "object",
      "additionalProperties": { "type": "string" },
    },
    "linear": {
      "type": "object",
      "additionalProperties": { "type": "string" },
    },
  },
  "required": ["github", "aws", "claudeCode", "linear"],
};

/**
 * 日次Blog要約用プロンプト
 */
export function getDailyBlogPrompt(filePath: string): string {
  return `${filePath} を読み込み、カテゴリごとにグループ化して記事をまとめてください。

## カテゴリグループ化のルール
- \`muted: true\` のエントリはスキップしてください
- 各記事の \`matchedCategories\` フィールドを参照してカテゴリ分けしてください
- \`matchedCategories\` が空でない記事のみを対象としてください
- \`matchedCategories\` の値をそのままカテゴリ名として使用してください（例: "aws", "git", "github", "docker", "claude code"）
- 複数のカテゴリにマッチする記事は、全てのカテゴリに表示してください
- カテゴリの順序は \`matchedCategories\` に含まれるキーワードの順序に従ってください

## 出力形式
- categories: カテゴリごとのグループのリスト
  - category: カテゴリ名（\`matchedCategories\` の値をそのまま使用。例: "aws", "git", "github", "claude code"）
  - entries: カテゴリ内の記事リスト
    - url: 記事のURL
    - title: 記事のタイトル
    - comment: 記事へのコメント（2-3文で、技術的なポイントを強調し、読者にとっての価値を説明）
  - categoryComment: カテゴリ全体のまとめコメント（1-2文で、そのカテゴリの今日のトレンドを説明）

\`matchedCategories\` が空でない記事がない場合は categories を空配列 \`[]\` としてください。`;
}

/**
 * 日次Blog要約用JSONスキーマ
 */
export const DAILY_BLOG_SCHEMA = {
  "type": "object",
  "properties": {
    "hatenaBookmark": {
      "type": "object",
      "properties": {
        "categories": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": { "type": "string" },
              "entries": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "url": { "type": "string" },
                    "title": { "type": "string" },
                    "comment": { "type": "string" },
                  },
                  "required": ["url", "title", "comment"],
                },
              },
              "categoryComment": { "type": "string" },
            },
            "required": ["category", "entries", "categoryComment"],
          },
        },
      },
      "required": ["categories"],
    },
    "hackerNews": {
      "type": "object",
      "properties": {
        "categories": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": { "type": "string" },
              "entries": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "url": { "type": "string" },
                    "title": { "type": "string" },
                    "comment": { "type": "string" },
                  },
                  "required": ["url", "title", "comment"],
                },
              },
              "categoryComment": { "type": "string" },
            },
            "required": ["category", "entries", "categoryComment"],
          },
        },
      },
      "required": ["categories"],
    },
  },
  "required": [],
};

/**
 * 週次要約用プロンプト（プロバイダー指定）
 */
export function getWeeklyChangelogPrompt(
  filePath: string,
  provider: string,
  pastDiscussionsPath?: string,
): string {
  const pastDiscussionNote = pastDiscussionsPath
    ? `data/past-discussions.json の過去Discussion情報と`
    : "";

  return `${filePath} の ${provider} 部分${
    pastDiscussionNote ? `と ${pastDiscussionNote}` : ""
  }を読み込み、${provider}用の週次レポートを生成してください。

## タスク
${provider}の週次分析を行い、プロバイダー単位の要約を生成します。

## ルール
${
    pastDiscussionNote
      ? "- 過去のDiscussionを参照し、比較コメントを含めてください"
      : ""
  }
- すべて日本語で記述してください

## 出力構造

### 1. highlights (1-5件の箇条書き文)
今週の重要な変更点を箇条書きで記述:
- 各項目は1~5文で簡潔にまとめる
- 技術者に影響のある更新のポイントを含める

### 2. 詳細データ
- GitHub/AWS: \`categories\` でカテゴリ別にグループ化（labels.changelog-label または labels.products）
- Claude Code/Linear: \`entries\` でリスト形式

### 3. コメント
- GitHub/AWS: 各カテゴリに \`comment\`（2-5文）と \`historicalContext\`（1-2文${
    pastDiscussionNote ? "、過去Discussionとの比較" : ""
  }）
- Claude Code/Linear: \`overallComment\`（2-5文）と \`historicalContext\`（1-2文${
    pastDiscussionNote ? "、過去Discussionとの比較" : ""
  }）`;
}

/**
 * 週次要約用JSONスキーマ（カテゴリ分け型: GitHub, AWS用）
 */
export const WEEKLY_CATEGORIZED_SCHEMA = {
  "type": "object",
  "properties": {
    "providerId": { "type": "string" },
    "highlights": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5,
    },
    "categories": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": { "type": "string" },
          "entries": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "url": { "type": "string" },
                "title": { "type": "string" },
              },
              "required": ["url", "title"],
            },
          },
          "comment": { "type": "string" },
          "historicalContext": { "type": "string" },
        },
        "required": ["category", "entries", "comment", "historicalContext"],
      },
    },
  },
  "required": ["providerId", "highlights", "categories"],
};

/**
 * 週次要約用JSONスキーマ（シンプル型: Claude Code, Linear用）
 */
export const WEEKLY_SIMPLE_SCHEMA = {
  "type": "object",
  "properties": {
    "providerId": { "type": "string" },
    "highlights": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5,
    },
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string" },
          "title": { "type": "string" },
        },
        "required": ["url", "title"],
      },
    },
    "overallComment": { "type": "string" },
    "historicalContext": { "type": "string" },
  },
  "required": [
    "providerId",
    "highlights",
    "entries",
    "overallComment",
    "historicalContext",
  ],
};

/**
 * 週次Blog要約用プロンプト
 */
export function getWeeklyBlogPrompt(
  filePath: string,
  provider: string,
): string {
  return `${filePath} の ${provider} 部分を読み込み、カテゴリごとにグループ化して記事をまとめてください。

## タスク
${provider}の週次分析を行い、カテゴリ別に記事を要約します。

## ルール
- \`muted: true\` のエントリはスキップしてください
- 各記事の \`matchedCategories\` フィールドを参照してカテゴリ分けしてください
- \`matchedCategories\` が空でない記事のみを対象としてください
- 複数のカテゴリにマッチする記事は、全てのカテゴリに表示してください
- すべて日本語で記述してください

## 出力構造

### 1. highlights (1-5件の箇条書き文)
今週の重要な記事を箇条書きで記述:
- 各項目は1~5文で簡潔にまとめる
- 技術者に影響のあるトピックを含める

### 2. categories
カテゴリごとにグループ化:
- category: カテゴリ名（\`matchedCategories\` の値をそのまま使用）
- entries: カテゴリ内の記事リスト
  - url: 記事のURL
  - title: 記事のタイトル
  - comment: 記事へのコメント（2-3文で、技術的なポイントを強調し、読者にとっての価値を説明）
- categoryComment: カテゴリ全体のまとめコメント（2-3文で、そのカテゴリの今週のトレンドを説明）

\`matchedCategories\` が空でない記事がない場合は categories を空配列 \`[]\` としてください。`;
}

/**
 * 週次Blog要約用JSONスキーマ
 */
export const WEEKLY_BLOG_SCHEMA = {
  "type": "object",
  "properties": {
    "providerId": { "type": "string" },
    "highlights": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5,
    },
    "categories": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": { "type": "string" },
          "entries": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "url": { "type": "string" },
                "title": { "type": "string" },
                "comment": { "type": "string" },
              },
              "required": ["url", "title", "comment"],
            },
          },
          "categoryComment": { "type": "string" },
        },
        "required": ["category", "entries", "categoryComment"],
      },
    },
  },
  "required": ["providerId", "highlights", "categories"],
};
