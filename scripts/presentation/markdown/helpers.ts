// Markdown生成用のヘルパー関数

// カテゴリ名に対応する絵文字を返す
export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    github: "🐙",
    aws: "☁️",
    claudeCode: "🤖",
    linear: "📐",
  };
  return emojis[category] || "📌";
}

// ChangelogEntry のラベルからバッククォート付きの文字列を生成
export function formatLabelsString(labels?: Record<string, string[]>): string {
  if (!labels) {
    return "";
  }
  const allLabels = Object.values(labels).flat();
  if (allLabels.length === 0) {
    return "";
  }
  return allLabels.map((label) => `\`${label}\``).join(" ");
}

// メンション文字列を生成
export function generateMention(): string {
  const mentionUser = Deno.env.get("MENTION_USER") || "korosuke613";
  return `\n\n---\ncc: @${mentionUser}`;
}

// エントリからタイトルを取得
export function getEntryTitle(
  entry: { title?: string; version?: string },
): string {
  if (entry.title) {
    return entry.title;
  }
  if (entry.version) {
    return entry.version;
  }
  return "Untitled";
}
