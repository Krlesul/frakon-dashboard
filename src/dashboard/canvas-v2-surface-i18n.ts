import type { SupportedLanguage } from '../i18n';

export type CanvasV2SurfaceTranslationKey =
  | 'surface' | 'selected' | 'cardDefaults' | 'selection' | 'fill' | 'border' | 'radius' | 'padding'
  | 'background' | 'opacity' | 'blur' | 'borderWidth' | 'borderColor' | 'gradient' | 'imageUrl' | 'shadow'
  | 'inheritDefaults' | 'resetDefaults' | 'theme' | 'transparent' | 'solid' | 'glass' | 'image' | 'none';

const EN: Record<CanvasV2SurfaceTranslationKey, string> = {
  surface:'Surface', selected:'selected', cardDefaults:'Card defaults', selection:'Selection', fill:'Fill', border:'Border', radius:'Radius', padding:'Padding', background:'Background', opacity:'Opacity', blur:'Blur', borderWidth:'Border width', borderColor:'Border color', gradient:'Gradient', imageUrl:'Image URL', shadow:'Shadow', inheritDefaults:'Inherit defaults', resetDefaults:'Reset defaults', theme:'Theme', transparent:'Transparent', solid:'Solid', glass:'Glass', image:'Image', none:'None',
};

const CS: Record<CanvasV2SurfaceTranslationKey, string> = {
  surface:'Povrch', selected:'vybráno', cardDefaults:'Výchozí vzhled karet', selection:'Výběr', fill:'Výplň', border:'Okraj', radius:'Zaoblení', padding:'Odsazení', background:'Pozadí', opacity:'Průhlednost', blur:'Rozmazání', borderWidth:'Šířka okraje', borderColor:'Barva okraje', gradient:'Přechod', imageUrl:'URL obrázku', shadow:'Stín', inheritDefaults:'Dědit výchozí', resetDefaults:'Obnovit výchozí', theme:'Motiv', transparent:'Průhledný', solid:'Plný', glass:'Sklo', image:'Obrázek', none:'Žádný',
};

const DE: Record<CanvasV2SurfaceTranslationKey, string> = {
  surface:'Oberfläche', selected:'ausgewählt', cardDefaults:'Karten-Standard', selection:'Auswahl', fill:'Füllung', border:'Rand', radius:'Radius', padding:'Innenabstand', background:'Hintergrund', opacity:'Deckkraft', blur:'Unschärfe', borderWidth:'Randbreite', borderColor:'Randfarbe', gradient:'Verlauf', imageUrl:'Bild-URL', shadow:'Schatten', inheritDefaults:'Standard übernehmen', resetDefaults:'Standard zurücksetzen', theme:'Theme', transparent:'Transparent', solid:'Voll', glass:'Glas', image:'Bild', none:'Keiner',
};

const SK: Record<CanvasV2SurfaceTranslationKey, string> = {
  surface:'Povrch', selected:'vybrané', cardDefaults:'Predvolený vzhľad kariet', selection:'Výber', fill:'Výplň', border:'Okraj', radius:'Zaoblenie', padding:'Odsadenie', background:'Pozadie', opacity:'Priehľadnosť', blur:'Rozmazanie', borderWidth:'Šírka okraja', borderColor:'Farba okraja', gradient:'Prechod', imageUrl:'URL obrázka', shadow:'Tieň', inheritDefaults:'Dediť predvolené', resetDefaults:'Obnoviť predvolené', theme:'Téma', transparent:'Priehľadný', solid:'Plný', glass:'Sklo', image:'Obrázok', none:'Žiadny',
};

const PL: Record<CanvasV2SurfaceTranslationKey, string> = {
  surface:'Powierzchnia', selected:'wybrano', cardDefaults:'Domyślny wygląd kart', selection:'Zaznaczenie', fill:'Wypełnienie', border:'Obramowanie', radius:'Zaokrąglenie', padding:'Odstęp', background:'Tło', opacity:'Krycie', blur:'Rozmycie', borderWidth:'Szerokość obramowania', borderColor:'Kolor obramowania', gradient:'Gradient', imageUrl:'URL obrazu', shadow:'Cień', inheritDefaults:'Dziedzicz domyślne', resetDefaults:'Przywróć domyślne', theme:'Motyw', transparent:'Przezroczysty', solid:'Pełny', glass:'Szkło', image:'Obraz', none:'Brak',
};

const DICTIONARIES: Record<SupportedLanguage, Record<CanvasV2SurfaceTranslationKey, string>> = { en:EN, cs:CS, de:DE, sk:SK, pl:PL };

export function canvasV2SurfaceTranslate(language: SupportedLanguage, key: CanvasV2SurfaceTranslationKey): string {
  return DICTIONARIES[language]?.[key] ?? EN[key];
}
