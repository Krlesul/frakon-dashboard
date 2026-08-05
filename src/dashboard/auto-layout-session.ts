import {
  generateAutoLayoutProposal,
  type AutoLayoutItem,
  type AutoLayoutProposal,
  type AutoLayoutStrategy,
} from '../../packages/studio-engine/src/auto-layout';
import {
  normalizeAndCompactDashboard,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from './layout-model';

export interface DashboardAutoLayoutMetadata {
  priority?: number;
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
}

export type DashboardAutoLayoutMetadataResolver = (
  item: FrakonGridItem,
) => DashboardAutoLayoutMetadata;

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
    locked: item.locked,
    priority: metadata.priority,
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
  return normalizeAndCompactDashboard({
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
    const proposal = generateAutoLayoutProposal(
      this.original.items.map((item) => toAutoLayoutItem(item, this.resolveMetadata(item))),
      { columns: this.original.columns, variant: this.variant },
    );
    return {
      original: cloneDocument(this.original),
      proposal: applyProposal(this.original, proposal),
      strategy: proposal.strategy,
      variant: proposal.variant,
    };
  }

  revert(): FrakonDashboardDocument {
    return cloneDocument(this.original);
  }

  apply(preview: DashboardAutoLayoutPreview): FrakonDashboardDocument {
    return cloneDocument(preview.proposal);
  }
}
