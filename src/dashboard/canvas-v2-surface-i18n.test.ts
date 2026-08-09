import { describe, expect, it } from 'vitest';
import type { SupportedLanguage } from '../i18n';
import { canvasV2SurfaceTranslate, type CanvasV2SurfaceTranslationKey } from './canvas-v2-surface-i18n';

const languages: SupportedLanguage[] = ['en','cs','de','sk','pl'];
const keys: CanvasV2SurfaceTranslationKey[] = ['surface','selected','cardDefaults','selection','fill','border','radius','padding','background','opacity','blur','borderWidth','borderColor','gradient','imageUrl','shadow','inheritDefaults','resetDefaults','theme','borderless','transparent','solid','glass','image','none'];

describe('canvas v2 surface translations', () => {
  it('provides every surface editor label for every supported language', () => {
    for (const language of languages) {
      for (const key of keys) expect(canvasV2SurfaceTranslate(language, key).trim()).not.toBe('');
    }
  });

  it('contains localized Czech editor labels', () => {
    expect(canvasV2SurfaceTranslate('cs','surface')).toBe('Povrch');
    expect(canvasV2SurfaceTranslate('cs','inheritDefaults')).toBe('Dědit výchozí');
    expect(canvasV2SurfaceTranslate('cs','borderless')).toBe('Bez okraje');
  });
});
