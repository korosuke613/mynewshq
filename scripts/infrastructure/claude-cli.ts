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

  // JSON Schemaを一時ファイルに保存
  const schemaFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(schemaFile, JSON.stringify(jsonSchema));

    // Claude Code CLI実行
    const command = new Deno.Command("claude", {
      args: [
        "--json-schema-file",
        schemaFile,
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

      return {
        success: true,
        output: output.trim(),
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
  } finally {
    // 一時ファイル削除
    try {
      await Deno.remove(schemaFile);
    } catch {
      // 削除失敗は無視
    }
  }
}
