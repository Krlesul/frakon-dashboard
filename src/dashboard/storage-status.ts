import type { SupportedLanguage } from '../i18n';
import type { DashboardStorageControllerState } from './dashboard-storage-controller';

export type DashboardStorageStatus =
  | 'loading'
  | 'saving'
  | 'local'
  | 'home-assistant'
  | 'fallback';

const labels: Record<SupportedLanguage, Record<DashboardStorageStatus, string>> = {
  en: {
    loading: 'Loading dashboard',
    saving: 'Saving dashboard',
    local: 'Saved in this browser',
    'home-assistant': 'Saved in Home Assistant',
    fallback: 'Home Assistant storage unavailable — using this browser',
  },
  cs: {
    loading: 'Načítám dashboard',
    saving: 'Ukládám dashboard',
    local: 'Uloženo v tomto prohlížeči',
    'home-assistant': 'Uloženo v Home Assistantu',
    fallback: 'Úložiště Home Assistantu není dostupné — používám tento prohlížeč',
  },
  de: {
    loading: 'Dashboard wird geladen',
    saving: 'Dashboard wird gespeichert',
    local: 'In diesem Browser gespeichert',
    'home-assistant': 'In Home Assistant gespeichert',
    fallback: 'Home-Assistant-Speicher nicht verfügbar — dieser Browser wird verwendet',
  },
  sk: {
    loading: 'Načítavam dashboard',
    saving: 'Ukladám dashboard',
    local: 'Uložené v tomto prehliadači',
    'home-assistant': 'Uložené v Home Assistante',
    fallback: 'Úložisko Home Assistantu nie je dostupné — používam tento prehliadač',
  },
  pl: {
    loading: 'Wczytywanie dashboardu',
    saving: 'Zapisywanie dashboardu',
    local: 'Zapisano w tej przeglądarce',
    'home-assistant': 'Zapisano w Home Assistant',
    fallback: 'Pamięć Home Assistant jest niedostępna — używana jest ta przeglądarka',
  },
};

export function resolveDashboardStorageStatus(
  state: DashboardStorageControllerState,
  adapterKind: string,
  requestedMode: 'local' | 'home-assistant' = 'local',
): DashboardStorageStatus {
  if (state.loading) return 'loading';
  if (state.saving) return 'saving';
  if (requestedMode === 'home-assistant' && adapterKind !== 'remote') return 'fallback';
  return adapterKind === 'remote' ? 'home-assistant' : 'local';
}

export function dashboardStorageStatusLabel(
  language: SupportedLanguage,
  status: DashboardStorageStatus,
): string {
  return labels[language][status] ?? labels.en[status];
}
