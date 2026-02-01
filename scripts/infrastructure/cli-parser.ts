// CLI引数解析ユーティリティ
// コマンドライン引数の解析パターンを共通化

/**
 * 引数配列から指定キーの値を取得
 * @param args - コマンドライン引数配列
 * @param key - 検索するキー（例: "date"）
 * @returns 値が見つかれば文字列、見つからなければundefined
 * @example parseArg(["--date=2026-01-15"], "date") // "2026-01-15"
 */
export function parseArg(
  args: string[],
  key: string,
): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${key}=`));
  return arg ? arg.split("=")[1] : undefined;
}

/**
 * 引数配列から指定キーの値を取得、見つからなければデフォルト値を返す
 * @param args - コマンドライン引数配列
 * @param key - 検索するキー
 * @param defaultValue - デフォルト値
 * @returns 値またはデフォルト値
 * @example parseArgWithDefault(["--owner=foo"], "owner", "korosuke613") // "foo"
 * @example parseArgWithDefault([], "owner", "korosuke613") // "korosuke613"
 */
export function parseArgWithDefault(
  args: string[],
  key: string,
  defaultValue: string,
): string {
  return parseArg(args, key) ?? defaultValue;
}

/**
 * フラグ引数（値なし）の存在を確認
 * @param args - コマンドライン引数配列
 * @param flag - 検索するフラグ（例: "dry-run"）
 * @returns フラグが存在すればtrue
 * @example hasFlag(["--dry-run"], "dry-run") // true
 * @example hasFlag(["--weekly"], "dry-run") // false
 */
export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(`--${flag}`);
}

/**
 * GITHUB_TOKEN環境変数を取得、存在しなければエラー終了
 * @returns GITHUB_TOKEN文字列
 * @throws エラーメッセージを出力してDeno.exit(1)
 */
export function requireGitHubToken(): string {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN environment variable is required");
    Deno.exit(1);
  }
  return token;
}
