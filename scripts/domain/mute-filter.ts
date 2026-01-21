// ミュートフィルタリング関連の純粋関数

// Issue本文から箇条書きのミュートワードを抽出
export function parseMuteWords(issueBody: string): string[] {
  const lines = issueBody.split("\n");
  const muteWords: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // "- " で始まる行を箇条書きとして抽出
    if (trimmed.startsWith("- ")) {
      const word = trimmed.slice(2).trim();
      if (word) {
        muteWords.push(word);
      }
    }
  }

  return muteWords;
}

// タイトルがミュートワードに一致するかチェック（部分一致・大文字小文字無視）
export function isMuted(title: string, muteWords: string[]): string | null {
  const lowerTitle = title.toLowerCase();
  for (const word of muteWords) {
    if (lowerTitle.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

// エントリからチェック対象のテキストを取得（title優先、なければversion）
function getTitleOrVersion(entry: { title?: string; version?: string }): string {
  if (entry.title) {
    return entry.title;
  }
  if (entry.version) {
    return entry.version;
  }
  return "";
}

// エントリ配列にミュートフラグを適用
export function applyMuteFilter<
  T extends { title?: string; version?: string },
>(
  entries: T[],
  muteWords: string[],
): (T & { muted?: boolean; mutedBy?: string })[] {
  return entries.map((entry) => {
    const titleToCheck = getTitleOrVersion(entry);
    const mutedBy = isMuted(titleToCheck, muteWords);
    if (mutedBy) {
      return { ...entry, muted: true, mutedBy };
    }
    return entry;
  });
}
