import { assertEquals } from "@std/assert";
import { resolveReplyToId } from "./reply-discussion.ts";

// deno-lint-ignore no-explicit-any
type MockGraphql = (...args: any[]) => Promise<any>;

Deno.test("resolveReplyToId", async (t) => {
  await t.step(
    "Level 1 コメント（replyTo: null）の場合はそのままのIDを返す",
    async () => {
      const mockGraphql = (() => {
        return Promise.resolve({
          node: { replyTo: null },
        });
      }) as MockGraphql;

      const result = await resolveReplyToId(
        mockGraphql as Parameters<typeof resolveReplyToId>[0],
        "DC_level1_id",
      );
      assertEquals(result, "DC_level1_id");
    },
  );

  await t.step(
    "Level 2 コメント（replyTo あり）の場合は親コメントのIDを返す",
    async () => {
      const mockGraphql = (() => {
        return Promise.resolve({
          node: { replyTo: { id: "DC_parent_id" } },
        });
      }) as MockGraphql;

      const result = await resolveReplyToId(
        mockGraphql as Parameters<typeof resolveReplyToId>[0],
        "DC_level2_id",
      );
      assertEquals(result, "DC_parent_id");
    },
  );

  await t.step(
    "node が null の場合は元のIDを返す（フォールバック）",
    async () => {
      const mockGraphql = (() => {
        return Promise.resolve({
          node: null,
        });
      }) as MockGraphql;

      const result = await resolveReplyToId(
        mockGraphql as Parameters<typeof resolveReplyToId>[0],
        "DC_invalid_id",
      );
      assertEquals(result, "DC_invalid_id");
    },
  );

  await t.step(
    "GraphQL エラーの場合は元のIDを返す（フォールバック）",
    async () => {
      const mockGraphql = (() => {
        return Promise.reject(new Error("GraphQL error"));
      }) as MockGraphql;

      const result = await resolveReplyToId(
        mockGraphql as Parameters<typeof resolveReplyToId>[0],
        "DC_error_id",
      );
      assertEquals(result, "DC_error_id");
    },
  );
});
