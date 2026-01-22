// URL正規化関連の純粋関数

// URLを正規化（破損したURLを修正）
function repairBrokenUrl(url: string): string {
  // AWS RSSフィードで `aws.amazon.comabout-aws` のように
  // TLDの後にスラッシュなしでパスが続くケースを修正
  // 例: .comの直後にアルファベットが続く場合に `/` を挿入
  return url.replace(/\.com([a-z])/i, ".com/$1");
}

// 末尾のスラッシュを削除
export function normalizeTrailingSlash(url: string): string {
  if (!url || url === "/") {
    return url;
  }
  return url.replace(/\/+$/, "");
}

// 完全なURL正規化（破損修正 + 末尾スラッシュ削除）
export function normalizeUrl(url: string): string {
  return normalizeTrailingSlash(repairBrokenUrl(url));
}
