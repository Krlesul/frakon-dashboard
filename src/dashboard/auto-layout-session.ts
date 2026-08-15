import {
  generateAutoLayoutProposal,
  type AutoLayoutItem,
  type AutoLayoutProposal,
  type AutoLayoutStrategy,
} from '../../packages/studio-engine/src/auto-layout';
import {
  normalizeDashboard,
  type FrakonBreakpoint,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from './layout-model';
import {
  defaultResponsiveColumns,
  documentForBreakpoint,
  type ResponsiveColumns,
} from './responsive-layout';

export interface DashboardAutoLayoutMetadata {
  priority?: number;
  semanticGroup?: string;
  preferredWidth?: number;
  preferredHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DashboardAutoLayoutPreview {
  original: FrakonDashboardDocument;
  proposal: FrakonDashboardDocument;
  strategy: AutoLayoutStrategy;
  variant: number;
  breakpoint: FrakonBreakpoint;
}

export type DashboardAutoLayoutResponsiveSet = Record<FrakonBreakpoint, DashboardAutoLayoutPreview[]>;

export type DashboardAutoLayoutMetadataResolver = (
  item: FrakonGridItem,
) => DashboardAutoLayoutMetadata;

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

function cloneDocument(document: FrakonDashboardDocument): FrakonDashboardDocument {
  return structuredClone(document);
}

function toAutoLayoutItem(
  item: FrakonGridItem,
  metadata: DashboardAutoLayoutMetadata,
): AutoLayoutItem {
  return {
    id: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    locked: item.locked || item.hidden,
    priority: metadata.priority,
    semanticGroup: metadata.semanticGroup,
    preferredWidth: metadata.preferredWidth,
    preferredHeight: metadata.preferredHeight,
    minWidth: metadata.minWidth ?? item.minW,
    minHeight: metadata.minHeight ?? item.minH,
    maxWidth: metadata.maxWidth ?? item.maxW,
    maxHeight: metadata.maxHeight ?? item.maxH,
  };
}

function applyProposal(
  document: FrakonDashboardDocument,
  proposal: AutoLayoutProposal,
): FrakonDashboardDocument {
  const positions = new Map(proposal.items.map((item) => [item.id, item]));
  // The auto-layout engine has already produced a bounded, collision-free
  // proposal. Re-running the generic compactor here would change the proposed
  // geometry and could move hidden cards that are intentionally fixed.
  return normalizeDashboard({
    ...document,
    items: document.items.map((item) => {
      const next = positions.get(item.id);
      if (!next) return item;
      return {
        ...item,
        x: next.x,
        y: next.y,
        w: next.w,
        h: next.h,
      };
    }),
  });
}

function proposalSignature(document: FrakonDashboardDocument): string {
  return document.items
    .map((item) => `${item.id}:${item.x},${item.y},${item.w},${item.h}`)
    .join('|');
}

export class DashboardAutoLayoutSession {
  private readonly original: FrakonDashboardDocument;
  private variant = -1;

  constructor(
    document: FrakonDashboardDocument,
    private readonly resolveMetadata: DashboardAutoLayoutMetadataResolver = () => ({}),
  ) {
    this.original = cloneDocument(document);
  }

  get originalDocument(): FrakonDashboardDocument {
    return cloneDocument(this.original);
  }

  next(): DashboardAutoLayoutPreview {
    this.variant += 1;
    return this.preview(this.variant);
  }

  preview(variant: number): DashboardAutoLayoutPreview {
    this.variant = Math.max(0, Math.floor(variant));
    return this.previewDocument(this.original, this.variant);
  }

  previewBreakpoint(
    breakpoint: FrakonBreakpoint,
    variant: number,
    columns: ResponsiveColumns = defaultResponsiveColumns,
  ): DashboardAutoLayoutPreview {
    const projected = documentForBreakpoint(this.original, breakpoint, columns);
    return this.previewDocument(projected, Math.max(0, Math.floor(variant)));
  }

  responsiveProposalSet(
    count = 3,
    columns: ResponsiveColumns = defaultResponsiveColumns,
  ): DashboardAutoLayoutResponsiveSet {
    const targetCount = Math.max(1, Math.floor(count));
    const result = {} as DashboardAutoLayoutResponsiveSet;

    for (const breakpoint of BREAKPOINTS) {
      const previews: DashboardAutoLayoutPreview[] = [];
      const signatures = new Set<string>();
      // Four strategies plus rotations provide plenty of deterministic candidates.
      // Stop after a bounded search so degenerate dashboards (for example one
      // locked card) cannot make proposal generation loop forever.
      for (let variant = 0; variant < 32 && previews.length < targetCount; variant += 1) {
        const preview = this.previewBreakpoint(breakpoint, variant, columns);
        const signature = proposalSignature(preview.proposal);
        if (signatures.has(signature)) continue;
        signatures.add(signature);
        previews.push(preview);
      }
      result[breakpoint] = previews;
    }

    return result;
  }

  private previewDocument(document: FrakonDashboardDocument, variant: number): DashboardAutoLayoutPreview {
    const proposal = generateAutoLayoutProposal(
      document.items.map((item) => toAutoLayoutItem(item, this.resolveMetadata(item))),
      { columns: document.columns, variant },
    );
    return {
      original: cloneDocument(document),
      proposal: applyProposal(document, proposal),
      strategy: proposal.strategy,
      variant: proposal.variant,
      breakpoint: document.breakpoint,
    };
  }

  revert(): FrakonDashboardDocument {
    return cloneDocument(this.original);
  }

  apply(preview: DashboardAutoLayoutPreview): FrakonDashboardDocument {
    return cloneDocument(preview.proposal);
  }
}
