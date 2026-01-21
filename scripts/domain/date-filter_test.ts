import { assertEquals } from "@std/assert";
import { isRecent, isWithinDays } from "./date-filter.ts";

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

Deno.test("isWithinDays", async (t) => {
  await t.step("1日以内の日付はtrueを返す（days=1）", () => {
    assertEquals(isWithinDays("2026-01-18T00:00:00Z", 1, NOW), true);
  });

  await t.step("ちょうど1日前はtrueを返す（境界値）", () => {
    assertEquals(isWithinDays("2026-01-17T12:00:00Z", 1, NOW), true);
  });

  await t.step("1日より前はfalseを返す（days=1）", () => {
    assertEquals(isWithinDays("2026-01-17T11:59:59Z", 1, NOW), false);
  });

  await t.step("7日以内の日付はtrueを返す（days=7）", () => {
    assertEquals(isWithinDays("2026-01-12T12:00:00Z", 7, NOW), true);
  });

  await t.step("ちょうど7日前はtrueを返す（境界値）", () => {
    assertEquals(isWithinDays("2026-01-11T12:00:00Z", 7, NOW), true);
  });

  await t.step("7日より前はfalseを返す（days=7）", () => {
    assertEquals(isWithinDays("2026-01-11T11:59:59Z", 7, NOW), false);
  });

  await t.step("未来の日付はfalseを返す", () => {
    assertEquals(isWithinDays("2026-01-19T00:00:00Z", 7, NOW), false);
  });

  await t.step("ちょうどnowと同じ日時はtrueを返す", () => {
    assertEquals(isWithinDays("2026-01-18T12:00:00Z", 1, NOW), true);
  });

  await t.step("nowより1秒後はfalseを返す", () => {
    assertEquals(isWithinDays("2026-01-18T12:00:01Z", 1, NOW), false);
  });

  await t.step("30日間でも正しく動作する", () => {
    assertEquals(isWithinDays("2026-01-01T12:00:00Z", 30, NOW), true);
    assertEquals(isWithinDays("2025-12-19T12:00:00Z", 30, NOW), true);
    assertEquals(isWithinDays("2025-12-19T11:59:59Z", 30, NOW), false);
  });

  await t.step("RFC 2822形式を処理できる", () => {
    assertEquals(isWithinDays("Sat, 18 Jan 2026 00:00:00 GMT", 1, NOW), true);
    assertEquals(isWithinDays("Mon, 13 Jan 2026 00:00:00 GMT", 7, NOW), true);
  });
});
