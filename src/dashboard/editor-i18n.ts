import { resolveLanguage, type SupportedLanguage } from '../i18n';

export type EditorTranslationKey =
  | 'addCard' | 'available' | 'searchCards' | 'all' | 'general' | 'lighting' | 'climate' | 'security' | 'media' | 'energy' | 'vehicle'
  | 'noMatchingCards' | 'cardConfiguration' | 'close' | 'cardType' | 'entity' | 'name' | 'icon' | 'showAdvanced' | 'hideAdvanced'
  | 'reset' | 'apply' | 'invalidConfig' | 'requiresType' | 'editMode' | 'undo' | 'redo' | 'closePalette' | 'export' | 'import'
  | 'noItems' | 'lock' | 'unlock' | 'remove' | 'locked' | 'dashboardExported' | 'dashboardImported' | 'dashboardImportFailed'
  | 'layoutUndone' | 'layoutRestored' | 'cardAdded' | 'cardUpdated'
  | 'dashboard' | 'title' | 'dashboardId' | 'editingColumns' | 'rowHeight' | 'gap' | 'responsiveColumns' | 'mobile' | 'tablet' | 'desktop' | 'wide';

type EditorMessages = Record<EditorTranslationKey, string>;

const messages: Record<SupportedLanguage, EditorMessages> = {
  en: {
    addCard:'Add FRAKON card', available:'available', searchCards:'Search cards', all:'All', general:'General', lighting:'Lighting', climate:'Climate', security:'Security', media:'Media', energy:'Energy', vehicle:'Vehicle',
    noMatchingCards:'No matching cards.', cardConfiguration:'Card configuration', close:'Close', cardType:'Card type', entity:'Entity', name:'Name', icon:'Icon', showAdvanced:'Show advanced JSON', hideAdvanced:'Hide advanced JSON', reset:'Reset', apply:'Apply', invalidConfig:'Invalid card configuration.', requiresType:'Card configuration requires a type.',
    editMode:'Edit mode', undo:'Undo', redo:'Redo', closePalette:'Close palette', export:'Export', import:'Import', noItems:'No dashboard items yet.', lock:'Lock', unlock:'Unlock', remove:'Remove', locked:'locked', dashboardExported:'Dashboard exported.', dashboardImported:'Dashboard imported.', dashboardImportFailed:'Dashboard import failed.', layoutUndone:'Last layout change undone.', layoutRestored:'Layout change restored.', cardAdded:'Card added.', cardUpdated:'Card updated.',
    dashboard:'Dashboard', title:'Title', dashboardId:'Dashboard ID', editingColumns:'Editing columns', rowHeight:'Row height', gap:'Gap', responsiveColumns:'Responsive columns', mobile:'Mobile', tablet:'Tablet', desktop:'Desktop', wide:'Wide'
  },
  cs: {
    addCard:'Přidat FRAKON kartu', available:'k dispozici', searchCards:'Hledat karty', all:'Vše', general:'Obecné', lighting:'Osvětlení', climate:'Klima', security:'Zabezpečení', media:'Média', energy:'Energie', vehicle:'Vozidlo',
    noMatchingCards:'Žádné odpovídající karty.', cardConfiguration:'Nastavení karty', close:'Zavřít', cardType:'Typ karty', entity:'Entita', name:'Název', icon:'Ikona', showAdvanced:'Zobrazit pokročilý JSON', hideAdvanced:'Skrýt pokročilý JSON', reset:'Obnovit', apply:'Použít', invalidConfig:'Neplatná konfigurace karty.', requiresType:'Konfigurace karty musí obsahovat typ.',
    editMode:'Režim úprav', undo:'Zpět', redo:'Znovu', closePalette:'Zavřít nabídku', export:'Exportovat', import:'Importovat', noItems:'Dashboard zatím neobsahuje žádné karty.', lock:'Zamknout', unlock:'Odemknout', remove:'Odstranit', locked:'zamčeno', dashboardExported:'Dashboard byl exportován.', dashboardImported:'Dashboard byl importován.', dashboardImportFailed:'Import dashboardu se nezdařil.', layoutUndone:'Poslední změna rozložení byla vrácena.', layoutRestored:'Změna rozložení byla obnovena.', cardAdded:'Karta byla přidána.', cardUpdated:'Karta byla aktualizována.',
    dashboard:'Dashboard', title:'Název', dashboardId:'ID dashboardu', editingColumns:'Sloupce editoru', rowHeight:'Výška řádku', gap:'Mezera', responsiveColumns:'Responzivní sloupce', mobile:'Mobil', tablet:'Tablet', desktop:'Počítač', wide:'Široká obrazovka'
  },
  de: {
    addCard:'FRAKON-Karte hinzufügen', available:'verfügbar', searchCards:'Karten suchen', all:'Alle', general:'Allgemein', lighting:'Beleuchtung', climate:'Klima', security:'Sicherheit', media:'Medien', energy:'Energie', vehicle:'Fahrzeug',
    noMatchingCards:'Keine passenden Karten.', cardConfiguration:'Kartenkonfiguration', close:'Schließen', cardType:'Kartentyp', entity:'Entität', name:'Name', icon:'Symbol', showAdvanced:'Erweitertes JSON anzeigen', hideAdvanced:'Erweitertes JSON ausblenden', reset:'Zurücksetzen', apply:'Übernehmen', invalidConfig:'Ungültige Kartenkonfiguration.', requiresType:'Die Kartenkonfiguration benötigt einen Typ.',
    editMode:'Bearbeitungsmodus', undo:'Rückgängig', redo:'Wiederholen', closePalette:'Palette schließen', export:'Exportieren', import:'Importieren', noItems:'Noch keine Dashboard-Karten vorhanden.', lock:'Sperren', unlock:'Entsperren', remove:'Entfernen', locked:'gesperrt', dashboardExported:'Dashboard exportiert.', dashboardImported:'Dashboard importiert.', dashboardImportFailed:'Dashboard-Import fehlgeschlagen.', layoutUndone:'Letzte Layoutänderung rückgängig gemacht.', layoutRestored:'Layoutänderung wiederhergestellt.', cardAdded:'Karte hinzugefügt.', cardUpdated:'Karte aktualisiert.',
    dashboard:'Dashboard', title:'Titel', dashboardId:'Dashboard-ID', editingColumns:'Bearbeitungsspalten', rowHeight:'Zeilenhöhe', gap:'Abstand', responsiveColumns:'Responsive Spalten', mobile:'Mobil', tablet:'Tablet', desktop:'Desktop', wide:'Breitbild'
  },
  sk: {
    addCard:'Pridať FRAKON kartu', available:'k dispozícii', searchCards:'Hľadať karty', all:'Všetko', general:'Všeobecné', lighting:'Osvetlenie', climate:'Klíma', security:'Zabezpečenie', media:'Médiá', energy:'Energia', vehicle:'Vozidlo',
    noMatchingCards:'Žiadne zodpovedajúce karty.', cardConfiguration:'Nastavenie karty', close:'Zavrieť', cardType:'Typ karty', entity:'Entita', name:'Názov', icon:'Ikona', showAdvanced:'Zobraziť pokročilý JSON', hideAdvanced:'Skryť pokročilý JSON', reset:'Obnoviť', apply:'Použiť', invalidConfig:'Neplatná konfigurácia karty.', requiresType:'Konfigurácia karty musí obsahovať typ.',
    editMode:'Režim úprav', undo:'Späť', redo:'Znova', closePalette:'Zavrieť ponuku', export:'Exportovať', import:'Importovať', noItems:'Dashboard zatiaľ neobsahuje žiadne karty.', lock:'Zamknúť', unlock:'Odomknúť', remove:'Odstrániť', locked:'zamknuté', dashboardExported:'Dashboard bol exportovaný.', dashboardImported:'Dashboard bol importovaný.', dashboardImportFailed:'Import dashboardu zlyhal.', layoutUndone:'Posledná zmena rozloženia bola vrátená.', layoutRestored:'Zmena rozloženia bola obnovená.', cardAdded:'Karta bola pridaná.', cardUpdated:'Karta bola aktualizovaná.',
    dashboard:'Dashboard', title:'Názov', dashboardId:'ID dashboardu', editingColumns:'Stĺpce editora', rowHeight:'Výška riadku', gap:'Medzera', responsiveColumns:'Responzívne stĺpce', mobile:'Mobil', tablet:'Tablet', desktop:'Počítač', wide:'Široká obrazovka'
  },
  pl: {
    addCard:'Dodaj kartę FRAKON', available:'dostępnych', searchCards:'Szukaj kart', all:'Wszystkie', general:'Ogólne', lighting:'Oświetlenie', climate:'Klimat', security:'Bezpieczeństwo', media:'Media', energy:'Energia', vehicle:'Pojazd',
    noMatchingCards:'Brak pasujących kart.', cardConfiguration:'Konfiguracja karty', close:'Zamknij', cardType:'Typ karty', entity:'Encja', name:'Nazwa', icon:'Ikona', showAdvanced:'Pokaż zaawansowany JSON', hideAdvanced:'Ukryj zaawansowany JSON', reset:'Resetuj', apply:'Zastosuj', invalidConfig:'Nieprawidłowa konfiguracja karty.', requiresType:'Konfiguracja karty wymaga typu.',
    editMode:'Tryb edycji', undo:'Cofnij', redo:'Ponów', closePalette:'Zamknij paletę', export:'Eksportuj', import:'Importuj', noItems:'Dashboard nie zawiera jeszcze kart.', lock:'Zablokuj', unlock:'Odblokuj', remove:'Usuń', locked:'zablokowane', dashboardExported:'Dashboard wyeksportowany.', dashboardImported:'Dashboard zaimportowany.', dashboardImportFailed:'Import dashboardu nie powiódł się.', layoutUndone:'Cofnięto ostatnią zmianę układu.', layoutRestored:'Przywrócono zmianę układu.', cardAdded:'Dodano kartę.', cardUpdated:'Zaktualizowano kartę.',
    dashboard:'Dashboard', title:'Tytuł', dashboardId:'ID dashboardu', editingColumns:'Kolumny edytora', rowHeight:'Wysokość wiersza', gap:'Odstęp', responsiveColumns:'Responsywne kolumny', mobile:'Telefon', tablet:'Tablet', desktop:'Komputer', wide:'Szeroki ekran'
  },
};

export function resolveEditorLanguage(...candidates: Array<string | undefined>): SupportedLanguage {
  return resolveLanguage(...candidates);
}

export function editorTranslate(language: SupportedLanguage, key: EditorTranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
