import type { ChangelogData, ChangelogEntry, ReleaseEntry } from "../types.ts";

export type WeeklyChangelogProviderId =
  | "github"
  | "aws"
  | "claudeCode"
  | "githubCli"
  | "linear";

export function getWeeklyProviderData(
  changelogData: ChangelogData,
  providerId: string,
): ChangelogEntry[] | ReleaseEntry[] {
  switch (providerId) {
    case "github":
      return changelogData.github;
    case "aws":
      return changelogData.aws;
    case "claudeCode":
      return changelogData.claudeCode;
    case "githubCli":
      return changelogData.githubCli ?? [];
    case "linear":
      return changelogData.linear;
    default:
      return [];
  }
}
