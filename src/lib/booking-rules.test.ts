import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCancel,
  checkBookingWindow,
  checkOpeningHours,
  displayStatus,
  overlaps,
} from "./booking-rules";
import { toInstant } from "./time";

const weekdayHours = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: "08:00", closesAt: "18:00" }));
const now = toInstant("2026-10-12", "09:00");

describe("overlaps", () => {
  const a = toInstant("2026-10-14", "10:00");
  const b = toInstant("2026-10-14", "11:00");
  const c = toInstant("2026-10-14", "12:00");

  it("treats back-to-back bookings as free", () => {
    assert.equal(overlaps(a, b, b, c), false);
  });

  it("detects partial overlap", () => {
    assert.equal(overlaps(a, c, b, toInstant("2026-10-14", "13:00")), true);
  });
});

describe("checkBookingWindow", () => {
  it("accepts a normal future booking", () => {
    assert.equal(checkBookingWindow(toInstant("2026-10-14", "10:00"), toInstant("2026-10-14", "11:30"), now), null);
  });

  it("rejects an end before the start", () => {
    assert.match(checkBookingWindow(toInstant("2026-10-14", "11:00"), toInstant("2026-10-14", "10:00"), now)!, /after the start/);
  });

  it("rejects times that are not on the 15 minute grid", () => {
    assert.match(checkBookingWindow(toInstant("2026-10-14", "10:05"), toInstant("2026-10-14", "11:00"), now)!, /15-minute/);
  });

  it("rejects bookings in the past", () => {
    assert.match(checkBookingWindow(toInstant("2026-10-12", "08:00"), toInstant("2026-10-12", "08:30"), now)!, /already started/);
  });

  it("rejects bookings too far ahead", () => {
    assert.match(checkBookingWindow(toInstant("2027-03-01", "10:00"), toInstant("2027-03-01", "11:00"), now)!, /in advance/);
  });
});

describe("checkOpeningHours", () => {
  it("accepts a booking inside opening hours", () => {
    assert.equal(checkOpeningHours(weekdayHours, toInstant("2026-10-14", "08:00"), toInstant("2026-10-14", "18:00")), null);
  });

  it("rejects a booking on a closed day", () => {
    assert.match(checkOpeningHours(weekdayHours, toInstant("2026-10-17", "10:00"), toInstant("2026-10-17", "11:00"))!, /closed on Saturdays/);
  });

  it("rejects a booking that runs past closing time", () => {
    assert.match(checkOpeningHours(weekdayHours, toInstant("2026-10-14", "17:00"), toInstant("2026-10-14", "18:30"))!, /between 8 AM and 6 PM/);
  });

  it("rejects a booking spanning two days", () => {
    assert.match(checkOpeningHours(weekdayHours, toInstant("2026-10-14", "17:00"), toInstant("2026-10-15", "09:00"))!, /same day/);
  });
});

describe("displayStatus and canCancel", () => {
  const start = toInstant("2026-10-12", "08:30");
  const end = toInstant("2026-10-12", "10:00");

  it("shows a running confirmed booking as in progress", () => {
    assert.equal(displayStatus("confirmed", start, end, now), "in_progress");
  });

  it("shows an unreviewed request that already started as expired", () => {
    assert.equal(displayStatus("pending", start, end, now), "expired");
  });

  it("allows cancelling only active bookings that have not ended", () => {
    assert.equal(canCancel("confirmed", end, now), true);
    assert.equal(canCancel("cancelled", end, now), false);
    assert.equal(canCancel("confirmed", start, now), false);
  });
});
