# Constraint preview overlay

`<frakon-constraint-preview-overlay>` renders a non-interactive comparison between the current dashboard document and a solved constraint preview.

```html
<frakon-constraint-preview-overlay
  .source=${currentDocument}
  .preview=${solveDashboardConstraints(currentDocument).document}
></frakon-constraint-preview-overlay>
```

For every changed card, the overlay draws:

- a faint dotted outline at the current position,
- a blue translucent ghost at the proposed position and size,
- the card label inside the proposed rectangle.

The overlay uses `pointer-events: none`, so selection, dragging, resizing and card controls remain unaffected. It is intended to be slotted inside the transformed Studio canvas above normal dashboard items and below resize handles.

The overlay does not mutate the dashboard document. The proposed layout becomes persistent only after the inspector executes **Apply layout rules**.
