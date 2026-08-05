# FRAKON Dashboard workspace architecture

Issue: #3

## Migration principle

The existing Home Assistant bundle remains built from the root `src/` tree until each module has a tested package replacement. The public artifact remains `dist/frakon-dashboard.js` throughout the migration.

## Applications

### `apps/home-assistant`

Home Assistant distribution shell, Lovelace registration, HACS packaging and Home Assistant-specific bootstrapping.

### `apps/studio`

Standalone FRAKON Dashboard Studio development surface. It must consume platform-neutral packages and must not depend directly on Home Assistant runtime objects.

## Packages

### `packages/dashboard-engine`

Dashboard document model, responsive layout, collision resolution, serialization, migrations, persistence contracts and history primitives.

### `packages/studio-engine`

Viewport transforms, zoom, pan, selection, pointer transforms, snapping, guides, layers and Studio transaction history. This package must be DOM-light and platform-neutral.

### `packages/design-system`

Design tokens, typography, spacing, elevation, themes, visual primitives and motion contracts.

### `packages/widget-sdk`

Widget metadata, lifecycle, serialization, settings and toolbar contracts for official and community widgets.

### `packages/localization`

Language resolution, translation catalogs and shared formatting rules.

### `packages/ha-adapter`

Home Assistant entities, services, WebSocket transport, Lovelace card hosting and storage integration.

## Dependency direction

```text
apps/home-assistant ─┬─> packages/ha-adapter
                     ├─> packages/dashboard-engine
                     ├─> packages/studio-engine
                     ├─> packages/design-system
                     ├─> packages/widget-sdk
                     └─> packages/localization

apps/studio ─────────┬─> packages/dashboard-engine
                     ├─> packages/studio-engine
                     ├─> packages/design-system
                     ├─> packages/widget-sdk
                     └─> packages/localization
```

Platform-neutral packages must never import from `packages/ha-adapter` or directly from Home Assistant types.

## Incremental migration order

1. Add workspace boundaries without moving runtime code.
2. Implement new Studio modules directly in `packages/studio-engine`.
3. Move pure layout and storage contracts into `packages/dashboard-engine` with compatibility re-exports.
4. Move shared localization and design tokens.
5. Isolate Home Assistant runtime code in `packages/ha-adapter` and `apps/home-assistant`.
6. Switch Vite entry to the Home Assistant app only after artifact parity tests pass.

## Compatibility requirements

- `npm run check` remains the repository-wide validation command.
- `dist/frakon-dashboard.js` remains the HACS artifact.
- Existing YAML card types and configuration fields remain compatible.
- Every move uses temporary compatibility exports to avoid a flag-day rewrite.
- Home Assistant and future FRAKON OS adapters consume the same dashboard and Studio engines.
