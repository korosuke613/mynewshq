/**
 * writeGitHubOutput関数の統合テスト
 *
 * 実行方法:
 * deno test --allow-read --allow-write --allow-env scripts/fetch-changelogs_integration_test.ts
 */
import { assertEquals } from "@std/assert";
import { writeGitHubOutput } from "./fetch-changelogs.ts";

Deno.test("writeGitHubOutput integration", async (t) => {
  await t.step(
    "GITHUB_OUTPUTが設定されている場合はファイルに書き込む",
    async () => {
      const tempFile = await Deno.makeTempFile();
      try {
        // 環境変数を設定
        Deno.env.set("GITHUB_OUTPUT", tempFile);

        writeGitHubOutput("test_key", "test_value");
        writeGitHubOutput("another_key", "another_value");

        const content = await Deno.readTextFile(tempFile);
        assertEquals(
          content,
          "test_key=test_value\nanother_key=another_value\n",
        );
      } finally {
        // クリーンアップ
        Deno.env.delete("GITHUB_OUTPUT");
        await Deno.remove(tempFile);
      }
    },
  );

  await t.step("GITHUB_OUTPUTが設定されていない場合は何もしない", () => {
    // 環境変数がないことを確認
    Deno.env.delete("GITHUB_OUTPUT");

    // エラーが発生しないことを確認
    writeGitHubOutput("key", "value");
    // 正常に完了すればOK
  });
});
