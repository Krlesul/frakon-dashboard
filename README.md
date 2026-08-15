# FRAKON Dashboard

FRAKON Dashboard is a premium, multilingual and highly customizable dashboard system for Home Assistant. The UI and editor core are being built so they can later be reused by FRAKON OS instead of remaining coupled to Home Assistant.

> Status: active alpha development. Do not use this alpha as the only control surface for gates, locks, heating protection or other safety-critical devices.

## Current alpha

The current Home Assistant alpha includes:

- English source language with Czech, German, Slovak and Polish localization
- automatic Home Assistant language detection with English fallback
- stable responsive grid dashboards
- experimental native Canvas v2 with free-pixel move and resize
- multi-selection and marquee selection
- collision-safe atomic commits
- live smart alignment guidelines
- align, distribute and equal-gap actions
- layers / z-order
- layout constraints with diagnostics and overlays
- keyboard nudging
- Copy / Cut / Paste including `Ctrl/Cmd+C/X/V`
- Undo / Redo
- zoom, pan, wheel zoom and pinch-to-zoom
- per-device viewport memory
- Mobile / Tablet / Desktop / Wide breakpoint layouts
- Auto / Manual breakpoint mode
- per-breakpoint draft histories
- copy-layout and reset-layout actions
- schema-driven native card configuration
- searchable single-entity selectors
- searchable multi-entity checklists
- Dashboard / Card defaults / Selection surface styling
- responsive persistence diagnostics and Alpha Readiness status
- server build identity and frontend/backend mismatch detection
- explicit Home Assistant single-entry `service` integration contract
- revision-aware multi-device synchronization and optimistic concurrency
- isolated responsive bundle storage
- breakpoint-aware Local / Remote conflict resolution
- non-mutating server-side Dry Run validation before writes
- exact-candidate validation receipts before responsive persistence
- real-server proof that Dry Run left responsive storage unchanged
- strict normal/responsive persistence validation with no silent stored-layout normalization
- shared **2,000,000 UTF-8 JSON byte** persistence ceiling across TypeScript v1/v2, Python document validation and responsive bundles
- exact-boundary, one-byte-over and multibyte UTF-8 size-limit contract fixtures
- packaged Home Assistant brand icons with source/package/install dimension checks
- HACS-style integration ZIP packaging with bundled frontend
- self-contained Alpha Test Kit generation and verification
- simulated Home Assistant installation verification in CI

Responsive Canvas v2 **reads are enabled**. Responsive Canvas v2 **writes remain deliberately locked** until real Home Assistant round-trip, restart-recovery and multi-device conflict tests are completed.

## Included cards

The current catalog contains:

- `custom:frakon-card`
- `custom:frakon-sensor-card`
- `custom:frakon-room-card`
- `custom:frakon-switch-card`
- `custom:frakon-action-card`
- `custom:frakon-light-card`
- `custom:frakon-climate-card`
- `custom:frakon-fan-card`
- `custom:frakon-binary-sensor-card`
- `custom:frakon-cover-card`
- `custom:frakon-lock-card`
- `custom:frakon-camera-card`
- `custom:frakon-media-player-card`
- `custom:frakon-energy-card`
- `custom:frakon-vehicle-card`
- `custom:frakon-dashboard-card`
- `custom:frakon-canvas-dashboard-card`

The native-v2 inspector explicitly covers every card in the FRAKON card catalog and validates domain-specific entity requirements before committing configuration changes.

## Development

Requirements:

- Node.js 20.19 or newer
- npm
- Python 3.13 for Home Assistant integration checks

```bash
npm install
npm run lint
npm test
npm run build
python -m compileall -q custom_components/frakon_dashboard
```

Run the frontend checks together with:

```bash
npm run check
```

The production frontend bundle is generated as:

```text
dist/frakon-dashboard.js
```

The verified Home Assistant integration package is generated as:

```text
dist/frakon_dashboard.zip
```

The ZIP contains `custom_components/frakon_dashboard/` together with the exact frontend bundle built from the same source revision.

## Alpha installation in Home Assistant

Use the package from a **successful** GitHub Actions CI artifact for the exact commit being tested. A failed workflow that never started its job is not a verified artifact.

The complete procedure and test matrix are documented in:

```text
docs/home-assistant-alpha-test.md
```

If you are upgrading an older development install, read the migration and rollback notes first:

```text
docs/alpha-migration.md
```

Short version:

1. Download `frakon-dashboard-alpha-test-kit.zip` from a successful CI run.
2. Record its source commit and SHA-256 identities.
3. Extract the kit and then extract its `frakon_dashboard.zip` into the Home Assistant config directory so the installed path is `/config/custom_components/frakon_dashboard`.
4. Restart Home Assistant.
5. Add **FRAKON Dashboard** from **Settings → Devices & services → Add integration**.
6. In Lovelace storage mode the integration registers or repairs its bundled JavaScript module resource automatically.
7. Run the kit's `verify_home_assistant_install.py` against the installed Home Assistant config and require these identity/safety markers to pass:

```text
Home Assistant manifest contract: OK
Home Assistant brand assets: OK
Dashboard serialized-byte guard: OK
Dashboard document validator: OK
Responsive bundle validator: OK
Czech config flow: OK
```

The manifest contract requires the installed integration to remain a single-entry `service` integration with the expected Home Assistant dependencies and repository identity. The serialized-byte guard requires the installed backend to carry the same 2,000,000-byte persistence ceiling as the frontend guards.

Do **not** separately copy the current bundled frontend into `/config/www`. The integration serves its own versioned frontend resource from:

```text
/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1
```

In YAML resource mode, add that versioned URL manually as a JavaScript module.

The installed integration contains local Home Assistant brand assets:

```text
custom_components/frakon_dashboard/brand/icon.png
custom_components/frakon_dashboard/brand/icon@2x.png
```

The self-check verifies them as valid 256×256 and 512×512 PNGs respectively.

## Persistence contract

Stable v1 and Canvas v2 persistence boundaries are fail-closed. Accepted documents are preserved exactly instead of being silently clamped, compacted or reordered. Client and server validation share a **2,000,000 UTF-8 JSON byte** ceiling.

CI verifies:

- an otherwise-valid controlled document exactly at 2,000,000 serialized bytes is accepted
- the same document at 2,000,001 bytes is rejected
- multibyte UTF-8 text is counted by encoded bytes, not character count
- normal and responsive package/install boundaries contain the same byte-limit contract
- rejected oversized server writes do not become valid through coercion or normalization

## Native Canvas v2 persistence safety

The current responsive transport uses contract version `1` and a dedicated Home Assistant Store namespace:

```text
frakon_dashboard.responsive_dashboards
```

Current endpoints include:

```text
frakon/dashboard/load_responsive_bundle_revision
frakon/dashboard/dry_run_responsive_revision
frakon/dashboard/save_responsive_revision
frakon/dashboard/remove_responsive_revision
```

The server currently advertises responsive read support but **does not advertise responsive write support**. The writable responsive kind allowlist remains empty.

The Dry Run endpoint is admin-only and goes through the same responsive bundle, frame, constraint, quota, serialized-byte and revision-envelope validation as Save, but it contains no storage mutation call. The editor additionally reads persisted responsive data before and after Dry Run and reports whether the store remained unchanged.

Before an eventual write unlock, CI also verifies:

- responsive contract version remains the expected alpha version
- the responsive write allowlist remains empty
- Save / Remove stay admin guarded
- Dry Run stays admin-only and non-mutating
- exact-candidate server validation is required before Save
- resolved conflicts are dry-run validated before persistence
- successful Save projects the clean revision state back into the parent Canvas card
- responsive stored/conflict envelopes stay bound to the requested dashboard ID
- responsive bundle/document payloads above 2,000,000 UTF-8 JSON bytes are rejected
- persistence metadata is rejected rather than coerced

## Build identity

The release package contains build information tying backend and frontend to the same source commit. Runtime diagnostics expose version, source commit, responsive contract version and frontend SHA-256 so a stale Lovelace/browser resource can be distinguished from a backend problem.

If the Canvas diagnostics show **FRAKON build mismatch**, stop persistence testing and correct the installed/browser resource before continuing.

## First dashboard

A stable grid dashboard can be started with:

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: home
title: FRAKON Home
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

The experimental native Canvas v2 uses:

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

Set `edit_mode: false` when a layout is ready for normal viewing.

## Automatic layout

The stable editor can generate deterministic layout proposals using explainable priority metadata. It supports preview, multiple proposal strategies, apply and restore without changing the stored dashboard until the user commits a proposal.

See:

```text
docs/auto-layout.md
```

A manual priority can be set in card configuration:

```yaml
priority: 92
```

An optional semantic grouping override is also supported:

```yaml
layout_group: security
```

## Architecture

- `apps/home-assistant` — Home Assistant application boundary
- `apps/studio` — standalone FRAKON Dashboard Studio boundary
- `packages/studio-engine` — platform-neutral viewport, selection, movement, resize, guidelines and constraints
- `packages/dashboard-engine` — dashboard-engine package boundary
- `packages/design-system` — reusable FRAKON surface styling and design primitives
- `packages/widget-sdk` — widget authoring package boundary
- `packages/localization` — localization package boundary
- `packages/ha-adapter` — Home Assistant adapter boundary
- `custom_components/frakon_dashboard` — Home Assistant backend, storage, build identity and WebSocket API
- `src` — current production Home Assistant frontend/runtime during incremental migration

Home Assistant is the first FRAKON adapter, not the permanent owner of the FRAKON UI architecture.

## Validation

The repository CI is designed to run:

- Python syntax validation
- integration relative-import verification
- build-info provider verification
- Home Assistant manifest contract/release-chain verification
- Home Assistant brand PNG validation
- Home Assistant brand package/install release-chain verification
- strict v1/v2 document validation contract
- cross-language dashboard serialized-byte parity verification
- responsive bundle validation contract
- responsive write-lock and Dry Run invariants
- persistence-integrity readiness checks
- alpha release-readiness verification
- ESLint
- Vitest
- TypeScript production build
- Vite bundle generation
- HACS release ZIP generation and verification
- Alpha Test Kit generation and verification
- simulated Home Assistant installation self-check
- artifact upload

A separate Hassfest workflow validates Home Assistant integration metadata and translations.

A HACS repository validation workflow is staged at `.github/workflows/hacs.yml` with `category: integration`, but it intentionally remains **manual-only while the repository is private**. Public HACS release work is tracked separately in:

```text
docs/hacs-publication.md
```

and GitHub issue #12. Custom-repository HACS publication and optional default HACS catalog inclusion are separate gates; local FRAKON `brand/` assets are already packaged for the custom-integration path, while any later default-catalog brands requirement must be rechecked immediately before submission.

## Current alpha limitations

- Responsive Canvas v2 server writes are deliberately disabled pending real-device tests.
- Real-device testing across multiple Home Assistant browsers/devices is still required before the responsive write gate is opened.
- The repository is currently private, so it cannot yet be used through HACS; public HACS publication is a separate post-alpha gate.
- Repository topics are intentionally not finalized until the public HACS publication gate.
- The staged HACS Action is manual-only until repository visibility/topics and public-release metadata are intentionally enabled.
- The experimental Canvas should not yet be the sole production control surface for safety-critical functions.
- Automatic importance scoring does not yet provide the complete planned live contextual AI model.
