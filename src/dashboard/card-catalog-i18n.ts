import type { SupportedLanguage } from '../i18n';

export interface FrakonCardCatalogLabel {
  name: string;
  description: string;
}

type CatalogMessages = Record<string, FrakonCardCatalogLabel>;

const en: CatalogMessages = {
  'custom:frakon-card': { name:'Entity', description:'Universal entity status and action card.' },
  'custom:frakon-sensor-card': { name:'Sensor', description:'Measurement and status display.' },
  'custom:frakon-room-card': { name:'Room', description:'Room overview with climate and grouped lights.' },
  'custom:frakon-switch-card': { name:'Switch', description:'Direct on/off control for Home Assistant switches.' },
  'custom:frakon-action-card': { name:'Action', description:'Press a button, run a script or activate a scene.' },
  'custom:frakon-light-card': { name:'Light', description:'Light control with brightness.' },
  'custom:frakon-climate-card': { name:'Climate', description:'Current and target temperature control.' },
  'custom:frakon-fan-card': { name:'Fan', description:'Fan power and percentage speed control.' },
  'custom:frakon-binary-sensor-card': { name:'Binary sensor', description:'Door, window, motion, smoke, moisture and safety state display.' },
  'custom:frakon-cover-card': { name:'Cover', description:'Blind, shutter, garage or gate control.' },
  'custom:frakon-lock-card': { name:'Lock', description:'Lock and unlock control with state feedback.' },
  'custom:frakon-camera-card': { name:'Camera', description:'Live camera preview with status overlay.' },
  'custom:frakon-media-player-card': { name:'Media player', description:'Playback and volume controls.' },
  'custom:frakon-energy-card': { name:'Energy', description:'Power, energy and price overview.' },
  'custom:frakon-vehicle-card': { name:'Vehicle', description:'Battery, range and charging overview.' },
};

const messages: Record<SupportedLanguage, CatalogMessages> = {
  en,
  cs: {
    'custom:frakon-card': { name:'Entita', description:'Univerzální karta stavu a ovládání entity.' },
    'custom:frakon-sensor-card': { name:'Senzor', description:'Zobrazení měření a stavu senzoru.' },
    'custom:frakon-room-card': { name:'Místnost', description:'Přehled místnosti s klimatem a skupinou světel.' },
    'custom:frakon-switch-card': { name:'Spínač', description:'Přímé zapnutí a vypnutí Home Assistant spínače.' },
    'custom:frakon-action-card': { name:'Akce', description:'Stisknutí tlačítka, spuštění skriptu nebo aktivace scény.' },
    'custom:frakon-light-card': { name:'Světlo', description:'Ovládání světla včetně jasu.' },
    'custom:frakon-climate-card': { name:'Klima', description:'Ovládání aktuální a cílové teploty.' },
    'custom:frakon-fan-card': { name:'Ventilátor', description:'Zapnutí ventilátoru a ovládání rychlosti v procentech.' },
    'custom:frakon-binary-sensor-card': { name:'Binární senzor', description:'Stav dveří, oken, pohybu, kouře, vlhkosti a bezpečnostních senzorů.' },
    'custom:frakon-cover-card': { name:'Roleta / brána', description:'Ovládání rolety, žaluzie, garáže nebo brány.' },
    'custom:frakon-lock-card': { name:'Zámek', description:'Zamknutí a odemknutí se zpětnou vazbou stavu.' },
    'custom:frakon-camera-card': { name:'Kamera', description:'Živý náhled kamery se stavovou vrstvou.' },
    'custom:frakon-media-player-card': { name:'Přehrávač', description:'Ovládání přehrávání a hlasitosti.' },
    'custom:frakon-energy-card': { name:'Energie', description:'Přehled výkonu, energie a ceny.' },
    'custom:frakon-vehicle-card': { name:'Vozidlo', description:'Baterie, dojezd a přehled nabíjení vozidla.' },
  },
  de: {
    'custom:frakon-card': { name:'Entität', description:'Universelle Status- und Aktionskarte für Entitäten.' },
    'custom:frakon-sensor-card': { name:'Sensor', description:'Messwert- und Statusanzeige.' },
    'custom:frakon-room-card': { name:'Raum', description:'Raumübersicht mit Klima und gruppierten Lichtern.' },
    'custom:frakon-switch-card': { name:'Schalter', description:'Direkte Ein/Aus-Steuerung für Home-Assistant-Schalter.' },
    'custom:frakon-action-card': { name:'Aktion', description:'Taste drücken, Skript ausführen oder Szene aktivieren.' },
    'custom:frakon-light-card': { name:'Licht', description:'Lichtsteuerung mit Helligkeit.' },
    'custom:frakon-climate-card': { name:'Klima', description:'Steuerung von Ist- und Zieltemperatur.' },
    'custom:frakon-fan-card': { name:'Ventilator', description:'Ventilator ein-/ausschalten und Geschwindigkeit in Prozent steuern.' },
    'custom:frakon-binary-sensor-card': { name:'Binärsensor', description:'Status für Tür, Fenster, Bewegung, Rauch, Feuchte und Sicherheit.' },
    'custom:frakon-cover-card': { name:'Abdeckung', description:'Steuerung von Rollladen, Jalousie, Garage oder Tor.' },
    'custom:frakon-lock-card': { name:'Schloss', description:'Ver- und Entriegeln mit Statusrückmeldung.' },
    'custom:frakon-camera-card': { name:'Kamera', description:'Live-Kameravorschau mit Statusanzeige.' },
    'custom:frakon-media-player-card': { name:'Mediaplayer', description:'Wiedergabe- und Lautstärkesteuerung.' },
    'custom:frakon-energy-card': { name:'Energie', description:'Übersicht über Leistung, Energie und Preis.' },
    'custom:frakon-vehicle-card': { name:'Fahrzeug', description:'Batterie-, Reichweiten- und Ladeübersicht.' },
  },
  sk: {
    'custom:frakon-card': { name:'Entita', description:'Univerzálna karta stavu a ovládania entity.' },
    'custom:frakon-sensor-card': { name:'Senzor', description:'Zobrazenie merania a stavu senzora.' },
    'custom:frakon-room-card': { name:'Miestnosť', description:'Prehľad miestnosti s klímou a skupinou svetiel.' },
    'custom:frakon-switch-card': { name:'Spínač', description:'Priame zapnutie a vypnutie Home Assistant spínača.' },
    'custom:frakon-action-card': { name:'Akcia', description:'Stlačenie tlačidla, spustenie skriptu alebo aktivácia scény.' },
    'custom:frakon-light-card': { name:'Svetlo', description:'Ovládanie svetla vrátane jasu.' },
    'custom:frakon-climate-card': { name:'Klíma', description:'Ovládanie aktuálnej a cieľovej teploty.' },
    'custom:frakon-fan-card': { name:'Ventilátor', description:'Zapnutie ventilátora a ovládanie rýchlosti v percentách.' },
    'custom:frakon-binary-sensor-card': { name:'Binárny senzor', description:'Stav dverí, okien, pohybu, dymu, vlhkosti a bezpečnostných senzorov.' },
    'custom:frakon-cover-card': { name:'Roleta / brána', description:'Ovládanie rolety, žalúzie, garáže alebo brány.' },
    'custom:frakon-lock-card': { name:'Zámok', description:'Zamknutie a odomknutie so spätnou väzbou stavu.' },
    'custom:frakon-camera-card': { name:'Kamera', description:'Živý náhľad kamery so stavovou vrstvou.' },
    'custom:frakon-media-player-card': { name:'Prehrávač', description:'Ovládanie prehrávania a hlasitosti.' },
    'custom:frakon-energy-card': { name:'Energia', description:'Prehľad výkonu, energie a ceny.' },
    'custom:frakon-vehicle-card': { name:'Vozidlo', description:'Batéria, dojazd a prehľad nabíjania vozidla.' },
  },
  pl: {
    'custom:frakon-card': { name:'Encja', description:'Uniwersalna karta stanu i sterowania encją.' },
    'custom:frakon-sensor-card': { name:'Czujnik', description:'Wyświetlanie pomiaru i stanu czujnika.' },
    'custom:frakon-room-card': { name:'Pomieszczenie', description:'Przegląd pomieszczenia z klimatem i grupą świateł.' },
    'custom:frakon-switch-card': { name:'Przełącznik', description:'Bezpośrednie włączanie i wyłączanie przełącznika Home Assistant.' },
    'custom:frakon-action-card': { name:'Akcja', description:'Naciśnięcie przycisku, uruchomienie skryptu lub aktywacja sceny.' },
    'custom:frakon-light-card': { name:'Światło', description:'Sterowanie światłem wraz z jasnością.' },
    'custom:frakon-climate-card': { name:'Klimat', description:'Sterowanie aktualną i docelową temperaturą.' },
    'custom:frakon-fan-card': { name:'Wentylator', description:'Włączanie wentylatora i sterowanie prędkością w procentach.' },
    'custom:frakon-binary-sensor-card': { name:'Czujnik binarny', description:'Stan drzwi, okien, ruchu, dymu, wilgoci i czujników bezpieczeństwa.' },
    'custom:frakon-cover-card': { name:'Roleta / brama', description:'Sterowanie roletą, żaluzją, garażem lub bramą.' },
    'custom:frakon-lock-card': { name:'Zamek', description:'Blokowanie i odblokowywanie z informacją o stanie.' },
    'custom:frakon-camera-card': { name:'Kamera', description:'Podgląd kamery na żywo z informacją o stanie.' },
    'custom:frakon-media-player-card': { name:'Odtwarzacz', description:'Sterowanie odtwarzaniem i głośnością.' },
    'custom:frakon-energy-card': { name:'Energia', description:'Przegląd mocy, energii i ceny.' },
    'custom:frakon-vehicle-card': { name:'Pojazd', description:'Bateria, zasięg i przegląd ładowania pojazdu.' },
  },
};

export function cardCatalogLabel(language: SupportedLanguage, type: string): FrakonCardCatalogLabel {
  return messages[language]?.[type] ?? en[type] ?? { name: type, description: type };
}
