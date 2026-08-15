# FRAKON Dashboard — Home Assistant alpha test report

Use this report together with `home-assistant-alpha-test.md` from the **same** `frakon-dashboard-alpha-test-kit.zip`. Keep issue #11 open until every required real-device section has been executed and evidence has been recorded.

## Build identity

- Test date/time:
- Tester:
- FRAKON version from `alpha-test-kit.json`:
- Source commit from `alpha-test-kit.json`:
- Integration ZIP SHA-256 from `alpha-test-kit.json`:
- Frontend SHA-256 from `alpha-test-kit.json`:
- Artifact workflow run:
- Install self-check result:
- Source commit printed by install self-check:
- Frontend SHA-256 printed by install self-check:
- Runtime build badge source commit:
- Runtime frontend/build identity (if displayed):
- Resource URL:
- Build mismatch shown: yes / no

Identity gate:

- ☐ Kit source commit = installed `build-info.json` source commit
- ☐ Kit frontend SHA-256 = install self-check frontend SHA-256
- ☐ Kit version = installed Home Assistant manifest/runtime version
- ☐ `Dashboard document validator: OK` reported
- ☐ `Responsive bundle validator: OK` reported
- ☐ Runtime build badge identifies the same build
- ☐ No stale `/local/frakon-dashboard.js` resource is enabled

If any identity item differs, stop functional testing and fix installation/cache/resource state first.

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

- ☐ Alpha Test Kit came from a successful CI run for the tested commit
- ☐ Kit identity values recorded before installation
- ☐ `frakon_dashboard.zip` extracted to `/config/custom_components/frakon_dashboard`
- ☐ Home Assistant restarted successfully
- ☐ FRAKON Dashboard integration added
- ☐ Versioned `/frakon-dashboard/frakon-dashboard.js?v=…` module loaded
- ☐ No legacy duplicate `/local/frakon-dashboard.js` resource remains
- ☐ Install self-check reports `OK`
- ☐ Self-check frontend SHA-256 matches kit manifest
- ☐ Dashboard document validator reports `OK`
- ☐ Responsive bundle validator reports `OK`
- ☐ Runtime build badge matches package identity

Evidence / notes:

## Stable FRAKON Dashboard Card

- ☐ Card renders with `language: cs`
- ☐ Czech editor strings render correctly
- ☐ Add/edit card and entity
- ☐ Pointer move / resize
- ☐ Marquee / multi-selection
- ☐ Lock / unlock
- ☐ Hide / Show preserves stored geometry
- ☐ Duplicate hidden layer creates visible copy
- ☐ Copy hidden layer → Paste creates visible copy
- ☐ Cut hidden layer → Paste preserves hidden state
- ☐ Delete removes attached constraints
- ☐ Collision rejection
- ☐ Undo restores exact prior geometry/z-order
- ☐ Redo restores exact later geometry/z-order
- ☐ Import / Export preserves hidden state, z-order and constraints
- ☐ Server/local persistence reload preserves exact geometry
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
- ☐ Hidden card remains fixed/reserved
- ☐ No collision / out-of-bounds proposal observed
- ☐ Mobile/Tablet/Desktop/Wide previews checked
- ☐ Non-canonical preview cannot overwrite canonical layout
- ☐ Apply commits exactly the previewed geometry
- ☐ Apply creates one undoable change
- ☐ Revert creates no committed change
- ☐ Undo/Redo around Apply are exact
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

Unsupported/unconfirmed Canvas-v2 behavior observed:

Evidence / notes:

## Responsive layouts

### Mobile
- ☐ Geometry retained
- ☐ Runtime hidden projection correct where applicable
- ☐ Constraint projection has no dangling endpoint
- ☐ Undo/Redo timeline retained
- ☐ Auto / Manual behavior correct

### Tablet
- ☐ Geometry retained
- ☐ Runtime hidden projection correct where applicable
- ☐ Constraint projection has no dangling endpoint
- ☐ Undo/Redo timeline retained
- ☐ Auto / Manual behavior correct

### Desktop
- ☐ Geometry retained
- ☐ Runtime hidden projection correct where applicable
- ☐ Constraint projection has no dangling endpoint
- ☐ Undo/Redo timeline retained
- ☐ Auto / Manual behavior correct

### Wide
- ☐ Geometry retained
- ☐ Runtime hidden projection correct where applicable
- ☐ Constraint projection has no dangling endpoint
- ☐ Undo/Redo timeline retained
- ☐ Auto / Manual behavior correct

- ☐ Copy layout from breakpoint is one undoable draft operation
- ☐ Reset active breakpoint is one undoable draft operation
- ☐ Shared card configuration remains synchronized
- ☐ Viewport memory remains independent per breakpoint/device

Evidence / notes:

## Storage / revisions / conflict handling

- ☐ Save/Load preserves exact accepted geometry instead of compacting
- ☐ Save/Load preserves serialized z-order
- ☐ Hidden state and constraints survive storage round-trip
- ☐ Offline/fallback queue replay preserves exact document
- ☐ Revision load preserves exact document
- ☐ One-sided layer reorder survives merge
- ☐ Concurrent incompatible layer reorders surface `itemOrder` conflict
- ☐ Local/Remote `itemOrder` selection changes order without changing geometry
- ☐ Independently valid concurrent edits that combine into invalid geometry surface an explicit conflict
- ☐ Malformed normal remote load is rejected
- ☐ Malformed revision/conflict envelope is rejected
- ☐ Wrong-dashboard document/revision substitution is rejected
- ☐ Explicit `constraints: null` is rejected while omitted `constraints` remains valid

Evidence / notes:

## Responsive server validation / write lock

- ☐ Build identity / contract matches
- ☐ `responsiveCanvasV2.read = true`
- ☐ `responsiveCanvasV2.write = false`
- ☐ `atomicRevision = true`
- ☐ Save Readiness contains `write-disabled`
- ☐ Save remains disabled
- ☐ Server dry-run accepts valid current-revision candidate without mutation
- ☐ Missing `card.type` candidate is rejected
- ☐ Invalid `layout.snap` candidate is rejected
- ☐ Invalid frame/min-max geometry is rejected
- ☐ Persisted Canvas-v2 `hidden` field is rejected
- ☐ Dangling/invalid responsive constraint is rejected
- ☐ Explicit responsive `constraints: null` is rejected
- ☐ Enabled responsive constraint dependency cycle is rejected
- ☐ Fractional `contractVersion` is rejected rather than coerced
- ☐ Boolean/string `contractVersion` is rejected rather than coerced
- ☐ Fractional `updatedAt` is rejected rather than coerced
- ☐ Boolean/string `updatedAt` is rejected rather than coerced
- ☐ `updatedAt` above JavaScript safe integer is rejected
- ☐ Stored responsive envelope with wrong dashboard ID is rejected
- ☐ Conflict remote envelope with wrong dashboard ID is rejected
- ☐ Stale-base dry-run returns only a validated ID-matched conflict envelope
- ☐ Direct save rejected with `unsupported_responsive_write`
- ☐ Direct remove rejected with `unsupported_responsive_write`
- ☐ Responsive storage unchanged after rejected writes and dry-run
- ☐ Home Assistant logs contain sanitized audit metadata only

Evidence / notes:

## Browser console / network

- JavaScript errors:
- Custom-element registration errors:
- Failed frontend module requests:
- WebSocket errors:
- Build/version/hash mismatch errors:
- Storage / revision / validation errors:
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
| Install self-check identity | | |
| Responsive validation/write lock | | |
| Console | | |

## Defects found

For every reproducible defect create a separate GitHub issue with reproduction steps and attach the issue number here.

| Issue | Severity | Area | Reproducible | Status |
|---|---|---|---|---|
| | | | | |

## Final alpha decision

- ☐ All mandatory #11 checks passed
- ☐ Alpha Test Kit / installed frontend / runtime identities match
- ☐ Dashboard document validator identity/negative cases passed
- ☐ Responsive bundle validator identity/negative cases passed
- ☐ Strict non-coercing persistence metadata checks passed
- ☐ Responsive write lock remained intact
- ☐ No unresolved blocker / critical defect
- ☐ Browser console and Home Assistant logs reviewed
- ☐ Required screenshots/evidence attached
- ☐ Environment/build identity recorded

Decision: ☐ PASS ☐ PASS WITH KNOWN LIMITATIONS ☐ FAIL

Summary:
