# Integrated FRAKON Dashboard Studio shell

`<frakon-dashboard-studio>` composes the first visible Studio workspace from the reusable canvas and surface inspector.

## Responsibilities

- render a `FrakonDashboardDocument` as selectable Studio objects
- keep canvas selection synchronized with the inspector
- apply dashboard, default-card and selected-card surface changes immediately
- render eight resize handles around the current selection
- resize one card or a multi-selection through a shared bounding box
- preserve locked cards during group resize
- account for the current canvas zoom while converting pointer movement
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

## Resize interaction

Select one or more cards and drag one of the eight handles around the blue selection boundary. The Studio engine computes the transformation from the pointer delta and current zoom. A multi-selection preserves the relative positions and dimensions of all unlocked items. Locked items remain unchanged.

The current implementation snaps the final live geometry back to the dashboard grid by rounding `x`, `y`, `w` and `h` to grid units. Collision-safe placement, drag movement, smart guides and persistence are integrated in subsequent stages through the same document-change event.
