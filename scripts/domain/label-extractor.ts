// ラベル抽出関連の純粋関数
import type {
  ChangelogData,
  DetermineLabelsOptions,
  XmlCategory,
} from "./types.ts";
import { PROVIDER_CONFIGS } from "./providers/index.ts";

// XMLのカテゴリ情報からラベルを抽出
export function extractLabelsFromCategories(
  category?: XmlCategory | XmlCategory[],
): Record<string, string[]> {
  const labels: Record<string, string[]> = {};
  const categories = Array.isArray(category)
    ? category
    : (category ? [category] : []);

  for (const cat of categories) {
    if (
      typeof cat === "object" && cat !== null &&
      cat["@domain"] && cat["#text"]
    ) {
      const domain = cat["@domain"];
      const value = cat["#text"];
      if (!labels[domain]) {
        labels[domain] = [];
      }
      labels[domain].push(value);
    }
  }

  return labels;
}

// AWSカテゴリ文字列からラベルを抽出
// 形式: "general:products/amazon-connect" → { "general:products": ["amazon-connect"] }
// general:products系のみを抽出（marketing:marchitectureなどは除外）
// rss-parserはカテゴリをカンマ区切りの文字列として返す場合があるため、分割処理を行う
export function extractLabelsFromAWSCategory(
  categories?: string[],
): Record<string, string[]> {
  const labels: Record<string, string[]> = {};
  if (!categories) return labels;

  for (const rawCat of categories) {
    // カンマ区切りの場合は分割
    const splitCategories = rawCat.split(",").map((c) => c.trim());

    for (const cat of splitCategories) {
      // general:products/xxx のみを抽出
      const match = cat.match(/^general:products\/(.+)$/);
      if (match) {
        const [, value] = match;
        if (!labels["general:products"]) {
          labels["general:products"] = [];
        }
        labels["general:products"].push(value);
      }
    }
  }

  return labels;
}

// amazon- または aws- プレフィックスを省略する
export function stripAwsPrefix(label: string): string {
  return label.replace(/^(amazon-|aws-)/, "");
}

// changelogデータからラベル名を決定
export function determineLabels(
  data: ChangelogData,
  options?: DetermineLabelsOptions,
): string[] {
  const labels = new Set<string>(); // Setを使用して重複を避ける
  const serviceOnly = options?.serviceOnly ?? false;

  for (const config of PROVIDER_CONFIGS) {
    const entries = data[config.id as keyof ChangelogData];
    if (Array.isArray(entries) && entries.length > 0) {
      // サービス名ラベルを追加
      labels.add(config.labelName);

      // サブカテゴリラベルを追加（serviceOnlyでない場合、かつlabelPrefixがある場合）
      if (!serviceOnly && config.labelPrefix) {
        for (const entry of entries) {
          // ChangelogEntryの場合のみlabelsを持つ
          if ("labels" in entry && entry.labels) {
            Object.values(entry.labels).flat().forEach((label) => {
              // transformLabelがあれば変換を適用
              const transformedLabel = config.transformLabel
                ? config.transformLabel(label)
                : label;
              labels.add(`${config.labelPrefix}${transformedLabel}`);
            });
          }
        }
      }
    }
  }

  return Array.from(labels); // Setを配列に変換して返す
}
