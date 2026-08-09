import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CanvasStyle } from './dashboard-canvas-v2-canvas-style';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document = {
  id:'surface-canvas', breakpoint:'desktop', version:2,
  layout:{ width:1200, minHeight:600, snap:{ enabled:true, size:20 } },
  items:[], constraints:[],
  surface:{ fill:'gradient', gradient:'linear-gradient(135deg, #10141c, #20293a)', border:'none', borderRadius:30, padding:12 },
} as unknown as FrakonDashboardDocumentV2;

describe('dashboard canvas v2 canvas style', () => {
  it('combines viewport height with dashboard surface css', () => {
    const style = dashboardCanvasV2CanvasStyle(document, 480);
    expect(style).toContain('height:480px');
    expect(style).toContain('background:linear-gradient(135deg, #10141c, #20293a)');
    expect(style).toContain('border-radius:30px');
    expect(style).toContain('padding:12px');
    expect(style).toContain('border:none');
  });

  it('preserves the minimum visible canvas height', () => {
    expect(dashboardCanvasV2CanvasStyle(document, 20)).toContain('height:120px');
  });
});
