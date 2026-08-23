import type { SupportedLanguage } from '../i18n';

export type ResponsiveV2ConflictTranslationKey =
  | 'title' | 'local' | 'remote' | 'resolve' | 'concurrent-change' | 'concurrent-add-remove'
  | 'items' | 'deleted' | 'unresolved';

type Messages = Record<ResponsiveV2ConflictTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { title:'Responsive conflict',local:'Local',remote:'Remote',resolve:'Resolve conflict', 'concurrent-change':'Both devices changed this breakpoint', 'concurrent-add-remove':'One side added or removed this breakpoint while the other changed it',items:'items',deleted:'deleted',unresolved:'Choose Local or Remote for every conflict' },
  cs: { title:'Responsive konflikt',local:'Lokální',remote:'Vzdálené',resolve:'Vyřešit konflikt', 'concurrent-change':'Obě zařízení změnila tento breakpoint', 'concurrent-add-remove':'Jedna strana breakpoint přidala nebo odstranila, zatímco druhá ho změnila',items:'karet',deleted:'odstraněno',unresolved:'U každého konfliktu zvolte Lokální nebo Vzdálené' },
  de: { title:'Responsive-Konflikt',local:'Lokal',remote:'Remote',resolve:'Konflikt lösen', 'concurrent-change':'Beide Geräte haben diesen Breakpoint geändert', 'concurrent-add-remove':'Eine Seite hat den Breakpoint hinzugefügt oder entfernt, während die andere ihn geändert hat',items:'Elemente',deleted:'gelöscht',unresolved:'Für jeden Konflikt Lokal oder Remote wählen' },
  sk: { title:'Responsive konflikt',local:'Lokálne',remote:'Vzdialené',resolve:'Vyriešiť konflikt', 'concurrent-change':'Obe zariadenia zmenili tento breakpoint', 'concurrent-add-remove':'Jedna strana breakpoint pridala alebo odstránila, zatiaľ čo druhá ho zmenila',items:'kariet',deleted:'odstránené',unresolved:'Pri každom konflikte zvoľte Lokálne alebo Vzdialené' },
  pl: { title:'Konflikt responsywny',local:'Lokalne',remote:'Zdalne',resolve:'Rozwiąż konflikt', 'concurrent-change':'Oba urządzenia zmieniły ten breakpoint', 'concurrent-add-remove':'Jedna strona dodała lub usunęła breakpoint, gdy druga go zmieniła',items:'elementów',deleted:'usunięto',unresolved:'Dla każdego konfliktu wybierz Lokalne lub Zdalne' },
};

export function responsiveV2ConflictTranslate(language: SupportedLanguage, key: ResponsiveV2ConflictTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
