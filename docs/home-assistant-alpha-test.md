# Home Assistant alpha test

This checklist is for the first real installation of the current FRAKON Dashboard development build.

> Use a non-critical test dashboard first. Do not rely on this alpha as the only control surface for gates, locks, heating protection or other safety-critical devices.

## 1. Download the verified alpha package

1. Open the latest successful `CI` workflow run for the current pull request.
2. Download the `frakon-dashboard` workflow artifact.
3. Inside the artifact use the verified integration package:

```text
frakon_dashboard.zip
```

The CI pipeline builds this ZIP from the current backend plus the current Vite frontend and then verifies its contents before publishing the artifact.

The ZIP must contain at least:

```text
custom_components/
└── frakon_dashboard/
    ├── __init__.py
    ├── build_info.py
    ├── build-info.json
    ├── build_websocket.py
    ├── manifest.json
    ├── frontend.py
    ├── responsive_storage.py
    ├── responsive_websocket.py
    ├── storage.py
    ├── websocket.py
    ├── translations/
    └── frontend/
        └── frakon-dashboard.js
```

`build-info.json` contains the source commit used to create the package. The same build identity is embedded into the frontend bundle so runtime diagnostics can detect a stale browser resource or a partial upgrade.

## 2. Install the alpha package

For the first private alpha test, extract `frakon_dashboard.zip` into the Home Assistant config directory so the final path is:

```text
/config/custom_components/frakon_dashboard
```

Do **not** separately copy the JavaScript bundle into `/config/www`. The integration now ships and serves its own bundled frontend.

Restart Home Assistant and add **FRAKON Dashboard** from:

```text
Settings → Devices & services → Add integration
```

The current alpha integration exposes the frontend module at a versioned URL:

```text
/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1
```

In Lovelace storage mode the integration attempts to create or repair this JavaScript-module resource automatically. The version suffix is intentional: after an integration upgrade Home Assistant updates the resource URL so the browser/service-worker does not keep an older FRAKON bundle. In YAML resource mode the integration does not rewrite YAML; add the versioned URL manually as a module resource.

## 3. Run the install self-check

If you have terminal access to the Home Assistant config directory, run the repository self-check against the installed config:

```bash
python3 scripts/verify_home_assistant_install.py /config
```

Expected result starts with:

```text
FRAKON Dashboard install self-check: OK
```

The output must also show:

- version `0.16.0-alpha.1`,
- a non-empty source commit,
- bundled frontend byte size,
- resource URL `/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1`.

The self-check verifies the integration directory, runtime build-info provider, manifest domain/version/config flow, required `http` and `lovelace` dependencies, bundled frontend size and production custom-element registration markers.

## 4. Verify runtime build identity

Open the experimental FRAKON canvas in edit mode. The responsive diagnostics area contains a build badge loaded through:

```text
frakon/dashboard/build_info
```

A correct packaged alpha should show:

```text
FRAKON 0.16.0-alpha.1
<source commit>
contract 1
```

The badge must **not** display:

```text
FRAKON build mismatch
```

If a mismatch appears, do not continue persistence testing. It means the loaded frontend version/source commit differs from the installed backend package. First verify the Lovelace resource URL, reload Home Assistant, clear the stale browser resource if necessary, and confirm that frontend and backend report the same build.

The backend also computes SHA-256 for the packaged `frontend/frakon-dashboard.js` and exposes it in build-info diagnostics for deeper troubleshooting.

## 5. Test the stable grid dashboard first

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

Confirm:

- FRAKON Dashboard renders without a red custom-element error.
- The editor language follows `language: cs`.
- A FRAKON card can be added and assigned to a real Home Assistant entity.
- Pointer move/resize, marquee, multi-selection and locked cards work.
- Collision feedback blocks invalid commits.
- Undo and Redo restore layout changes.
- Reloading another browser/device restores server-side layout where that storage path is enabled.

## 6. Experimental native canvas v2

Add a second Manual card with a separate dashboard ID:

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

The native v2 editor currently includes:

- free-pixel move and resize,
- multi-select and marquee,
- alignment guidelines,
- constraints and live constraint diagnostics,
- align/distribute/equal-gap actions,
- layers / z-order,
- Add Card palette,
- Copy / Cut / Paste plus `Ctrl/Cmd+C/X/V`,
- Undo / Redo,
- zoom, pan, wheel zoom and pinch-to-zoom,
- per-device viewport memory,
- Mobile / Tablet / Desktop / Wide breakpoint drafts,
- Auto / Manual responsive mode,
- Copy layout from another breakpoint and Reset active layout,
- searchable single-entity selectors,
- searchable multi-entity checklists,
- schema-driven card configuration,
- Dashboard / Card defaults / Selection surface styling,
- responsive persistence diagnostics,
- Alpha Readiness status,
- Save Readiness and breakpoint-aware conflict-resolution UI,
- non-mutating server-side responsive candidate validation.

Responsive v2 server **reads are enabled**. Responsive v2 server **writes remain intentionally locked** during this alpha stage.

## 7. Responsive breakpoint test

Use these breakpoint boundaries:

- mobile: below 600 px
- tablet: 600–1023 px
- desktop: 1024–1599 px
- wide: 1600 px and above

Verify:

- each breakpoint keeps independent frame geometry,
- switching breakpoints preserves each local Undo/Redo timeline,
- shared card configuration remains synchronized,
- zoom/pan memory is independent per breakpoint/device,
- Auto follows viewport width,
- Manual keeps the selected breakpoint after resize,
- Copy layout and Reset active are single undoable draft operations.

## 8. Responsive storage isolation and transport metadata

The diagnostics panel should report the current alpha contract:

```text
contractVersion: 1
storageNamespace: frakon_dashboard.responsive_dashboards
maxItems: 2000
maxConstraints: 4000
maxSerializedBytes: 2000000
loadEndpoint: frakon/dashboard/load_responsive_bundle_revision
dryRunEndpoint: frakon/dashboard/dry_run_responsive_revision
saveEndpoint: frakon/dashboard/save_responsive_revision
removeEndpoint: frakon/dashboard/remove_responsive_revision
```

For a clean loaded draft the Alpha Readiness row should report the equivalent of:

```text
Read ready · write locked
```

After making a local responsive change, it should advance to:

```text
Dry-run ready · write locked
```

`Contract mismatch` or `Install mismatch` is a hard stop for persistence testing.

Responsive bundles use a dedicated Home Assistant Store namespace and must not overwrite legacy/single-document dashboard data.

Verify that a responsive bundle is preferred when present, single-v2 is used when responsive data is absent, and v1 remains the final compatibility fallback. A malformed responsive bundle must be reported as invalid rather than silently hidden behind fallback data.

## 9. Responsive validation and quota test

Before any write unlock, validation must reject:

- more than 2000 items across all breakpoint documents,
- more than 4000 constraints in one breakpoint,
- duplicate item IDs,
- negative or non-finite frame coordinates,
- zero/non-finite frame dimensions,
- invalid/missing constraint references,
- self-referential constraints,
- duplicate constraint IDs,
- enabled constraint dependency cycles,
- a serialized responsive bundle larger than 2,000,000 bytes,
- invalid revision envelopes including negative timestamps or self-parent revisions.

## 10. Responsive write-safety and audit test

Before responsive writes are intentionally enabled, verify all of the following:

- `responsiveCanvasV2.read = true`,
- `responsiveCanvasV2.write = false`,
- `atomicRevision = true`,
- revision sync is enabled,
- Save Readiness lists `write-disabled`,
- Save remains disabled,
- direct `save_responsive_revision` is rejected with `unsupported_responsive_write`,
- direct `remove_responsive_revision` is rejected with `unsupported_responsive_write`,
- responsive storage remains unchanged after rejected requests,
- Home Assistant logs contain only sanitized blocked-persistence audit metadata and never the dashboard/card payload.

The CI workflow separately enforces this write-lock invariant. It also checks that the dry-run handler remains admin-only and contains no storage save/remove mutation calls. Do not change the responsive writable allowlist until the real-device round-trip, restart recovery and multi-device conflict tests pass.

## 11. Server validation dry run

Create at least one local native-v2 change while `responsiveCanvasV2.write = false`.

The persistence panel should expose:

```text
Ověřit na serveru / Validate on server
```

Run it and verify:

1. The request uses `frakon/dashboard/dry_run_responsive_revision`.
2. The same contract v1, bundle, frame, constraint, quota and revision-envelope validation used by Save is applied.
3. A candidate based on the current remote revision returns `valid`.
4. The UI reports that server validation passed and explicitly states that storage was not changed.
5. The server still reports `writeEnabled: false`.
6. Reloading `load_responsive_bundle_revision` after dry run returns exactly the pre-dry-run persisted data.
7. If another client advances the remote revision first, dry run returns `conflict` and the existing breakpoint Local / Remote resolver opens.
8. Resolving that conflict while `write=false` must still stop at the write gate; dry run must never become a hidden save path.

## 12. Save/conflict UI flow

The current frontend contains the complete guarded flow:

```text
stable preview
→ exact candidate validation
→ server dry run (available while writes are locked)
→ capability/write gate
→ optimistic save
→ breakpoint conflict session
→ Local / Remote selection per breakpoint
→ child revision against the latest remote revision
```

With the alpha write lock active, the actual Save flow must stop before transport mutation. After the future controlled unlock, verify that a successful save resets all breakpoint drafts to a clean base, clears Undo/Redo history, advances the displayed revision and updates the parent canvas state without a page reload.

## 13. Browser console and runtime check

Record:

- red JavaScript errors,
- failed requests for `/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1`,
- `FRAKON build mismatch`,
- custom-element registration errors,
- Home Assistant card creation errors,
- WebSocket capability/load/dry-run/build-info errors,
- storage/revision errors.

When reporting an issue include Home Assistant version, browser/device, dashboard YAML, console error text, screenshot/recording, build badge version/source commit and exported FRAKON dashboard JSON when layout is involved.

## 14. Current expected limitations

- The repository is still private, so this is not yet a public HACS distribution flow.
- A final FRAKON brand asset is still required before public HACS publication.
- Responsive v2 writes are deliberately disabled even though the validated save/conflict/remove transport layers are implemented.
- Real-device testing across multiple Home Assistant installations/devices is still required before the responsive write gate is opened.
- The experimental canvas should not yet be the sole production control surface for safety-critical functions.
