import type { SupportedLanguage } from '../i18n';

export type CanvasV2CardConfigTranslationKey =
  | 'showBrightness'
  | 'showColorTemperature'
  | 'showPosition'
  | 'showState'
  | 'showVolume'
  | 'compact'
  | 'temperatureStep'
  | 'precision'
  | 'unit'
  | 'aspectRatio'
  | 'temperatureEntity'
  | 'humidityEntity'
  | 'lightEntities'
  | 'rangeEntity'
  | 'chargingPowerEntity'
  | 'chargingSwitchEntity';

const messages: Record<SupportedLanguage, Record<CanvasV2CardConfigTranslationKey, string>> = {
  en: {
    showBrightness:'Show brightness', showColorTemperature:'Show color temperature', showPosition:'Show position', showState:'Show state', showVolume:'Show volume', compact:'Compact', temperatureStep:'Temperature step', precision:'Precision', unit:'Unit', aspectRatio:'Aspect ratio', temperatureEntity:'Temperature entity', humidityEntity:'Humidity entity', lightEntities:'Light entities', rangeEntity:'Range entity', chargingPowerEntity:'Charging power entity', chargingSwitchEntity:'Charging switch entity',
  },
  cs: {
    showBrightness:'Zobrazit jas', showColorTemperature:'Zobrazit teplotu barvy', showPosition:'Zobrazit polohu', showState:'Zobrazit stav', showVolume:'Zobrazit hlasitost', compact:'Kompaktní', temperatureStep:'Krok teploty', precision:'Přesnost', unit:'Jednotka', aspectRatio:'Poměr stran', temperatureEntity:'Entita teploty', humidityEntity:'Entita vlhkosti', lightEntities:'Entity světel', rangeEntity:'Entita dojezdu', chargingPowerEntity:'Entita nabíjecího výkonu', chargingSwitchEntity:'Entita spínače nabíjení',
  },
  de: {
    showBrightness:'Helligkeit anzeigen', showColorTemperature:'Farbtemperatur anzeigen', showPosition:'Position anzeigen', showState:'Status anzeigen', showVolume:'Lautstärke anzeigen', compact:'Kompakt', temperatureStep:'Temperaturschritt', precision:'Genauigkeit', unit:'Einheit', aspectRatio:'Seitenverhältnis', temperatureEntity:'Temperatur-Entität', humidityEntity:'Feuchtigkeits-Entität', lightEntities:'Licht-Entitäten', rangeEntity:'Reichweiten-Entität', chargingPowerEntity:'Ladeleistungs-Entität', chargingSwitchEntity:'Ladeschalter-Entität',
  },
  sk: {
    showBrightness:'Zobraziť jas', showColorTemperature:'Zobraziť teplotu farby', showPosition:'Zobraziť polohu', showState:'Zobraziť stav', showVolume:'Zobraziť hlasitosť', compact:'Kompaktné', temperatureStep:'Krok teploty', precision:'Presnosť', unit:'Jednotka', aspectRatio:'Pomer strán', temperatureEntity:'Entita teploty', humidityEntity:'Entita vlhkosti', lightEntities:'Entity svetiel', rangeEntity:'Entita dojazdu', chargingPowerEntity:'Entita nabíjacieho výkonu', chargingSwitchEntity:'Entita spínača nabíjania',
  },
  pl: {
    showBrightness:'Pokaż jasność', showColorTemperature:'Pokaż temperaturę barwową', showPosition:'Pokaż pozycję', showState:'Pokaż stan', showVolume:'Pokaż głośność', compact:'Kompaktowy', temperatureStep:'Krok temperatury', precision:'Precyzja', unit:'Jednostka', aspectRatio:'Proporcje obrazu', temperatureEntity:'Encja temperatury', humidityEntity:'Encja wilgotności', lightEntities:'Encje świateł', rangeEntity:'Encja zasięgu', chargingPowerEntity:'Encja mocy ładowania', chargingSwitchEntity:'Encja przełącznika ładowania',
  },
};

export function canvasV2CardConfigTranslate(language: SupportedLanguage, key: CanvasV2CardConfigTranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
