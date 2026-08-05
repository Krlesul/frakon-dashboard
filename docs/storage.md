# Dashboard storage

`custom:frakon-dashboard-card` supports two persistence modes.

## Browser storage

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: home
storage: local
edit_mode: true
items: []
```

`storage: local` is the default. The dashboard is stored in the current browser profile through `localStorage`. Use JSON export for backups and moving layouts between devices.

## Home Assistant storage

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: home
storage: home-assistant
edit_mode: true
items: []
```

This mode uses Home Assistant's `hass.callWS()` API and expects these server-side commands:

- `frakon/dashboard/load`
- `frakon/dashboard/save`
- `frakon/dashboard/remove`

The server-side command handler is not part of the frontend bundle yet. When `callWS` is unavailable, the card safely falls back to browser storage. When `callWS` exists but the FRAKON commands are not registered, the editor shows the backend error and keeps the current in-memory layout available for export.

The visual card editor exposes the same choice in English, Czech, German, Slovak and Polish.
