// カテゴリフィルタリング関連の純粋関数
// Blog記事を設定したカテゴリ（キーワード）でフィルタリングする

// Issue本文から箇条書きのカテゴリキーワードを抽出
export function parseCategoryKeywords(issueBody: string): string[] {
  const lines = issueBody.split("\n");
  const keywords: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // "- " で始まる行を箇条書きとして抽出
    if (trimmed.startsWith("- ")) {
      const keyword = trimmed.slice(2).trim();
      if (keyword) {
        keywords.push(keyword);
      }
    }
  }

  return keywords;
}

// テキストがカテゴリキーワードにマッチするかチェック（部分一致・大文字小文字無視）
// マッチしたキーワードを返す（マッチしない場合はnull）
export function matchesCategory(
  text: string,
  categoryKeywords: string[],
): string | null {
  const lowerText = text.toLowerCase();
  for (const keyword of categoryKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

// エントリがいずれかのカテゴリにマッチするかチェック
// タイトル、タグ、説明文を順にチェックし、マッチしたカテゴリを全て返す
export function findMatchedCategories(
  entry: { title: string; tags?: string[]; description?: string },
  categoryKeywords: string[],
): string[] {
  const matchedCategories = new Set<string>();

  // タイトルでチェック
  const titleMatch = matchesCategory(entry.title, categoryKeywords);
  if (titleMatch) {
    matchedCategories.add(titleMatch);
  }

  // タグでチェック
  if (entry.tags) {
    for (const tag of entry.tags) {
      const tagMatch = matchesCategory(tag, categoryKeywords);
      if (tagMatch) {
        matchedCategories.add(tagMatch);
      }
    }
  }

  // 説明文でチェック
  if (entry.description) {
    const descMatch = matchesCategory(entry.description, categoryKeywords);
    if (descMatch) {
      matchedCategories.add(descMatch);
    }
  }

  return Array.from(matchedCategories);
}

// エントリ配列にカテゴリフィルターを適用
// マッチしたエントリのみを返し、matchedCategoriesフィールドを付与
export function applyCategoryFilter<
  T extends { title: string; tags?: string[]; description?: string },
>(
  entries: T[],
  categoryKeywords: string[],
): {
  filtered: (T & { matchedCategories: string[] })[];
  excludedCount: number;
} {
  // カテゴリキーワードが空の場合は全てのエントリを返す（フィルタリングなし）
  if (categoryKeywords.length === 0) {
    return {
      filtered: entries.map((entry) => ({ ...entry, matchedCategories: [] })),
      excludedCount: 0,
    };
  }

  const filtered: (T & { matchedCategories: string[] })[] = [];
  let excludedCount = 0;

  for (const entry of entries) {
    const matchedCategories = findMatchedCategories(entry, categoryKeywords);
    if (matchedCategories.length > 0) {
      filtered.push({ ...entry, matchedCategories });
    } else {
      excludedCount++;
    }
  }

  return { filtered, excludedCount };
}
