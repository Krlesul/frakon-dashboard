# FRAKON free-canvas and layout v2

The production `custom:frakon-dashboard-card` remains on the stable version-1 grid document format. The free-canvas work is deliberately isolated so existing Home Assistant dashboards are not silently migrated.

## Experimental Home Assistant surface

The bundle now registers:

```yaml
type: custom:frakon-canvas-dashboard-card
entity: sensor.placeholder
dashboard_id: canvas-experimental
title: FRAKON Canvas Experimental
columns: 12
row_height: 48
gap: 12
edit_mode: true
storage: local
items: []
```

This experimental card projects the version-1 grid into pixel rectangles and provides free-pixel move/resize previews through `DashboardCanvasSession`.

A successful gesture is still committed back to the compatible version-1 grid. The commit performs collision checks twice:

1. in free pixel space,
2. again after projection back to grid cells.

That second check prevents two non-overlapping pixel rectangles from being rounded into the same legacy grid cells.

## Version 2 document

The proposed version-2 schema uses explicit canvas geometry:

```json
{
  "version": 2,
  "id": "home",
  "title": "Home",
  "breakpoint": "desktop",
  "layout": {
    "mode": "canvas",
    "width": 1200,
    "minHeight": 800,
    "snap": {
      "enabled": true,
      "size": 8
    }
  },
  "items": [
    {
      "id": "living-room",
      "card": { "type": "custom:frakon-room-card" },
      "frame": {
        "x": 40,
        "y": 32,
        "width": 380,
        "height": 260
      }
    }
  ]
}
```

`minWidth`, `minHeight`, `maxWidth` and `maxHeight` are stored in pixels in version 2. Migration from version 1 converts grid-span limits into their actual pixel sizes.

## Migration policy

Version 2 is not automatically writable yet.

Default capabilities are intentionally conservative:

```text
readV2 = false
writeV2 = false
migrateV1ToV2 = true
```

Requesting canvas mode for a version-1 document therefore creates a non-destructive migration preview. It does not persist the candidate.

The migration preview reports item count, locked items, constraints, estimated canvas size and responsive-layout review warnings.

Version-2 persistence will only be enabled after the Home Assistant storage adapters, revision synchronization, conflict resolver and responsive model have explicit v2 coverage.
