# FRAKON Studio history host

`<frakon-dashboard-studio-history>` wraps the interactive Dashboard Studio with atomic undo/redo history.

```html
<frakon-dashboard-studio-history></frakon-dashboard-studio-history>
```

Assign a `FrakonDashboardDocument` through the `document` property.

## Behaviour

- continuous drag and resize updates are held as a temporary transaction
- the transaction is committed after 220 ms without another update
- one drag or resize gesture therefore creates one undo step
- surface, constraint and preview application changes enter the same history
- temporary constraint ghost previews do not create history entries
- a new committed edit clears the redo stack
- external document replacement resets the local history

## Controls

The host renders a sticky toolbar with Undo and Redo buttons.

Keyboard shortcuts:

- `Ctrl+Z` or `Cmd+Z`: undo
- `Ctrl+Shift+Z` or `Cmd+Shift+Z`: redo
- `Ctrl+Y`: redo

Shortcuts are ignored while editing inputs, textareas, selects or contenteditable elements.

## Change event

The host emits `frakon-history-studio-changed` after a committed edit, undo or redo.

```ts
interface FrakonHistoryStudioChangedDetail {
  document: FrakonDashboardDocument;
  canUndo: boolean;
  canRedo: boolean;
}
```

Persistence adapters should save this committed event rather than every intermediate pointer update.
