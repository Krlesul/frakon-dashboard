# FRAKON Constraint Inspector

`<frakon-constraint-inspector>` edits persistent layout relationships stored in `FrakonDashboardDocument.constraints`.

## Inputs

- `document`: the active `FrakonDashboardDocument`
- `selection`: the current Studio `SelectionState`

When possible, the first selected card becomes the default source card.

## Supported relationships

- align left, right, top and bottom
- align horizontal and vertical centers
- place below another card
- place right of another card
- match width
- match height

Each relationship supports a gap, priority and enabled state.

## Output event

The inspector emits `frakon-constraint-document-changed` with:

```ts
{
  document: FrakonDashboardDocument;
  constraintId?: string;
}
```

The Studio host should write the returned document into history and persistence.

## Safety behavior

- a card cannot constrain itself
- duplicate constraint IDs are rejected by the document action layer
- invalid numeric values are normalized
- constraints referencing deleted cards are removed during document normalization
