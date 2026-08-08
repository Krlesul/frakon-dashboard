# FRAKON free-canvas and layout v2

The production `custom:frakon-dashboard-card` remains on the stable version-1 grid document format. Free-canvas v2 is deliberately isolated so existing Home Assistant dashboards are never silently migrated.

## Experimental Home Assistant surface

The bundle registers:

```yaml
type: custom:frakon-canvas-dashboard-card
entity: sensor.placeholder
dashboard_id: canvas-experimental
title: FRAKON Canvas Experimental
edit_mode: true
storage: home-assistant
```

The experimental surface supports native pixel geometry, move/resize, multi-selection, marquee, constraints, alignment/distribution tools, layers, duplicate/delete, undo/redo, zoom, pan, pinch zoom and responsive breakpoint editing.

## Version 2 document

A single breakpoint uses explicit canvas geometry:

```json
{
  "version": 2,
  "id": "home",
  "title": "Home",
  "breakpoint": "desktop",
  "layout": {
    "mode": "canvas",
    "width": 1440,
    "minHeight": 800,
    "snap": { "enabled": true, "size": 8 }
  },
  "items": [
    {
      "id": "living-room",
      "card": { "type": "custom:frakon-room-card" },
      "frame": { "x": 40, "y": 32, "width": 380, "height": 260 }
    }
  ]
}
```

`minWidth`, `minHeight`, `maxWidth` and `maxHeight` are stored in pixels. Migration from version 1 converts grid-span limits into their actual pixel dimensions.

## Responsive bundle

Responsive layouts are treated as one atomic persistence unit instead of four unrelated dashboards:

```json
{
  "kind": "responsive-canvas-v2",
  "id": "home",
  "title": "Home",
  "defaultBreakpoint": "desktop",
  "documents": {
    "mobile": { "version": 2, "breakpoint": "mobile" },
    "tablet": { "version": 2, "breakpoint": "tablet" },
    "desktop": { "version": 2, "breakpoint": "desktop" },
    "wide": { "version": 2, "breakpoint": "wide" }
  }
}
```

Each breakpoint keeps independent frame geometry and local undo/redo history. Shared card configuration can be synchronized without replacing breakpoint-specific frames.

The responsive bundle has its own atomic revision identity. A change to only Mobile still creates a new revision of the whole responsive dashboard. Three-way merge is breakpoint-aware: independent Desktop and Mobile changes merge automatically, while concurrent edits to the same breakpoint become an explicit conflict. Conflict resolution can select Local or Remote separately per breakpoint.

## Home Assistant capability negotiation

The Home Assistant backend now advertises both single-document and responsive capabilities:

```json
{
  "readableDocumentVersions": [1, 2],
  "writableDocumentVersions": [1],
  "revisionSync": true,
  "responsiveCanvasV2": {
    "read": true,
    "write": false,
    "atomicRevision": true,
    "breakpoints": ["mobile", "tablet", "desktop", "wide"]
  }
}
```

`frakon/dashboard/load_responsive_revision` is read-only. The backend validates bundle id, breakpoint keys, v2 document shape and default breakpoint before returning a revision envelope.

There is intentionally **no server-side `save_responsive_revision` command yet**. The frontend persistence guard also blocks before transport whenever `responsiveCanvasV2.write !== true`. This provides two independent fail-closed barriers.

## Read-only recovery

The recovery path is:

```text
capabilities
→ load_responsive_revision
→ bundle validation
→ responsive revision envelope
→ ResponsiveV2DraftController.fromBundle()
→ clean per-breakpoint local timelines
```

Recovered breakpoint documents are treated as exact server bases. Missing breakpoint variants are not silently substituted for persisted ones during recovery.

## Migration and write policy

Version 1 remains the default writable format. Single-document v2 and responsive v2 are readable for alpha testing, but server writes stay disabled until the complete chain is validated in real Home Assistant installations:

```text
bundle validation
→ atomic revision
→ multi-device conflict detection
→ breakpoint selective resolution
→ recovery
→ capability-gated transport
→ real-device HA testing
```

Only after that verification will the backend expose a responsive save endpoint and advertise `responsiveCanvasV2.write = true`.
