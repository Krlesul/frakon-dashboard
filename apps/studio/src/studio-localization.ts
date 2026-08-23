export type StudioLocale = 'en' | 'cs';

const STORAGE_KEY = 'frakon.studio.language.v1';

const EN_CS: ReadonlyArray<readonly [string, string]> = [
  ['Dashboard designer', 'Editor dashboardů'],
  ['DASHBOARD DESIGNER', 'EDITOR DASHBOARDŮ'],
  ['Dashboard', 'Dashboard'],
  ['Dashboard ID', 'ID dashboardu'],
  ['Title', 'Název'],
  ['Saved locally', 'Uloženo lokálně'],
  ['Components', 'Komponenty'],
  ['Search components', 'Hledat komponenty'],
  ['Entities', 'Entity'],
  ['Search entities', 'Hledat entity'],
  ['All', 'Vše'],
  ['New', 'Nový'],
  ['Import', 'Importovat'],
  ['Export', 'Exportovat'],
  ['Load from HA', 'Načíst z HA'],
  ['Publish to HA', 'Publikovat do HA'],
  ['Refresh states', 'Obnovit stavy'],
  ['Connect Home Assistant', 'Připojit Home Assistant'],
  ['Home Assistant connected', 'Home Assistant připojen'],
  ['Offline workspace', 'Offline pracovní prostor'],
  ['Home Assistant connection', 'Připojení Home Assistant'],
  ['Home Assistant URL', 'Adresa Home Assistantu'],
  ['Long-lived access token', 'Dlouhodobý přístupový token'],
  ['Close', 'Zavřít'],
  ['Connecting…', 'Připojuji…'],
  ['Disconnect', 'Odpojit'],
  ['Studio ready', 'Studio připraveno'],
  ['Quick properties', 'Rychlé vlastnosti'],
  ['Selected card', 'Vybraná karta'],
  ['Card name', 'Název karty'],
  ['Entity', 'Entita'],
  ['Geometry', 'Geometrie'],
  ['Position', 'Pozice'],
  ['Size', 'Velikost'],
  ['Lock', 'Zamknout'],
  ['Unlock', 'Odemknout'],
  ['Hide', 'Skrýt'],
  ['Show', 'Zobrazit'],
  ['Duplicate', 'Duplikovat'],
  ['Delete', 'Smazat'],
  ['Automatic Designer', 'Automatický návrhář'],
  ['Generate proposal', 'Vygenerovat návrh'],
  ['Generate another', 'Vygenerovat další'],
  ['Apply', 'Použít'],
  ['Revert', 'Vrátit'],
  ['Next', 'Další'],
  ['Preview', 'Náhled'],
  ['ready', 'připraveno'],
  ['Select one card to override its layout priority or semantic group.', 'Vyber jednu kartu a nastav její prioritu rozložení nebo sémantickou skupinu.'],
  ['Undo', 'Zpět'],
  ['Redo', 'Znovu'],
  ['No committed changes', 'Žádné potvrzené změny'],
  ['Layers', 'Vrstvy'],
  ['LAYERS', 'VRSTVY'],
  ['Align & distribute', 'Zarovnat a rozmístit'],
  ['No layers yet.', 'Zatím nejsou žádné vrstvy.'],
  ['Drop here to send layer to back', 'Přetáhni sem vrstvu a pošli ji dozadu'],
  ['Appearance', 'Vzhled'],
  ['Layout rules', 'Pravidla rozložení'],
  ['Intelligence', 'Inteligence'],
  ['Selection', 'Výběr'],
  ['Card defaults', 'Výchozí nastavení karet'],
  ['Dashboard surface', 'Povrch dashboardu'],
  ['Card surface', 'Povrch karty'],
  ['Selected card surface', 'Povrch vybrané karty'],
  ['Surface appearance', 'Vzhled povrchu'],
  ['Borderless', 'Bez rámečku'],
  ['Transparent', 'Průhledný'],
  ['Solid', 'Plný'],
  ['Background', 'Pozadí'],
  ['Border', 'Rámeček'],
  ['Radius', 'Zaoblení'],
  ['Shadow', 'Stín'],
  ['Blur', 'Rozostření'],
  ['Opacity', 'Krytí'],
  ['Constraints', 'Vazby'],
  ['Constraint', 'Vazba'],
  ['Add constraint', 'Přidat vazbu'],
  ['No constraints yet.', 'Zatím nejsou žádné vazby.'],
  ['Source', 'Zdroj'],
  ['Target', 'Cíl'],
  ['Kind', 'Typ'],
  ['Gap', 'Mezera'],
  ['Snap threshold', 'Práh přichytávání'],
  ['Constraint ghost preview', 'Náhled vazeb'],
  ['Visible', 'Viditelný'],
  ['Hidden', 'Skrytý'],
  ['Canvas zoom controls', 'Ovládání přiblížení plátna'],
  ['Canvas origin', 'Počátek plátna'],
  ['Fit', 'Přizpůsobit'],
  ['Empty dashboard', 'Prázdný dashboard'],
  ['All layers are hidden', 'Všechny vrstvy jsou skryté'],
  ['Add cards to begin composing the FRAKON interface.', 'Přidej karty a začni skládat rozhraní FRAKON.'],
  ['Use the Layers panel to show a hidden card.', 'Skrytou kartu zobrazíš v panelu Vrstvy.'],
  ['FRAKON Dashboard Studio', 'FRAKON Dashboard Studio'],
  ['Click objects to select, use Shift or Ctrl/Cmd for multiple selection, drag empty canvas for a marquee and use Alt-drag or the middle mouse button to pan.', 'Kliknutím vybereš objekt, Shift nebo Ctrl/Cmd použij pro vícenásobný výběr, tažením po prázdném plátně vytvoříš výběr a Alt-tažením nebo prostředním tlačítkem myši plátno posuneš.'],
  ['screen px · hold Ctrl/Cmd while dragging to bypass grid + guides', 'px obrazovky · při tažení drž Ctrl/Cmd pro vypnutí mřížky a vodítek'],
  ['Preview · use Automatic Designer controls to apply or revert', 'Náhled · pomocí Automatického návrháře změny použij nebo vrať'],
  ['General', 'Obecné'],
  ['general', 'obecné'],
  ['Lighting', 'Osvětlení'],
  ['lighting', 'osvětlení'],
  ['Climate', 'Klima'],
  ['climate', 'klima'],
  ['Security', 'Zabezpečení'],
  ['security', 'zabezpečení'],
  ['Media', 'Média'],
  ['media', 'média'],
  ['Energy', 'Energie'],
  ['energy', 'energie'],
  ['Vehicle', 'Vozidlo'],
  ['vehicle', 'vozidlo'],
  ['Sensor', 'Senzor'],
  ['Room', 'Místnost'],
  ['Switch', 'Spínač'],
  ['Action', 'Akce'],
  ['Light', 'Světlo'],
  ['Fan', 'Ventilátor'],
  ['Binary sensor', 'Binární senzor'],
  ['Cover', 'Roleta / vrata'],
  ['Lock', 'Zámek'],
  ['Camera', 'Kamera'],
  ['Media player', 'Přehrávač médií'],
  ['Universal entity status and action card.', 'Univerzální karta stavu entity a akcí.'],
  ['Measurement and status display.', 'Zobrazení měření a stavu.'],
  ['Room overview with climate and grouped lights.', 'Přehled místnosti s klimatem a skupinami světel.'],
  ['Direct on/off control for Home Assistant switches.', 'Přímé zapnutí a vypnutí spínačů Home Assistantu.'],
  ['Press a button, run a script or activate a scene.', 'Stisknutí tlačítka, spuštění skriptu nebo aktivace scény.'],
  ['Light control with brightness.', 'Ovládání světla včetně jasu.'],
  ['Current and target temperature control.', 'Ovládání aktuální a cílové teploty.'],
  ['Fan power and percentage speed control.', 'Ovládání ventilátoru a jeho výkonu v procentech.'],
  ['Door, window, motion, smoke, moisture and safety state card.', 'Karta stavu dveří, oken, pohybu, kouře, vlhkosti a bezpečnostních senzorů.'],
  ['Blind, shutter, garage or gate control.', 'Ovládání žaluzie, rolety, garáže nebo brány.'],
  ['Lock and unlock control with state feedback.', 'Ovládání zamknutí a odemknutí se zpětnou vazbou.'],
  ['Live camera preview with status overlay.', 'Živý náhled kamery se stavovou vrstvou.'],
  ['Playback and volume controls.', 'Ovládání přehrávání a hlasitosti.'],
  ['Power, energy and price overview.', 'Přehled výkonu, energie a ceny.'],
  ['Battery, range and charging overview.', 'Přehled baterie, dojezdu a nabíjení.'],
  ['Drop to place component', 'Pusť a umísti komponentu'],
  ['Drag to canvas', 'Přetáhni na plátno'],
  ['Card added.', 'Karta přidána.'],
  ['Card placed on canvas.', 'Karta umístěna na plátno.'],
  ['Card updated.', 'Karta upravena.'],
  ['Card deleted.', 'Karta smazána.'],
  ['Dashboard loaded from Home Assistant.', 'Dashboard načten z Home Assistantu.'],
  ['Dashboard published to Home Assistant.', 'Dashboard publikován do Home Assistantu.'],
  ['Dashboard imported.', 'Dashboard importován.'],
  ['New local dashboard created.', 'Vytvořen nový lokální dashboard.'],
  ['Home Assistant states refreshed.', 'Stavy Home Assistantu byly obnoveny.'],
  ['Connect Home Assistant to browse live entities.', 'Připoj Home Assistant a zobrazí se skutečné entity.'],
  ['Select a card on the canvas to edit it here.', 'Vyber kartu na plátně a uprav ji zde.'],
  ['Select a card on the canvas to edit its entity.', 'Vyber kartu na plátně a zde změň její entitu.'],
  ['The token is kept only in memory and is never stored by FRAKON Studio.', 'Token zůstává pouze v paměti otevřené stránky a FRAKON Studio ho nikdy neukládá.'],
  ['The token is kept only in memory and is never stored by FRAKON Studio.', 'Token zůstává pouze v paměti otevřené stránky a FRAKON Studio ho nikdy neukládá.'],
];

const enToCs = new Map<string, string>(EN_CS);
const csToEn = new Map<string, string>(EN_CS.map(([en, cs]) => [cs, en] as const));
const observedRoots = new WeakSet<Node>();
const observers: MutationObserver[] = [];
let locale: StudioLocale = 'en';
let scheduled = false;
let languageControl: HTMLElement | undefined;

function storedLocale(): StudioLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'cs') return saved;
  } catch {
    // Keep browser-language fallback when storage is unavailable.
  }
  return navigator.language.toLocaleLowerCase().startsWith('cs') ? 'cs' : 'en';
}

function preserveWhitespace(source: string, replacement: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${replacement}${trailing}`;
}

function translateDynamic(value: string, target: StudioLocale): string | undefined {
  const selectedEn = value.match(/^(\d+) selected$/);
  const selectedCs = value.match(/^Vybráno:\s*(\d+)$/);
  if (target === 'cs' && selectedEn) return `Vybráno: ${selectedEn[1]}`;
  if (target === 'en' && selectedCs) return `${selectedCs[1]} selected`;

  const columnsEn = value.match(/^(\d+) columns$/);
  const columnsCs = value.match(/^(\d+) sloupců$/);
  if (target === 'cs' && columnsEn) return `${columnsEn[1]} sloupců`;
  if (target === 'en' && columnsCs) return `${columnsCs[1]} columns`;

  const cardsEn = value.match(/^(\d+) cards$/);
  const cardsCs = value.match(/^(\d+) karet$/);
  if (target === 'cs' && cardsEn) return `${cardsEn[1]} karet`;
  if (target === 'en' && cardsCs) return `${cardsCs[1]} cards`;

  const entitiesEn = value.match(/^(\d+) entities$/);
  const entitiesCs = value.match(/^(\d+) entit$/);
  if (target === 'cs' && entitiesEn) return `${entitiesEn[1]} entit`;
  if (target === 'en' && entitiesCs) return `${entitiesCs[1]} entities`;

  return undefined;
}

function translateValue(source: string, target: StudioLocale): string {
  const trimmed = source.trim();
  if (!trimmed) return source;
  const direct = target === 'cs' ? enToCs.get(trimmed) : csToEn.get(trimmed);
  const dynamic = translateDynamic(trimmed, target);
  const translated = direct ?? dynamic;
  return translated === undefined ? source : preserveWhitespace(source, translated);
}

function translateAttributes(element: Element): void {
  for (const name of ['title', 'aria-label', 'placeholder']) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const translated = translateValue(value, locale);
    if (translated !== value) element.setAttribute(name, translated);
  }
}

function translateTree(root: ParentNode): void {
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !['STYLE', 'SCRIPT', 'TEXTAREA'].includes(parent.tagName)) {
        const value = node.nodeValue ?? '';
        const translated = translateValue(value, locale);
        if (translated !== value) node.nodeValue = translated;
      }
      return;
    }
    if (node instanceof Element) {
      translateAttributes(node);
      if (node.shadowRoot) observeRoot(node.shadowRoot);
    }
    for (const child of node.childNodes) visit(child);
  };
  for (const child of root.childNodes) visit(child);
}

function installReadabilityFixes(root: ShadowRoot): void {
  const hostName = root.host.localName;
  if (hostName === 'frakon-studio-canvas' && !root.querySelector('style[data-frakon-readability]')) {
    const style = document.createElement('style');
    style.dataset.frakonReadability = 'true';
    style.textContent = `
      .placeholder { display:none !important; }
      .toolbar { max-width:calc(100% - 28px); flex-wrap:wrap; }
    `;
    root.append(style);
  }
  if (hostName === 'frakon-dashboard-studio' && !root.querySelector('style[data-frakon-readability]')) {
    const style = document.createElement('style');
    style.dataset.frakonReadability = 'true';
    style.textContent = `
      .empty {
        width:min(420px,calc(100% - 180px)) !important;
        min-height:150px !important;
        padding:26px !important;
        color:#eef4ff !important;
        background:linear-gradient(145deg,rgba(23,31,45,.98),rgba(14,20,31,.98)) !important;
        border:1px solid rgba(125,180,255,.28) !important;
        box-shadow:0 24px 70px rgba(0,0,0,.34) !important;
      }
      .empty strong { display:block; margin-bottom:10px; font-size:22px; line-height:1.2; }
      .empty p { margin:0; max-width:34rem; line-height:1.55; opacity:.72; }
    `;
    root.append(style);
  }
}

function observeRoot(root: Document | ShadowRoot): void {
  if (observedRoots.has(root)) return;
  observedRoots.add(root);
  if (root instanceof ShadowRoot) installReadabilityFixes(root);
  translateTree(root);
  const observer = new MutationObserver(() => scheduleApply());
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'placeholder'],
  });
  observers.push(observer);
}

function nativeLanguageSelect(): HTMLSelectElement | undefined {
  const app = document.querySelector('frakon-studio-app-v2');
  const root = app?.shadowRoot;
  return root?.querySelector<HTMLSelectElement>('select[aria-label="Language"], select[aria-label="Jazyk"]') ?? undefined;
}

function syncNativeLanguage(): void {
  const select = nativeLanguageSelect();
  if (!select) return;
  select.style.display = 'none';
  if (select.value === locale) return;
  select.value = locale;
  select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function ensureLanguageControl(): void {
  const app = document.querySelector('frakon-studio-app-v2');
  const root = app?.shadowRoot;
  const toolbar = root?.querySelector<HTMLElement>('.toolbar');
  if (!root || !toolbar) return;
  const native = nativeLanguageSelect();
  if (native) native.style.display = 'none';

  if (!root.querySelector('style[data-frakon-language-control]')) {
    const style = document.createElement('style');
    style.dataset.frakonLanguageControl = 'true';
    style.textContent = `
      .frakon-runtime-language {
        display:inline-flex;
        align-items:center;
        gap:8px;
        min-height:38px;
        padding:0 8px 0 11px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:11px;
        background:rgba(255,255,255,.05);
        white-space:nowrap;
        font-size:12px;
        font-weight:650;
      }
      .frakon-runtime-language span { opacity:.62; }
      .frakon-runtime-language select {
        width:auto !important;
        min-width:92px !important;
        min-height:30px !important;
        padding:0 28px 0 9px !important;
        border-radius:8px !important;
        background:#0e1723 !important;
      }
    `;
    root.append(style);
  }

  if (!languageControl || !languageControl.isConnected) {
    const label = document.createElement('label');
    label.className = 'frakon-runtime-language';
    const caption = document.createElement('span');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Studio language');
    const en = document.createElement('option');
    en.value = 'en';
    en.textContent = 'English';
    const cs = document.createElement('option');
    cs.value = 'cs';
    cs.textContent = 'Čeština';
    select.append(en, cs);
    label.append(caption, select);
    toolbar.append(label);
    languageControl = label;
    select.addEventListener('change', () => setStudioLocale(select.value === 'cs' ? 'cs' : 'en'));
  }

  const caption = languageControl.querySelector('span');
  const select = languageControl.querySelector('select');
  if (caption) caption.textContent = locale === 'cs' ? 'Jazyk' : 'Language';
  if (select instanceof HTMLSelectElement) select.value = locale;
}

function applyLocalization(): void {
  scheduled = false;
  document.documentElement.lang = locale === 'cs' ? 'cs' : 'en';
  observeRoot(document);
  translateTree(document);
  syncNativeLanguage();
  ensureLanguageControl();
}

function scheduleApply(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(applyLocalization);
}

export function setStudioLocale(next: StudioLocale): void {
  locale = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* session-only fallback */ }
  scheduleApply();
}

export function getStudioLocale(): StudioLocale {
  return locale;
}

export function installStudioLocalization(): void {
  locale = storedLocale();
  const originalAttachShadow = Element.prototype.attachShadow;
  if (!(originalAttachShadow as typeof originalAttachShadow & { __frakonPatched?: boolean }).__frakonPatched) {
    const patched: typeof Element.prototype.attachShadow = function attachShadow(init: ShadowRootInit): ShadowRoot {
      const root = originalAttachShadow.call(this, init);
      queueMicrotask(() => observeRoot(root));
      return root;
    };
    (patched as typeof patched & { __frakonPatched?: boolean }).__frakonPatched = true;
    Element.prototype.attachShadow = patched;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleApply(), { once: true });
  } else {
    scheduleApply();
  }
  window.setInterval(() => scheduleApply(), 500);
}
