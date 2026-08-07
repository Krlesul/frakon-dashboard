# FRAKON Dashboard

A premium, multilingual and highly customizable dashboard system for Home Assistant, designed so its UI core can later be reused in FRAKON OS.

> Status: active alpha development. Do not yet use this as the only control surface for safety-critical devices.

## Current alpha

The project currently includes:

- English source language with Czech, German, Slovak and Polish localization
- automatic Home Assistant language detection with English fallback
- responsive mobile, tablet, desktop and wide layouts
- editable collision-safe dashboard grid
- live nested FRAKON cards
- card palette with search and categories
- drag-and-drop position exchange
- width and height controls
- locked items
- undo and redo history
- asynchronous storage controller with ordered writes and error reporting
- local browser storage adapter
- Home Assistant server-side dashboard storage integration
- revision-aware multi-device synchronization with optimistic concurrency
- JSON import and export
- visual dashboard configuration editor
- visual per-card form editor with an advanced JSON mode
- intelligent automatic layout previews with priority-first, balanced, compact and focus strategies
- preview, next-proposal, apply and restore workflow for automatic layout
- explainable card priority scoring with manual overrides
- initial `apps/*` and `packages/*` monorepo boundaries for Dashboard Studio
- platform-neutral Studio viewport engine with zoom, pan, coordinate transforms, fit-to-content and persistence
- multi-selection, move, resize, smart guidelines and layout constraints in the Studio engine
- Emergency Intelligence with occurrence-aware execution, durable idempotency, execution journal, restart recovery, evidence consistency checks and verify-before-retry safety

### Included cards

- `custom:frakon-card`
- `custom:frakon-light-card`
- `custom:frakon-sensor-card`
- `custom:frakon-cover-card`
- `custom:frakon-climate-card`
- `custom:frakon-room-card`
- `custom:frakon-camera-card`
- `custom:frakon-media-player-card`
- `custom:frakon-vehicle-card`
- `custom:frakon-dashboard-card`

## Development

Requirements:

- Node.js 20.19 or newer
- npm
- Python 3.13 for validating the Home Assistant custom integration

```bash
npm install
npm run lint
npm test
npm run build
python -m compileall -q custom_components/frakon_dashboard
```

Run all checks:

```bash
npm run check
```

The production bundle is generated as:

```text
dist/frakon-dashboard.js
```

## Manual installation in Home Assistant

The current development build can be tested from a successful GitHub Actions artifact. Follow the complete checklist:

```text
docs/home-assistant-alpha-test.md
```

The short frontend installation path is:

1. Download the `frakon-dashboard` artifact from the latest successful CI run.
2. Copy `frakon-dashboard.js` to `/config/www/frakon-dashboard/frakon-dashboard.js`.
3. Register `/local/frakon-dashboard/frakon-dashboard.js?v=alpha-1` as a JavaScript module resource.
4. Add the Manual card configuration below.

For shared Home Assistant storage, also copy `custom_components/frakon_dashboard` to `/config/custom_components/frakon_dashboard`, restart Home Assistant and add **FRAKON Dashboard** from **Settings → Devices & services → Add integration**.

After changing the bundle, change the query suffix to avoid browser and service-worker cache confusion.

## First dashboard

Add a Manual card with:

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
storage: local
responsive_columns:
  mobile: 4
  tablet: 8
  desktop: 12
  wide: 16
items: []
```

In edit mode you can:

1. open the FRAKON card palette,
2. select a card template,
3. choose a real Home Assistant entity,
4. change its name, icon and advanced configuration,
5. resize, lock, remove or move the card,
6. undo and redo layout changes,
7. preview several automatic layout proposals,
8. apply a proposal or restore the original layout,
9. export the dashboard as a backup JSON file.

Set `edit_mode: false` when the layout is ready for normal use.

## Automatic layout

Automatic layout can resize and reposition unlocked cards according to their explainable priority metadata. It supports multiple deterministic proposals and preserves the original dashboard until a proposal is applied.

See:

```text
docs/auto-layout.md
```

A manual priority can be set in a card configuration:

```yaml
priority: 92
```

## Card examples

### General entity

```yaml
type: custom:frakon-card
entity: switch.example
language: cs
tap_action: toggle
```

### Light

```yaml
type: custom:frakon-light-card
entity: light.living_room
name: Living room
show_brightness: true
show_color_temperature: true
compact: false
```

### Camera

```yaml
type: custom:frakon-camera-card
entity: camera.front_door
name: Front door
aspect_ratio: 16 / 9
show_state: true
priority: 90
```

### Vehicle

```yaml
type: custom:frakon-vehicle-card
entity: sensor.vehicle_battery
name: Vehicle
range_entity: sensor.vehicle_range
charging_power_entity: sensor.charging_power
charging_switch_entity: switch.vehicle_charging
```

## Persistence and backups

The dashboard runtime talks to an asynchronous storage controller. `storage: local` stores documents in the browser's `localStorage` and remains useful as a zero-backend fallback.

`storage: home-assistant` uses the included `custom_components/frakon_dashboard` backend and Home Assistant's authenticated WebSocket API. The backend persists dashboard revision envelopes through Home Assistant's `Store` helper and supports:

```text
frakon/dashboard/load
frakon/dashboard/save
frakon/dashboard/remove
frakon/dashboard/load_revision
frakon/dashboard/save_revision
frakon/dashboard/remove_revision
```

Dashboard identifiers are sent as `dashboard_id` because Home Assistant reserves the WebSocket `id` field for numeric message correlation. Revision-aware saves use `expectedRevision`; a stale client receives a conflict instead of silently overwriting a newer dashboard.

Loading is available to authenticated Home Assistant users. Server-side mutations require an administrator account.

Use Export after important changes. Import validates the document version and normalizes the layout before saving it.

See `docs/storage.md` for the complete storage and synchronization model.

## Architecture

- `apps/home-assistant` — Home Assistant application boundary retained while the custom integration backend lives in `custom_components/frakon_dashboard`
- `apps/studio` — standalone FRAKON Dashboard Studio boundary
- `packages/studio-engine` — platform-neutral viewport, selection, movement, resize, guidelines, constraints and automatic layout engine
- `packages/dashboard-engine` — planned platform-neutral dashboard document operations
- `packages/design-system` — reusable FRAKON surface styling and design primitives
- `packages/widget-sdk` — planned widget authoring contracts
- `packages/localization` — planned shared localization package
- `packages/ha-adapter` — Home Assistant-only adapter package boundary
- `custom_components/frakon_dashboard` — Home Assistant server persistence and WebSocket backend
- `src` — current production Home Assistant runtime retained during incremental migration

Home Assistant is treated as the first adapter, not as the permanent owner of the FRAKON UI architecture.

## Validation

GitHub Actions validates every push and pull request with:

- Python syntax validation for the Home Assistant integration
- ESLint
- Vitest
- TypeScript production build
- Vite bundle generation
- build artifact upload

## Known alpha limitations

- the default persistence mode is still browser-local unless `storage: home-assistant` is selected
- Home Assistant backend packaging is currently manual; unified HACS distribution is not finished
- drag-and-drop in the production Home Assistant card still exchanges positions rather than exposing every Studio free-canvas interaction
- not every specialized card has its own full visual editor yet
- automatic importance scoring is currently based on card type and optional manual priority, not full live AI context
- camera behavior depends on the entity image exposed by Home Assistant
- real-device testing across multiple Home Assistant installations is still required

## Planned next milestones

- perform the first real Home Assistant alpha installation test with server-side persistence
- complete production free-canvas interaction parity with the Studio engine
- broader visual editors for specialized cards
- Energy, Alarm, Graph, Weather and Floorplan cards
- screenshot and browser interaction tests
- unified/signed alpha packaging and public HACS distribution
