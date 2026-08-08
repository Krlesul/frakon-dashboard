import type { FrakonBreakpoint } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { DashboardV2DraftController } from './dashboard-v2-draft-controller';
import {
  deriveDashboardCanvasV2Breakpoint,
  synchronizeResponsiveCanvasV2SharedState,
  type ResponsiveCanvasV2Documents,
  defaultResponsiveCanvasV2Widths,
} from './responsive-layout-v2';
import { copyResponsiveCanvasV2Layout } from './responsive-layout-v2-actions';

export interface ResponsiveV2DraftSnapshot {
  activeBreakpoint: FrakonBreakpoint;
  active: ReturnType<DashboardV2DraftController['undo']>;
  documents: ResponsiveCanvasV2Documents;
  dirtyBreakpoints: FrakonBreakpoint[];
}

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

export class ResponsiveV2DraftController {
  private readonly controllers = new Map<FrakonBreakpoint, DashboardV2DraftController>();
  private readonly baseDocuments = new Map<FrakonBreakpoint, FrakonDashboardDocumentV2>();
  private activeBreakpoint: FrakonBreakpoint;

  constructor(base: FrakonDashboardDocumentV2, activeBreakpoint: FrakonBreakpoint = base.breakpoint) {
    this.activeBreakpoint = activeBreakpoint;
    this.baseDocuments.set(base.breakpoint, structuredClone(base));
    this.controllers.set(base.breakpoint, new DashboardV2DraftController(base));
    this.ensure(activeBreakpoint);
  }

  get snapshot(): ResponsiveV2DraftSnapshot {
    const active = this.ensure(this.activeBreakpoint);
    return {
      activeBreakpoint: this.activeBreakpoint,
      active: active.snapshot,
      documents: this.documents(),
      dirtyBreakpoints: BREAKPOINTS.filter((breakpoint) => this.controllers.get(breakpoint)?.snapshot.dirty === true),
    };
  }

  switchTo(breakpoint: FrakonBreakpoint): ResponsiveV2DraftSnapshot {
    this.ensure(breakpoint);
    this.activeBreakpoint = breakpoint;
    return this.snapshot;
  }

  copyLayoutFrom(source: FrakonBreakpoint, target: FrakonBreakpoint = this.activeBreakpoint): ResponsiveV2DraftSnapshot {
    const result = copyResponsiveCanvasV2Layout(this.documents(), source, target);
    if (result.status !== 'committed') return this.snapshot;
    const next = result.documents[target];
    if (!next) return this.snapshot;
    const controller = this.ensure(target);
    controller.apply({ status: 'committed', document: next, collisionIds: [] });
    if (target === this.activeBreakpoint) this.activeBreakpoint = target;
    return this.snapshot;
  }

  applyActive(result: Parameters<DashboardV2DraftController['apply']>[0], synchronizeSharedState = true): ResponsiveV2DraftSnapshot {
    const controller = this.ensure(this.activeBreakpoint);
    const applied = controller.apply(result);
    if (result.status === 'committed' && synchronizeSharedState) {
      const synchronized = synchronizeResponsiveCanvasV2SharedState(
        { ...this.documents(), [this.activeBreakpoint]: applied.document },
        this.activeBreakpoint,
      );
      for (const breakpoint of BREAKPOINTS) {
        if (breakpoint === this.activeBreakpoint) continue;
        const next = synchronized[breakpoint];
        const existing = this.controllers.get(breakpoint);
        if (!next || !existing) continue;
        const current = existing.snapshot;
        if (JSON.stringify(current.document) !== JSON.stringify(next)) {
          existing.apply({ status: 'committed', document: next, collisionIds: [] });
        }
      }
    }
    return this.snapshot;
  }

  undo(): ResponsiveV2DraftSnapshot {
    this.ensure(this.activeBreakpoint).undo();
    return this.snapshot;
  }

  redo(): ResponsiveV2DraftSnapshot {
    this.ensure(this.activeBreakpoint).redo();
    return this.snapshot;
  }

  resetBreakpoint(breakpoint: FrakonBreakpoint): ResponsiveV2DraftSnapshot {
    const base = this.baseDocuments.get(breakpoint) ?? this.deriveBase(breakpoint);
    this.baseDocuments.set(breakpoint, structuredClone(base));
    this.controllers.set(breakpoint, new DashboardV2DraftController(base));
    return this.snapshot;
  }

  resetAll(base: FrakonDashboardDocumentV2): ResponsiveV2DraftSnapshot {
    this.controllers.clear();
    this.baseDocuments.clear();
    this.baseDocuments.set(base.breakpoint, structuredClone(base));
    this.controllers.set(base.breakpoint, new DashboardV2DraftController(base));
    this.activeBreakpoint = base.breakpoint;
    return this.snapshot;
  }

  private documents(): ResponsiveCanvasV2Documents {
    const documents: ResponsiveCanvasV2Documents = {};
    for (const breakpoint of BREAKPOINTS) {
      const controller = this.controllers.get(breakpoint);
      if (controller) documents[breakpoint] = controller.snapshot.document;
    }
    return documents;
  }

  private deriveBase(breakpoint: FrakonBreakpoint): FrakonDashboardDocumentV2 {
    const source = this.controllers.get(this.activeBreakpoint)?.snapshot.document
      ?? [...this.controllers.values()][0]?.snapshot.document;
    if (!source) throw new Error('Responsive v2 draft controller has no source document.');
    return deriveDashboardCanvasV2Breakpoint(source, breakpoint, defaultResponsiveCanvasV2Widths).document;
  }

  private ensure(breakpoint: FrakonBreakpoint): DashboardV2DraftController {
    const existing = this.controllers.get(breakpoint);
    if (existing) return existing;
    const base = this.baseDocuments.get(breakpoint) ?? this.deriveBase(breakpoint);
    this.baseDocuments.set(breakpoint, structuredClone(base));
    const controller = new DashboardV2DraftController(base);
    this.controllers.set(breakpoint, controller);
    return controller;
  }
}
