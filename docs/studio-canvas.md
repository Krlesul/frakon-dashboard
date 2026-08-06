# FRAKON Studio Canvas

`<frakon-studio-canvas>` is the first visible shell for FRAKON Dashboard Studio.

## Current capabilities

- platform-neutral viewport and selection state from `@frakon/studio-engine`
- zoom range from 25% to 800%
- cursor-centered mouse-wheel zoom
- Alt + primary-button or middle-button panning with pointer capture
- toolbar zoom controls and reset to 100%
- layered minor and major grid
- slotted content rendered inside the transformed world
- single and multi-object selection
- marquee selection on empty canvas
- selected-object visual outline
- `frakon-studio-viewport-changed` event after every viewport mutation
- `frakon-studio-selection-changed` event after every selection mutation

## Usage

```ts
import '@frakon/studio-app';
```

```html
<frakon-studio-canvas>
  <article
    data-frakon-id="living-room"
    style="position:absolute;left:160px;top:140px;width:360px;height:220px"
  >
    Living room
  </article>
</frakon-studio-canvas>
```

Every selectable object must expose a stable `data-frakon-id`. Set `data-frakon-selectable="false"` to keep an object visible but exclude it from marquee selection.

Controlled state:

```ts
canvas.viewport = { x: 120, y: 80, zoom: 1.25 };
canvas.selection = { ids: ['living-room'], anchorId: 'living-room' };

canvas.addEventListener('frakon-studio-viewport-changed', (event) => {
  console.log(event.detail.viewport);
});

canvas.addEventListener('frakon-studio-selection-changed', (event) => {
  console.log(event.detail.selection);
});
```

## Interaction contract

- click an object to replace the current selection
- Shift-click adds an object
- Ctrl-click or Cmd-click toggles an object
- drag empty canvas with the primary button to create a selection marquee
- Shift, Ctrl or Cmd while starting a marquee preserves the current selection and adds matched objects
- Alt-drag with the primary button or drag with the middle button to pan
- use the mouse wheel or trackpad to zoom around the pointer location
- use `−` and `+` for fixed zoom steps around the viewport center
- use `100%` to reset the transform

## Selection events

The selection event detail is intentionally platform-neutral:

```ts
interface FrakonStudioSelectionChangedDetail {
  selection: {
    ids: string[];
    anchorId?: string;
  };
}
```

The canvas mirrors selection state to `data-frakon-selected="true"` on slotted objects. Applications can use that attribute for additional object-specific styling.

## Acceptance checks

- zoom never leaves the 25–800% range
- the point below the pointer stays fixed during wheel zoom
- pointer capture prevents interrupted pan and marquee gestures
- reset returns `{ x: 0, y: 0, zoom: 1 }`
- slotted children inherit the world transform
- click, modifier click and marquee produce deterministic selection state
- marquee geometry remains correct at every zoom level and viewport offset
- the component does not import Home Assistant contracts

Object movement, resize handles and smart guides belong to subsequent Studio issues and will consume the same viewport and selection contracts.
