import {
  MAX_HISTORY_ITEMS,
  STORAGE_KEY_ALARM_HISTORY,
  coerceAlarmHistory,
  sortAlarmHistoryByCreationTime,
  type AlarmHistoryEntry,
} from "./lib/alarms";
import { escapeHtml } from "./lib/escape-html";
import { formatWhen } from "./lib/format-when";

type Filters = {
  query: string;
};

const loadHistory = async (): Promise<AlarmHistoryEntry[]> => {
  const v = await chrome.storage.local.get(STORAGE_KEY_ALARM_HISTORY);
  return sortAlarmHistoryByCreationTime(coerceAlarmHistory(v[STORAGE_KEY_ALARM_HISTORY]));
};

const applyFilters = (rows: AlarmHistoryEntry[], filters: Filters): AlarmHistoryEntry[] => {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (query && !row.label.toLowerCase().includes(query)) return false;
    return true;
  });
};

const render = (
  container: HTMLElement,
  allHistory: AlarmHistoryEntry[],
  filters: Filters,
): void => {
  if (allHistory.length === 0) {
    container.innerHTML = `<p class="empty">No past alarms yet.</p>`;
    return;
  }

  const rows = applyFilters(allHistory, filters);
  if (rows.length === 0) {
    container.innerHTML = `<p class="empty">No alarms match the selected filters.</p>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      return `
        <article class="row">
          <div class="row-top">
            <span class="label">${escapeHtml(row.label)}</span>
          </div>
          <p class="meta">
            <span>Scheduled: ${escapeHtml(formatWhen(row.scheduledAt))}</span>
            <span>Fired: ${escapeHtml(formatWhen(row.firedAt))}</span>
          </p>
        </article>
      `;
    })
    .join("");
};

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("history-list");
  const search = document.getElementById("search");
  if (!(list instanceof HTMLElement) || !(search instanceof HTMLInputElement)) {
    return;
  }

  let allHistory: AlarmHistoryEntry[] = [];

  const refresh = () => {
    render(list, allHistory, {
      query: search.value,
    });
  };

  const bindInputRefresh = (el: HTMLInputElement) => {
    el.addEventListener("input", refresh);
    el.addEventListener("change", refresh);
  };
  bindInputRefresh(search);

  void loadHistory().then((rows) => {
    allHistory = rows.slice(0, MAX_HISTORY_ITEMS);
    refresh();
  });
});
