// シンプルアダプタ（Claude Code/Linear用）
// カテゴリなし、entriesリスト形式に対応

import type {
  ChangelogData,
  ChangelogEntry,
  ReleaseEntry,
} from "../../types.ts";
import type { SummarizeConfig } from "../pipeline.ts";
import type { WeeklyContext, WeeklyMarkdownGenerator } from "../types.ts";
import { SIMPLE_SUMMARY_SCHEMA } from "../types.ts";
import { BaseAdapter } from "./base-adapter.ts";

/**
 * シンプルプロバイダー用のプロンプトテンプレート
 */
const SIMPLE_PROMPT_TEMPLATE = `
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

1. **highlights**: 今週の重要なポイントを1-5文の箇条書きで記述
   - 技術者にとって重要な変更や影響を強調
   - 具体的な機能名や改善点を含める
   - エントリが少ない場合は1文でも構いません

2. **entries**: 全エントリのurl/titleをリスト
   - mutedがtrueのエントリは除外

3. **overallComment**: 今週の変更全体を2-3文で要約

4. **historicalContext**: 過去のDiscussionと比較して1-2文でコメント
   - 初回や比較対象がない場合は「初回の週次レポートです」など

## 注意事項
- mutedがtrueのエントリはスキップしてください
- すべて日本語で記述してください
- 技術用語は正確に使用してください
- URLは必ず元データのものをそのまま使用してください
`.trim();

/**
 * Claude Code用アダプタ
 */
export class ClaudeCodeAdapter extends BaseAdapter {
  readonly providerId = "claudeCode";

  constructor(markdownGenerator: WeeklyMarkdownGenerator) {
    super(markdownGenerator);
  }

  getSummarizeConfig(): SummarizeConfig {
    return {
      jsonSchema: SIMPLE_SUMMARY_SCHEMA,
      promptTemplate: SIMPLE_PROMPT_TEMPLATE,
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
      aws: [],
      claudeCode: providerData as ReleaseEntry[],
      linear: [],
    };
  }
}

/**
 * Linear Changelog用アダプタ
 */
export class LinearAdapter extends BaseAdapter {
  readonly providerId = "linear";

  constructor(markdownGenerator: WeeklyMarkdownGenerator) {
    super(markdownGenerator);
  }

  getSummarizeConfig(): SummarizeConfig {
    return {
      jsonSchema: SIMPLE_SUMMARY_SCHEMA,
      promptTemplate: SIMPLE_PROMPT_TEMPLATE,
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
      aws: [],
      claudeCode: [],
      linear: providerData as ChangelogEntry[],
    };
  }
}

/**
 * シンプルプロバイダーのアダプタを取得
 */
export function getSimpleAdapter(
  providerId: string,
  markdownGenerator: WeeklyMarkdownGenerator,
): BaseAdapter | undefined {
  switch (providerId) {
    case "claudeCode":
      return new ClaudeCodeAdapter(markdownGenerator);
    case "linear":
      return new LinearAdapter(markdownGenerator);
    default:
      return undefined;
  }
}
