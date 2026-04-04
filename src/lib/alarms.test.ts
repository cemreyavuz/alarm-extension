import { describe, expect, test } from "bun:test";
import {
  alarmName,
  idFromAlarmName,
  parseAlarms,
  planChromeAlarmReconcile,
  sortAlarmsBySchedule,
  validateNewAlarm,
  scheduledAtAfterMinutes,
} from "./alarms";

describe("parseAlarms", () => {
  test("empty for non-array", () => {
    expect(parseAlarms(undefined)).toEqual([]);
    expect(parseAlarms({})).toEqual([]);
  });

  test("filters invalid entries", () => {
    const raw = [
      {
        id: "1",
        label: "a",
        scheduledAt: 100,
        enabled: true,
        updatedAt: 1,
      },
      { bad: true },
    ];
    expect(parseAlarms(raw)).toHaveLength(1);
  });
});

describe("planChromeAlarmReconcile", () => {
  const base = (over: Partial<{
    id: string;
    enabled: boolean;
    scheduledAt: number;
  }> = {}) => ({
    id: "x",
    label: "L",
    scheduledAt: 2000,
    enabled: true,
    updatedAt: 1,
    ...over,
  });

  test("schedules only enabled future alarms", () => {
    const now = 1000;
    const alarms = [
      base({ id: "a", scheduledAt: 1500, enabled: true }),
      base({ id: "b", scheduledAt: 800, enabled: true }),
      base({ id: "c", scheduledAt: 2000, enabled: false }),
      base({ id: "d", scheduledAt: 3000, enabled: true }),
    ];
    const { schedules } = planChromeAlarmReconcile(alarms, now);
    expect(schedules.map((s) => s.alarmId).sort()).toEqual(["a", "d"]);
  });
});

describe("validateNewAlarm", () => {
  test("rejects empty label and past time", () => {
    expect(validateNewAlarm({ label: "  ", scheduledAt: 2, nowMs: 1 }).ok).toBe(
      false,
    );
    expect(validateNewAlarm({ label: "ok", scheduledAt: 1, nowMs: 2 }).ok).toBe(
      false,
    );
  });

  test("accepts valid", () => {
    expect(
      validateNewAlarm({ label: "x", scheduledAt: 10, nowMs: 1 }).ok,
    ).toBe(true);
  });
});

describe("sortAlarmsBySchedule", () => {
  test("orders by scheduledAt", () => {
    const a = [
      {
        id: "2",
        label: "b",
        scheduledAt: 20,
        enabled: true,
        updatedAt: 0,
      },
      {
        id: "1",
        label: "a",
        scheduledAt: 10,
        enabled: true,
        updatedAt: 0,
      },
    ];
    expect(sortAlarmsBySchedule(a).map((x) => x.id)).toEqual(["1", "2"]);
  });
});

describe("alarmName / idFromAlarmName", () => {
  test("roundtrip", () => {
    const id = "abc-def";
    expect(idFromAlarmName(alarmName(id))).toBe(id);
  });
});

describe("scheduledAtAfterMinutes", () => {
  test("adds minutes in ms", () => {
    expect(scheduledAtAfterMinutes(1_000_000, 5)).toBe(1_000_000 + 5 * 60_000);
  });
});
