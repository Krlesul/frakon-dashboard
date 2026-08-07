import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardEmergencyFocusState, DashboardEmergencyFocusTarget } from '../../../src/dashboard/dashboard-emergency-focus';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { ViewportTransform } from '../../../packages/studio-engine/src/viewport';
import type { FrakonDashboardEmergencyFocusOverlay } from './dashboard-emergency-focus-overlay';
import type { FrakonStudioCanvas } from './studio-canvas';
import './dashboard-emergency-focus-overlay';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-emergency-focus-bridge')
export class FrakonDashboardEmergencyFocusBridge extends LitElement {
  @property({ attribute: false }) focusState?: DashboardEmergencyFocusState;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ type: Boolean }) autoFocus = true;
  @property() activeItemId = '';
  @property({ type: Number }) focusToken = 0;
  @property({ type: Number }) restoreToken = 0;

  private overlay?: FrakonDashboardEmergencyFocusOverlay;
  private previousViewport?: ViewportTransform;
  private focusedItemId?: string;
  private lastFocusToken = -1;
  private lastRestoreToken = -1;
  private wasActive = false;

  protected updated(): void { this.sync(); }
  disconnectedCallback(): void { this.deactivate(); super.disconnectedCallback(); }

  private sync(): void {
    if (!this.focusState?.active || !this.document) { this.deactivate(); this.wasActive = false; return; }
    const canvas = this.studioCanvas();
    if (!canvas) return;
    if (!this.previousViewport) this.previousViewport = { ...canvas.viewport };
    if (!this.overlay) this.overlay = document.createElement('frakon-dashboard-emergency-focus-overlay');
    this.overlay.focusState = this.focusState;
    this.overlay.document = this.document;
    this.overlay.activeItemId = this.currentTarget()?.itemId ?? '';
    if (this.overlay.parentElement !== canvas) canvas.append(this.overlay);

    if (this.restoreToken !== this.lastRestoreToken) {
      this.lastRestoreToken = this.restoreToken;
      if (this.wasActive) this.restorePreviousViewport(canvas);
    }

    const manualFocusRequested = this.focusToken !== this.lastFocusToken;
    if (manualFocusRequested) this.lastFocusToken = this.focusToken;
    const target = this.currentTarget();
    if (!target) return;
    const targetChanged = this.focusedItemId !== target.itemId;
    const entering = !this.wasActive;
    this.wasActive = true;
    if (manualFocusRequested || targetChanged || (entering && this.autoFocus)) {
      if (manualFocusRequested || this.autoFocus) this.focusTarget(canvas, target);
    }
  }

  private currentTarget(): DashboardEmergencyFocusTarget | undefined {
    if (!this.focusState?.active) return undefined;
    if (this.activeItemId) {
      const selected = this.focusState.targets.find((target) => target.itemId === this.activeItemId);
      if (selected) return selected;
    }
    return this.focusState.primary;
  }

  private focusTarget(canvas: FrakonStudioCanvas, target: DashboardEmergencyFocusTarget): void {
    if (!this.document) return;
    this.focusedItemId = target.itemId;
    const rect = canvas.getBoundingClientRect();
    const item = target.item;
    const itemWidth = item.w * COLUMN_WIDTH - this.document.gap;
    const itemHeight = item.h * this.document.rowHeight - this.document.gap;
    const availableWidth = Math.max(320, rect.width - 96);
    const availableHeight = Math.max(240, rect.height - 96);
    const zoom = Math.min(1.35, Math.max(canvas.viewport.zoom, Math.min(availableWidth / itemWidth, availableHeight / itemHeight)));
    const centerX = item.x * COLUMN_WIDTH + itemWidth / 2;
    const centerY = item.y * this.document.rowHeight + itemHeight / 2;
    canvas.viewport = { zoom, x: rect.width / 2 - centerX * zoom, y: rect.height / 2 - centerY * zoom };
    canvas.requestUpdate();
  }

  private restorePreviousViewport(canvas = this.studioCanvas()): void {
    if (!canvas || !this.previousViewport) return;
    canvas.viewport = { ...this.previousViewport };
    canvas.requestUpdate();
    this.focusedItemId = undefined;
  }

  private deactivate(): void {
    this.overlay?.remove();
    this.focusedItemId = undefined;
    if (this.previousViewport) this.restorePreviousViewport();
    this.previousViewport = undefined;
    this.wasActive = false;
  }

  private studioCanvas(): FrakonStudioCanvas | undefined {
    let root: Node = this.getRootNode();
    while (root instanceof ShadowRoot) {
      const canvas = findStudioCanvas(root);
      if (canvas) return canvas;
      root = root.host.getRootNode();
    }
    return undefined;
  }

  render() { return nothing; }
}

function findStudioCanvas(root: ParentNode): FrakonStudioCanvas | undefined {
  const direct = root.querySelector<FrakonStudioCanvas>('frakon-studio-canvas');
  if (direct) return direct;
  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    if (!element.shadowRoot) continue;
    const nested = findStudioCanvas(element.shadowRoot);
    if (nested) return nested;
  }
  return undefined;
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-emergency-focus-bridge': FrakonDashboardEmergencyFocusBridge; } }
