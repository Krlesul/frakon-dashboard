import type { SupportedLanguage } from '../i18n';

export type CanvasV2ResponsiveToolbarTranslationKey =
  | 'responsiveLayout' | 'auto' | 'manual' | 'copyFrom' | 'copy' | 'reset' | 'resetTitle';

type Messages = Record<CanvasV2ResponsiveToolbarTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { responsiveLayout:'Responsive layout',auto:'Auto',manual:'Manual',copyFrom:'Copy from',copy:'Copy layout',reset:'Reset active',resetTitle:'Reset the active breakpoint to its server/base layout' },
  cs: { responsiveLayout:'Responsive rozložení',auto:'Auto',manual:'Ručně',copyFrom:'Kopírovat z',copy:'Kopírovat rozložení',reset:'Reset aktivního',resetTitle:'Obnovit aktivní breakpoint na serverové/výchozí rozložení' },
  de: { responsiveLayout:'Responsives Layout',auto:'Auto',manual:'Manuell',copyFrom:'Kopieren von',copy:'Layout kopieren',reset:'Aktives zurücksetzen',resetTitle:'Aktiven Breakpoint auf Server-/Basislayout zurücksetzen' },
  sk: { responsiveLayout:'Responsive rozloženie',auto:'Auto',manual:'Ručne',copyFrom:'Kopírovať z',copy:'Kopírovať rozloženie',reset:'Reset aktívneho',resetTitle:'Obnoviť aktívny breakpoint na serverové/východiskové rozloženie' },
  pl: { responsiveLayout:'Układ responsywny',auto:'Auto',manual:'Ręcznie',copyFrom:'Kopiuj z',copy:'Kopiuj układ',reset:'Reset aktywnego',resetTitle:'Przywróć aktywny breakpoint do układu serwera/bazowego' },
};

export function canvasV2ResponsiveToolbarTranslate(
  language: SupportedLanguage,
  key: CanvasV2ResponsiveToolbarTranslationKey,
): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
