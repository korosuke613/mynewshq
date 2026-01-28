// カテゴリ分類ありアダプタ（GitHub/AWS用）
// labels フィールドを使用してカテゴリ別要約を生成

import type {
  ChangelogData,
  ChangelogEntry,
  ReleaseEntry,
} from "../../types.ts";
import type { SummarizeConfig } from "../pipeline.ts";
import type { WeeklyContext } from "../types.ts";
import { CATEGORIZED_SUMMARY_SCHEMA } from "../types.ts";
import { BaseAdapter } from "./base-adapter.ts";

/**
 * カテゴリ分類ありプロバイダー用のプロンプトテンプレート
 */
const CATEGORIZED_PROMPT_TEMPLATE = `
あなたは技術系Changelogの週次要約を生成するアシスタントです。

## プロバイダー情報
プロバイダーID: {providerId}

## 今週のChangelogデータ
以下は今週の{providerId}のChangelogエントリです：

\`\`\`json
{currentData}
\`\`\`

## 過去のDiscussion
以下は過去の週次Discussionの内容です（比較用）：

\`\`\`json
{pastDiscussions}
\`\`\`

## タスク
上記のデータを分析し、以下の形式で週次要約を生成してください：

1. **highlights**: 今週の重要なポイントを3-5文の箇条書きで記述
   - 技術者にとって重要な変更や影響を強調
   - 具体的な機能名や改善点を含める

2. **categories**: labelsフィールドを基にカテゴリごとにグループ化
   - 各カテゴリに属するエントリのurl/titleをリスト
   - comment: そのカテゴリの変更内容を2-3文で要約
   - historicalContext: 過去のDiscussionと比較して1-2文でコメント（初回や比較対象がない場合は「初回の週次レポートです」など）

## 注意事項
- mutedがtrueのエントリはスキップしてください
- すべて日本語で記述してください
- 技術用語は正確に使用してください
- URLは必ず元データのものをそのまま使用してください
`.trim();

/**
 * GitHub Changelog用アダプタ
 */
export class GitHubAdapter extends BaseAdapter {
  readonly providerId = "github";

  getSummarizeConfig(): SummarizeConfig {
    return {
      jsonSchema: CATEGORIZED_SUMMARY_SCHEMA,
      promptTemplate: CATEGORIZED_PROMPT_TEMPLATE,
    };
  }

  protected buildChangelogDataFromProviderData(
    providerData: ChangelogEntry[] | ReleaseEntry[],
    ctx: WeeklyContext,
  ): ChangelogData {
    return {
      date: ctx.endDate,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      github: providerData as ChangelogEntry[],
      aws: [],
      claudeCode: [],
      linear: [],
    };
  }
}

/**
 * AWS What's New用アダプタ
 */
export class AWSAdapter extends BaseAdapter {
  readonly providerId = "aws";

  getSummarizeConfig(): SummarizeConfig {
    return {
      jsonSchema: CATEGORIZED_SUMMARY_SCHEMA,
      promptTemplate: CATEGORIZED_PROMPT_TEMPLATE,
    };
  }

  protected buildChangelogDataFromProviderData(
    providerData: ChangelogEntry[] | ReleaseEntry[],
    ctx: WeeklyContext,
  ): ChangelogData {
    return {
      date: ctx.endDate,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      github: [],
      aws: providerData as ChangelogEntry[],
      claudeCode: [],
      linear: [],
    };
  }
}

/**
 * カテゴリ分類ありプロバイダーのアダプタを取得
 */
export function getCategorizedAdapter(
  providerId: string,
): BaseAdapter | undefined {
  switch (providerId) {
    case "github":
      return new GitHubAdapter();
    case "aws":
      return new AWSAdapter();
    default:
      return undefined;
  }
}
