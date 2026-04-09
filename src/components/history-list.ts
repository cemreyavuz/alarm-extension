import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AlarmHistoryEntry } from "../lib/alarms";

@customElement("history-list")
export class HistoryListElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty {
      margin: 0;
      color: var(--muted);
    }
  `;

  @property({ attribute: false })
  accessor rows: AlarmHistoryEntry[] = [];

  @property({ type: Boolean })
  accessor hasAnyRows = false;

  @property({ type: Boolean })
  accessor isLoading = false;

  protected render() {
    if (this.isLoading) {
      return html`<p class="empty">Loading history...</p>`;
    }

    if (!this.hasAnyRows) {
      return html`<p class="empty">No past alarms yet.</p>`;
    }

    if (this.rows.length === 0) {
      return html`<p class="empty">No alarms match the selected filters.</p>`;
    }

    return this.rows.map(
      (row) => html`<history-list-item .row=${row}></history-list-item>`,
    );
  }
}
