/**
 * Claude Code CLI実行ユーティリティ
 *
 * Claude Code CLIを使って構造化JSONレスポンスを取得する
 */

export interface ClaudeCliOptions {
  prompt: string;
  jsonSchema: object;
  timeout?: number; // ミリ秒、デフォルト: 5分
}

export interface ClaudeCliResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Claude Code CLIが利用可能かチェック
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  try {
    const command = new Deno.Command("claude", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });

    const process = command.spawn();
    const status = await process.status;

    return status.success;
  } catch {
    return false;
  }
}

/**
 * Claude Code CLIを実行して構造化JSONを取得
 */
export async function executeClaudeCli(
  options: ClaudeCliOptions,
): Promise<ClaudeCliResult> {
  const { prompt, jsonSchema, timeout = 300000 } = options; // デフォルト5分

  // Claude Code CLI実行
  const command = new Deno.Command("claude", {
    args: [
      "--print",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(jsonSchema),
      prompt,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();

  // タイムアウト処理
  const timeoutId = setTimeout(() => {
    process.kill("SIGTERM");
  }, timeout);

  try {
    const { stdout, stderr, success } = await process.output();

    clearTimeout(timeoutId);

    if (!success) {
      const errorMessage = new TextDecoder().decode(stderr);
      return {
        success: false,
        error: errorMessage || "Claude Code CLI execution failed",
      };
    }

    const output = new TextDecoder().decode(stdout);
    const trimmedOutput = output.trim();

    // --output-format json を使用すると、メタデータを含むJSONが返される
    // structured_output フィールドを抽出する
    try {
      const parsed = JSON.parse(trimmedOutput);
      if (parsed.structured_output) {
        return {
          success: true,
          output: JSON.stringify(parsed.structured_output),
        };
      }
    } catch {
      // JSONパースに失敗した場合はそのまま返す
    }

    return {
      success: true,
      output: trimmedOutput,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: `Claude Code CLI error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
