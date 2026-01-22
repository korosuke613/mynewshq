// URL正規化関連の純粋関数

// .com直後にスラッシュがない場合に挿入する
// AWS RSSフィードで `aws.amazon.comabout-aws` のようにパスが続くケースを修正
// 例: aws.amazon.comabout-aws → aws.amazon.com/about-aws
function fixMissingSlashAfterCom(url: string): string {
  return url.replace(/\.com([a-z])/i, ".com/$1");
}

// 末尾のスラッシュを削除
export function normalizeTrailingSlash(url: string): string {
  if (!url || url === "/") {
    return url;
  }
  return url.replace(/\/+$/, "");
}

// 完全なURL正規化（.comスラッシュ修正 + 末尾スラッシュ削除）
export function normalizeUrl(url: string): string {
  return normalizeTrailingSlash(fixMissingSlashAfterCom(url));
}
