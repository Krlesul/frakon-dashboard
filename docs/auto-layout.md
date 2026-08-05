# Automatic layout

FRAKON Dashboard can generate multiple deterministic layout proposals for the same dashboard.

## Strategies

- `priority-first` — important cards receive more space and appear earlier.
- `balanced` — cards use more even visual weight and regular rows.
- `compact` — cards are reduced toward their minimum useful size.
- `focus` — the highest-priority card becomes a hero card.

Every click on **Next proposal** advances the variant index. The strategy cycles and, after a full cycle, the ordering rotates to provide another valid composition.

## Priority

Default priority is explainable and currently based on card type. A manual value can override it:

```yaml
priority: 92
```

The supported range is `0–100`.

Locked cards keep their exact position and size. Unlocked cards may be resized and repositioned within their declared minimum and maximum dimensions.

## Preview workflow

1. Start automatic layout.
2. Inspect the preview without saving it.
3. Request another proposal as many times as needed.
4. Apply the selected proposal or restore the original layout.

Applying a proposal records one normal dashboard history operation, so Undo can restore the previous layout.

## Future contextual scoring

The metadata resolver is intentionally separate from the layout algorithm. Future FRAKON adapters can raise or lower priority using live context such as:

- active alarm or leak,
- camera person detection,
- charging vehicle,
- current room and user,
- time of day,
- frequency of card use,
- accessibility preferences.

Contextual scoring must remain explainable and manually overridable.
