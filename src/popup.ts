import {
  STORAGE_KEY_ALARMS,
  parseAlarms,
  scheduledAtAfterMinutes,
  scheduledAtFromDatetimeLocal,
  sortAlarmsBySchedule,
  validateNewAlarm,
} from "./lib/alarms";
import type { Alarm } from "./lib/alarms";
import { escapeHtml } from "./lib/escape-html";
import { formatWhen } from "./lib/format-when";
import { toDatetimeLocalValue } from "./lib/datetime-local-value";

const loadAlarms = async (): Promise<Alarm[]> => {
  const raw = await chrome.storage.local.get(STORAGE_KEY_ALARMS);
  return parseAlarms(raw[STORAGE_KEY_ALARMS]);
};

const saveAlarms = async (alarms: Alarm[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY_ALARMS]: alarms });
};

const renderList = (container: HTMLElement, alarms: Alarm[]): void => {
  const sorted = sortAlarmsBySchedule(alarms);
  if (sorted.length === 0) {
    container.innerHTML = `<p>No alarms yet.</p>`;
    return;
  }
  container.innerHTML = sorted
    .map(
      (item) => `
      <div class="flex flex-row justify-between">
        <div class="flex flex-col gap-small">
          <strong>${escapeHtml(item.label)}</strong>
          <br/>
          <strong>${escapeHtml(formatWhen(item.scheduledAt))}</strong>
        </div>
        <br />
        <div>
          <button type="button" class="outline" data-action="delete" data-rowid="${escapeHtml(item.id)}">
            Delete
          </button>
        </div>
      </div>`,
    )
    .join("<hr />");
};

const setError = (
  el: HTMLElement,
  helper: HTMLElement,
  error: string | undefined,
): void => {
  if (error) {
    el.setAttribute("aria-invalid", "true");
    helper.textContent = error;
    helper.hidden = false;
  } else {
    el.removeAttribute("aria-invalid");
    helper.textContent = "";
    helper.hidden = true;
  }
};

const formInput = (
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | undefined => {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el : undefined;
};

const refresh = async (): Promise<void> => {
  const list = document.getElementById("alarm-list");
  if (!list) {
    return;
  }
  const alarms = await loadAlarms();
  renderList(list, alarms);
};

const wirePresets = (form: HTMLFormElement): void => {
  const whenInput = formInput(form, "when");
  if (!whenInput) {
    return;
  }
  form.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const min = Number(btn.dataset.preset);
      if (!Number.isFinite(min)) {
        return;
      }
      const timestamp = scheduledAtAfterMinutes(
        new Date(whenInput.value).getTime(),
        min,
      );
      whenInput.value = toDatetimeLocalValue(new Date(timestamp));
    });
  });
};

const defaultDatetimeLocalValue = (offsetMinutes: number): string =>
  toDatetimeLocalValue(new Date(Date.now() + offsetMinutes * 60_000));

document.addEventListener("DOMContentLoaded", () => {
  const formEl = document.getElementById("add-form");
  const form = formEl instanceof HTMLFormElement ? formEl : undefined;
  if (!form) {
    return;
  }

  const labelHelper = document.getElementById("label-helper");
  const whenHelper = document.getElementById("when-helper");
  if (!labelHelper || !whenHelper) {
    return;
  }

  const whenInput = formInput(form, "when");
  if (whenInput && !whenInput.value) {
    whenInput.value = defaultDatetimeLocalValue(1);
  }

  wirePresets(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const labelInput = formInput(form, "label");
    const whenField = formInput(form, "when");
    if (!labelInput || !whenField) {
      return;
    }

    setError(labelInput, labelHelper, undefined);
    setError(whenField, whenHelper, undefined);

    const label = labelInput.value;
    const whenRaw = whenField.value;
    const nowMs = Date.now();
    const scheduledAt = scheduledAtFromDatetimeLocal(whenRaw, nowMs);
    const validation = validateNewAlarm({ label, nowMs, scheduledAt });
    if (!validation.ok) {
      if (validation.field === "label") {
        setError(labelInput, labelHelper, validation.error);
      } else {
        setError(whenField, whenHelper, validation.error);
      }
      return;
    }

    const alarm: Alarm = {
      enabled: true,
      id: crypto.randomUUID(),
      label: label.trim(),
      scheduledAt,
      updatedAt: nowMs,
    };

    const existing = await loadAlarms();
    await saveAlarms([...existing, alarm]);
    await chrome.runtime.sendMessage({ type: "RECONCILE" });
    form.reset();
    await refresh();
  });

  const list = document.getElementById("alarm-list");
  list?.addEventListener("click", async (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const { target } = event;
    if (Boolean(target.dataset.rowid) && target.dataset.action === "delete") {
      const alarms = await loadAlarms();
      await saveAlarms(
        alarms.filter((item) => item.id !== target.dataset.rowid),
      );
      await chrome.runtime.sendMessage({ type: "RECONCILE" });
      await refresh();

      return;
    }
  });

  const openHistoryBtn = document.getElementById("open-history");
  openHistoryBtn?.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });

  void refresh();
});
