# FRAKON Dashboard alpha migration guide

This guide describes migration between early FRAKON Dashboard development installs and the current `0.16.0-alpha.1` Home Assistant integration package.

The alpha schema is still allowed to evolve. Always export important dashboards before replacing an older development build.

## 1. Move from `/local` frontend installs to the bundled integration

Older development instructions could use a manually copied frontend file under:

```text
/config/www/frakon-dashboard.js
```

with a Lovelace resource such as:

```text
/local/frakon-dashboard.js
```

The current alpha no longer uses that installation model. Install the verified package at:

```text
/config/custom_components/frakon_dashboard
```

and let the integration serve the versioned frontend resource:

```text
/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1
```

### Required cleanup

1. Back up/export any important FRAKON dashboard JSON.
2. Remove stale FRAKON JavaScript resources that point to `/local/frakon-dashboard.js` or another manually copied bundle.
3. Remove the old `/config/www/frakon-dashboard.js` file after confirming nothing else references it.
4. Extract the verified `frakon_dashboard.zip` artifact into `/config`.
5. Restart Home Assistant.
6. Add **FRAKON Dashboard** from **Settings → Devices & services**.
7. In Lovelace storage mode, allow the integration to register/repair the versioned module resource.
8. From a FRAKON Dashboard repository/release workspace that contains `scripts/verify_home_assistant_install.py`, run the self-check against the target Home Assistant config directory:

```bash
python scripts/verify_home_assistant_install.py /config
```

The self-check script is a repository/release verification tool; it is not installed inside `custom_components/frakon_dashboard`.

Do not keep both the old `/local` resource and the new integration resource enabled at the same time. Duplicate custom-element registration can make a stale frontend appear to be a backend or storage defect.

## 2. Build identity is now mandatory for verified alpha tests

Current release artifacts contain `build-info.json`. The real-install self-check requires `sourceCommit` to be a Git commit identifier rather than the local-development placeholder `development`.

For issue #11 and other release evidence, record:

- FRAKON integration version,
- source commit,
- frontend SHA-256/build diagnostics,
- Home Assistant version,
- browser/app and device.

If the UI reports a FRAKON build mismatch, stop persistence testing until the frontend and backend identify the same build.

## 3. Stable dashboard storage

The stable `custom:frakon-dashboard-card` supports the configured Dashboard storage adapter. Current alpha testing should use:

```yaml
storage: home-assistant
```

for server-backed persistence and multi-device testing.

Before replacing an older alpha build:

1. export the dashboard from the editor,
2. preserve the JSON outside Home Assistant,
3. upgrade the integration,
4. reload the dashboard,
5. verify revision/storage status before editing.

Import normalizes legacy geometry once. After import, Automatic Designer Apply and Undo/Redo preserve the exact committed geometry instead of re-running generic compaction.

## 4. Hidden layers

The grid item schema now supports:

```yaml
hidden: true
```

A hidden layer:

- remains serialized with its geometry and constraints,
- keeps its place reserved for a safe future Show operation,
- is excluded from normal Studio interaction,
- is excluded from the stable Home Assistant card render, including edit mode,
- does not participate as a smart-guide target,
- remains fixed during Automatic Designer proposals.

This is intentionally different from deleting a card. Delete also removes constraints that reference the deleted object.

## 5. Serialized layer order

`items[]` order is the serialized z-order. Current compaction and Automatic Designer application preserve this order.

If an older development build reordered layers by geometric `x/y` position, review the Layers panel after migration and set the desired z-order once. New saves preserve that explicit order.

## 6. Automatic Designer metadata

The current alpha supports optional per-card layout metadata:

```yaml
priority: 92
layout_group: security
```

`priority` is clamped to `0–100`. Clear it to restore automatic type-based scoring.

`layout_group` overrides the explainable semantic group inferred from the card type. Clear it to restore automatic grouping.

The canonical Automatic Designer strategies are:

- `priority-first`
- `balanced`
- `compact`
- `focus`

`comfortable` is accepted only as a compatibility alias for balanced behavior.

## 7. Responsive Canvas v2 storage

Responsive Canvas v2 uses a dedicated Home Assistant Store namespace:

```text
frakon_dashboard.responsive_dashboards
```

The current alpha permits responsive reads and server dry-run validation, but responsive writes remain deliberately locked. Do not manually enable the writable kind allowlist during migration.

Before a future write unlock, the real Home Assistant test must prove:

- round-trip correctness,
- restart recovery,
- stale revision conflict handling,
- multi-device behavior,
- server dry-run non-mutation,
- exact-candidate validation.

## 8. Editor behavior changes to expect

The current Studio/editor includes functionality that early builds did not have:

- multi-selection and marquee selection,
- smart guides and configurable snap threshold,
- Ctrl/Cmd drag to bypass grid/guideline snapping,
- group resize with Shift/Alt aspect-ratio preservation,
- precise X/Y/W/H controls,
- Align/Distribute tools,
- Layers rename/lock/hide/reorder,
- Copy/Cut/Paste with constraint remapping,
- transaction-safe Undo/Redo,
- Layout Constraints preview,
- non-destructive Automatic Designer preview/Next/Revert.

When comparing an old and new alpha, treat these as editor migrations rather than Home Assistant entity/config migrations.

## 9. Rollback

For alpha rollback:

1. stop editing on all clients,
2. export the current dashboard JSON,
3. back up the Home Assistant config and FRAKON storage files,
4. replace `custom_components/frakon_dashboard` with the previously verified artifact,
5. restart Home Assistant,
6. verify the versioned frontend resource and build identity,
7. import the previously compatible dashboard only if the older build cannot read the current stored document.

Do not reuse a browser tab that still has the newer frontend cached when validating a rollback. Confirm the build badge/resource identity first.

## 10. Current alpha gate

Migration documentation does not replace the real-install acceptance test. Issue #11 remains open until a current verified artifact is installed in a real Home Assistant instance and the complete test report is recorded.
