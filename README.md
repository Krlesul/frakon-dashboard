# FRAKON Dashboard

A premium, multilingual and fully customizable dashboard system for Home Assistant, designed for later reuse in FRAKON OS.

## Alpha scope

The current alpha contains:

- reusable FRAKON design tokens
- responsive mobile, tablet, desktop and wide layout contracts
- English source language with Czech, German, Slovak and Polish runtime localization
- `custom:frakon-card` for general entities
- `custom:frakon-light-card` with toggle, brightness control and visual editor
- `custom:frakon-sensor-card` for measurements and status values
- TypeScript, Lit, Vite, Vitest, ESLint and GitHub Actions validation
- HACS-compatible metadata and a single production bundle

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

The production bundle is generated as:

```text
dist/frakon-dashboard.js
```

## Home Assistant resource

Add `frakon-dashboard.js` as a JavaScript module resource.

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

### Sensor

```yaml
type: custom:frakon-sensor-card
entity: sensor.living_room_temperature
precision: 1
unit: °C
```

## Architecture

- `src/design-system` — visual tokens and reusable UI foundations
- `src/home-assistant` — isolated Home Assistant adapter contracts
- `src/i18n` — localization, language detection and English fallback
- `src/layout` — responsive sizing contracts
- `src/cards` — Home Assistant-compatible FRAKON cards and editors

The UI core is intentionally separated from Home Assistant-specific contracts so the same components can later power the standalone FRAKON Dashboard and FRAKON OS applications.

## Roadmap

The next milestones are Room, Climate, Cover, Camera, Energy, Vehicle and Media cards, followed by the complete dashboard layout editor with drag-and-drop, resizing, breakpoints, undo/redo and import/export.
