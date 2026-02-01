// 週次Markdown生成の実装クラス
// WeeklyMarkdownGeneratorインターフェースの具象実装

import type {
  ChangelogEntry,
  ProviderWeeklySummary,
  ReleaseEntry,
} from "../../domain/types.ts";
import type { WeeklyMarkdownGenerator } from "../../domain/weekly/types.ts";
import {
  generateProviderWeeklyBody,
  generateProviderWeeklyTitle,
} from "./weekly-generator.ts";
import { generateMention } from "./helpers.ts";

/**
 * 週次Markdown生成の実装
 * domain層から参照されるインターフェースの実装
 */
export class DefaultWeeklyMarkdownGenerator implements WeeklyMarkdownGenerator {
  generateBody(
    providerId: string,
    data: ChangelogEntry[] | ReleaseEntry[],
    summary: ProviderWeeklySummary,
    startDate: string,
    endDate: string,
  ): string {
    return generateProviderWeeklyBody(
      providerId,
      data,
      summary,
      startDate,
      endDate,
    );
  }

  generateTitle(providerId: string, endDate: string): string {
    return generateProviderWeeklyTitle(providerId, endDate);
  }

  generateMention(): string {
    return generateMention();
  }
}
