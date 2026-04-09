export const STORAGE_KEY_ALARMS = "alarms";
export const STORAGE_KEY_ALARM_HISTORY = "alarmHistory";
export const MAX_HISTORY_ITEMS = 500;

export type Alarm = {
  id: string;
  label: string;
  scheduledAt: number;
  enabled: boolean;
  updatedAt: number;
};

export type AlarmHistoryEntry = {
  id: string;
  alarmId: string;
  label: string;
  scheduledAt: number;
  firedAt: number;
  createdAt: number;
  updatedAt: number;
};

const PREFIX = "ae-";

export const alarmName = (id: string): string => `${PREFIX}${id}`;

export const idFromAlarmName = (name: string): string | null => {
  if (!name.startsWith(PREFIX)) return null;
  return name.slice(PREFIX.length);
};

export const isAlarm = (x: unknown): x is Alarm => {
  if (typeof x !== "object" || x === null) return false;
  return (
    typeof Reflect.get(x, "id") === "string" &&
    typeof Reflect.get(x, "label") === "string" &&
    typeof Reflect.get(x, "scheduledAt") === "number" &&
    typeof Reflect.get(x, "enabled") === "boolean" &&
    typeof Reflect.get(x, "updatedAt") === "number"
  );
};

export const parseAlarms = (raw: unknown): Alarm[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAlarm);
};

export const isAlarmHistoryEntry = (x: unknown): x is AlarmHistoryEntry => {
  if (typeof x !== "object" || x === null) {
    return false;
  }
  
  return (
    typeof Reflect.get(x, "id") === "string" &&
    typeof Reflect.get(x, "alarmId") === "string" &&
    typeof Reflect.get(x, "label") === "string" &&
    typeof Reflect.get(x, "scheduledAt") === "number" &&
    typeof Reflect.get(x, "firedAt") === "number" &&
    typeof Reflect.get(x, "createdAt") === "number" &&
    typeof Reflect.get(x, "updatedAt") === "number"
  );
};

export const coerceAlarmHistory = (raw: unknown): AlarmHistoryEntry[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isAlarmHistoryEntry);
};

export const sortAlarmHistoryByCreationTime = (
  history: AlarmHistoryEntry[],
  direction: "asc" | "desc" = "desc",
): AlarmHistoryEntry[] => [...history].sort((a, b) => {
  if (direction === "asc") {
    return a.createdAt - b.createdAt;
  }
  return b.createdAt - a.createdAt;
});

export const appendAlarmHistoryEntry = (
  history: AlarmHistoryEntry[],
  entry: AlarmHistoryEntry,
  maxItems: number = MAX_HISTORY_ITEMS,
): AlarmHistoryEntry[] => {
  const next = [...history, entry];

  // if there are more than maxItems entries, trim the oldest ones
  return next.slice(Math.max(0, next.length - maxItems));
}

export const sortAlarmsBySchedule = (alarms: Alarm[]): Alarm[] =>
  [...alarms].sort((a, b) => a.scheduledAt - b.scheduledAt);

export type ScheduleEntry = { alarmId: string; whenMs: number };

/** Enabled and fire time strictly after nowMs (same rule as chrome.alarms scheduling). */
export const isUpcomingAlarmEnabled = (alarm: Alarm, nowMs: number): boolean =>
  alarm.enabled && alarm.scheduledAt > nowMs;

export const getUpcomingEnabledAlarms = (alarms: Alarm[], nowMs: number): number =>
  alarms.filter((a) => isUpcomingAlarmEnabled(a, nowMs)).length;

/** Enabled alarms with fire time strictly after nowMs. */
export const planChromeAlarmReconcile = (
  alarms: Alarm[],
  nowMs: number,
): { schedules: ScheduleEntry[] } => {
  const schedules = alarms
    .filter((a) => isUpcomingAlarmEnabled(a, nowMs))
    .map((a) => ({ alarmId: a.id, whenMs: a.scheduledAt }));
  return { schedules };
};

export const validateNewAlarm = (input: {
  label: string;
  scheduledAt: number;
  nowMs: number;
}): { ok: true } | { ok: false; error: string } => {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required." };
  if (label.length > 200) return { ok: false, error: "Label too long." };
  if (input.scheduledAt <= input.nowMs) {
    return { ok: false, error: "Time must be in the future." };
  }
  return { ok: true };
};

export const scheduledAtFromDatetimeLocal = (
  value: string,
  nowMs: number,
): number => {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return nowMs;
  return t;
};

/** Offset from now in minutes (relative timers / presets). */
export const scheduledAtAfterMinutes = (nowMs: number, minutes: number): number =>
  nowMs + minutes * 60_000;
