import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AlarmHistoryEntry } from "../lib/alarms";
import { formatWhen } from "../lib/format-when";

@customElement("history-list-item")
export class HistoryListItemElement extends LitElement {
  override createRenderRoot(): HTMLElement {
    return this;
  }

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
