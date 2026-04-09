import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AlarmHistoryEntry } from "../lib/alarms";
import { formatWhen } from "../lib/format-when";

@customElement("history-list-item")
export class HistoryListItemElement extends LitElement {
  static styles = css`
    .row {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
    }

    .row-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .label {
      font-weight: 600;
    }

    .meta {
      margin: 0;
      color: var(--muted);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 4px 12px;
      font-size: 0.88rem;
    }
  `;

  @property({ attribute: false })
  accessor row: AlarmHistoryEntry | undefined = undefined;

  protected render() {
    if (!this.row) {
      return undefined;
    }

    return html`
      <article class="row">
        <div class="row-top">
          <span class="label">${this.row.label}</span>
        </div>
        <p class="meta">
          <span>Scheduled: ${formatWhen(this.row.scheduledAt)}</span>
          <span>Fired: ${formatWhen(this.row.firedAt)}</span>
        </p>
      </article>
    `;
  }
}
