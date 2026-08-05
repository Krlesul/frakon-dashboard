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
- remote storage adapter and Home Assistant WebSocket transport foundation
- JSON import and export
- visual dashboard configuration editor
- visual per-card form editor with an advanced JSON mode
- intelligent automatic layout previews with priority-first, balanced, compact and focus strategies
- preview, next-proposal, apply and restore workflow for automatic layout
- explainable card priority scoring with manual overrides
- initial `apps/*` and `packages/*` monorepo boundaries for Dashboard Studio
- platform-neutral Studio viewport engine with zoom, pan, coordinate transforms, fit-to-content and persistence

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

```bash
npm install
npm run lint
npm test
npm run build
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

The short installation path is:

1. Download the `frakon-dashboard` artifact from the latest successful CI run.
2. Copy `frakon-dashboard.js` to `/config/www/frakon-dashboard/frakon-dashboard.js`.
3. Register `/local/frakon-dashboard/frakon-dashboard.js?v=alpha-1` as a JavaScript module resource.
4. Add the Manual card configuration below.

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

The dashboard runtime talks to an asynchronous storage controller. The default adapter stores documents in the browser's `localStorage`, so layouts remain browser-profile specific in the current alpha.

A remote adapter, Home Assistant `callWS` transport and backend factory are implemented and tested. They expect these WebSocket commands:

```text
frakon/dashboard/load
frakon/dashboard/save
frakon/dashboard/remove
```

The matching Home Assistant backend handlers are not part of this frontend repository yet. Until an integration provides them, use `storage: local`.

Use Export after important changes. Import validates the document version and normalizes the layout before saving it.

## Architecture

- `apps/home-assistant` — future Home Assistant application boundary
- `apps/studio` — future standalone Dashboard Studio boundary
- `packages/studio-engine` — platform-neutral viewport and automatic layout engine
- `packages/dashboard-engine` — planned platform-neutral dashboard document operations
- `packages/design-system` — planned reusable FRAKON design system package
- `packages/widget-sdk` — planned widget authoring contracts
- `packages/localization` — planned shared localization package
- `packages/ha-adapter` — planned Home Assistant-only adapter package
- `src` — current production Home Assistant runtime retained during incremental migration

Home Assistant is treated as the first adapter, not as the permanent owner of the FRAKON UI architecture.

## Validation

GitHub Actions validates every push and pull request with:

- ESLint
- Vitest
- TypeScript production build
- Vite bundle generation
- build artifact upload

## Known alpha limitations

- the default dashboard persistence is currently local to each browser profile
- Home Assistant remote storage requires backend WebSocket handlers that are not implemented in this frontend repository
- drag-and-drop currently exchanges card positions rather than providing final free-canvas pointer placement
- not every specialized card has its own full visual editor yet
- automatic importance scoring is currently based on card type and optional manual priority, not live AI context
- camera behavior depends on the entity image exposed by Home Assistant
- public HACS release installation is not finished; current testing uses the CI artifact
- real-device testing across multiple Home Assistant installations is still required

## Planned next milestones

- perform the first real Home Assistant alpha installation test
- free canvas, zoom and pan Studio UI
- selection engine and multi-select
- pointer resize handles and smart guidelines
- Home Assistant integration implementing server-side dashboard storage handlers
- broader visual editors for specialized cards
- Energy, Alarm, Graph, Weather and Floorplan cards
- screenshot and browser interaction tests
- signed alpha release and public HACS distribution
