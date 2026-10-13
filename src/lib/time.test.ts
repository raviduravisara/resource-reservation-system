import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDaysToKey, minutesIntoDay, toDateKey, toInstant, weekdayOf, weekStartKey } from "./time";

describe("time helpers (Asia/Colombo)", () => {
  it("converts a local date and time to the correct instant", () => {
    assert.equal(toInstant("2026-10-14", "09:00").toISOString(), "2026-10-14T03:30:00.000Z");
  });

  it("reads the local calendar day, not the UTC one", () => {
    const lateEvening = new Date("2026-10-14T19:00:00.000Z");
    assert.equal(toDateKey(lateEvening), "2026-10-15");
    assert.equal(weekdayOf(lateEvening), 4);
    assert.equal(minutesIntoDay(lateEvening), 30);
  });

  it("starts weeks on Monday", () => {
    assert.equal(weekStartKey("2026-10-18"), "2026-10-12");
    assert.equal(weekStartKey("2026-10-12"), "2026-10-12");
  });

  it("adds days across month boundaries", () => {
    assert.equal(addDaysToKey("2026-10-30", 3), "2026-11-02");
  });
});
