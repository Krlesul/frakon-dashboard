# Storage-aware FRAKON Dashboard Studio

`<frakon-dashboard-studio-storage>` combines the Studio editor, atomic history and dashboard persistence.

## Responsibilities

- loads a dashboard by `dashboardId`
- receives only committed history changes
- debounces autosave writes
- serializes saves through `DashboardStorageController`
- exposes pending, saving, saved and error states
- supports manual `Save now` and `Retry`
- flushes pending changes on `pagehide`

## Local storage

```ts
import {
  DashboardStorageController,
  LocalStorageDashboardAdapter,
} from '@frakon/dashboard-core';

const controller = new DashboardStorageController(
  new LocalStorageDashboardAdapter(),
);

const studio = document.createElement('frakon-dashboard-studio-storage');
studio.controller = controller;
studio.dashboardId = 'main-dashboard';
studio.document = initialDocument;
```

## Home Assistant storage

```ts
import {
  DashboardStorageController,
  RemoteDashboardStorageAdapter,
} from '@frakon/dashboard-core';

const transport = {
  request: (command: string, payload: Record<string, unknown>) =>
    hass.callWS({ type: command, ...payload }),
};

const controller = new DashboardStorageController(
  new RemoteDashboardStorageAdapter(transport),
);

const studio = document.createElement('frakon-dashboard-studio-storage');
studio.controller = controller;
studio.dashboardId = 'main-dashboard';
```

The remote adapter uses these commands by default:

- `frakon/dashboard/load`
- `frakon/dashboard/save`
- `frakon/dashboard/remove`

## Events

The component emits `frakon-storage-studio-changed`.

```ts
interface FrakonStorageStudioChangedDetail {
  document: FrakonDashboardDocument;
  saved: boolean;
}
```

`saved: false` means the committed document changed locally and is pending persistence. `saved: true` means the latest autosave completed successfully.

## Save semantics

Pointer move and resize frames are grouped by the history host before autosave sees them. Autosave therefore persists one committed document for a complete interaction instead of every pointer frame.
