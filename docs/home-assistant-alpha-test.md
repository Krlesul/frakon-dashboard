# FRAKON Dashboard — Home Assistant alpha test

This checklist is the mandatory real-install gate for FRAKON Dashboard Alpha. Issue #11 must remain open until the current verified build has been installed in a real Home Assistant instance and the evidence report is complete.

> Use a non-critical test dashboard first. Do not rely on this alpha as the only control surface for gates, locks, heating protection or other safety-critical devices.

## 1. Use one verified Alpha Test Kit

Download **`frakon-dashboard-alpha-test-kit.zip`** from a successful GitHub Actions CI artifact for the exact commit being tested. Do not assemble test inputs from different workflow runs or from an unverified local build.

The kit contains:

- `frakon_dashboard.zip` — exact integration package to install
- `frakon-dashboard.js` — exact frontend bundle from the same build, for identity/debugging only
- `verify_home_assistant_install.py` — install/build identity self-check
- `home-assistant-alpha-test.md` — this checklist
- `home-assistant-alpha-test-report-template.md` — evidence report
- `alpha-migration.md` — upgrade and rollback instructions
- `alpha-test-kit.json` — version, minimum Home Assistant version, source commit, integration SHA-256, frontend SHA-256 and install identity
- `README.txt` — short install sequence

Before installation, record these immutable identity values from `alpha-test-kit.json` in the report:

- `version`
- `minimumHomeAssistant`
- `sourceCommit`
- `integrationSha256`
- `frontendSha256`

`minimumHomeAssistant` must be `2025.1.0` for the current Alpha contract.

If upgrading an older FRAKON development install, read `alpha-migration.md` first.

## 2. Install the integration

The declared minimum supported Home Assistant Core version is **2025.1.0**. The packaged frontend registration code is verified against both the HA 2025.1 Lovelace dict shape and the modern `LovelaceData` / `HassKey` shape before an Alpha artifact is accepted.

`frakon_dashboard.zip` is a HACS `zip_release` archive whose integration files are stored at the ZIP root. For a manual Alpha install:

1. extract the Alpha Test Kit,
2. create the target directory `/config/custom_components/frakon_dashboard`,
3. extract `frakon_dashboard.zip` **directly into that target directory**.

After extraction these files must exist directly at:

```text
/config/custom_components/frakon_dashboard/manifest.json
/config/custom_components/frakon_dashboard/__init__.py
/config/custom_components/frakon_dashboard/frontend/frakon-dashboard.js
```

Do **not** extract `frakon_dashboard.zip` directly into `/config`; that would place `manifest.json` and the other integration files in the wrong directory. Also do not create a second nested `/config/custom_components/frakon_dashboard/custom_components/frakon_dashboard` tree.

Do **not** copy `frakon-dashboard.js` to `/config/www` and do not keep a legacy `/local/frakon-dashboard.js` Lovelace resource enabled. The integration serves its own cache-busted module:

```text
/frakon-dashboard/frakon-dashboard.js?v=<integration-version>
```

Then:

1. restart Home Assistant,
2. open **Settings → Devices & services → Add integration**,
3. add **FRAKON Dashboard**,
4. confirm the Czech setup step is headed **Nastavení ukládání dashboardů** when Home Assistant is using Czech,
5. confirm the packaged FRAKON integration icon is shown when the installed Home Assistant version supports local custom-integration brand assets,
6. confirm the versioned module is registered/loaded,
7. from the extracted Alpha Test Kit directory run:

```bash
python verify_home_assistant_install.py /path/to/home-assistant/config
```

The required result starts with:

```text
FRAKON Dashboard install self-check: OK
```

The output must include the same source commit and the same frontend SHA-256 as `alpha-test-kit.json`. It must also report:

```text
Home Assistant manifest contract: OK
Home Assistant minimum compatibility: OK (2025.1.0+)
Home Assistant translations: OK (en, cs, de, sk, pl)
Home Assistant brand assets: OK
Dashboard serialized-byte guard: OK
Dashboard document validator: OK
Responsive bundle validator: OK
Czech config flow: OK
```

`Home Assistant manifest contract: OK` proves the installed manifest still identifies FRAKON Dashboard as a single-entry `service` integration with `iot_class=calculated`, the expected dependencies, documentation and issue-tracker identity.

`Home Assistant minimum compatibility: OK (2025.1.0+)` proves the installed `frontend.py` avoids the newer-only `LOVELACE_DATA` import and retains the compatibility adapter required for the HA 2025.1 Lovelace dict plus modern `LovelaceData` resource shapes. The self-check also reads the real Home Assistant config-root `.HA_VERSION` and rejects Core versions below 2025.1.0.

`Home Assistant translations: OK (en, cs, de, sk, pl)` proves the installed custom integration contains complete English, Czech, German, Slovak and Polish translation files with the same key structure, non-empty text, task-specific config-flow headings and no Core-only `strings.json` / translation-placeholder model. The Czech config-flow title is additionally checked against **Nastavení ukládání dashboardů**.

`Home Assistant brand assets: OK` proves the installed integration contains valid PNG assets at `brand/icon.png` (256×256) and `brand/icon@2x.png` (512×512), rather than merely relying on repository metadata.

`Dashboard serialized-byte guard: OK` proves the installed Python validation boundary includes the same **2,000,000 UTF-8 JSON byte** persistence ceiling used by the TypeScript v1/v2 document guards and by the responsive bundle contract.

The test-kit verifier has already proven the chain:

```text
Alpha Test Kit manifest
→ integration ZIP SHA-256
→ root-layout install path contract
→ Home Assistant manifest + minimum-version compatibility
→ multilingual custom-integration translations
→ brand assets + document/byte-limit validators
→ build-info.json sourceCommit + frontendSha256
→ bundled frontend bytes
```

The install self-check completes that chain by hashing the frontend actually installed under `/config/custom_components/frakon_dashboard/frontend/`, validating the real Home Assistant Core version, installed manifest, HA 2025.1+ compatibility markers, all five installed translation files, both brand PNGs and the installed normal/responsive validation boundaries.

If any version, source commit, SHA-256, install layout, manifest, compatibility, translation, brand, byte-limit or validator marker differs, stop functional testing and correct installation/cache/resource state first.

## 3. Record the environment

Use `home-assistant-alpha-test-report-template.md` from the same kit. Record at minimum:

- Home Assistant Core version and installation type; Core must be **2025.1.0 or newer**
- host hardware
- browser/app and version
- client device and OS
- viewport size/class
- FRAKON version and source commit
- `minimumHomeAssistant`
- integration/frontend SHA-256 values
- Lovelace mode
- FRAKON storage mode

Viewport classes:

- Mobile: `<600 px`
- Tablet: `600–1023 px`
- Desktop: `1024–1599 px`
- Wide: `≥1600 px`

## 4. Stable FRAKON Dashboard Card

Create a test dashboard:

```yaml
type: custom:frakon-dashboard-card
entity: sensor.placeholder
dashboard_id: frakon-alpha-test
title: FRAKON Alpha Test
language: cs
columns: 12
row_height: 48
gap: 12
edit_mode: true
storage: home-assistant
responsive_columns:
  mobile: 4
  tablet: 8
  desktop: 12
  wide: 16
items: []
```

Verify:

- card and visual editor render without custom-element errors
- Czech editor strings render correctly
- add/edit card and entity
- pointer move/resize, marquee and multi-selection
- lock/unlock, hide/show, duplicate, delete, Copy/Cut/Paste
- normal Copy/Duplicate of a hidden layer creates a visible discoverable copy
- Cut/Paste preserves the original hidden state
- hidden layers remain absent from normal rendering while stored geometry survives hide/show
- collision rejection never stores an overlapping layout
- Undo/Redo restores exact geometry and z-order
- Import/Export round-trip preserves hidden state, z-order and constraints
- reload preserves exact saved geometry rather than compacting it
- a second browser/device loads the expected server-backed layout

## 5. Automatic Designer

With several cards present, including locked and hidden cards, verify:

- **Generate proposal** is non-destructive
- **Next proposal** produces deterministic alternatives
- `priority-first`, `balanced`, `compact` and `focus` strategies
- proposals stay bounded and collision-free
- locked/hidden geometry remains reserved
- manual `priority` and `layout_group` overrides
- mobile/tablet/desktop/wide previews
- a non-canonical breakpoint preview cannot overwrite the canonical document
- **Revert preview** creates no committed/history change
- **Apply** commits exactly the previewed geometry as one undoable history step
- Undo restores exact pre-Apply geometry and Redo restores the exact proposal

## 6. Experimental native Canvas v2

Create a separate card:

```yaml
type: custom:frakon-canvas-dashboard-card
entity: sensor.placeholder
dashboard_id: frakon-canvas-alpha-test
title: FRAKON Canvas Alpha Test
language: cs
edit_mode: true
storage: home-assistant
items: []
```

Verify the implemented Canvas v2 workflows:

- add/configure cards
- free-pixel move and resize
- multi-select and marquee
- collision-safe commits
- smart edge/center/equal-spacing guides
- align/distribute/equal-gap actions
- constraints and diagnostics
- layers/z-order
- Copy/Cut/Paste
- Undo/Redo
- zoom/pan/pinch
- per-device viewport memory
- entity selectors and card palette
- surface styling

Record any semantic mismatch between the stable grid card and Canvas v2. Do not infer support for a feature merely from the stable editor; test the Canvas implementation actually presented by the build.

## 7. Responsive layout matrix

Exercise Mobile, Tablet, Desktop and Wide. For every supported breakpoint verify:

- expected geometry loads
- switching away and back preserves geometry
- per-breakpoint Undo/Redo timeline is preserved
- Auto mode follows viewport width
- Manual mode remains on the selected breakpoint
- shared card configuration remains synchronized
- viewport memory is independent where designed
- hidden geometry remains reserved in editor/optimizer projections where supported
- runtime projection does not expose hidden v1 layers
- constraints whose endpoint is absent from a runtime projection are not left dangling

Also test Copy layout and Reset active breakpoint as single undoable draft operations.

## 8. Storage, revisions and conflicts

For stable v1 server-backed storage verify:

- Save/Load preserves exact accepted geometry and z-order; reload must not run implicit compaction
- hidden state and constraints survive storage round-trip
- offline/fallback queue replay preserves the same document
- revision reload preserves exact document content
- a one-sided layer reorder survives conflict merge
- incompatible concurrent layer reorders surface an explicit `itemOrder` conflict
- selecting Local/Remote for `itemOrder` changes only layer order, not item geometry
- independently valid Local/Remote edits that would combine into an invalid/overlapping document surface an explicit conflict instead of a clean merge
- malformed remote or revision payloads are rejected rather than silently normalized into corrupt state
- a valid payload stored under/requested as another dashboard ID is rejected rather than substituted
- explicit `constraints: null` is rejected; omitted `constraints` remains valid
- a controlled v1 payload whose compact UTF-8 JSON serialization is **exactly 2,000,000 bytes** is accepted when otherwise valid
- the same payload with one additional ASCII byte is rejected without storage mutation
- a controlled payload that stays below 2,000,000 Python/JavaScript characters but exceeds **2,000,000 UTF-8 bytes** because of multibyte text is rejected; this proves byte accounting rather than character counting

Use a controlled WebSocket/API test fixture for the byte-limit checks rather than attempting to build a multi-megabyte dashboard manually in the visual editor. Record the response and confirm the previously stored revision is unchanged after every rejected oversized write.

## 9. Responsive server validation / write lock

Responsive Canvas v2 writes remain intentionally locked in this alpha. Verify:

- `responsiveCanvasV2.read = true`
- `responsiveCanvasV2.write = false`
- `atomicRevision = true`
- Save Readiness reports `write-disabled`
- normal responsive Save remains disabled
- server Dry Run accepts a valid current-revision candidate without storage mutation
- malformed responsive candidates are rejected, including missing `card.type`, invalid `layout.snap`, invalid frame/min-max geometry, persisted `hidden`, dangling/invalid constraints and explicit `constraints: null`
- responsive bundle/document payloads over **2,000,000 UTF-8 JSON bytes** are rejected without mutation
- `updatedAt` and `contractVersion` are strict integers: fractional, boolean and string values are rejected rather than coerced
- revision timestamps outside the JavaScript safe-integer range are rejected
- a responsive stored/conflict envelope whose bundle ID does not match the requested dashboard ID is rejected
- enabled responsive constraint dependency cycles are rejected
- stale-base Dry Run reports conflict only with a validated, ID-matched remote envelope
- direct responsive Save and Remove are rejected with `unsupported_responsive_write`
- responsive storage remains unchanged after rejected writes and Dry Run
- Home Assistant logs contain sanitized audit metadata only

Do not modify the writable-kind allowlist to make this section pass.

## 10. Browser console, network and Home Assistant logs

Review and record:

- JavaScript exceptions
- custom-element registration errors
- failed `/frakon-dashboard/` requests
- WebSocket errors
- build/version/hash mismatch diagnostics
- storage/revision/conflict errors
- validation errors from the negative v1/v2 cases above
- unexpected Home Assistant warnings/errors

Attach screenshots/recordings for the FRAKON integration icon, stable dashboard, breakpoint matrix, Automatic Designer, Canvas v2, build identity/self-check and final console state.

For every reproducible defect, create a separate issue with exact source commit, kit SHA-256 values, environment, reproduction steps, expected/actual result and evidence.

## 11. Pass criteria

Issue #11 can be closed only when:

- the tested Alpha Test Kit came from a successful CI run for the tested commit
- `alpha-test-kit.json.minimumHomeAssistant` is `2025.1.0`
- the real test runs on Home Assistant Core 2025.1.0 or newer
- `frakon_dashboard.zip` was extracted directly into `/config/custom_components/frakon_dashboard` and no nested integration directory exists
- kit manifest, installed integration/frontend and runtime build identities match
- install self-check passes with expected source commit + frontend SHA-256 + `Home Assistant manifest contract: OK` + `Home Assistant minimum compatibility: OK (2025.1.0+)` + `Home Assistant translations: OK (en, cs, de, sk, pl)` + `Home Assistant brand assets: OK` + `Dashboard serialized-byte guard: OK` + `Dashboard document validator: OK` + `Responsive bundle validator: OK`
- installed manifest still declares the intended single-entry `service` contract with `iot_class=calculated`
- the Czech config-flow step heading is `Nastavení ukládání dashboardů` and installed EN/CS/DE/SK/PL translations remain structurally complete
- packaged FRAKON brand assets have the required dimensions and the integration icon is visually checked where the Home Assistant version supports local custom-integration brand assets
- the 2,000,000-byte persistence ceiling is verified at the exact boundary, one byte above it and with multibyte UTF-8 content without mutating stored state on rejection
- mandatory stable Dashboard, Automatic Designer, Canvas v2, storage/conflict and responsive checks were executed
- strict non-coercing normal/responsive validation boundaries passed the required negative cases
- responsive write lock remained intact
- browser console and Home Assistant logs were reviewed
- required screenshots/evidence were recorded
- no unresolved blocker/critical defect remains
- final report records PASS or explicitly accepted PASS WITH KNOWN LIMITATIONS

Repository preflight and simulated installation are necessary but **not** a substitute for the real #11 installation.
