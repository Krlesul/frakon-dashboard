# Integrated FRAKON Dashboard Studio shell

`<frakon-dashboard-studio>` composes the first visible Studio workspace from the reusable canvas and surface inspector.

## Responsibilities

- render a `FrakonDashboardDocument` as selectable Studio objects
- keep canvas selection synchronized with the inspector
- apply dashboard, default-card and selected-card surface changes immediately
- emit the updated document and selection through `frakon-dashboard-studio-changed`
- remain independent from Home Assistant runtime contracts

## Usage

```ts
import '@frakon/studio-app';

const studio = document.querySelector('frakon-dashboard-studio');
studio.document = dashboardDocument;
studio.addEventListener('frakon-dashboard-studio-changed', (event) => {
  history.commit(event.detail.document);
});
```

## Current limits

The shell currently renders lightweight Studio placeholders for dashboard items. Home Assistant card hosting, resize handles, drag movement, smart guides and persistence are integrated in later stages through the same document-change event.
