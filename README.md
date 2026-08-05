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
- versioned local persistence
- JSON import and export
- visual dashboard configuration editor
- visual per-card form editor with an advanced JSON mode

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

Until the first public release is published, build the project and copy:

```text
dist/frakon-dashboard.js
```

into:

```text
/config/www/frakon-dashboard/frakon-dashboard.js
```

Then add this resource in Home Assistant:

```text
/local/frakon-dashboard/frakon-dashboard.js
```

Resource type:

```text
JavaScript module
```

After changing the bundle, clear the browser cache or increment the resource URL temporarily:

```text
/local/frakon-dashboard/frakon-dashboard.js?v=1
```

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
7. export the dashboard as a backup JSON file.

Set `edit_mode: false` when the layout is ready for normal use.

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

The current alpha stores edited dashboard documents in the browser's `localStorage`. This means layouts are browser-profile specific until Home Assistant server-side storage is implemented.

Use Export after important changes. Import validates the document version and normalizes the layout before saving it.

## Architecture

- `src/design-system` — visual tokens and reusable UI foundations
- `src/home-assistant` — isolated Home Assistant adapter contracts
- `src/i18n` — card localization and language detection
- `src/dashboard` — layout engine, persistence, history, palette, inspectors and editor localization
- `src/layout` — shared responsive sizing contracts
- `src/cards` — Home Assistant-compatible FRAKON cards

Home Assistant is treated as the first adapter, not as the permanent owner of the FRAKON UI architecture.

## Validation

GitHub Actions validates every push and pull request with:

- ESLint
- Vitest
- TypeScript production build
- Vite bundle generation
- build artifact upload

## Known alpha limitations

- dashboard persistence is currently local to each browser profile
- drag-and-drop currently exchanges card positions rather than providing free pointer-based grid placement
- not every specialized card has its own full visual editor yet
- camera behavior depends on the entity image exposed by Home Assistant
- release packaging and public HACS installation are not finished
- real-device testing across multiple Home Assistant installations is still required

## Planned next milestones

- Home Assistant server-side dashboard storage
- free drag placement and resize handles
- broader visual editors for specialized cards
- Energy, Alarm, Graph, Weather and Floorplan cards
- screenshot and browser interaction tests
- signed alpha release and public HACS distribution
