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
    - comment: 記事へのコメント（1文で簡潔に、技術的なポイントを強調）
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
  },
  "required": ["hatenaBookmark"],
};
