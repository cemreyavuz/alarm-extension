const STORAGE_KEY_ALARMS = "alarms";
const STORAGE_KEY_ALARM_HISTORY = "alarmHistory";
const MAX_HISTORY_ITEMS = 500;

interface Alarm {
  id: string;
  label: string;
  scheduledAt: number;
  enabled: boolean;
  updatedAt: number;
}

interface AlarmHistoryEntry {
  id: string;
  alarmId: string;
  label: string;
  scheduledAt: number;
  firedAt: number;
  createdAt: number;
  updatedAt: number;
}

const PREFIX = "ae-";

const alarmName = (id: string): string => `${PREFIX}${id}`;

const idFromAlarmName = (name: string): string | undefined => {
  if (!name.startsWith(PREFIX)) {
    return undefined;
  }
  return name.slice(PREFIX.length);
};

const isAlarm = (item: unknown): item is Alarm => {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  return (
    typeof Reflect.get(item, "id") === "string" &&
    typeof Reflect.get(item, "label") === "string" &&
    typeof Reflect.get(item, "scheduledAt") === "number" &&
    typeof Reflect.get(item, "enabled") === "boolean" &&
    typeof Reflect.get(item, "updatedAt") === "number"
  );
};

const parseAlarms = (raw: unknown): Alarm[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isAlarm);
};

const isAlarmHistoryEntry = (item: unknown): item is AlarmHistoryEntry => {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  return (
    typeof Reflect.get(item, "id") === "string" &&
    typeof Reflect.get(item, "alarmId") === "string" &&
    typeof Reflect.get(item, "label") === "string" &&
    typeof Reflect.get(item, "scheduledAt") === "number" &&
    typeof Reflect.get(item, "firedAt") === "number" &&
    typeof Reflect.get(item, "createdAt") === "number" &&
    typeof Reflect.get(item, "updatedAt") === "number"
  );
};

const coerceAlarmHistory = (raw: unknown): AlarmHistoryEntry[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isAlarmHistoryEntry);
};

const sortAlarmHistoryByCreationTime = (
  history: AlarmHistoryEntry[],
  direction: "asc" | "desc" = "desc",
): AlarmHistoryEntry[] =>
  [...history].sort((item1, item2) => {
    if (direction === "asc") {
      return item1.createdAt - item2.createdAt;
    }
    return item2.createdAt - item1.createdAt;
  });

const appendAlarmHistoryEntry = (
  history: AlarmHistoryEntry[],
  entry: AlarmHistoryEntry,
  maxItems: number = MAX_HISTORY_ITEMS,
): AlarmHistoryEntry[] => {
  const next = [...history, entry];

  // If there are more than maxItems entries, trim the oldest ones
  return next.slice(Math.max(0, next.length - maxItems));
};

const sortAlarmsBySchedule = (alarms: Alarm[]): Alarm[] =>
  [...alarms].sort((item1, item2) => item1.scheduledAt - item2.scheduledAt);

interface ScheduleEntry {
  alarmId: string;
  whenMs: number;
}

/** Enabled and fire time strictly after nowMs (same rule as chrome.alarms scheduling). */
const isUpcomingAlarmEnabled = (alarm: Alarm, nowMs: number): boolean =>
  alarm.enabled && alarm.scheduledAt > nowMs;

const getUpcomingEnabledAlarms = (alarms: Alarm[], nowMs: number): number =>
  alarms.filter((item) => isUpcomingAlarmEnabled(item, nowMs)).length;

/** Enabled alarms with fire time strictly after nowMs. */
const planChromeAlarmReconcile = (
  alarms: Alarm[],
  nowMs: number,
): { schedules: ScheduleEntry[] } => {
  const schedules = alarms
    .filter((item) => isUpcomingAlarmEnabled(item, nowMs))
    .map((item) => ({ alarmId: item.id, whenMs: item.scheduledAt }));
  return { schedules };
};

const validateNewAlarm = (input: {
  label: string;
  scheduledAt: number;
  nowMs: number;
}): { ok: true } | { ok: false; error: string; field: "label" | "when" } => {
  const label = input.label.trim();
  if (!label) {
    return { error: "Label is required.", field: "label", ok: false };
  }
  if (label.length > 200) {
    return { error: "Label too long.", field: "label", ok: false };
  }
  if (input.scheduledAt <= input.nowMs) {
    return { error: "Time must be in the future.", field: "when", ok: false };
  }
  return { ok: true };
};

const scheduledAtFromDatetimeLocal = (value: string, nowMs: number): number => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return nowMs;
  }
  return timestamp;
};

/** Offset from now in minutes (relative timers / presets). */
const scheduledAtAfterMinutes = (nowMs: number, minutes: number): number =>
  nowMs + minutes * 60_000;

export type { AlarmHistoryEntry, Alarm, ScheduleEntry };

export {
  appendAlarmHistoryEntry,
  sortAlarmsBySchedule,
  sortAlarmHistoryByCreationTime,
  coerceAlarmHistory,
  isAlarmHistoryEntry,
  isAlarm,
  parseAlarms,
  alarmName,
  idFromAlarmName,
  STORAGE_KEY_ALARMS,
  STORAGE_KEY_ALARM_HISTORY,
  MAX_HISTORY_ITEMS,
  isUpcomingAlarmEnabled,
  getUpcomingEnabledAlarms,
  planChromeAlarmReconcile,
  validateNewAlarm,
  scheduledAtFromDatetimeLocal,
  scheduledAtAfterMinutes,
};
