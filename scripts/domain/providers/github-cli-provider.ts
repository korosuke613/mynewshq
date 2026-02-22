// GitHub CLI Provider
// 設定とデータ取得ロジックを統合

import { Octokit } from "@octokit/rest";
import type { ReleaseEntry } from "../types.ts";
import type { ProviderConfig } from "./types.ts";
import { isWithinDays } from "../date-filter.ts";

/**
 * GitHub CLI Releasesを取得
 */
async function fetchGitHubCliReleases(
  targetDate: Date,
  days: number = 1,
): Promise<ReleaseEntry[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  const octokit = new Octokit(token ? { auth: token } : undefined);

  const { data: releases } = await octokit.repos.listReleases({
    owner: "cli",
    repo: "cli",
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
 * GitHub CLI Provider設定
 */
export const githubCliProvider: ProviderConfig<ReleaseEntry> = {
  id: "githubCli",
  displayName: "GitHub CLI",
  emoji: "⌨️",
  labelName: "github-cli",
  category: "changelog",
  titleField: "version",
  pubDateField: "publishedAt",
  fetch: fetchGitHubCliReleases,
};
