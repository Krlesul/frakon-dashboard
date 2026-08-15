# FRAKON Dashboard — HACS public publication gate

This checklist is intentionally separate from the Home Assistant Alpha gate in issue #11.
A real Home Assistant alpha can be installed and validated manually while the repository remains private. Public HACS distribution must not be claimed until every item below is complete.

## Current repository state

At the time this checklist was added:

- repository visibility: **private**
- repository description: present
- GitHub Issues: enabled
- repository topics: **none**
- `README.md`: present
- root `hacs.json`: present
- integration manifest: `custom_components/frakon_dashboard/manifest.json`
- local Home Assistant brand assets: present under `custom_components/frakon_dashboard/brand/`
- hassfest workflow: present
- dedicated HACS validation Action: **not enabled yet**

The private visibility and missing topics are deliberate publication gates, not FRAKON Dashboard runtime defects.

## 1. Repository metadata

Before public HACS publication:

- [ ] make `Krlesul/frakon-dashboard` public
- [ ] keep GitHub Issues enabled
- [ ] keep a concise repository description
- [ ] add relevant repository topics, for example:
  - `home-assistant`
  - `hacs`
  - `lovelace`
  - `dashboard`
  - `smart-home`
  - `typescript`
- [ ] confirm the default branch contains the intended public release state

Do not make the repository public merely to satisfy automated validation before the project is ready for public review.

## 2. HACS integration structure

The repository must continue to have exactly one custom integration under `custom_components/`:

```text
custom_components/frakon_dashboard/
```

All runtime files required by the Home Assistant integration must be contained there. Release packaging may additionally ship the generated `frakon_dashboard.zip` artifact configured by root `hacs.json`.

## 3. Home Assistant manifest

`custom_components/frakon_dashboard/manifest.json` must include at least:

- `domain`
- `name`
- `version`
- `documentation`
- `issue_tracker`
- `codeowners`

FRAKON also keeps `config_flow`, `dependencies`, `iot_class` and `single_config_entry` explicitly declared.

## 4. Brand assets

The integration ships local custom-integration brand assets:

```text
custom_components/frakon_dashboard/brand/icon.png
custom_components/frakon_dashboard/brand/icon@2x.png
```

Release invariants:

- [x] `icon.png` is a PNG and exactly 256×256
- [x] `icon@2x.png` is a PNG and exactly 512×512
- [x] source assets are checked by `scripts/verify_brand_assets.py`
- [x] HACS ZIP verification checks both packaged files and dimensions
- [x] Alpha Test Kit verification checks both packaged files and dimensions
- [x] installed Home Assistant self-check verifies both installed assets
- [ ] visually verify the integration icon in the real #11 installation on a Home Assistant version supporting local custom-integration brand assets

## 5. HACS validation Action

Enable the official HACS repository validation workflow only when the repository is ready for public validation.
The workflow should use the current HACS-recommended action and integration category, conceptually:

```yaml
name: Validate HACS

on:
  push:
  pull_request:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions: {}

jobs:
  validate-hacs:
    runs-on: ubuntu-latest
    steps:
      - name: HACS validation
        uses: hacs/action@main
        with:
          category: integration
```

Do not ignore the `brands`, `description`, `issues` or `topics` checks just to obtain a green result. Fix the repository metadata instead.

## 6. Required automated validation

Before a public release candidate is announced, require successful execution of:

- [ ] FRAKON CI
- [ ] hassfest
- [ ] HACS validation Action
- [ ] `scripts/verify_brand_assets.py`
- [ ] `scripts/verify_dashboard_document_validation.py`
- [ ] `scripts/verify_responsive_bundle_validation.py`
- [ ] `scripts/verify_responsive_write_lock.py`
- [ ] `scripts/verify_persistence_integrity_readiness.py`
- [ ] HACS release build and verification
- [ ] Alpha Test Kit build and verification
- [ ] simulated Home Assistant installation self-check

A workflow that never starts because of GitHub billing/spending status is not a successful validation run.

## 7. GitHub release

For public distribution:

- [ ] choose the release version intentionally
- [ ] ensure package, Home Assistant manifest and embedded frontend version agree
- [ ] build `frakon_dashboard.zip` from the exact release commit
- [ ] verify the release ZIP before upload
- [ ] create a full GitHub Release, not only a tag, when preparing HACS default inclusion
- [ ] attach `frakon_dashboard.zip`
- [ ] record release notes, migration notes and known limitations
- [ ] verify HACS installs the released ZIP rather than an unrelated branch snapshot

## 8. HACS default inclusion

Default-store inclusion is a later publication step, not an Alpha requirement.
Before submitting it:

- [ ] repository is public
- [ ] repository description/topics/issues are valid
- [ ] HACS Action passes without ignored publication checks
- [ ] hassfest passes
- [ ] at least one appropriate GitHub Release exists
- [ ] submit the repository according to the current HACS default-repository process

## Separation from Alpha issue #11

Issue #11 is the real-install functional gate for the current Alpha artifact. It must not be blocked solely because the repository is intentionally still private or because public HACS metadata has not yet been enabled.

Conversely, passing #11 does **not** automatically mean FRAKON Dashboard is ready for public HACS publication. Public distribution requires this checklist as a separate release decision.
