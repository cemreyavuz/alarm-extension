import {
  MAX_HISTORY_ITEMS,
  STORAGE_KEY_ALARM_HISTORY,
  STORAGE_KEY_ALARMS,
  alarmName,
  coerceAlarmHistory,
  idFromAlarmName,
  getUpcomingEnabledAlarms,
  parseAlarms,
  planChromeAlarmReconcile,
  type Alarm,
  type AlarmHistoryEntry,
} from "./lib/alarms";

const AE_PREFIX = "ae-";

// ==== ALARM STORAGE UTILITIES

const getAlarms = async (): Promise<Alarm[]> => {
  const v = await chrome.storage.local.get(STORAGE_KEY_ALARMS);
  return parseAlarms(v[STORAGE_KEY_ALARMS]);
};

// ==== ALARM HISTORY STORAGE UTILITIES

const getAlarmHistory = async (): Promise<AlarmHistoryEntry[]> => {
  const v = await chrome.storage.local.get(STORAGE_KEY_ALARM_HISTORY);
  return coerceAlarmHistory(v[STORAGE_KEY_ALARM_HISTORY]);
};

const upsertAlarmHistoryEntry = async (entry: AlarmHistoryEntry): Promise<void> => {
  const history = await getAlarmHistory();
  const next = [...history];

  // if the entry already exists, update it
  const index = next.findIndex((row) => row.id === entry.id);
  if (index >= 0) {
    next[index] = entry;
  } else {
    next.push(entry);
  }

  // if there are more than MAX_HISTORY_ITEMS entries, trim the oldest ones
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
    id: crypto.randomUUID(),
    alarmId,
    label,
    scheduledAt,
    firedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await upsertAlarmHistoryEntry(entry);
};

// ==== OTHER UTILITIES
// TODO(cemreyavuz): recategorize these utilities

export const reconcileAlarms = async (): Promise<void> => {
  const alarms = await getAlarms();
  const now = Date.now();
  const { schedules } = planChromeAlarmReconcile(alarms, now);

  const existing = await chrome.alarms.getAll();
  await Promise.all(
    existing
      .filter((a) => a.name.startsWith(AE_PREFIX))
      .map((a) => chrome.alarms.clear(a.name)),
  );

  for (const s of schedules) {
    await chrome.alarms.create(alarmName(s.alarmId), { when: s.whenMs });
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

const SNOOZE_KEY = (alarmId: string) => `snooze-${alarmId}`;

/** 1×1 PNG; used when the extension icon URL fails to load (create() still requires iconUrl in typings). */
const NOTIFICATION_ICON_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const alarmNotificationOptions = (
  message: string,
  withButtons: boolean,
  iconUrl: string,
): chrome.notifications.NotificationOptions<true> => {
  const opts: chrome.notifications.NotificationOptions<true> = {
    type: "basic",
    title: "nudgememaybe",
    message,
    iconUrl,
    priority: 2,
  };
  if (withButtons) {
    opts.buttons = [
      { title: "Snooze 5 min" },
      { title: "Snooze 15 min" },
    ];
    opts.requireInteraction = true;
  }
  return opts;
};

const snoozeSessionLabel = (stored: unknown): string => {
  if (!stored || typeof stored !== "object") return "Alarm";
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
    await chrome.notifications.create(
      `notif-${id}`,
      alarmNotificationOptions(message, withButtons, extensionIcon),
    );
  } catch {
    await chrome.notifications.create(
      `notif-${id}`,
      alarmNotificationOptions(message, withButtons, NOTIFICATION_ICON_FALLBACK),
    );
  }
};

chrome.alarms.onAlarm.addListener(async (fired) => {
  const id = idFromAlarmName(fired.name);
  if (!id) return;

  const alarms = await getAlarms();
  const found = alarms.find((a) => a.id === id);
  const message = found?.label ?? "Alarm";
  const scheduledAt = found?.scheduledAt ?? fired.scheduledTime ?? Date.now();

  await chrome.storage.session.set({
    [SNOOZE_KEY(id)]: { label: message },
  });
  await appendFiredAlarmHistory(id, message, scheduledAt);

  try {
    await createAlarmNotification(id, message, true);
  } catch {
    await createAlarmNotification(id, message, false);
  }

  const next = alarms.filter((a) => a.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY_ALARMS]: next });
  await reconcileAlarms();
});

chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    if (!notificationId.startsWith("notif-")) return;
    const oldId = notificationId.slice("notif-".length);
    const key = SNOOZE_KEY(oldId);
    const session = await chrome.storage.session.get(key);
    const label = snoozeSessionLabel(session[key]);
    await chrome.storage.session.remove(key);

    const minutes = buttonIndex === 0 ? 5 : 15;
    const now = Date.now();

    const newAlarm: Alarm = {
      id: crypto.randomUUID(),
      label,
      scheduledAt: now + minutes * 60_000,
      enabled: true,
      updatedAt: now,
    };

    const list = await getAlarms();
    await chrome.storage.local.set({
      [STORAGE_KEY_ALARMS]: [...list, newAlarm],
    });
    await chrome.notifications.clear(notificationId);
    await reconcileAlarms();
  },
);

chrome.notifications.onClosed.addListener(async (notificationId) => {
  if (!notificationId.startsWith("notif-")) return;
  const oldId = notificationId.slice("notif-".length);
  await chrome.storage.session.remove(SNOOZE_KEY(oldId));
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
      const found = alarms.find((a) => a.id === id);
      if (!found) {
        sendResponse({ ok: false });
        return;
      }
      const scheduledAt = Date.now() + minutes * 60_000;
      const next: Alarm[] = alarms.map((a) =>
        a.id === id
          ? {
              ...a,
              scheduledAt,
              updatedAt: Date.now(),
              enabled: true,
            }
          : a,
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
