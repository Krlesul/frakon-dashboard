# FRAKON Studio Canvas

`<frakon-studio-canvas>` is the visible platform-neutral editing surface for FRAKON Dashboard Studio.

## Current capabilities

- platform-neutral viewport and selection state from `@frakon/studio-engine`
- zoom range from 25% to 800%
- cursor-centered mouse-wheel and trackpad zoom
- Alt + primary-button or middle-button panning with pointer capture
- toolbar zoom controls, reset to 100% and Fit-to-content
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

### Pointer and trackpad

- click an object to replace the current selection
- Shift-click adds an object
- Ctrl-click or Cmd-click toggles an object
- drag empty canvas with the primary button to create a selection marquee
- Shift, Ctrl or Cmd while starting a marquee preserves the current selection and adds matched objects
- Alt-drag with the primary button or drag with the middle mouse button to pan
- use the mouse wheel or trackpad scroll gesture to zoom around the pointer location
- repeated pan and zoom operations operate only on the platform-neutral viewport transform and do not rewrite card geometry

### Toolbar

- `−` and `+` apply fixed zoom steps around the viewport center
- `100%` resets the viewport to `{ x: 0, y: 0, zoom: 1 }`
- `Fit` computes the bounds of the currently rendered selectable objects and fits them into the viewport with padding; if there are no objects it falls back to the reset viewport

### Keyboard

- `Ctrl/Cmd+A` selects every currently selectable object
- `Escape` clears selection
- keyboard commands are ignored while focus is inside an input, textarea, select or contenteditable element
- object nudge, clipboard, layer and history shortcuts are implemented by the higher-level Dashboard Studio/history hosts so the canvas remains reusable and independent of Home Assistant

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
- the point below the pointer stays fixed during wheel/trackpad zoom
- pointer capture prevents interrupted pan and marquee gestures
- reset returns `{ x: 0, y: 0, zoom: 1 }`
- Fit uses the same deterministic `fitRectToViewport()` transform tested in `@frakon/studio-engine`
- slotted children inherit the world transform
- click, modifier click and marquee produce deterministic selection state
- marquee geometry remains correct at every zoom level and viewport offset
- the component does not import Home Assistant contracts

Object movement, resize handles and smart guides are composed by the higher-level Dashboard Studio and consume these same viewport and selection contracts.
