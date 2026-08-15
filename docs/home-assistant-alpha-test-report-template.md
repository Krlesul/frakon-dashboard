# FRAKON Dashboard — Home Assistant alpha test report

Use this report together with `docs/home-assistant-alpha-test.md`. Keep issue #11 open until every required real-device section has been executed and evidence has been recorded.

## Build identity

- Test date/time:
- Tester:
- FRAKON version:
- Source commit from build badge / `build-info.json`:
- Artifact workflow run:
- `verify_home_assistant_install.py /config` result:
- Resource URL:
- Build mismatch shown: yes / no

## Home Assistant environment

- Home Assistant Core version:
- Installation type (HA OS / Supervised / Container / Core):
- Host hardware:
- Frontend version (if different):
- Lovelace mode (storage / YAML):
- FRAKON storage mode used:

## Client matrix

| Client | Device | OS | Browser / app | Viewport | Result | Notes |
|---|---|---|---|---|---|---|
| Desktop | | | | 1024–1599 px | ☐ Pass ☐ Fail | |
| Wide | | | | ≥1600 px | ☐ Pass ☐ Fail | |
| Tablet | | | | 600–1023 px | ☐ Pass ☐ Fail | |
| Mobile | | | | <600 px | ☐ Pass ☐ Fail | |

## Installation

- ☐ `frakon_dashboard.zip` extracted to `/config/custom_components/frakon_dashboard`
- ☐ Home Assistant restarted successfully
- ☐ FRAKON Dashboard integration added from Settings → Devices & services
- ☐ Versioned `/frakon-dashboard/frakon-dashboard.js?v=…` module is registered / loaded
- ☐ No legacy duplicate `/local/frakon-dashboard.js` resource remains
- ☐ Install self-check reports `OK`
- ☐ Runtime build badge matches package source commit

Evidence / notes:

## Stable FRAKON Dashboard Card

- ☐ Card renders with `language: cs`
- ☐ Czech editor strings render correctly
- ☐ Add card
- ☐ Edit card / entity
- ☐ Pointer move
- ☐ Pointer resize
- ☐ Marquee selection
- ☐ Multi-selection
- ☐ Lock / unlock
- ☐ Remove
- ☐ Collision rejection
- ☐ Undo / Redo
- ☐ Import / Export
- ☐ Server/local persistence reload
- ☐ Second client/device loads expected saved layout

Evidence / notes:

## Automatic layout

- ☐ Generate proposal
- ☐ Next proposal changes variant deterministically
- ☐ Priority-first checked
- ☐ Balanced checked
- ☐ Compact checked
- ☐ Focus checked
- ☐ Locked card remains fixed
- ☐ No collision / out-of-bounds proposal observed
- ☐ Apply creates one undoable change
- ☐ Revert preview creates no committed change
- ☐ Manual priority override checked
- ☐ Manual semantic layout group checked

Evidence / notes:

## Experimental native canvas v2

- ☐ Canvas renders
- ☐ Free-pixel move / resize
- ☐ Multi-select / marquee
- ☐ Smart guides
- ☐ Align / distribute / equal-gap actions
- ☐ Constraints and diagnostics
- ☐ Layers / z-order
- ☐ Copy / Cut / Paste
- ☐ Undo / Redo
- ☐ Zoom / pan / pinch
- ☐ Per-device viewport memory
- ☐ Card palette and entity selectors
- ☐ Surface styling

Evidence / notes:

## Responsive layouts

### Mobile
- ☐ Geometry retained
- ☐ Undo/Redo timeline retained
- ☐ Auto mode follows viewport
- ☐ Manual mode remains selected

### Tablet
- ☐ Geometry retained
- ☐ Undo/Redo timeline retained
- ☐ Auto mode follows viewport
- ☐ Manual mode remains selected

### Desktop
- ☐ Geometry retained
- ☐ Undo/Redo timeline retained
- ☐ Auto mode follows viewport
- ☐ Manual mode remains selected

### Wide
- ☐ Geometry retained
- ☐ Undo/Redo timeline retained
- ☐ Auto mode follows viewport
- ☐ Manual mode remains selected

- ☐ Copy layout from breakpoint is one undoable draft operation
- ☐ Reset active breakpoint is one undoable draft operation
- ☐ Shared card configuration remains synchronized
- ☐ Viewport memory remains independent per breakpoint/device

Evidence / notes:

## Responsive server validation / write lock

- ☐ Build identity / contract matches
- ☐ `responsiveCanvasV2.read = true`
- ☐ `responsiveCanvasV2.write = false`
- ☐ `atomicRevision = true`
- ☐ Save Readiness contains `write-disabled`
- ☐ Save remains disabled
- ☐ Server dry-run accepts a valid current-revision candidate without storage mutation
- ☐ Stale-base dry-run returns conflict
- ☐ Direct save is rejected with `unsupported_responsive_write`
- ☐ Direct remove is rejected with `unsupported_responsive_write`
- ☐ Responsive storage is unchanged after rejected writes
- ☐ Home Assistant logs contain sanitized audit metadata only

Evidence / notes:

## Browser console / network

- JavaScript errors:
- Custom-element registration errors:
- Failed frontend module requests:
- WebSocket errors:
- Build mismatch errors:
- Storage / revision errors:
- Other warnings worth triaging:

## Home Assistant logs

Relevant log excerpts / timestamps:

## Screenshots / recordings

| Evidence | File / link | What it proves |
|---|---|---|
| Stable dashboard | | |
| Mobile | | |
| Tablet | | |
| Desktop | | |
| Wide | | |
| Automatic Designer | | |
| Canvas v2 | | |
| Build badge | | |
| Console | | |

## Defects found

For every defect create a separate GitHub issue with reproduction steps and attach the issue number here.

| Issue | Severity | Area | Reproducible | Status |
|---|---|---|---|---|
| | | | | |

## Final alpha decision

- ☐ All mandatory #11 checks passed
- ☐ No unresolved blocker / critical defect
- ☐ Browser console reviewed
- ☐ Required screenshots/evidence attached
- ☐ Home Assistant/browser/device/build identity recorded

Decision: ☐ PASS ☐ PASS WITH KNOWN LIMITATIONS ☐ FAIL

Summary:
