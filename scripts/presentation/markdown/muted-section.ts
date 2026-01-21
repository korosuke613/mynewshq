// ミュートセクション生成
import { getEntryTitle } from "./helpers.ts";

// ミュートされたエントリの折りたたみセクションを生成
export function generateMutedSection<
  T extends { title?: string; version?: string; url: string; mutedBy?: string },
>(entries: T[]): string {
  const mutedEntries = entries.filter((e) => "muted" in e && e.muted);
  if (mutedEntries.length === 0) {
    return "";
  }

  let section =
    `<details>\n<summary>ミュートされたエントリ (${mutedEntries.length}件)</summary>\n\n`;
  for (const entry of mutedEntries) {
    const title = getEntryTitle(entry);
    const mutedBy = entry.mutedBy || "unknown";
    section += `- [${title}](${entry.url}) *(ミュートワード: ${mutedBy})*\n`;
  }
  section += `</details>\n\n`;
  return section;
}
