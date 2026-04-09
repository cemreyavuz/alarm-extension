import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  MAX_HISTORY_ITEMS,
  STORAGE_KEY_ALARM_HISTORY,
  coerceAlarmHistory,
  sortAlarmHistoryByCreationTime,
} from "../lib/alarms";
import type { AlarmHistoryEntry } from "../lib/alarms";

const loadHistory = async (): Promise<AlarmHistoryEntry[]> => {
  const raw = await chrome.storage.local.get(STORAGE_KEY_ALARM_HISTORY);
  return sortAlarmHistoryByCreationTime(
    coerceAlarmHistory(raw[STORAGE_KEY_ALARM_HISTORY]),
  );
};

const applyFilters = (
  rows: AlarmHistoryEntry[],
  query: string,
): AlarmHistoryEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (normalizedQuery && !row.label.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    return true;
  });
};

@customElement("options-page")
export class OptionsPageElement extends LitElement {
  override createRenderRoot(): HTMLElement {
    return this;
  }

  @state()
  private accessor allHistory: AlarmHistoryEntry[] = [];

  @state()
  private accessor query = "";

  @state()
  private accessor isLoading = true;

  connectedCallback(): void {
    super.connectedCallback();
    void loadHistory()
      .then((rows) => {
        this.allHistory = rows.slice(0, MAX_HISTORY_ITEMS);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  protected render() {
    const rows = applyFilters(this.allHistory, this.query);

    return html`
      <main class="wrap">
        <header class="header">
          <h1 class="title">Past alarms</h1>
          <p class="subtitle">Showing latest 500 alarms</p>
        </header>

        <div class="field">
          <input
            name="search"
            type="search"
            placeholder="Search past alarms by label"
            autocomplete="off"
            .value=${this.query}
            @input=${(event: Event) => {
              this.query = (event.target as HTMLInputElement).value;
            }}
          />
        </div>

        <section class="list-section">
          <history-list
            .rows=${rows}
            .hasAnyRows=${this.allHistory.length > 0}
            .isLoading=${this.isLoading}
          ></history-list>
        </section>
      </main>
    `;
  }
}
