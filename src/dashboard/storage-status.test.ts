import { describe, expect, it } from 'vitest';
import {
  dashboardStorageStatusLabel,
  resolveDashboardStorageStatus,
} from './storage-status';

describe('dashboard storage status', () => {
  it('prefers loading and saving activity states', () => {
    expect(resolveDashboardStorageStatus({ loading:true, saving:false }, 'local-storage')).toBe('loading');
    expect(resolveDashboardStorageStatus({ loading:false, saving:true }, 'remote')).toBe('saving');
  });

  it('identifies remote and local storage', () => {
    expect(resolveDashboardStorageStatus({ loading:false, saving:false }, 'remote')).toBe('home-assistant');
    expect(resolveDashboardStorageStatus({ loading:false, saving:false }, 'local-storage')).toBe('local');
  });

  it('identifies a Home Assistant storage fallback', () => {
    expect(resolveDashboardStorageStatus(
      { loading:false, saving:false },
      'local-storage',
      'home-assistant',
    )).toBe('fallback');
  });

  it('provides localized labels', () => {
    expect(dashboardStorageStatusLabel('cs', 'saving')).toBe('Ukládám dashboard');
    expect(dashboardStorageStatusLabel('de', 'local')).toBe('In diesem Browser gespeichert');
    expect(dashboardStorageStatusLabel('pl', 'home-assistant')).toBe('Zapisano w Home Assistant');
  });
});
