# Home Assistant alpha test

This checklist is for the first real installation of the current FRAKON Dashboard development build.

> Use a non-critical test dashboard first. Do not rely on this alpha as the only control surface for gates, locks, heating protection or other safety-critical devices.

## 1. Download the verified bundle

1. Open the latest successful `CI` workflow run for the current pull request.
2. Download the `frakon-dashboard` artifact.
3. Extract `frakon-dashboard.js`.

The expected file name is exactly:

```text
frakon-dashboard.js
```

## 2. Copy the frontend and backend into Home Assistant

Create this directory if it does not exist:

```text
/config/www/frakon-dashboard/
```

Copy the downloaded bundle to:

```text
/config/www/frakon-dashboard/frakon-dashboard.js
```

For server-side persistence also copy:

```text
custom_components/frakon_dashboard
```

to:

```text
/config/custom_components/frakon_dashboard
```

Restart Home Assistant and add **FRAKON Dashboard** from:

```text
Settings → Devices & services → Add integration
```

## 3. Register the Lovelace resource

In Home Assistant open:

```text
Settings → Dashboards → Resources
```

Add:

```text
/local/frakon-dashboard/frakon-dashboard.js?v=alpha-1
```

Resource type:

```text
JavaScript module
```

If the resource already exists, change the query suffix after every copied build, for example from `alpha-1` to `alpha-2`. This avoids browser and service-worker cache confusion during development.

## 4. Test the stable grid dashboard first

Add a Manual card with:

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: frakon-alpha-test
title: FRAKON Alpha Test
language: cs
columns: 12
row_height: 48
gap: 12
edit_mode: true
storage: home-assistant
responsive_columns:
  mobile: 4
  tablet: 8
  desktop: 12
  wide: 16
items: []
```

The `entity` field is currently required by the Home Assistant card contract but is not used as the dashboard's only data source.

## 5. Stable editor smoke test

Confirm the following in this order:

- FRAKON Dashboard renders without a red custom-element error.
- The editor language follows `language: cs`.
- A FRAKON card can be added and assigned to a real Home Assistant entity.
- The card can be moved and resized with pointer handles.
- Multi-selection and marquee selection work.
- Locked cards remain immovable.
- Collision feedback prevents invalid commits.
- Undo and Redo restore layout changes.
- Reloading another browser or device restores the server-side layout.
- Export and Import preserve the dashboard.
- Automatic layout preview can be generated, applied and restored.

## 6. Experimental native canvas v2

Add a second Manual card using the same backend but a separate dashboard ID:

```yaml
type: custom:frakon-canvas-dashboard-card
entity: sensor.placeholder
dashboard_id: frakon-canvas-alpha-test
title: FRAKON Canvas Alpha Test
language: cs
edit_mode: true
storage: home-assistant
items: []
```

The native v2 editor currently supports local-draft editing with:

- free pixel move and resize,
- multi-select and marquee,
- constraints and live constraint diagnostics,
- alignment guidelines,
- align/distribute/equal-gap actions,
- layers / z-order,
- duplicate and delete,
- Undo / Redo,
- zoom, pan, wheel zoom and pinch-to-zoom,
- per-device viewport memory,
- Mobile / Tablet / Desktop / Wide breakpoint drafts.

Responsive v2 server **reads** are enabled. Responsive v2 server **writes remain intentionally locked** during this alpha stage. The save-readiness model must therefore report `write-disabled` and no responsive save request should mutate Home Assistant storage.

In edit mode with `storage: home-assistant`, confirm that the **Responsive persistence diagnostics** panel is visible below the breakpoint toolbar.

## 7. Responsive breakpoint test

Use these breakpoint boundaries:

- mobile: below 600 px
- tablet: 600–1023 px
- desktop: 1024–1599 px
- wide: 1600 px and above

For native v2, verify:

- each breakpoint can keep different frame geometry,
- switching breakpoints preserves each local Undo/Redo timeline,
- shared card configuration remains synchronized,
- zoom/pan memory is independent per breakpoint and device,
- Auto mode follows viewport width,
- Manual mode keeps the explicitly selected breakpoint after resize.

## 8. Responsive storage isolation and transport metadata test

Responsive bundles use a dedicated Home Assistant Store namespace and must not overwrite legacy/single-document dashboard data.

The diagnostics panel should report these current alpha values:

```text
contractVersion: 1
storageNamespace: frakon_dashboard.responsive_dashboards
maxItems: 2000
maxConstraints: 4000
maxSerializedBytes: 2000000
loadEndpoint: frakon/dashboard/load_responsive_bundle_revision
saveEndpoint: frakon/dashboard/save_responsive_revision
removeEndpoint: frakon/dashboard/remove_responsive_revision
```

Use the same `dashboard_id` for a legacy/single-v2 test document and a responsive bundle test. Verify that:

1. `frakon/dashboard/load_revision` still returns the legacy/single-document revision.
2. `frakon/dashboard/load_responsive_bundle_revision` independently returns the responsive bundle revision or `null`.
3. Loading the experimental canvas prefers the responsive bundle when present.
4. If the responsive bundle is absent, the client falls back to single-v2 and then v1.
5. A malformed responsive bundle is reported as invalid and is not silently hidden behind fallback data.
6. The responsive storage namespace shown by diagnostics is not the legacy dashboard Store key.

## 9. Responsive validation and quota test

Before any write unlock, verify locally or with guarded test payloads that responsive validation rejects:

- more than 2000 items across all breakpoint documents,
- more than 4000 constraints in one breakpoint,
- duplicate item IDs,
- negative or non-finite frame coordinates,
- zero/non-finite frame dimensions,
- invalid or missing constraint references,
- self-referential constraints,
- duplicate constraint IDs,
- enabled constraint dependency cycles,
- a serialized responsive bundle larger than 2,000,000 bytes.

A disabled constraint may temporarily close an otherwise cyclic dependency graph; enabling it must be rejected until the cycle is removed.

## 10. Responsive write-safety and audit test

Before responsive writes are intentionally enabled, verify all of the following:

- server capabilities report `responsiveCanvasV2.read = true`,
- server capabilities report `responsiveCanvasV2.write = false`,
- `atomicRevision = true`,
- the Save Readiness model lists `write-disabled`,
- the Save control remains disabled,
- a direct `save_responsive_revision` attempt is rejected with `unsupported_responsive_write`,
- a direct `remove_responsive_revision` attempt is rejected with `unsupported_responsive_write`,
- the responsive Home Assistant Store remains unchanged after either rejected request,
- Home Assistant logs contain a sanitized blocked-persistence audit line with operation, dashboard ID, contract version and reason,
- the audit log does **not** contain the responsive bundle/card payload.

Do not enable the responsive write allowlist until real-device round-trip, restart recovery and multi-device conflict tests pass.

## 11. Browser console check

Open the browser developer console and record:

- red JavaScript errors,
- failed requests for `frakon-dashboard.js`,
- custom element registration errors,
- Home Assistant card creation errors,
- WebSocket capability/load errors,
- storage or revision errors.

When reporting a problem, include:

- Home Assistant version,
- browser and device,
- exact resource URL including the cache suffix,
- dashboard YAML,
- console error text,
- screenshot or screen recording,
- exported FRAKON dashboard JSON when the issue concerns layout.

## 12. Current expected limitations

- Public HACS release installation is not ready yet; this test still uses the verified CI artifact and manual backend copy.
- Responsive v2 writes are deliberately disabled even though the validated transport and conflict-resolution layers are already implemented.
- The experimental canvas is not yet the recommended sole production editor.
- Automatic importance scoring is currently based on card type and optional manual `priority` metadata; full live contextual AI scoring will be added later.
- Real-device testing across multiple Home Assistant installations is still required before the responsive write gate is opened.
