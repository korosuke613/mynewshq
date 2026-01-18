import { assertEquals } from "@std/assert";
import { isRecent } from "./fetch-changelogs.ts";

const NOW = new Date("2026-01-18T12:00:00Z");

Deno.test("isRecent", async (t) => {
  await t.step("24時間以内の日付はtrueを返す", () => {
    assertEquals(isRecent("2026-01-18T00:00:00Z", NOW), true);
  });

  await t.step("ちょうど24時間前はtrueを返す（境界値）", () => {
    assertEquals(isRecent("2026-01-17T12:00:00Z", NOW), true);
  });

  await t.step("24時間より前はfalseを返す", () => {
    assertEquals(isRecent("2026-01-17T11:59:59Z", NOW), false);
  });

  await t.step("1週間前はfalseを返す", () => {
    assertEquals(isRecent("2026-01-11T12:00:00Z", NOW), false);
  });

  await t.step("未来の日付はfalseを返す", () => {
    assertEquals(isRecent("2026-01-19T00:00:00Z", NOW), false);
  });

  await t.step("ちょうどnowと同じ日時はtrueを返す（上限の境界値）", () => {
    assertEquals(isRecent("2026-01-18T12:00:00Z", NOW), true);
  });

  await t.step("nowより1秒後はfalseを返す（上限を超える）", () => {
    assertEquals(isRecent("2026-01-18T12:00:01Z", NOW), false);
  });

  await t.step("RFC 2822形式を処理できる", () => {
    assertEquals(isRecent("Sat, 18 Jan 2026 00:00:00 GMT", NOW), true);
  });
});
