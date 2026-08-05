# FRAKON Studio Canvas

`<frakon-studio-canvas>` is the first visible shell for FRAKON Dashboard Studio.

## Current capabilities

- platform-neutral viewport state from `@frakon/studio-engine`
- zoom range from 25% to 800%
- cursor-centered mouse-wheel zoom
- pointer panning with capture
- toolbar zoom controls
- reset to 100%
- layered minor and major grid
- slotted content rendered inside the transformed world
- `frakon-studio-viewport-changed` event after every viewport mutation

## Usage

```ts
import '@frakon/studio-app';
```

```html
<frakon-studio-canvas></frakon-studio-canvas>
```

Controlled viewport:

```ts
canvas.viewport = { x: 120, y: 80, zoom: 1.25 };
canvas.addEventListener('frakon-studio-viewport-changed', (event) => {
  console.log(event.detail.viewport);
});
```

## Interaction contract

- drag the empty canvas with the primary pointer button to pan
- use the mouse wheel or trackpad to zoom around the pointer location
- use `−` and `+` for fixed zoom steps around the viewport center
- use `100%` to reset the transform

The component deliberately does not yet implement selection, object movement, resize handles or smart guides. Those capabilities belong to subsequent Studio issues and will consume the same viewport transform.

## Acceptance checks

- zoom never leaves the 25–800% range
- the point below the pointer stays fixed during wheel zoom
- pointer capture prevents interrupted panning
- reset returns `{ x: 0, y: 0, zoom: 1 }`
- slotted children inherit the world transform
- the component does not import Home Assistant contracts
