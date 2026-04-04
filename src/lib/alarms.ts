export const STORAGE_KEY_ALARMS = "alarms";

export type Alarm = {
  id: string;
  label: string;
  scheduledAt: number;
  enabled: boolean;
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

export const sortAlarmsBySchedule = (alarms: Alarm[]): Alarm[] =>
  [...alarms].sort((a, b) => a.scheduledAt - b.scheduledAt);

export type ScheduleEntry = { alarmId: string; whenMs: number };

/** Enabled alarms with fire time strictly after nowMs. */
export const planChromeAlarmReconcile = (
  alarms: Alarm[],
  nowMs: number,
): { schedules: ScheduleEntry[] } => {
  const schedules = alarms
    .filter((a) => a.enabled && a.scheduledAt > nowMs)
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
