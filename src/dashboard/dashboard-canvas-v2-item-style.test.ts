import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2ItemStyle } from './dashboard-canvas-v2-item-style';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1000, minHeight: 500, snap: { enabled: true, size: 8 } },
  cardSurface: { fill: 'glass', backgroundOpacity: 0.6, backdropBlur: 20, borderRadius: 24, padding: 8 },
  items: [
    { id: 'a', card: { type: 'custom:frakon-card', entity: 'sensor.a' }, frame: { x: 40, y: 60, width: 280, height: 180 } },
    { id: 'b', card: { type: 'custom:frakon-card', entity: 'sensor.b' }, frame: { x: 360, y: 60, width: 280, height: 180 }, surface: { fill: 'transparent', padding: 0 } },
  ],
};

describe('dashboard canvas v2 item style', () => {
  it('combines frame geometry with inherited card surface css', () => {
    const style = dashboardCanvasV2ItemStyle(document, document.items[0]);
    expect(style).toContain('left:40px');
    expect(style).toContain('top:60px');
    expect(style).toContain('width:280px');
    expect(style).toContain('height:180px');
    expect(style).toContain('border-radius:24px');
    expect(style).toContain('padding:8px');
    expect(style).toContain('backdrop-filter:blur(20px)');
  });

  it('lets an item override only selected inherited surface fields', () => {
    const style = dashboardCanvasV2ItemStyle(document, document.items[1]);
    expect(style).toContain('background:transparent');
    expect(style).toContain('border-radius:24px');
    expect(style).toContain('padding:0px');
  });
});
