// カテゴリフィルタリング関連の純粋関数
// Blog記事を設定したカテゴリ（キーワード）でフィルタリングする

// Issue本文から箇条書きのカテゴリキーワードを抽出
export function parseCategoryKeywords(issueBody: string): string[] {
  const BULLET_PREFIX = "- ";
  const BULLET_PREFIX_LENGTH = BULLET_PREFIX.length;
  const lines = issueBody.split("\n");
  const keywords: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // "- " で始まる行を箇条書きとして抽出
    if (trimmed.startsWith(BULLET_PREFIX)) {
      const keyword = trimmed.slice(BULLET_PREFIX_LENGTH).trim();
      if (keyword) {
        keywords.push(keyword);
      }
    }
  }

  return keywords;
}

// テキストがカテゴリキーワードにマッチするかチェック（単語境界・大文字小文字無視）
// 最初にマッチしたキーワードを返す（マッチしない場合はnull）
export function findFirstMatchedKeyword(
  text: string,
  categoryKeywords: string[],
): string | null {
  for (const keyword of categoryKeywords) {
    // 単語境界でマッチング（特殊文字をエスケープ）
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
    if (regex.test(text)) {
      return keyword;
    }
  }
  return null;
}

// @deprecated Use findFirstMatchedKeyword instead
export const matchesCategory = findFirstMatchedKeyword;

// テキストにマッチする全てのカテゴリキーワードを返す（単語境界・大文字小文字無視）
export function findAllMatchedKeywords(
  text: string,
  categoryKeywords: string[],
): string[] {
  const matched: string[] = [];
  for (const keyword of categoryKeywords) {
    // 単語境界でマッチング（特殊文字をエスケープ）
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
    if (regex.test(text)) {
      matched.push(keyword);
    }
  }
  return matched;
}

// エントリがいずれかのカテゴリにマッチするかチェック
// タイトル、タグ、説明文を順にチェックし、マッチしたカテゴリを全て返す
export function findMatchedCategories(
  entry: { title: string; tags?: string[]; description?: string },
  categoryKeywords: string[],
): string[] {
  const matchedCategories = new Set<string>();

  // タイトルで全てのキーワードをチェック
  for (const keyword of findAllMatchedKeywords(entry.title, categoryKeywords)) {
    matchedCategories.add(keyword);
  }

  // タグで全てのキーワードをチェック
  if (entry.tags) {
    for (const tag of entry.tags) {
      for (
        const keyword of findAllMatchedKeywords(tag, categoryKeywords)
      ) {
        matchedCategories.add(keyword);
      }
    }
  }

  // 説明文で全てのキーワードをチェック
  if (entry.description) {
    for (
      const keyword of findAllMatchedKeywords(
        entry.description,
        categoryKeywords,
      )
    ) {
      matchedCategories.add(keyword);
    }
  }

  return Array.from(matchedCategories);
}

// エントリ配列にカテゴリフィルターを適用
// マッチしたエントリのみを返し、matchedCategoriesフィールドを付与
// keepUnmatched: trueの場合、マッチしないエントリもmatchedCategories: []で返す
export function applyCategoryFilter<
  T extends { title: string; tags?: string[]; description?: string },
>(
  entries: T[],
  categoryKeywords: string[],
  options?: { keepUnmatched?: boolean },
): {
  filtered: (T & { matchedCategories: string[] })[];
  excludedCount: number;
} {
  const keepUnmatched = options?.keepUnmatched ?? false;

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
    } else if (keepUnmatched) {
      // keepUnmatchedがtrueの場合、マッチしないエントリも空配列で返す
      filtered.push({ ...entry, matchedCategories: [] });
    } else {
      excludedCount++;
    }
  }

  return { filtered, excludedCount };
}
