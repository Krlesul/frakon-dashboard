# Automatic layout

FRAKON Dashboard Studio can generate multiple deterministic, collision-free layout proposals for the same dashboard without committing them to history until the user explicitly chooses **Apply**.

## Product strategies

- `priority-first` — important cards receive more space and are placed earlier.
- `balanced` — regular visual weight with fair representation across semantic groups.
- `compact` — cards are reduced toward their minimum useful size.
- `focus` — the highest-priority card becomes a hero card.
- `comfortable` is accepted as a compatibility alias for balanced sizing/group fairness, while the canonical proposal cycle uses `balanced`.

Every click on **Next proposal** advances the variant index. The strategy cycles and, after a full cycle, the ordering rotates to provide another valid composition.

## Priority and semantic groups

Default priority is explainable and based on card type. A manual value can override it:

```yaml
priority: 92
```

The supported range is `0–100`.

Cards are also assigned explainable semantic groups such as `security`, `comfort`, `lighting`, `energy`, `media`, `status` and `actions`. A card can override the automatic group:

```yaml
layout_group: outdoor
```

Studio exposes both values in **Automatic Designer** when exactly one card is selected. Clearing either field restores automatic scoring/grouping.

Priority-oriented modes keep related semantic groups together. Balanced mode deliberately interleaves groups so a large domain such as sensors cannot monopolise the first screen.

Locked cards keep their exact position and size. Hidden cards are also treated as fixed geometry in the canonical layout, so revealing a previously hidden card cannot expose a layout that auto-layout silently invalidated.

## Responsive proposals

`DashboardAutoLayoutSession` can generate proposals independently for all supported breakpoints:

- mobile — 4 columns by default
- tablet — 8 columns by default
- desktop — 12 columns by default
- wide — 16 columns by default

`responsiveProposalSet(3)` searches deterministic variants and returns up to three geometrically distinct proposals per breakpoint. The standard dashboard test fixture is required to produce at least three distinct, in-bounds and collision-free proposals for every supported breakpoint.

Studio lets the user switch the preview breakpoint without changing the canonical dashboard. Applying a proposal is enabled only when the preview breakpoint matches the canonical document breakpoint. Other breakpoint previews are intentionally read-only until FRAKON's persisted document schema stores independent per-breakpoint geometry.

## Studio preview workflow

1. Select **Generate proposal** in Automatic Designer.
2. Inspect the non-destructive preview; normal canvas editing is temporarily locked.
3. Switch breakpoint to inspect mobile/tablet/desktop/wide variants if needed.
4. Request **Next proposal** as many times as needed.
5. Choose **Apply** on the canonical breakpoint or **Revert preview**.

Preview and Next operations live only in `StudioHistoryController` preview state and do not create Undo entries. **Apply** commits the complete proposal as one `auto-layout` history step. **Revert preview** cancels it without changing history.

## Safety and determinism

Generated proposals:

- remain inside the configured grid width,
- avoid card collisions,
- preserve locked and hidden canonical geometry,
- preserve card min/max sizing metadata,
- remain deterministic for the same document, breakpoint, scoring metadata and variant,
- preserve serialized layer order even when geometry is compacted after proposal application.

## Future contextual scoring

The metadata resolver is intentionally separate from the layout algorithm. Future FRAKON adapters can raise or lower priority using live context such as:

- active alarm or leak,
- camera person detection,
- charging vehicle,
- current room and user,
- time of day,
- frequency of card use,
- accessibility preferences.

Contextual scoring must remain explainable and manually overridable. The current resolver boundary is the optimization hook; future optimizers can replace scoring metadata without coupling the platform-neutral layout engine to Home Assistant.
