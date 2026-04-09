import type { Alarm, AlarmHistoryEntry } from "./lib/alarms";
import {
  MAX_HISTORY_ITEMS,
  STORAGE_KEY_ALARMS,
  STORAGE_KEY_ALARM_HISTORY,
  alarmName,
  coerceAlarmHistory,
  getUpcomingEnabledAlarms,
  idFromAlarmName,
  parseAlarms,
  planChromeAlarmReconcile,
} from "./lib/alarms";

const AE_PREFIX = "ae-";
const MINUTE_IN_MS = 60_000;

// ==== ALARM STORAGE UTILITIES

const getAlarms = async (): Promise<Alarm[]> => {
  const raw = await chrome.storage.local.get(STORAGE_KEY_ALARMS);
  return parseAlarms(raw[STORAGE_KEY_ALARMS]);
};

// ==== ALARM HISTORY STORAGE UTILITIES

const getAlarmHistory = async (): Promise<AlarmHistoryEntry[]> => {
  const raw = await chrome.storage.local.get(STORAGE_KEY_ALARM_HISTORY);
  return coerceAlarmHistory(raw[STORAGE_KEY_ALARM_HISTORY]);
};

const upsertAlarmHistoryEntry = async (
  entry: AlarmHistoryEntry,
): Promise<void> => {
  const history = await getAlarmHistory();
  const next = [...history];

  // If the entry already exists, update it
  const index = next.findIndex((row) => row.id === entry.id);
  if (index !== -1) {
    next[index] = entry;
  } else {
    next.push(entry);
  }

  // If there are more than MAX_HISTORY_ITEMS entries, trim the oldest ones
  const trimmed = next.slice(Math.max(0, next.length - MAX_HISTORY_ITEMS));

  await chrome.storage.local.set({ [STORAGE_KEY_ALARM_HISTORY]: trimmed });
};

const appendFiredAlarmHistory = async (
  alarmId: string,
  label: string,
  scheduledAt: number,
): Promise<void> => {
  const now = Date.now();
  const entry: AlarmHistoryEntry = {
    alarmId,
    createdAt: now,
    firedAt: now,
    id: crypto.randomUUID(),
    label,
    scheduledAt,
    updatedAt: now,
  };
  await upsertAlarmHistoryEntry(entry);
};

// ==== OTHER UTILITIES
// TODO(cemreyavuz): recategorize these utilities

const reconcileAlarms = async (): Promise<void> => {
  const alarms = await getAlarms();
  const now = Date.now();
  const { schedules } = planChromeAlarmReconcile(alarms, now);

  const existing = await chrome.alarms.getAll();
  await Promise.all(
    existing
      .filter((item) => item.name.startsWith(AE_PREFIX))
      .map((item) => chrome.alarms.clear(item.name)),
  );

  for (const schedule of schedules) {
    await chrome.alarms.create(alarmName(schedule.alarmId), {
      when: schedule.whenMs,
    });
  }

  const upcoming = getUpcomingEnabledAlarms(alarms, now);
  const text = upcoming > 0 ? String(upcoming) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#5F6368" });
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY_ALARMS]) {
    void reconcileAlarms();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void reconcileAlarms();
});

const getSnoozeKey = (alarmId: string) => `snooze-${alarmId}`;

/** 1×1 PNG; used when the extension icon URL fails to load (create() still requires iconUrl in typings). */
const NOTIFICATION_ICON_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const alarmNotificationOptions = (
  message: string,
  withButtons: boolean,
  iconUrl: string,
): chrome.notifications.NotificationOptions<true> => {
  const opts: chrome.notifications.NotificationOptions<true> = {
    iconUrl,
    message,
    priority: 2,
    title: "nudgememaybe",
    type: "basic",
  };
  if (withButtons) {
    opts.buttons = [{ title: "Snooze 5 min" }, { title: "Snooze 15 min" }];
    opts.requireInteraction = true;
  }
  return opts;
};

const snoozeSessionLabel = (stored: unknown): string => {
  if (!stored || typeof stored !== "object") {
    return "Alarm";
  }
  const label = Reflect.get(stored, "label");
  return typeof label === "string" ? label : "Alarm";
};

const createAlarmNotification = async (
  id: string,
  message: string,
  withButtons: boolean,
): Promise<void> => {
  const extensionIcon = chrome.runtime.getURL("icons/icon@128px.png");
  try {
    chrome.notifications.create(
      `notif-${id}`,
      alarmNotificationOptions(message, withButtons, extensionIcon),
    );
  } catch {
    chrome.notifications.create(
      `notif-${id}`,
      alarmNotificationOptions(
        message,
        withButtons,
        NOTIFICATION_ICON_FALLBACK,
      ),
    );
  }
};

chrome.alarms.onAlarm.addListener(async (fired) => {
  const id = idFromAlarmName(fired.name);
  if (!id) {
    return;
  }

  const alarms = await getAlarms();
  const found = alarms.find((item) => item.id === id);
  const message = found?.label ?? "Alarm";
  const scheduledAt = found?.scheduledAt ?? fired.scheduledTime ?? Date.now();

  await chrome.storage.session.set({
    [getSnoozeKey(id)]: { label: message },
  });
  await appendFiredAlarmHistory(id, message, scheduledAt);

  try {
    await createAlarmNotification(id, message, true);
  } catch {
    await createAlarmNotification(id, message, false);
  }

  const next = alarms.filter((item) => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY_ALARMS]: next });
  await reconcileAlarms();
});

chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    if (!notificationId.startsWith("notif-")) {
      return;
    }
    const oldId = notificationId.slice("notif-".length);
    const key = getSnoozeKey(oldId);
    const session = await chrome.storage.session.get(key);
    const label = snoozeSessionLabel(session[key]);
    await chrome.storage.session.remove(key);

    const minutes = buttonIndex === 0 ? 5 : 15;
    const now = Date.now();

    const newAlarm: Alarm = {
      enabled: true,
      id: crypto.randomUUID(),
      label,
      scheduledAt: now + minutes * MINUTE_IN_MS,
      updatedAt: now,
    };

    const list = await getAlarms();
    await chrome.storage.local.set({
      [STORAGE_KEY_ALARMS]: [...list, newAlarm],
    });
    chrome.notifications.clear(notificationId);
    await reconcileAlarms();
  },
);

chrome.notifications.onClosed.addListener(async (notificationId) => {
  if (!notificationId.startsWith("notif-")) {
    return;
  }
  const oldId = notificationId.slice("notif-".length);
  await chrome.storage.session.remove(getSnoozeKey(oldId));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "RECONCILE") {
    void reconcileAlarms().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg && typeof msg === "object" && Reflect.get(msg, "type") === "SNOOZE") {
    const minutes = Reflect.get(msg, "minutes");
    const id = Reflect.get(msg, "alarmId");
    if (typeof minutes !== "number" || typeof id !== "string") {
      sendResponse({ ok: false });
      return true;
    }
    void (async () => {
      const alarms = await getAlarms();
      const found = alarms.find((item) => item.id === id);
      if (!found) {
        sendResponse({ ok: false });
        return;
      }
      const scheduledAt = Date.now() + minutes * MINUTE_IN_MS;
      const next: Alarm[] = alarms.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled: true,
              scheduledAt,
              updatedAt: Date.now(),
            }
          : item,
      );
      await chrome.storage.local.set({ [STORAGE_KEY_ALARMS]: next });
      await reconcileAlarms();
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});

void reconcileAlarms();
