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

## Home Assistant server storage

The repository now includes the `custom_components/frakon_dashboard` Home Assistant integration. Install that directory into `/config/custom_components/frakon_dashboard`, restart Home Assistant, then add **FRAKON Dashboard** from **Settings → Devices & services → Add integration**.

After the integration is configured, use:

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: home
storage: home-assistant
edit_mode: true
items: []
```

This mode uses Home Assistant's authenticated `hass.callWS()` connection and these commands:

- `frakon/dashboard/load` with `dashboard_id`
- `frakon/dashboard/save` with the normalized `document`
- `frakon/dashboard/remove` with `dashboard_id`

The backend persists documents through Home Assistant's `Store` helper, so the same dashboard is available across browser profiles and devices connected to the same Home Assistant instance.

### Permissions

- Loading a dashboard is available to an authenticated Home Assistant user.
- Saving and removing dashboards require a Home Assistant administrator account.

The use of `dashboard_id` is intentional. Home Assistant reserves the WebSocket `id` field for the numeric message correlation identifier, so FRAKON never reuses it for a dashboard identifier.

When `callWS` is unavailable, the card safely falls back to browser storage. When the FRAKON integration is missing or not configured, the editor reports the backend error and keeps the current in-memory layout available for export.

The visual card editor exposes the same storage choice in English, Czech, German, Slovak and Polish.
