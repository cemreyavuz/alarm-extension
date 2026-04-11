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
      <article>
        <hgroup>
          <h5>${this.row.label}</h5>
          <div class="grid">
            <small>Scheduled: ${formatWhen(this.row.scheduledAt)}</small>
            <small>Fired: ${formatWhen(this.row.firedAt)}</small>
          </div>
        </hgroup>
      </article>
    `;
  }
}
