import assert from "node:assert/strict";
import { test } from "node:test";
import { startOfTodayInKL } from "../src/lib/kl-time.ts";

test("startOfTodayInKL returns KL midnight, not UTC midnight", () => {
  // 10:00 KL on 25 Sep = 02:00 UTC on 25 Sep; KL midnight was 16:00 UTC on 24 Sep.
  assert.equal(startOfTodayInKL(new Date("2026-09-25T02:00:00Z")).toISOString(), "2026-09-24T16:00:00.000Z");
  // 23:30 UTC on 24 Sep is already 07:30 on 25 Sep in KL.
  assert.equal(startOfTodayInKL(new Date("2026-09-24T23:30:00Z")).toISOString(), "2026-09-24T16:00:00.000Z");
  // 15:59 UTC is still the previous KL day; 16:00 UTC is exactly KL midnight.
  assert.equal(startOfTodayInKL(new Date("2026-09-24T15:59:59Z")).toISOString(), "2026-09-23T16:00:00.000Z");
  assert.equal(startOfTodayInKL(new Date("2026-09-24T16:00:00Z")).toISOString(), "2026-09-24T16:00:00.000Z");
});
