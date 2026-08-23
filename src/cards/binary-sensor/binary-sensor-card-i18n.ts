import type { SupportedLanguage } from '../../i18n';

type Pair = readonly [inactive: string, active: string];

interface BinarySensorMessages {
  unknown: string;
  unavailable: string;
  generic: Pair;
  classes: Record<string, Pair>;
}

const messages: Record<SupportedLanguage, BinarySensorMessages> = {
  en: {
    unknown: 'Unknown', unavailable: 'Unavailable', generic: ['Off', 'On'],
    classes: {
      battery:['Battery OK','Low battery'], connectivity:['Disconnected','Connected'], door:['Closed','Open'], garage_door:['Closed','Open'], gas:['Clear','Gas detected'], lock:['Locked','Unlocked'], moisture:['Dry','Wet'], motion:['Clear','Motion detected'], occupancy:['Clear','Occupied'], opening:['Closed','Open'], presence:['Away','Present'], problem:['OK','Problem'], safety:['Safe','Unsafe'], smoke:['Clear','Smoke detected'], tamper:['Clear','Tamper detected'], window:['Closed','Open'],
    },
  },
  cs: {
    unknown: 'Neznámý stav', unavailable: 'Nedostupné', generic: ['Vypnuto', 'Zapnuto'],
    classes: {
      battery:['Baterie v pořádku','Slabá baterie'], connectivity:['Odpojeno','Připojeno'], door:['Zavřeno','Otevřeno'], garage_door:['Zavřeno','Otevřeno'], gas:['Bez plynu','Detekován plyn'], lock:['Zamčeno','Odemčeno'], moisture:['Sucho','Mokro'], motion:['Klid','Detekován pohyb'], occupancy:['Volno','Obsazeno'], opening:['Zavřeno','Otevřeno'], presence:['Pryč','Přítomen'], problem:['V pořádku','Problém'], safety:['Bezpečné','Nebezpečné'], smoke:['Bez kouře','Detekován kouř'], tamper:['V pořádku','Narušení'], window:['Zavřeno','Otevřeno'],
    },
  },
  de: {
    unknown: 'Unbekannt', unavailable: 'Nicht verfügbar', generic: ['Aus', 'Ein'],
    classes: {
      battery:['Batterie OK','Batterie schwach'], connectivity:['Getrennt','Verbunden'], door:['Geschlossen','Offen'], garage_door:['Geschlossen','Offen'], gas:['Kein Gas','Gas erkannt'], lock:['Verriegelt','Entriegelt'], moisture:['Trocken','Nass'], motion:['Keine Bewegung','Bewegung erkannt'], occupancy:['Frei','Belegt'], opening:['Geschlossen','Offen'], presence:['Abwesend','Anwesend'], problem:['OK','Problem'], safety:['Sicher','Unsicher'], smoke:['Kein Rauch','Rauch erkannt'], tamper:['OK','Manipulation erkannt'], window:['Geschlossen','Offen'],
    },
  },
  sk: {
    unknown: 'Neznámy stav', unavailable: 'Nedostupné', generic: ['Vypnuté', 'Zapnuté'],
    classes: {
      battery:['Batéria v poriadku','Slabá batéria'], connectivity:['Odpojené','Pripojené'], door:['Zatvorené','Otvorené'], garage_door:['Zatvorené','Otvorené'], gas:['Bez plynu','Detegovaný plyn'], lock:['Zamknuté','Odomknuté'], moisture:['Sucho','Mokro'], motion:['Pokoj','Detegovaný pohyb'], occupancy:['Voľné','Obsadené'], opening:['Zatvorené','Otvorené'], presence:['Preč','Prítomný'], problem:['V poriadku','Problém'], safety:['Bezpečné','Nebezpečné'], smoke:['Bez dymu','Detegovaný dym'], tamper:['V poriadku','Narušenie'], window:['Zatvorené','Otvorené'],
    },
  },
  pl: {
    unknown: 'Nieznany stan', unavailable: 'Niedostępne', generic: ['Wyłączone', 'Włączone'],
    classes: {
      battery:['Bateria OK','Niski poziom baterii'], connectivity:['Rozłączono','Połączono'], door:['Zamknięte','Otwarte'], garage_door:['Zamknięte','Otwarte'], gas:['Brak gazu','Wykryto gaz'], lock:['Zablokowane','Odblokowane'], moisture:['Sucho','Mokro'], motion:['Brak ruchu','Wykryto ruch'], occupancy:['Wolne','Zajęte'], opening:['Zamknięte','Otwarte'], presence:['Nieobecny','Obecny'], problem:['OK','Problem'], safety:['Bezpiecznie','Niebezpiecznie'], smoke:['Brak dymu','Wykryto dym'], tamper:['OK','Wykryto sabotaż'], window:['Zamknięte','Otwarte'],
    },
  },
};

export function frakonBinarySensorStateLabel(
  language: SupportedLanguage,
  state: string,
  deviceClass?: string,
): string {
  const dictionary = messages[language] ?? messages.en;
  if (state === 'unavailable') return dictionary.unavailable;
  if (state !== 'on' && state !== 'off') return dictionary.unknown;
  const pair = (deviceClass && dictionary.classes[deviceClass]) || dictionary.generic;
  return pair[state === 'on' ? 1 : 0];
}
