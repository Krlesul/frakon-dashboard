# FRAKON Dashboard

A premium, multilingual and fully customizable dashboard system for Home Assistant.

## Status

Early architecture bootstrap. The first milestone delivers a reusable design system, multilingual runtime and an initial Home Assistant card.

## Languages

English is the source language. Initial translations are available for Czech, German, Slovak and Polish.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

The production bundle is generated as:

```text
dist/frakon-dashboard.js
```

## Home Assistant resource

Add the built file as a JavaScript module resource and use:

```yaml
type: custom:frakon-card
entity: light.example
name: Living room
```

Optional configuration:

```yaml
type: custom:frakon-card
entity: switch.example
language: cs
tap_action: toggle
```

## Architecture

- `src/design-system` — visual tokens and reusable UI foundations
- `src/home-assistant` — Home Assistant adapter contracts
- `src/i18n` — localization and fallback rules
- `src/cards` — Home Assistant-compatible FRAKON cards

The UI core is intentionally kept separate from Home Assistant-specific contracts so it can later be reused by FRAKON OS.
