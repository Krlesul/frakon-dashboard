# FRAKON Surface Style Editor

`<frakon-surface-style-editor>` is the first visual control surface for dashboard and card appearance.

## Targets

The same editor can be bound to:

1. `document.surface` — dashboard canvas appearance
2. `document.defaultItemSurface` — inherited appearance for all dashboard cards
3. `item.surface` — appearance override for one selected card
4. multiple selected cards — apply the emitted style to every selected item

## Usage

```ts
import '@frakon/studio-app';
```

```html
<frakon-surface-style-editor target="Selected card"></frakon-surface-style-editor>
```

```ts
editor.style = selectedItem.surface ?? {};
editor.addEventListener('frakon-surface-style-changed', (event) => {
  selectedItem.surface = event.detail.style;
});
```

## Presets

- Borderless
- Transparent
- Solid
- Glass
- Gradient
- Image

## Editable properties

- fill mode
- background color and opacity
- image URL or CSS gradient
- backdrop blur
- border mode, color, opacity and width
- corner radius
- padding
- CSS box shadow

The component emits normalized `SurfaceStyle` values and includes a live preview. Selection outlines and resize handles belong only to Studio chrome; they are not part of the persisted surface appearance and are not visible in the normal dashboard runtime.
