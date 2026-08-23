import type { SupportedLanguage } from '../i18n';

export type AutoLayoutTranslationKey =
  | 'autoLayout'
  | 'autoLayoutPreview'
  | 'nextProposal'
  | 'applyProposal'
  | 'revertOriginal'
  | 'autoLayoutPreviewReady'
  | 'autoLayoutApplied'
  | 'autoLayoutReverted';

const messages: Record<SupportedLanguage, Record<AutoLayoutTranslationKey, string>> = {
  en: {
    autoLayout: 'Auto arrange',
    autoLayoutPreview: 'Automatic layout preview',
    nextProposal: 'Next proposal',
    applyProposal: 'Apply proposal',
    revertOriginal: 'Restore original',
    autoLayoutPreviewReady: 'Automatic layout proposal is ready.',
    autoLayoutApplied: 'Automatic layout was applied.',
    autoLayoutReverted: 'Original layout was restored.',
  },
  cs: {
    autoLayout: 'Automaticky uspořádat',
    autoLayoutPreview: 'Náhled automatického uspořádání',
    nextProposal: 'Další návrh',
    applyProposal: 'Použít návrh',
    revertOriginal: 'Vrátit původní',
    autoLayoutPreviewReady: 'Návrh automatického uspořádání je připraven.',
    autoLayoutApplied: 'Automatické uspořádání bylo použito.',
    autoLayoutReverted: 'Původní rozložení bylo obnoveno.',
  },
  de: {
    autoLayout: 'Automatisch anordnen',
    autoLayoutPreview: 'Vorschau der automatischen Anordnung',
    nextProposal: 'Nächster Vorschlag',
    applyProposal: 'Vorschlag übernehmen',
    revertOriginal: 'Original wiederherstellen',
    autoLayoutPreviewReady: 'Ein Vorschlag für die automatische Anordnung ist bereit.',
    autoLayoutApplied: 'Die automatische Anordnung wurde übernommen.',
    autoLayoutReverted: 'Das ursprüngliche Layout wurde wiederhergestellt.',
  },
  sk: {
    autoLayout: 'Automaticky usporiadať',
    autoLayoutPreview: 'Náhľad automatického usporiadania',
    nextProposal: 'Ďalší návrh',
    applyProposal: 'Použiť návrh',
    revertOriginal: 'Vrátiť pôvodné',
    autoLayoutPreviewReady: 'Návrh automatického usporiadania je pripravený.',
    autoLayoutApplied: 'Automatické usporiadanie bolo použité.',
    autoLayoutReverted: 'Pôvodné rozloženie bolo obnovené.',
  },
  pl: {
    autoLayout: 'Ułóż automatycznie',
    autoLayoutPreview: 'Podgląd automatycznego układu',
    nextProposal: 'Następna propozycja',
    applyProposal: 'Zastosuj propozycję',
    revertOriginal: 'Przywróć oryginał',
    autoLayoutPreviewReady: 'Propozycja automatycznego układu jest gotowa.',
    autoLayoutApplied: 'Automatyczny układ został zastosowany.',
    autoLayoutReverted: 'Przywrócono pierwotny układ.',
  },
};

export function autoLayoutTranslate(
  language: SupportedLanguage,
  key: AutoLayoutTranslationKey,
): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
