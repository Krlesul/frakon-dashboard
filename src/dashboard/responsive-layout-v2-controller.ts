import type { FrakonBreakpoint } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { detectBreakpoint } from './responsive-layout';
import {
  deriveDashboardCanvasV2Breakpoint,
  resolveResponsiveCanvasV2Document,
  synchronizeResponsiveCanvasV2SharedState,
  type ResponsiveCanvasV2Documents,
  type ResponsiveCanvasV2Widths,
  defaultResponsiveCanvasV2Widths,
} from './responsive-layout-v2';

export interface ResponsiveCanvasV2ControllerSnapshot {
  activeBreakpoint: FrakonBreakpoint;
  activeDocument?: FrakonDashboardDocumentV2;
  documents: ResponsiveCanvasV2Documents;
}

export class ResponsiveCanvasV2Controller {
  private documents: ResponsiveCanvasV2Documents;
  private activeBreakpoint: FrakonBreakpoint;
  private readonly widths: ResponsiveCanvasV2Widths;

  constructor(
    documents: ResponsiveCanvasV2Documents,
    activeBreakpoint: FrakonBreakpoint = 'desktop',
    widths: ResponsiveCanvasV2Widths = defaultResponsiveCanvasV2Widths,
  ) {
    this.documents = structuredClone(documents);
    this.activeBreakpoint = activeBreakpoint;
    this.widths = { ...widths };
    this.ensure(activeBreakpoint);
  }

  snapshot(): ResponsiveCanvasV2ControllerSnapshot {
    return {
      activeBreakpoint: this.activeBreakpoint,
      activeDocument: this.documents[this.activeBreakpoint] ? structuredClone(this.documents[this.activeBreakpoint]) : undefined,
      documents: structuredClone(this.documents),
    };
  }

  setActiveBreakpoint(breakpoint: FrakonBreakpoint): ResponsiveCanvasV2ControllerSnapshot {
    this.ensure(breakpoint);
    this.activeBreakpoint = breakpoint;
    return this.snapshot();
  }

  setViewportWidth(width: number): ResponsiveCanvasV2ControllerSnapshot {
    return this.setActiveBreakpoint(detectBreakpoint(width));
  }

  updateActiveDocument(
    document: FrakonDashboardDocumentV2,
    options: { synchronizeSharedState?: boolean } = {},
  ): ResponsiveCanvasV2ControllerSnapshot {
    const normalized: FrakonDashboardDocumentV2 = {
      ...structuredClone(document),
      breakpoint: this.activeBreakpoint,
      layout: {
        ...structuredClone(document.layout),
        width: Math.max(1, this.widths[this.activeBreakpoint]),
      },
    };
    this.documents[this.activeBreakpoint] = normalized;
    if (options.synchronizeSharedState !== false) {
      this.documents = synchronizeResponsiveCanvasV2SharedState(this.documents, this.activeBreakpoint);
    }
    return this.snapshot();
  }

  replaceDocuments(documents: ResponsiveCanvasV2Documents): ResponsiveCanvasV2ControllerSnapshot {
    this.documents = structuredClone(documents);
    this.ensure(this.activeBreakpoint);
    return this.snapshot();
  }

  private ensure(breakpoint: FrakonBreakpoint): void {
    if (this.documents[breakpoint]) return;
    const resolved = resolveResponsiveCanvasV2Document(this.documents, breakpoint);
    if (resolved) {
      this.documents[breakpoint] = {
        ...resolved,
        breakpoint,
        layout: { ...resolved.layout, width: this.widths[breakpoint] },
      };
      return;
    }
    const fallback = Object.values(this.documents).find(Boolean);
    if (fallback) this.documents[breakpoint] = deriveDashboardCanvasV2Breakpoint(fallback, breakpoint, this.widths).document;
  }
}
