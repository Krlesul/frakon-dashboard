# FRAKON Surface Styles

FRAKON separates layout geometry from visual surfaces. The dashboard canvas and every card can be styled independently.

## Levels

1. `document.surface` — the visible dashboard area
2. `document.cardSurface` — the default style inherited by all cards
3. `item.surface` — an optional override for one card

## Capabilities

- visible or hidden frame
- transparent, theme, solid, glass, gradient or image background
- background opacity
- backdrop blur
- border color, opacity and width
- border radius
- shadow
- inner padding

## Frameless transparent dashboard

```json
{
  "surface": {
    "fill": "transparent",
    "border": "none",
    "shadow": "none",
    "padding": 0
  }
}
```

## Frameless transparent card

```json
{
  "surface": {
    "fill": "transparent",
    "border": "none",
    "shadow": "none",
    "padding": 0,
    "borderRadius": 0
  }
}
```

## Glass default for all cards

```json
{
  "cardSurface": {
    "fill": "glass",
    "backgroundOpacity": 0.55,
    "backdropBlur": 24,
    "border": "solid",
    "borderColor": "#ffffff",
    "borderOpacity": 0.12,
    "borderWidth": 1,
    "borderRadius": 24,
    "padding": 10
  }
}
```

An individual card may override only the properties it needs. Other values continue to inherit from `cardSurface`.

## Planned Studio controls

The property panel will provide:

- dashboard/card target selector
- fill type selector
- color and opacity controls
- border on/off and border controls
- radius and padding controls
- shadow presets and custom value
- image or gradient editor
- reset to inherited style
- copy and paste style

The visual selection outline remains an editor-only overlay. It does not become part of the saved card frame and is hidden in normal dashboard mode.
