// Claude Code Provider
// 設定とデータ取得ロジックを統合

import { Octokit } from "@octokit/rest";
import type { ReleaseEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

const octokit = new Octokit();

/**
 * Claude Code Releasesを取得
 */
async function fetchClaudeCodeReleases(
  targetDate: Date,
  days: number = 1,
): Promise<ReleaseEntry[]> {
  const { data: releases } = await octokit.repos.listReleases({
    owner: "anthropics",
    repo: "claude-code",
    per_page: 10,
  });

  const entries: ReleaseEntry[] = [];

  for (const release of releases) {
    if (
      release.published_at &&
      isWithinDays(release.published_at, days, targetDate)
    ) {
      entries.push({
        version: release.tag_name,
        url: release.html_url,
        body: release.body || "",
        publishedAt: release.published_at,
      });
    }
  }

  return entries;
}

/**
 * Claude Code Provider設定
 */
export const claudeCodeProvider: ProviderConfig<ReleaseEntry> = {
  id: "claudeCode",
  displayName: "Claude Code",
  emoji: "\u{1F916}",
  labelName: "claude-code",
  category: "changelog",
  titleField: "version",
  pubDateField: "publishedAt",
  fetch: fetchClaudeCodeReleases,
};
