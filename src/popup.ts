import {
  STORAGE_KEY_ALARMS,
  parseAlarms,
  sortAlarmsBySchedule,
  validateNewAlarm,
  scheduledAtFromDatetimeLocal,
  scheduledAtAfterMinutes,
  type Alarm,
} from "./lib/alarms";
import { toDatetimeLocalValue } from "./lib/datetime-local-value";
import { escapeHtml } from "./lib/escape-html";
import { formatWhen } from "./lib/format-when";

const loadAlarms = async (): Promise<Alarm[]> => {
  const v = await chrome.storage.local.get(STORAGE_KEY_ALARMS);
  return parseAlarms(v[STORAGE_KEY_ALARMS]);
};

const saveAlarms = async (alarms: Alarm[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY_ALARMS]: alarms });
};

const renderList = (container: HTMLElement, alarms: Alarm[]): void => {
  const sorted = sortAlarmsBySchedule(alarms);
  if (sorted.length === 0) {
    container.innerHTML = `<p class="empty">No alarms yet.</p>`;
    return;
  }
  container.innerHTML = sorted
    .map(
      (a) => `
    <article class="row" data-id="${escapeHtml(a.id)}">
      <div class="row-main">
        <span class="label">${escapeHtml(a.label)}</span>
        <span class="when">${escapeHtml(formatWhen(a.scheduledAt))}</span>
      </div>
      <div class="row-actions">
        <label class="toggle"><input type="checkbox" data-action="toggle" ${
          a.enabled ? "checked" : ""
        } /> On</label>
        <button type="button" data-action="delete">Delete</button>
      </div>
    </article>`,
    )
    .join("");
};

const setError = (el: HTMLElement | null, text: string): void => {
  if (!el) {return;}
  el.textContent = text;
  el.hidden = !text;
};

const formInput = (
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | null => {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el : null;
};

const refresh = async (): Promise<void> => {
  const list = document.getElementById("alarm-list");
  if (!list) {return;}
  const alarms = await loadAlarms();
  renderList(list, alarms);
};

const wirePresets = (form: HTMLFormElement): void => {
  const whenInput = formInput(form, "when");
  if (!whenInput) {return;}
  form.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const min = Number(btn.dataset.preset);
      if (!Number.isFinite(min)) {return;}
      const t = scheduledAtAfterMinutes(Date.now(), min);
      whenInput.value = toDatetimeLocalValue(new Date(t));
    });
  });
};

const defaultDatetimeLocalValue = (offsetMinutes: number): string =>
  toDatetimeLocalValue(new Date(Date.now() + offsetMinutes * 60_000));

document.addEventListener("DOMContentLoaded", () => {
  const formEl = document.getElementById("add-form");
  const form = formEl instanceof HTMLFormElement ? formEl : null;
  const err = document.getElementById("form-error");

  if (form) {
    const whenInput = formInput(form, "when");
    if (whenInput && !whenInput.value) {
      whenInput.value = defaultDatetimeLocalValue(15);
    }
    wirePresets(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setError(err, "");

      const labelInput = formInput(form, "label");
      const whenField = formInput(form, "when");
      if (!labelInput || !whenField) {return;}
      const label = labelInput.value;
      const whenRaw = whenField.value;
      const nowMs = Date.now();
      const scheduledAt = scheduledAtFromDatetimeLocal(whenRaw, nowMs);

      const v = validateNewAlarm({ label, scheduledAt, nowMs });
      if (!v.ok) {
        setError(err, v.error);
        return;
      }

      const alarm: Alarm = {
        id: crypto.randomUUID(),
        label: label.trim(),
        scheduledAt,
        enabled: true,
        updatedAt: nowMs,
      };

      const existing = await loadAlarms();
      await saveAlarms([...existing, alarm]);
      await chrome.runtime.sendMessage({ type: "RECONCILE" });
      form.reset();
      await refresh();
    });
  }

  const list = document.getElementById("alarm-list");
  list?.addEventListener("click", async (e) => {
    if (!(e.target instanceof HTMLElement)) {return;}
    const target = e.target;
    const rowEl = target.closest(".row");
    if (!(rowEl instanceof HTMLElement) || !rowEl.dataset.id) {return;}
    const id = rowEl.dataset.id;

    if (target.closest("[data-action=delete]")) {
      const alarms = await loadAlarms();
      await saveAlarms(alarms.filter((a) => a.id !== id));
      await chrome.runtime.sendMessage({ type: "RECONCILE" });
      await refresh();
      return;
    }

    const toggleEl = target.closest("[data-action=toggle]");
    if (toggleEl instanceof HTMLInputElement) {
      const alarms = await loadAlarms();
      const next = alarms.map((a) =>
        a.id === id
          ? { ...a, enabled: toggleEl.checked, updatedAt: Date.now() }
          : a,
      );
      await saveAlarms(next);
      await chrome.runtime.sendMessage({ type: "RECONCILE" });
      await refresh();
    }
  });

  const openHistoryBtn = document.getElementById("open-history");
  openHistoryBtn?.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });

  void refresh();
});
