# FRAKON Studio Surface Inspector

`<frakon-surface-inspector>` connects Studio selection state, a FRAKON dashboard document and the visual surface style editor.

## Targets

- `Selection` edits the currently selected cards; with no selection it falls back to the dashboard surface.
- `Dashboard` edits the whole dashboard canvas surface.
- `Card defaults` edits the inherited default style for all cards.

For selected cards, `Use inherited card style` removes individual overrides so cards inherit the dashboard card default again. Locked cards are not changed by bulk selection styling unless a future caller explicitly opts in through the lower-level action API.

## Inputs

```ts
inspector.document = dashboardDocument;
inspector.selection = { ids: ['living-room', 'camera-gate'], anchorId: 'camera-gate' };
```

## Output

Every applied change emits:

```text
frakon-studio-document-changed
```

with:

```ts
{
  document: FrakonDashboardDocument,
  target: DashboardSurfaceTarget,
}
```

The host application should commit this document to its undo/redo transaction model and persistence controller.
