# Revisioned dashboard conflict workflow

FRAKON Dashboard can use revision-aware storage to prevent silent overwrites when the same dashboard is edited on multiple devices.

## Studio integration

Provide a `RevisionedDashboardSyncController` to the storage-aware Studio host:

```ts
const transport = new HomeAssistantDashboardStorageTransport(hass);
const storage = new RevisionedDashboardStorage(transport);
const revisionController = new RevisionedDashboardSyncController(
  storage,
  persistentClientId,
);

studio.revisionController = revisionController;
studio.dashboardId = 'home';
```

When `revisionController` is present it takes precedence over the legacy autosave controller. Confirmed Studio history changes are saved as revisions. Intermediate pointer frames are still grouped by the history host before reaching storage.

## WebSocket contract

### Load

Command:

```text
frakon/dashboard/load_revision
```

Request:

```json
{ "id": "home" }
```

Response is either `undefined` or a `DashboardRevisionEnvelope`.

### Save

Command:

```text
frakon/dashboard/save_revision
```

Request:

```json
{
  "envelope": {
    "document": {},
    "revision": "...",
    "parentRevision": "...",
    "updatedAt": 0,
    "clientId": "wall-tablet"
  },
  "expectedRevision": "..."
}
```

Successful response:

```json
{
  "status": "saved",
  "envelope": {}
}
```

Conflict response:

```json
{
  "status": "conflict",
  "remote": {}
}
```

The backend must compare `expectedRevision` atomically with the currently stored revision before accepting the write.

### Remove

Command:

```text
frakon/dashboard/remove_revision
```

Request:

```json
{
  "id": "home",
  "expectedRevision": "..."
}
```

## Conflict UI

When a save returns a conflict, `<frakon-dashboard-studio-storage>` automatically renders `<frakon-dashboard-conflict-panel>` above the editor.

Available decisions:

- **Keep local**: preserve the locally edited dashboard and rebase it onto the latest Home Assistant revision.
- **Use Home Assistant version**: replace the local dashboard with the remote version and create a new resolved revision.
- **Use automatic merge**: combine independent changes. This option is disabled when the three-way resolver reports conflicts.

While a conflict is active, regular **Save now** is disabled. After resolution, the returned revision becomes the active Studio document and a saved change event is emitted.

## Client ID

Use a stable client ID per browser or device. It should survive reloads, for example in local storage. Human-readable IDs such as `hall-tablet`, `office-mac` or `frantisek-iphone` make the conflict panel easier to understand.
