import type { SupportedLanguage } from '../i18n';

export type CanvasV2CardConfigTranslationKey =
  | 'showBrightness'
  | 'showPosition'
  | 'showState'
  | 'showVolume'
  | 'temperatureStep'
  | 'aspectRatio';

const messages: Record<SupportedLanguage, Record<CanvasV2CardConfigTranslationKey, string>> = {
  en: { showBrightness:'Show brightness', showPosition:'Show position', showState:'Show state', showVolume:'Show volume', temperatureStep:'Temperature step', aspectRatio:'Aspect ratio' },
  cs: { showBrightness:'Zobrazit jas', showPosition:'Zobrazit polohu', showState:'Zobrazit stav', showVolume:'Zobrazit hlasitost', temperatureStep:'Krok teploty', aspectRatio:'Poměr stran' },
  de: { showBrightness:'Helligkeit anzeigen', showPosition:'Position anzeigen', showState:'Status anzeigen', showVolume:'Lautstärke anzeigen', temperatureStep:'Temperaturschritt', aspectRatio:'Seitenverhältnis' },
  sk: { showBrightness:'Zobraziť jas', showPosition:'Zobraziť polohu', showState:'Zobraziť stav', showVolume:'Zobraziť hlasitosť', temperatureStep:'Krok teploty', aspectRatio:'Pomer strán' },
  pl: { showBrightness:'Pokaż jasność', showPosition:'Pokaż pozycję', showState:'Pokaż stan', showVolume:'Pokaż głośność', temperatureStep:'Krok temperatury', aspectRatio:'Proporcje obrazu' },
};

export function canvasV2CardConfigTranslate(language: SupportedLanguage, key: CanvasV2CardConfigTranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
