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

## 2. Copy the bundle into Home Assistant

Create this directory if it does not exist:

```text
/config/www/frakon-dashboard/
```

Copy the downloaded bundle to:

```text
/config/www/frakon-dashboard/frakon-dashboard.js
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

## 4. Create the first test card

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
storage: local
responsive_columns:
  mobile: 4
  tablet: 8
  desktop: 12
  wide: 16
items: []
```

The `entity` field is currently required by the Home Assistant card contract but is not used as the dashboard's only data source.

## 5. Functional smoke test

Confirm the following in this order:

- FRAKON Dashboard renders without a red custom-element error.
- The editor language follows `language: cs`.
- `Přidat FRAKON kartu` opens the card palette.
- A Light or Sensor card can be added and assigned to a real entity.
- The card can be resized, moved, locked and removed.
- Undo and Redo restore layout changes.
- Export downloads a dashboard JSON file.
- Import restores the exported file.
- Reloading the browser restores the local layout.
- `Automaticky uspořádat` opens preview mode.
- `Další návrh` produces a different deterministic layout.
- `Použít návrh` saves the proposal and adds it to Undo history.
- `Vrátit původní` exits preview without changing the stored dashboard.

## 6. Responsive test

Test the same dashboard at these approximate viewport widths:

- mobile: below 600 px
- tablet: 600–1023 px
- desktop: 1024–1439 px
- wide: 1440 px and above

Check that cards stay within the configured column count and no card overlaps another card.

## 7. Browser console check

Open the browser developer console and record:

- red JavaScript errors,
- failed requests for `frakon-dashboard.js`,
- custom element registration errors,
- Home Assistant card creation errors,
- storage errors.

When reporting a problem, include:

- Home Assistant version,
- browser and device,
- exact resource URL including the cache suffix,
- dashboard YAML,
- console error text,
- screenshot or screen recording,
- exported FRAKON dashboard JSON when the issue concerns layout.

## 8. Current expected limitations

- `storage: local` is specific to the current browser profile.
- `storage: home-assistant` requires FRAKON WebSocket backend handlers that are not yet shipped by this frontend repository.
- The current grid editor is not yet the final free-canvas Dashboard Studio.
- Automatic importance scoring is currently based on card type and optional manual `priority` metadata; live contextual AI scoring will be added later.
- Public HACS release installation is not ready yet; this test uses the verified CI artifact.
