import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  removeFromSelection,
  selectOnly,
  toggleSelection,
  type SelectionState,
} from '../../../packages/studio-engine/src/selection';
import {
  moveDashboardLayerAbove,
  moveDashboardLayerToBack,
  renameDashboardLayer,
  setDashboardLayerHidden,
  setDashboardLayerLocked,
} from '../../../src/dashboard/dashboard-layers';
import type { FrakonDashboardDocument, FrakonGridItem } from '../../../src/dashboard/layout-model';

export interface FrakonLayersDocumentChangedDetail {
  document: FrakonDashboardDocument;
}

export interface FrakonLayersSelectionChangedDetail {
  selection: SelectionState;
}

@customElement('frakon-layers-panel')
export class FrakonLayersPanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @state() private draggedId?: string;
  @state() private dropTargetId?: string;

  static styles = css`
    :host { display:block; color:inherit; }
    .panel {
      overflow:hidden;
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:16px;
      background:rgb(255 255 255 / 4%);
    }
    .head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:12px 14px;
      border-bottom:1px solid rgb(255 255 255 / 8%);
    }
    .title { font-size:13px; font-weight:760; letter-spacing:.06em; text-transform:uppercase; }
    .count { font-size:11px; opacity:.56; }
    .list { display:grid; }
    .row {
      display:grid;
      grid-template-columns:24px minmax(0,1fr) auto;
      gap:8px;
      align-items:center;
      padding:7px 8px;
      border-bottom:1px solid rgb(255 255 255 / 6%);
      background:transparent;
      transition:background 100ms ease,box-shadow 100ms ease,opacity 100ms ease;
    }
    .row:last-child { border-bottom:0; }
    .row.selected { background:rgb(105 167 255 / 13%); }
    .row.hidden { opacity:.5; }
    .row.dragging { opacity:.34; }
    .row.drop-target { box-shadow:inset 0 2px #69a7ff; }
    .drag {
      width:24px;
      height:30px;
      display:grid;
      place-items:center;
      border:0;
      border-radius:7px;
      color:inherit;
      background:transparent;
      cursor:grab;
      user-select:none;
    }
    .drag:active { cursor:grabbing; }
    .drag:disabled { opacity:.3; cursor:not-allowed; }
    .identity { min-width:0; display:grid; gap:3px; }
    .name {
      width:100%;
      min-width:0;
      box-sizing:border-box;
      border:0;
      border-radius:7px;
      padding:4px 6px;
      color:inherit;
      background:transparent;
      font:inherit;
      font-size:12px;
      font-weight:650;
    }
    .name:focus { outline:1px solid rgb(105 167 255 / 56%); background:rgb(0 0 0 / 14%); }
    .meta { padding:0 6px; overflow:hidden; font-size:10px; opacity:.48; text-overflow:ellipsis; white-space:nowrap; }
    .actions { display:flex; gap:3px; }
    .icon {
      width:30px;
      height:30px;
      border:0;
      border-radius:8px;
      color:inherit;
      background:rgb(255 255 255 / 5%);
      cursor:pointer;
      font:inherit;
      font-size:12px;
    }
    .icon.active { color:#9bc5ff; background:rgb(105 167 255 / 14%); }
    .back-drop {
      padding:9px 12px;
      border-top:1px dashed rgb(255 255 255 / 10%);
      font-size:10px;
      text-align:center;
      opacity:.45;
    }
    .back-drop.active { opacity:1; color:#9bc5ff; background:rgb(105 167 255 / 8%); }
    .empty { padding:20px 14px; font-size:12px; opacity:.56; }
  `;

  private layerName(item: FrakonGridItem): string {
    return typeof item.card.name === 'string' && item.card.name.trim()
      ? item.card.name
      : item.id;
  }

  private emitDocument(document: FrakonDashboardDocument): void {
    this.dispatchEvent(new CustomEvent<FrakonLayersDocumentChangedDetail>('frakon-layers-document-changed', {
      detail: { document },
      bubbles: true,
      composed: true,
    }));
  }

  private emitSelection(selection: SelectionState): void {
    this.dispatchEvent(new CustomEvent<FrakonLayersSelectionChangedDetail>('frakon-layers-selection-changed', {
      detail: { selection },
      bubbles: true,
      composed: true,
    }));
  }

  private selectLayer(event: MouseEvent, item: FrakonGridItem): void {
    const target = event.composedPath()[0];
    if (target instanceof HTMLInputElement || target instanceof HTMLButtonElement) return;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    this.emitSelection(additive ? toggleSelection(this.selection, item.id) : selectOnly(item.id));
  }

  private rename(item: FrakonGridItem, event: Event): void {
    if (!this.document) return;
    const result = renameDashboardLayer(this.document, item.id, (event.target as HTMLInputElement).value);
    if (result.status === 'committed') this.emitDocument(result.document);
  }

  private toggleLock(item: FrakonGridItem): void {
    if (!this.document) return;
    const result = setDashboardLayerLocked(this.document, item.id, !item.locked);
    if (result.status === 'committed') this.emitDocument(result.document);
  }

  private toggleHidden(item: FrakonGridItem): void {
    if (!this.document) return;
    const hidden = !item.hidden;
    const result = setDashboardLayerHidden(this.document, item.id, hidden);
    if (result.status !== 'committed') return;
    this.emitDocument(result.document);
    if (hidden && this.selection.ids.includes(item.id)) {
      this.emitSelection(removeFromSelection(this.selection, item.id));
    }
  }

  private dragStart(event: DragEvent, item: FrakonGridItem): void {
    if (item.locked) {
      event.preventDefault();
      return;
    }
    this.draggedId = item.id;
    event.dataTransfer?.setData('text/plain', item.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  private dragEnd(): void {
    this.draggedId = undefined;
    this.dropTargetId = undefined;
  }

  private dragOver(event: DragEvent, targetId?: string): void {
    if (!this.draggedId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTargetId = targetId;
  }

  private dropAbove(event: DragEvent, targetId: string): void {
    event.preventDefault();
    if (!this.document || !this.draggedId) return;
    const result = moveDashboardLayerAbove(this.document, this.draggedId, targetId);
    this.dragEnd();
    if (result.status === 'committed') this.emitDocument(result.document);
  }

  private dropToBack(event: DragEvent): void {
    event.preventDefault();
    if (!this.document || !this.draggedId) return;
    const result = moveDashboardLayerToBack(this.document, this.draggedId);
    this.dragEnd();
    if (result.status === 'committed') this.emitDocument(result.document);
  }

  private renderRow(item: FrakonGridItem) {
    const selected = this.selection.ids.includes(item.id);
    const classes = [
      'row',
      selected ? 'selected' : '',
      item.hidden ? 'hidden' : '',
      this.draggedId === item.id ? 'dragging' : '',
      this.dropTargetId === item.id && this.draggedId !== item.id ? 'drop-target' : '',
    ].filter(Boolean).join(' ');
    const cardType = typeof item.card.type === 'string' ? item.card.type : 'card';
    return html`
      <div
        class=${classes}
        draggable=${item.locked ? 'false' : 'true'}
        @click=${(event: MouseEvent) => this.selectLayer(event, item)}
        @dragstart=${(event: DragEvent) => this.dragStart(event, item)}
        @dragend=${this.dragEnd}
        @dragover=${(event: DragEvent) => this.dragOver(event, item.id)}
        @drop=${(event: DragEvent) => this.dropAbove(event, item.id)}
      >
        <button class="drag" ?disabled=${item.locked} title=${item.locked ? 'Unlock layer to reorder' : 'Drag to reorder'} aria-label="Reorder layer">⋮⋮</button>
        <div class="identity">
          <input
            class="name"
            .value=${this.layerName(item)}
            aria-label=${`Layer name for ${item.id}`}
            @change=${(event: Event) => this.rename(item, event)}
          >
          <div class="meta">${item.id} · ${cardType}</div>
        </div>
        <div class="actions">
          <button class="icon ${item.hidden ? '' : 'active'}" @click=${() => this.toggleHidden(item)} title=${item.hidden ? 'Show layer' : 'Hide layer'} aria-label=${item.hidden ? 'Show layer' : 'Hide layer'}>${item.hidden ? '○' : '●'}</button>
          <button class="icon ${item.locked ? 'active' : ''}" @click=${() => this.toggleLock(item)} title=${item.locked ? 'Unlock layer' : 'Lock layer'} aria-label=${item.locked ? 'Unlock layer' : 'Lock layer'}>${item.locked ? '◆' : '◇'}</button>
        </div>
      </div>
    `;
  }

  render() {
    const document = this.document;
    if (!document) return nothing;
    const visualOrder = [...document.items].reverse();
    return html`
      <section class="panel" aria-label="Dashboard layers">
        <div class="head"><span class="title">Layers</span><span class="count">${document.items.length}</span></div>
        ${visualOrder.length
          ? html`<div class="list">${visualOrder.map((item) => this.renderRow(item))}</div>`
          : html`<div class="empty">No layers yet.</div>`}
        <div
          class="back-drop ${this.draggedId && this.dropTargetId === undefined ? 'active' : ''}"
          @dragover=${(event: DragEvent) => this.dragOver(event)}
          @drop=${this.dropToBack}
        >Drop here to send layer to back</div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-layers-panel': FrakonLayersPanel;
  }
}
