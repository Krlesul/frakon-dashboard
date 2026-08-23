import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  addGridItem,
  normalizeDashboard,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from '../../../src/dashboard/layout-model';
import {
  frakonCardCatalog,
  type FrakonCardCategory,
  type FrakonCardTemplate,
} from '../../../src/dashboard/card-catalog';
import type { FrakonDashboardStudioChangedDetail } from './dashboard-studio';
import type { FrakonHistoryStudioChangedDetail } from './dashboard-studio-history';
import {
  HomeAssistantStudioConnection,
  type FrakonDashboardCapabilities,
  type HomeAssistantEntity,
} from './home-assistant-connection';
import './dashboard-studio-history';

const WORKSPACE_KEY = 'frakon.studio.workspace.v1';
const HA_URL_KEY = 'frakon.studio.home-assistant-url.v1';
const MAX_ENTITY_RESULTS = 120;

type StudioLanguage = 'en' | 'cs';
type StudioViewport = 'mobile' | 'tablet' | 'desktop' | 'wide';
type ConnectionState = 'offline' | 'connecting' | 'connected' | 'error';
type PaletteCategory = FrakonCardCategory | 'all';

const TEXT = {
  en: {
    cards: 'Components', entities: 'Entities', searchCards: 'Search components', searchEntities: 'Search entities',
    all: 'All', connect: 'Connect Home Assistant', connected: 'Home Assistant connected', offline: 'Offline workspace',
    new: 'New', import: 'Import', export: 'Export', load: 'Load from HA', publish: 'Publish to HA',
    document: 'Dashboard', dashboardId: 'Dashboard ID', title: 'Title', localSaved: 'Saved locally',
    selected: 'Selected card', noSelection: 'Select a card on the canvas to edit its entity.', entity: 'Entity',
    add: 'Add', noEntities: 'Connect Home Assistant to browse live entities.', connectionTitle: 'Home Assistant connection',
    url: 'Home Assistant URL', token: 'Long-lived access token', tokenHint: 'The token is kept only in memory and is never stored by FRAKON Studio.',
    close: 'Close', connecting: 'Connecting…', disconnect: 'Disconnect', ready: 'Studio ready',
    emptyHa: 'No FRAKON dashboard with this ID exists in Home Assistant yet.', loaded: 'Dashboard loaded from Home Assistant.',
    published: 'Dashboard published to Home Assistant.', imported: 'Dashboard imported.', invalidImport: 'The selected file is not a valid FRAKON v1 dashboard.',
    newCreated: 'New local dashboard created.', added: 'Card added.', entityUpdated: 'Card entity updated.',
    integrationMissing: 'Connected to Home Assistant, but the FRAKON Dashboard API is not available.',
    writeLocked: 'This Home Assistant installation does not allow v1 dashboard writes.',
  },
  cs: {
    cards: 'Komponenty', entities: 'Entity', searchCards: 'Hledat komponenty', searchEntities: 'Hledat entity',
    all: 'Vše', connect: 'Připojit Home Assistant', connected: 'Home Assistant připojen', offline: 'Offline pracovní prostor',
    new: 'Nový', import: 'Importovat', export: 'Exportovat', load: 'Načíst z HA', publish: 'Publikovat do HA',
    document: 'Dashboard', dashboardId: 'ID dashboardu', title: 'Název', localSaved: 'Uloženo lokálně',
    selected: 'Vybraná karta', noSelection: 'Vyber kartu na plátně a zde změníš její entitu.', entity: 'Entita',
    add: 'Přidat', noEntities: 'Připoj Home Assistant a zobrazí se skutečné entity.', connectionTitle: 'Připojení Home Assistant',
    url: 'Adresa Home Assistantu', token: 'Long-lived access token', tokenHint: 'Token FRAKON Studio neukládá. Zůstává pouze v paměti otevřené stránky.',
    close: 'Zavřít', connecting: 'Připojuji…', disconnect: 'Odpojit', ready: 'Studio připraveno',
    emptyHa: 'V Home Assistantu zatím neexistuje FRAKON dashboard s tímto ID.', loaded: 'Dashboard načten z Home Assistantu.',
    published: 'Dashboard publikován do Home Assistantu.', imported: 'Dashboard importován.', invalidImport: 'Vybraný soubor není platný FRAKON v1 dashboard.',
    newCreated: 'Vytvořen nový lokální dashboard.', added: 'Karta přidána.', entityUpdated: 'Entita karty změněna.',
    integrationMissing: 'Home Assistant je připojen, ale FRAKON Dashboard API není dostupné.',
    writeLocked: 'Tato instalace Home Assistantu nepovoluje zápis dashboardu v1.',
  },
} as const;

function initialLanguage(): StudioLanguage {
  return navigator.language.toLocaleLowerCase().startsWith('cs') ? 'cs' : 'en';
}

function createBlankDashboard(): FrakonDashboardDocument {
  const suffix = Date.now().toString(36);
  return {
    version: 1,
    id: `studio-${suffix}`,
    title: 'FRAKON Dashboard',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    items: [],
  };
}

function parseDashboard(value: unknown): FrakonDashboardDocument | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Partial<FrakonDashboardDocument>;
  if (candidate.version !== 1 || typeof candidate.id !== 'string' || !candidate.id || !Array.isArray(candidate.items)) return undefined;
  if (typeof candidate.title !== 'string' || typeof candidate.columns !== 'number' || typeof candidate.rowHeight !== 'number' || typeof candidate.gap !== 'number') return undefined;
  if (!['mobile', 'tablet', 'desktop', 'wide'].includes(String(candidate.breakpoint))) return undefined;
  try {
    return normalizeDashboard(candidate as FrakonDashboardDocument);
  } catch {
    return undefined;
  }
}

function loadWorkspace(): FrakonDashboardDocument {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return createBlankDashboard();
    return parseDashboard(JSON.parse(raw)) ?? createBlankDashboard();
  } catch {
    return createBlankDashboard();
  }
}

function expectedDomain(type: string): string | undefined {
  const domains: Record<string, string> = {
    'custom:frakon-light-card': 'light',
    'custom:frakon-switch-card': 'switch',
    'custom:frakon-action-card': 'button',
    'custom:frakon-climate-card': 'climate',
    'custom:frakon-fan-card': 'fan',
    'custom:frakon-binary-sensor-card': 'binary_sensor',
    'custom:frakon-cover-card': 'cover',
    'custom:frakon-lock-card': 'lock',
    'custom:frakon-camera-card': 'camera',
    'custom:frakon-media-player-card': 'media_player',
    'custom:frakon-energy-card': 'sensor',
    'custom:frakon-vehicle-card': 'sensor',
    'custom:frakon-sensor-card': 'sensor',
  };
  return domains[type];
}

function entityDomain(entityId: string): string {
  return entityId.split('.', 1)[0] ?? '';
}

function entityFriendlyName(entity: HomeAssistantEntity): string {
  const friendly = entity.attributes.friendly_name;
  return typeof friendly === 'string' && friendly.trim() ? friendly : entity.entity_id;
}

@customElement('frakon-studio-app')
export class FrakonStudioApp extends LitElement {
  @state() private dashboard = loadWorkspace();
  @state() private language: StudioLanguage = initialLanguage();
  @state() private viewport: StudioViewport = 'desktop';
  @state() private paletteCategory: PaletteCategory = 'all';
  @state() private cardQuery = '';
  @state() private entityQuery = '';
  @state() private entities: HomeAssistantEntity[] = [];
  @state() private selectedIds: string[] = [];
  @state() private preferredEntityId = '';
  @state() private connectionState: ConnectionState = 'offline';
  @state() private connectionDialogOpen = false;
  @state() private haUrl = localStorage.getItem(HA_URL_KEY) ?? 'http://homeassistant.local:8123';
  @state() private accessToken = '';
  @state() private capabilities?: FrakonDashboardCapabilities;
  @state() private message = TEXT[initialLanguage()].ready;
  @state() private errorMessage = '';

  private readonly ha = new HomeAssistantStudioConnection();
  private saveTimer?: ReturnType<typeof setTimeout>;

  static styles = css`
    :host {
      display:block;
      min-height:100vh;
      color:#eef4ff;
      background:#070b12;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      --primary-color:#69a7ff;
      --primary-text-color:#eef4ff;
      --card-background-color:#111824;
      --divider-color:rgb(255 255 255 / 10%);
    }
    * { box-sizing:border-box; }
    button,input,select { font:inherit; }
    button { color:inherit; }
    .app { min-height:100vh; display:grid; grid-template-rows:auto auto 1fr; }
    .topbar {
      position:sticky; top:0; z-index:100;
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      min-height:72px; padding:12px 18px;
      border-bottom:1px solid rgb(255 255 255 / 8%);
      background:rgb(7 11 18 / 92%); backdrop-filter:blur(18px);
    }
    .brand { display:flex; align-items:center; gap:12px; min-width:220px; }
    .mark {
      width:42px; height:42px; display:grid; place-items:center; border-radius:13px;
      border:1px solid rgb(105 167 255 / 34%); background:linear-gradient(145deg,#101a2a,#0b111b);
      color:#7db4ff; font-weight:900; font-size:24px; box-shadow:0 12px 40px rgb(0 0 0 / 24%);
    }
    .brand-title { font-weight:800; letter-spacing:.01em; }
    .brand-sub { margin-top:2px; font-size:11px; opacity:.5; letter-spacing:.12em; text-transform:uppercase; }
    .toolbar { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
    .button,.file-button {
      min-height:38px; display:inline-flex; align-items:center; justify-content:center; gap:7px;
      border:1px solid rgb(255 255 255 / 10%); border-radius:11px; padding:0 12px;
      background:rgb(255 255 255 / 5%); cursor:pointer; white-space:nowrap;
    }
    .button:hover,.file-button:hover { border-color:rgb(105 167 255 / 42%); background:rgb(105 167 255 / 10%); }
    .button.primary { border-color:rgb(105 167 255 / 46%); background:#276ec8; }
    .button.good { border-color:rgb(83 209 155 / 34%); background:rgb(83 209 155 / 12%); }
    .button:disabled { opacity:.36; cursor:not-allowed; }
    .file-button input { display:none; }
    .statusbar {
      display:flex; align-items:center; justify-content:space-between; gap:14px; padding:8px 18px;
      border-bottom:1px solid rgb(255 255 255 / 6%); background:#0a1019; font-size:12px;
    }
    .status { display:flex; align-items:center; gap:8px; min-width:0; }
    .dot { width:8px; height:8px; border-radius:50%; background:#697386; flex:none; }
    .dot.connected { background:#53d19b; box-shadow:0 0 12px rgb(83 209 155 / 55%); }
    .dot.error { background:#ff647c; }
    .message { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.72; }
    .workspace { display:grid; grid-template-columns:290px minmax(0,1fr); min-height:0; }
    .sidebar {
      height:calc(100vh - 113px); position:sticky; top:113px; overflow:auto;
      border-right:1px solid rgb(255 255 255 / 8%); background:#0b111b; padding:14px;
    }
    .section { display:grid; gap:10px; padding:12px 0 16px; border-bottom:1px solid rgb(255 255 255 / 7%); }
    .section:last-child { border-bottom:0; }
    .section-title { display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; opacity:.72; }
    .field { display:grid; gap:6px; }
    .field label { font-size:11px; opacity:.56; }
    input,select {
      width:100%; min-height:38px; border:1px solid rgb(255 255 255 / 10%); border-radius:10px;
      padding:0 10px; color:inherit; background:#0e1723; outline:none;
    }
    input:focus,select:focus { border-color:#69a7ff; box-shadow:0 0 0 3px rgb(105 167 255 / 10%); }
    .category-row { display:flex; gap:6px; overflow:auto; padding-bottom:2px; }
    .chip { border:1px solid rgb(255 255 255 / 8%); border-radius:999px; padding:5px 8px; background:transparent; cursor:pointer; font-size:11px; white-space:nowrap; }
    .chip.active { border-color:rgb(105 167 255 / 42%); background:rgb(105 167 255 / 15%); }
    .library { display:grid; gap:7px; }
    .library-card {
      display:grid; grid-template-columns:minmax(0,1fr) auto; gap:9px; align-items:center;
      width:100%; border:1px solid rgb(255 255 255 / 8%); border-radius:12px; padding:10px;
      color:inherit; background:rgb(255 255 255 / 3%); text-align:left; cursor:pointer;
    }
    .library-card:hover { border-color:rgb(105 167 255 / 38%); transform:translateY(-1px); }
    .library-name { font-size:13px; font-weight:700; }
    .library-meta { margin-top:3px; font-size:10px; opacity:.48; }
    .plus { width:28px; height:28px; display:grid; place-items:center; border-radius:8px; background:rgb(105 167 255 / 16%); color:#8fc0ff; font-size:18px; }
    .entity-list { display:grid; gap:5px; max-height:250px; overflow:auto; }
    .entity-row {
      width:100%; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center;
      border:0; border-radius:9px; padding:8px 9px; background:transparent; text-align:left; cursor:pointer;
    }
    .entity-row:hover,.entity-row.active { background:rgb(105 167 255 / 10%); }
    .entity-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
    .entity-id { margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; opacity:.43; }
    .entity-state { max-width:76px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; opacity:.58; }
    .hint { font-size:11px; line-height:1.45; opacity:.48; }
    .main { min-width:0; padding:14px 18px 40px; overflow:auto; }
    .workbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 auto 12px; max-width:1500px; }
    .viewport-switch { display:flex; gap:5px; padding:4px; border:1px solid rgb(255 255 255 / 8%); border-radius:11px; background:#0d1520; }
    .viewport-switch button { border:0; border-radius:8px; padding:7px 10px; background:transparent; cursor:pointer; font-size:11px; }
    .viewport-switch button.active { background:rgb(105 167 255 / 15%); color:#a8ceff; }
    .canvas-stage { margin:0 auto; transition:max-width 180ms ease; }
    .canvas-stage.mobile { max-width:430px; }
    .canvas-stage.tablet { max-width:850px; }
    .canvas-stage.desktop { max-width:1400px; }
    .canvas-stage.wide { max-width:1680px; }
    .canvas-frame { border:1px solid rgb(255 255 255 / 8%); border-radius:18px; padding:12px; background:#090f18; box-shadow:0 30px 90px rgb(0 0 0 / 24%); overflow:hidden; }
    .error-banner { padding:8px 10px; border:1px solid rgb(255 100 124 / 30%); border-radius:9px; color:#ffc0ca; background:rgb(255 100 124 / 8%); }
    .dialog-backdrop { position:fixed; inset:0; z-index:300; display:grid; place-items:center; padding:18px; background:rgb(0 0 0 / 66%); backdrop-filter:blur(12px); }
    .dialog { width:min(560px,100%); display:grid; gap:14px; border:1px solid rgb(255 255 255 / 12%); border-radius:22px; padding:20px; background:#101824; box-shadow:0 32px 100px rgb(0 0 0 / 54%); }
    .dialog-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .dialog h2 { margin:0; font-size:20px; }
    .dialog-actions { display:flex; justify-content:flex-end; gap:8px; }
    .connection-summary { padding:10px 12px; border:1px solid rgb(83 209 155 / 20%); border-radius:10px; background:rgb(83 209 155 / 7%); font-size:12px; line-height:1.5; }
    @media (max-width:900px) {
      .topbar { align-items:flex-start; }
      .brand { min-width:0; }
      .workspace { grid-template-columns:1fr; }
      .sidebar { position:relative; top:auto; height:auto; border-right:0; border-bottom:1px solid rgb(255 255 255 / 8%); }
    }
  `;

  disconnectedCallback(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.ha.disconnect();
    super.disconnectedCallback();
  }

  private t<K extends keyof typeof TEXT.en>(key: K): (typeof TEXT.en)[K] | (typeof TEXT.cs)[K] {
    return TEXT[this.language][key];
  }

  private persistSoon(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(this.dashboard)); } catch { /* browser storage may be unavailable */ }
    }, 120);
  }

  private replaceDashboard(next: FrakonDashboardDocument, message?: string): void {
    this.dashboard = normalizeDashboard(next);
    this.selectedIds = [];
    this.persistSoon();
    if (message) this.message = message;
    this.errorMessage = '';
  }

  private onHistoryChanged(event: CustomEvent<FrakonHistoryStudioChangedDetail>): void {
    this.dashboard = normalizeDashboard(event.detail.document);
    this.persistSoon();
  }

  private onStudioChanged(event: CustomEvent<FrakonDashboardStudioChangedDetail>): void {
    this.selectedIds = [...event.detail.selection.ids];
  }

  private updateDashboardIdentity(field: 'id' | 'title', value: string): void {
    const trimmed = field === 'id' ? value.trim().slice(0, 128) : value;
    if (field === 'id' && !trimmed) return;
    this.dashboard = { ...this.dashboard, [field]: trimmed };
    this.persistSoon();
  }

  private newDashboard(): void {
    this.replaceDashboard(createBlankDashboard(), this.t('newCreated'));
  }

  private exportDashboard(): void {
    const blob = new Blob([`${JSON.stringify(this.dashboard, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${this.dashboard.id}.frakon-dashboard.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async importDashboard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const dashboard = parseDashboard(parsed);
      if (!dashboard) throw new Error(this.t('invalidImport'));
      this.replaceDashboard(dashboard, this.t('imported'));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : this.t('invalidImport');
    } finally {
      input.value = '';
    }
  }

  private matchingTemplates(): FrakonCardTemplate[] {
    const query = this.cardQuery.trim().toLocaleLowerCase();
    return frakonCardCatalog.filter((template) => {
      if (this.paletteCategory !== 'all' && template.category !== this.paletteCategory) return false;
      if (!query) return true;
      return `${template.name} ${template.description} ${template.type} ${template.category}`.toLocaleLowerCase().includes(query);
    });
  }

  private matchingEntities(domain?: string): HomeAssistantEntity[] {
    const query = this.entityQuery.trim().toLocaleLowerCase();
    return this.entities.filter((entity) => {
      if (domain && entityDomain(entity.entity_id) !== domain) return false;
      if (!query) return true;
      return `${entity.entity_id} ${entityFriendlyName(entity)} ${entity.state}`.toLocaleLowerCase().includes(query);
    }).slice(0, MAX_ENTITY_RESULTS);
  }

  private entityForTemplate(template: FrakonCardTemplate): string | undefined {
    const expected = expectedDomain(template.type);
    if (this.preferredEntityId && (!expected || entityDomain(this.preferredEntityId) === expected)) return this.preferredEntityId;
    const first = this.matchingEntities(expected)[0];
    return first?.entity_id;
  }

  private addTemplate(template: FrakonCardTemplate): void {
    const entityId = this.entityForTemplate(template);
    const id = `${template.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const y = this.dashboard.items.reduce((maximum, item) => Math.max(maximum, item.y + item.h), 0);
    const item: FrakonGridItem = {
      id,
      x: 0,
      y,
      w: Math.min(template.defaultWidth, this.dashboard.columns),
      h: template.defaultHeight,
      card: template.createConfig(entityId),
    };
    this.replaceDashboard(addGridItem(this.dashboard, item), this.t('added'));
  }

  private selectedItem(): FrakonGridItem | undefined {
    if (this.selectedIds.length !== 1) return undefined;
    return this.dashboard.items.find((item) => item.id === this.selectedIds[0]);
  }

  private updateSelectedEntity(entityId: string): void {
    const item = this.selectedItem();
    if (!item) return;
    this.preferredEntityId = entityId;
    this.dashboard = {
      ...this.dashboard,
      items: this.dashboard.items.map((candidate) => candidate.id === item.id
        ? { ...candidate, card: { ...candidate.card, entity: entityId } }
        : candidate),
    };
    this.persistSoon();
    this.message = this.t('entityUpdated');
  }

  private choosePreferredEntity(entityId: string): void {
    this.preferredEntityId = entityId;
    if (this.selectedItem()) this.updateSelectedEntity(entityId);
  }

  private async connectHomeAssistant(): Promise<void> {
    this.connectionState = 'connecting';
    this.errorMessage = '';
    try {
      await this.ha.connect(this.haUrl, this.accessToken);
      const entities = await this.ha.listEntities();
      let capabilities: FrakonDashboardCapabilities;
      try {
        capabilities = await this.ha.capabilities();
      } catch {
        this.connectionState = 'error';
        this.entities = entities;
        this.errorMessage = this.t('integrationMissing');
        return;
      }
      this.entities = entities;
      this.capabilities = capabilities;
      this.connectionState = 'connected';
      localStorage.setItem(HA_URL_KEY, this.haUrl.trim());
      this.message = `${this.t('connected')} · ${entities.length} entities`;
      this.connectionDialogOpen = false;
    } catch (error) {
      this.connectionState = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Connection failed.';
    }
  }

  private disconnectHomeAssistant(): void {
    this.ha.disconnect();
    this.entities = [];
    this.capabilities = undefined;
    this.connectionState = 'offline';
    this.accessToken = '';
    this.message = this.t('offline');
  }

  private async loadFromHomeAssistant(): Promise<void> {
    if (this.connectionState !== 'connected') return;
    this.errorMessage = '';
    try {
      const result = await this.ha.loadDashboard<unknown>(this.dashboard.id);
      if (result === null) {
        this.message = this.t('emptyHa');
        return;
      }
      const dashboard = parseDashboard(result);
      if (!dashboard) throw new Error(this.t('invalidImport'));
      this.replaceDashboard(dashboard, this.t('loaded'));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Load failed.';
    }
  }

  private async publishToHomeAssistant(): Promise<void> {
    if (this.connectionState !== 'connected') return;
    this.errorMessage = '';
    if (!this.capabilities?.writableDocumentVersions.includes(1)) {
      this.errorMessage = this.t('writeLocked');
      return;
    }
    try {
      await this.ha.saveDashboard(this.dashboard as unknown as Record<string, unknown>);
      this.message = this.t('published');
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Publish failed.';
    }
  }

  private renderConnectionDialog() {
    if (!this.connectionDialogOpen) return nothing;
    return html`
      <div class="dialog-backdrop" @click=${() => { this.connectionDialogOpen = false; }}>
        <section class="dialog" @click=${(event: Event) => event.stopPropagation()}>
          <div class="dialog-head">
            <h2>${this.t('connectionTitle')}</h2>
            <button class="button" @click=${() => { this.connectionDialogOpen = false; }}>${this.t('close')}</button>
          </div>
          <div class="field">
            <label>${this.t('url')}</label>
            <input .value=${this.haUrl} @input=${(event: Event) => { this.haUrl = (event.target as HTMLInputElement).value; }} placeholder="http://homeassistant.local:8123">
          </div>
          <div class="field">
            <label>${this.t('token')}</label>
            <input type="password" autocomplete="off" .value=${this.accessToken} @input=${(event: Event) => { this.accessToken = (event.target as HTMLInputElement).value; }}>
            <div class="hint">${this.t('tokenHint')}</div>
          </div>
          ${this.connectionState === 'connected' ? html`
            <div class="connection-summary">${this.t('connected')} · ${this.entities.length} entities · API v${this.capabilities?.readableDocumentVersions.join(', ') ?? '?'}</div>
          ` : nothing}
          ${this.errorMessage ? html`<div class="error-banner">${this.errorMessage}</div>` : nothing}
          <div class="dialog-actions">
            ${this.connectionState === 'connected'
              ? html`<button class="button" @click=${this.disconnectHomeAssistant}>${this.t('disconnect')}</button>`
              : html`<button class="button primary" ?disabled=${this.connectionState === 'connecting'} @click=${this.connectHomeAssistant}>${this.connectionState === 'connecting' ? this.t('connecting') : this.t('connect')}</button>`}
          </div>
        </section>
      </div>
    `;
  }

  private renderSidebar() {
    const categories: PaletteCategory[] = ['all', 'general', 'lighting', 'climate', 'security', 'media', 'energy', 'vehicle'];
    const selected = this.selectedItem();
    const selectedDomain = selected && typeof selected.card.type === 'string' ? expectedDomain(selected.card.type) : undefined;
    const selectedEntity = selected && typeof selected.card.entity === 'string' ? selected.card.entity : '';
    return html`
      <aside class="sidebar">
        <section class="section">
          <div class="section-title"><span>${this.t('document')}</span><span>${this.t('localSaved')}</span></div>
          <div class="field"><label>${this.t('title')}</label><input .value=${this.dashboard.title} @change=${(event: Event) => this.updateDashboardIdentity('title', (event.target as HTMLInputElement).value)}></div>
          <div class="field"><label>${this.t('dashboardId')}</label><input .value=${this.dashboard.id} @change=${(event: Event) => this.updateDashboardIdentity('id', (event.target as HTMLInputElement).value)}></div>
        </section>

        <section class="section">
          <div class="section-title"><span>${this.t('cards')}</span><span>${this.matchingTemplates().length}</span></div>
          <input placeholder=${this.t('searchCards')} .value=${this.cardQuery} @input=${(event: Event) => { this.cardQuery = (event.target as HTMLInputElement).value; }}>
          <div class="category-row">
            ${categories.map((category) => html`<button class="chip ${this.paletteCategory === category ? 'active' : ''}" @click=${() => { this.paletteCategory = category; }}>${category === 'all' ? this.t('all') : category}</button>`)}
          </div>
          <div class="library">
            ${this.matchingTemplates().map((template) => html`
              <button class="library-card" @click=${() => this.addTemplate(template)}>
                <span><span class="library-name">${template.name}</span><span class="library-meta">${template.category} · ${template.defaultWidth}×${template.defaultHeight}</span></span>
                <span class="plus">+</span>
              </button>
            `)}
          </div>
        </section>

        <section class="section">
          <div class="section-title"><span>${this.t('selected')}</span><span>${selected?.id ?? '—'}</span></div>
          ${selected ? html`
            <div class="field"><label>${this.t('entity')}</label><input .value=${selectedEntity} @change=${(event: Event) => this.updateSelectedEntity((event.target as HTMLInputElement).value.trim())}></div>
          ` : html`<div class="hint">${this.t('noSelection')}</div>`}
        </section>

        <section class="section">
          <div class="section-title"><span>${this.t('entities')}</span><span>${this.entities.length || '—'}</span></div>
          <input placeholder=${this.t('searchEntities')} .value=${this.entityQuery} @input=${(event: Event) => { this.entityQuery = (event.target as HTMLInputElement).value; }}>
          ${this.connectionState !== 'connected' ? html`<div class="hint">${this.t('noEntities')}</div>` : html`
            <div class="entity-list">
              ${this.matchingEntities(selectedDomain).map((entity) => html`
                <button class="entity-row ${entity.entity_id === (selectedEntity || this.preferredEntityId) ? 'active' : ''}" @click=${() => this.choosePreferredEntity(entity.entity_id)}>
                  <span><div class="entity-name">${entityFriendlyName(entity)}</div><div class="entity-id">${entity.entity_id}</div></span>
                  <span class="entity-state">${entity.state}</span>
                </button>
              `)}
            </div>
          `}
        </section>
      </aside>
    `;
  }

  render() {
    const connected = this.connectionState === 'connected';
    const viewportOptions: StudioViewport[] = ['mobile', 'tablet', 'desktop', 'wide'];
    return html`
      <div class="app">
        <header class="topbar">
          <div class="brand"><div class="mark">F.</div><div><div class="brand-title">FRAKON Studio</div><div class="brand-sub">Dashboard designer</div></div></div>
          <div class="toolbar">
            <button class="button" @click=${this.newDashboard}>${this.t('new')}</button>
            <label class="file-button">${this.t('import')}<input type="file" accept="application/json,.json" @change=${this.importDashboard}></label>
            <button class="button" @click=${this.exportDashboard}>${this.t('export')}</button>
            <button class="button" ?disabled=${!connected} @click=${this.loadFromHomeAssistant}>${this.t('load')}</button>
            <button class="button good" ?disabled=${!connected} @click=${this.publishToHomeAssistant}>${this.t('publish')}</button>
            <button class="button ${connected ? 'good' : 'primary'}" @click=${() => { this.connectionDialogOpen = true; }}>${connected ? this.t('connected') : this.t('connect')}</button>
            <select aria-label="Language" .value=${this.language} @change=${(event: Event) => { this.language = (event.target as HTMLSelectElement).value as StudioLanguage; }}><option value="en">EN</option><option value="cs">CZ</option></select>
          </div>
        </header>
        <div class="statusbar">
          <div class="status"><span class="dot ${this.connectionState}"></span><span>${connected ? this.t('connected') : this.t('offline')}</span></div>
          <div class="message">${this.errorMessage || this.message}</div>
        </div>
        <div class="workspace">
          ${this.renderSidebar()}
          <main class="main">
            <div class="workbar">
              <div><strong>${this.dashboard.title}</strong> <span class="hint">· ${this.dashboard.columns} columns · ${this.dashboard.items.length} cards</span></div>
              <div class="viewport-switch">
                ${viewportOptions.map((viewport) => html`<button class=${this.viewport === viewport ? 'active' : ''} @click=${() => { this.viewport = viewport; }}>${viewport}</button>`)}
              </div>
            </div>
            ${this.errorMessage ? html`<div class="error-banner" style="max-width:1500px;margin:0 auto 12px">${this.errorMessage}</div>` : nothing}
            <div class="canvas-stage ${this.viewport}">
              <div class="canvas-frame">
                <frakon-dashboard-studio-history
                  .document=${this.dashboard}
                  @frakon-history-studio-changed=${this.onHistoryChanged}
                  @frakon-dashboard-studio-changed=${this.onStudioChanged}
                ></frakon-dashboard-studio-history>
              </div>
            </div>
          </main>
        </div>
      </div>
      ${this.renderConnectionDialog()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-studio-app': FrakonStudioApp;
  }
}
