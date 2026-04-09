import { describe, expect, test } from "bun:test";

import {
  alarmName,
  getUpcomingEnabledAlarms,
  idFromAlarmName,
  isUpcomingAlarmEnabled,
  parseAlarms,
  planChromeAlarmReconcile,
  scheduledAtAfterMinutes,
  sortAlarmsBySchedule,
  validateNewAlarm,
} from "./alarms";

describe("parseAlarms", () => {
  test("empty for non-array", () => {
    expect(parseAlarms(undefined)).toEqual([]);
    expect(parseAlarms({})).toEqual([]);
  });

  test("filters invalid entries", () => {
    const raw = [
      {
        enabled: true,
        id: "1",
        label: "a",
        scheduledAt: 100,
        updatedAt: 1,
      },
      { bad: true },
    ];
    expect(parseAlarms(raw)).toHaveLength(1);
  });
});

describe("planChromeAlarmReconcile", () => {
  const base = (
    over: Partial<{
      id: string;
      enabled: boolean;
      scheduledAt: number;
    }> = {},
  ) => ({
    enabled: true,
    id: "x",
    label: "L",
    scheduledAt: 2000,
    updatedAt: 1,
    ...over,
  });

  test("schedules only enabled future alarms", () => {
    const now = 1000;
    const alarms = [
      base({ enabled: true, id: "a", scheduledAt: 1500 }),
      base({ enabled: true, id: "b", scheduledAt: 800 }),
      base({ enabled: false, id: "c", scheduledAt: 2000 }),
      base({ enabled: true, id: "d", scheduledAt: 3000 }),
    ];
    const { schedules } = planChromeAlarmReconcile(alarms, now);
    expect(schedules.map((schedule) => schedule.alarmId).sort()).toEqual([
      "a",
      "d",
    ]);
  });
});

describe("isUpcomingAlarmEnabled", () => {
  const row = (scheduledAt: number, enabled: boolean) => ({
    enabled,
    id: "x",
    label: "L",
    scheduledAt,
    updatedAt: 0,
  });

  test("true only when enabled and strictly after now", () => {
    const now = 1000;
    expect(isUpcomingAlarmEnabled(row(2000, true), now)).toBe(true);
    expect(isUpcomingAlarmEnabled(row(500, true), now)).toBe(false);
    expect(isUpcomingAlarmEnabled(row(1000, true), now)).toBe(false);
    expect(isUpcomingAlarmEnabled(row(2000, false), now)).toBe(false);
  });
});

describe("getUpcomingEnabledAlarms", () => {
  const base = (
    over: Partial<{
      id: string;
      enabled: boolean;
      scheduledAt: number;
    }> = {},
  ) => ({
    enabled: true,
    id: "x",
    label: "L",
    scheduledAt: 2000,
    updatedAt: 1,
    ...over,
  });

  test("matches planChromeAlarmReconcile schedule count", () => {
    const now = 1000;
    const alarms = [
      base({ enabled: true, id: "a", scheduledAt: 1500 }),
      base({ enabled: true, id: "b", scheduledAt: 800 }),
      base({ enabled: false, id: "c", scheduledAt: 2000 }),
      base({ enabled: true, id: "d", scheduledAt: 3000 }),
    ];
    expect(getUpcomingEnabledAlarms(alarms, now)).toBe(
      planChromeAlarmReconcile(alarms, now).schedules.length,
    );
  });

  test("excludes scheduledAt equal to now", () => {
    const now = 2000;
    expect(
      getUpcomingEnabledAlarms(
        [base({ enabled: true, id: "a", scheduledAt: 2000 })],
        now,
      ),
    ).toBe(0);
  });
});

describe("validateNewAlarm", () => {
  test("rejects empty label and past time", () => {
    expect(validateNewAlarm({ label: "  ", nowMs: 1, scheduledAt: 2 }).ok).toBe(
      false,
    );
    expect(validateNewAlarm({ label: "ok", nowMs: 2, scheduledAt: 1 }).ok).toBe(
      false,
    );
  });

  test("accepts valid", () => {
    expect(validateNewAlarm({ label: "x", nowMs: 1, scheduledAt: 10 }).ok).toBe(
      true,
    );
  });
});

describe("sortAlarmsBySchedule", () => {
  test("orders by scheduledAt", () => {
    const alarms = [
      {
        enabled: true,
        id: "2",
        label: "b",
        scheduledAt: 20,
        updatedAt: 0,
      },
      {
        enabled: true,
        id: "1",
        label: "a",
        scheduledAt: 10,
        updatedAt: 0,
      },
    ];
    expect(sortAlarmsBySchedule(alarms).map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
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
