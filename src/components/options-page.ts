import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  MAX_HISTORY_ITEMS,
  STORAGE_KEY_ALARM_HISTORY,
  coerceAlarmHistory,
  sortAlarmHistoryByCreationTime,
  type AlarmHistoryEntry,
} from "../lib/alarms";
import "./history-list";

const loadHistory = async (): Promise<AlarmHistoryEntry[]> => {
  const v = await chrome.storage.local.get(STORAGE_KEY_ALARM_HISTORY);
  return sortAlarmHistoryByCreationTime(
    coerceAlarmHistory(v[STORAGE_KEY_ALARM_HISTORY]),
  );
};

const applyFilters = (
  rows: AlarmHistoryEntry[],
  query: string,
): AlarmHistoryEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (normalizedQuery && !row.label.toLowerCase().includes(normalizedQuery))
      {return false;}
    return true;
  });
};

@customElement("options-page")
export class OptionsPageElement extends LitElement {
  static styles = css`
    :host {
      color-scheme: light dark;
      --bg: #0f1419;
      --surface: #1a2332;
      --border: #2d3a4d;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #3b82f6;
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      display: block;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
    }

    @media (prefers-color-scheme: light) {
      :host {
        --bg: #f4f6f9;
        --surface: #fff;
        --border: #d1d9e6;
        --text: #1a2332;
        --muted: #5c6b80;
      }
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .wrap {
      margin: 0 auto;
      width: min(880px, 100%);
      padding: 24px 16px 28px;
    }

    .header {
      margin-bottom: 14px;
    }

    .title {
      margin: 0;
      font-size: 1.4rem;
    }

    .subtitle {
      margin: 6px 0 0;
      color: var(--muted);
    }

    .field {
      margin-bottom: 10px;
    }

    input[type="search"] {
      width: 320px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text);
    }
  `;

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
            @input=${(e: Event) => {
              this.query = (e.target as HTMLInputElement).value;
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
