import { resolveLanguage, type SupportedLanguage } from '../i18n';

export type EditorTranslationKey =
  | 'addCard' | 'available' | 'searchCards' | 'all' | 'general' | 'lighting' | 'climate' | 'security' | 'media' | 'energy' | 'vehicle'
  | 'noMatchingCards' | 'cardConfiguration' | 'close' | 'cardType' | 'entity' | 'name' | 'icon' | 'showAdvanced' | 'hideAdvanced'
  | 'reset' | 'apply' | 'invalidConfig' | 'requiresType';

type EditorMessages = Record<EditorTranslationKey, string>;

const messages: Record<SupportedLanguage, EditorMessages> = {
  en: { addCard:'Add FRAKON card', available:'available', searchCards:'Search cards', all:'All', general:'General', lighting:'Lighting', climate:'Climate', security:'Security', media:'Media', energy:'Energy', vehicle:'Vehicle', noMatchingCards:'No matching cards.', cardConfiguration:'Card configuration', close:'Close', cardType:'Card type', entity:'Entity', name:'Name', icon:'Icon', showAdvanced:'Show advanced JSON', hideAdvanced:'Hide advanced JSON', reset:'Reset', apply:'Apply', invalidConfig:'Invalid card configuration.', requiresType:'Card configuration requires a type.' },
  cs: { addCard:'Přidat FRAKON kartu', available:'k dispozici', searchCards:'Hledat karty', all:'Vše', general:'Obecné', lighting:'Osvětlení', climate:'Klima', security:'Zabezpečení', media:'Média', energy:'Energie', vehicle:'Vozidlo', noMatchingCards:'Žádné odpovídající karty.', cardConfiguration:'Nastavení karty', close:'Zavřít', cardType:'Typ karty', entity:'Entita', name:'Název', icon:'Ikona', showAdvanced:'Zobrazit pokročilý JSON', hideAdvanced:'Skrýt pokročilý JSON', reset:'Obnovit', apply:'Použít', invalidConfig:'Neplatná konfigurace karty.', requiresType:'Konfigurace karty musí obsahovat typ.' },
  de: { addCard:'FRAKON-Karte hinzufügen', available:'verfügbar', searchCards:'Karten suchen', all:'Alle', general:'Allgemein', lighting:'Beleuchtung', climate:'Klima', security:'Sicherheit', media:'Medien', energy:'Energie', vehicle:'Fahrzeug', noMatchingCards:'Keine passenden Karten.', cardConfiguration:'Kartenkonfiguration', close:'Schließen', cardType:'Kartentyp', entity:'Entität', name:'Name', icon:'Symbol', showAdvanced:'Erweitertes JSON anzeigen', hideAdvanced:'Erweitertes JSON ausblenden', reset:'Zurücksetzen', apply:'Übernehmen', invalidConfig:'Ungültige Kartenkonfiguration.', requiresType:'Die Kartenkonfiguration benötigt einen Typ.' },
  sk: { addCard:'Pridať FRAKON kartu', available:'k dispozícii', searchCards:'Hľadať karty', all:'Všetko', general:'Všeobecné', lighting:'Osvetlenie', climate:'Klíma', security:'Zabezpečenie', media:'Médiá', energy:'Energia', vehicle:'Vozidlo', noMatchingCards:'Žiadne zodpovedajúce karty.', cardConfiguration:'Nastavenie karty', close:'Zavrieť', cardType:'Typ karty', entity:'Entita', name:'Názov', icon:'Ikona', showAdvanced:'Zobraziť pokročilý JSON', hideAdvanced:'Skryť pokročilý JSON', reset:'Obnoviť', apply:'Použiť', invalidConfig:'Neplatná konfigurácia karty.', requiresType:'Konfigurácia karty musí obsahovať typ.' },
  pl: { addCard:'Dodaj kartę FRAKON', available:'dostępnych', searchCards:'Szukaj kart', all:'Wszystkie', general:'Ogólne', lighting:'Oświetlenie', climate:'Klimat', security:'Bezpieczeństwo', media:'Media', energy:'Energia', vehicle:'Pojazd', noMatchingCards:'Brak pasujących kart.', cardConfiguration:'Konfiguracja karty', close:'Zamknij', cardType:'Typ karty', entity:'Encja', name:'Nazwa', icon:'Ikona', showAdvanced:'Pokaż zaawansowany JSON', hideAdvanced:'Ukryj zaawansowany JSON', reset:'Resetuj', apply:'Zastosuj', invalidConfig:'Nieprawidłowa konfiguracja karty.', requiresType:'Konfiguracja karty wymaga typu.' },
};

export function resolveEditorLanguage(...candidates: Array<string | undefined>): SupportedLanguage {
  return resolveLanguage(...candidates);
}

export function editorTranslate(language: SupportedLanguage, key: EditorTranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
