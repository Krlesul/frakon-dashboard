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

The current alpha no longer uses that installation model. Use the verified `frakon-dashboard-alpha-test-kit.zip`, extract its `frakon_dashboard.zip`, and install the integration at:

```text
/config/custom_components/frakon_dashboard
```

The integration serves the cache-busted frontend resource:

```text
/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1
```

### Required cleanup

1. Back up/export important FRAKON dashboard JSON.
2. Record `version`, `sourceCommit`, `integrationSha256` and `frontendSha256` from `alpha-test-kit.json`.
3. Remove stale FRAKON JavaScript resources pointing to `/local/frakon-dashboard.js` or another manually copied bundle.
4. Remove `/config/www/frakon-dashboard.js` after confirming nothing else references it.
5. Extract the verified `frakon_dashboard.zip` into the Home Assistant config directory.
6. Restart Home Assistant.
7. Add **FRAKON Dashboard** from **Settings → Devices & services**.
8. In Lovelace storage mode, allow the integration to register/repair the versioned module resource.
9. From the extracted Alpha Test Kit directory run:

```bash
python verify_home_assistant_install.py /config
```

The installed frontend SHA-256 printed by the self-check must equal `frontendSha256` from `alpha-test-kit.json`.

Do not keep the old `/local` resource and the new integration resource enabled together. Duplicate custom-element registration can make a stale frontend look like a backend/storage defect.

## 2. Build identity is mandatory

Verified alpha packages carry a complete identity chain:

```text
Alpha Test Kit sourceCommit
+ integrationSha256
+ frontendSha256
→ integration build-info.json
→ installed frontend bytes
```

The install self-check also verifies the standalone dashboard document validator and Czech config flow. For issue #11 record:

- FRAKON integration version,
- source commit,
- integration ZIP SHA-256,
- frontend SHA-256,
- Home Assistant version,
- browser/app and device.

If the UI or self-check reports a build/hash mismatch, stop persistence testing until frontend and backend identify the same build.

## 3. Stable dashboard storage

Current alpha testing should use:

```yaml
storage: home-assistant
```

for server-backed persistence and multi-device testing.

Before replacing an older alpha build:

1. export the dashboard,
2. preserve the JSON outside Home Assistant,
3. upgrade the integration,
4. reload the dashboard,
5. verify revision/storage status before editing.

Current storage boundaries normalize only valid document values; they no longer run implicit compaction during Save/Load. Accepted geometry and `items[]` z-order therefore survive reload exactly.

Malformed local/remote/revision payloads are rejected instead of being silently coerced into a potentially corrupt dashboard.

## 4. Hidden layers

The stable v1 grid item schema supports:

```yaml
hidden: true
```

A hidden layer:

- remains serialized with its geometry and constraints,
- keeps its grid place reserved for a safe future Show operation,
- is excluded from normal Studio interaction,
- is excluded from stable Home Assistant rendering, including edit mode,
- is excluded from the experimental v1 canvas projection,
- does not participate as a smart-guide target,
- remains fixed during compaction and Automatic Designer proposals.

Copy/Duplicate creates a visible discoverable copy. Cut/Paste preserves the source hidden state because Cut is a move, not a new object.

### v1 → Canvas v2 preview

The current v2 schema does **not** yet have native persisted hidden-layer semantics and responsive v2 writes remain locked. A read-only v1→v2 migration candidate therefore **omits hidden v1 items and constraints attached to them rather than exposing those cards as visible**.

Migration diagnostics report:

```text
hidden-items-omitted
```

and the candidate remains `safeToPersist: false`. Do not enable v2 writes until hidden-layer semantics have an explicit v2 persistence design and real Home Assistant validation.

This is intentionally different from deleting a v1 card: the canonical v1 source document still retains the hidden object and its constraints.

## 5. Serialized layer order

`items[]` order is the serialized z-order. Current compaction, storage, Automatic Designer and revision conflict resolution preserve this order.

One-sided reorders survive a revision merge. Incompatible concurrent reorders produce an explicit `itemOrder` conflict; choosing Local/Remote changes layer order without sorting geometry.

If an older development build reordered layers by geometric `x/y`, review the Layers panel once after migration and set the desired z-order.

## 6. Automatic Designer metadata

The current alpha supports optional per-card layout metadata:

```yaml
priority: 92
layout_group: security
```

`priority` is clamped to `0–100`. Clear it to restore automatic type-based scoring.

`layout_group` overrides the explainable semantic group inferred from card type. Clear it to restore automatic grouping.

Canonical strategies:

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

Before a future write unlock, real Home Assistant testing must prove:

- round-trip correctness,
- restart recovery,
- stale revision conflict handling,
- multi-device behavior,
- server dry-run non-mutation,
- exact-candidate validation,
- explicit hidden-layer behavior or an explicit schema decision that hidden is unsupported.

## 8. Editor behavior changes to expect

The current Studio/editor includes:

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

Treat these as editor migrations rather than Home Assistant entity/config migrations.

## 9. Rollback

For alpha rollback:

1. stop editing on all clients,
2. export current dashboard JSON,
3. back up Home Assistant config and FRAKON storage files,
4. replace `custom_components/frakon_dashboard` with the previously verified artifact,
5. restart Home Assistant,
6. verify versioned frontend resource, source commit and frontend SHA-256,
7. import previously compatible dashboard JSON only if the older build cannot read current stored data.

Do not reuse a browser tab that still has the newer frontend cached when validating rollback. Confirm build identity first.

## 10. Current alpha gate

Migration documentation does not replace the real-install acceptance test. Issue #11 remains open until a current verified artifact is installed in a real Home Assistant instance and the complete test report is recorded.
