// URL正規化関連の純粋関数

// URLを正規化（破損したURLを修正）
export function normalizeUrl(url: string): string {
  // AWS RSSフィードで `aws.amazon.comabout-aws` のように
  // TLDの後にスラッシュなしでパスが続くケースを修正
  // 例: .comの直後にアルファベットが続く場合に `/` を挿入
  return url.replace(/\.com([a-z])/i, ".com/$1");
}
