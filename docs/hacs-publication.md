# FRAKON Dashboard — HACS public publication gate

This checklist is intentionally separate from the Home Assistant Alpha gate in issue #11.
A real Home Assistant alpha can be installed and validated manually while the repository remains private. Public HACS distribution must not be claimed until every item below is complete.

## Current repository state

At the time this checklist was updated:

- repository visibility: **private**
- repository description: present
- GitHub Issues: enabled
- repository topics: **none**
- `README.md`: present
- root `hacs.json`: present
- integration manifest: `custom_components/frakon_dashboard/manifest.json`
- manifest integration type: `service`
- manifest IoT class: `calculated`
- local Home Assistant/HACS brand assets: present under `custom_components/frakon_dashboard/brand/`
- hassfest workflow: present
- FRAKON CI: present
- HACS validation workflow: **staged as manual-only** in `.github/workflows/hacs.yml`

The exact current verified Alpha head, workflow run IDs, artifact ID, artifact digest and packaged source/frontend hashes are intentionally **not pinned in this version-controlled checklist**. A documentation-only commit changes the branch head and therefore changes the build identity of the next artifact. Use issue #11 and PR #1 as the live evidence record for the exact Alpha artifact selected for real-install testing.

HACS cannot use private GitHub repositories at all. The private visibility and missing topics are deliberate publication gates, not FRAKON Dashboard runtime defects. Do not attempt to validate or distribute the current private repository through HACS; use the verified Alpha Test Kit / manual Home Assistant installation path for issue #11.

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
  - `frakon`
- [ ] confirm the default branch contains the intended public release state

Do not make the repository public merely to satisfy automated validation before the project is ready for public review.

## 2. HACS integration structure

The repository must continue to have exactly one custom integration under `custom_components/`:

```text
custom_components/frakon_dashboard/
```

All runtime files required by the Home Assistant integration must be contained there. Release packaging may additionally ship the generated `frakon_dashboard.zip` artifact configured by root `hacs.json`.

The generated HACS ZIP uses the **HACS root layout**: `manifest.json`, `__init__.py` and the remaining integration files are at the ZIP root. HACS extracts that archive into its integration directory. Manual installation must therefore create `/config/custom_components/frakon_dashboard` and extract the ZIP directly into that directory rather than extracting it into `/config` or creating another nested `custom_components/` tree.

## 3. Home Assistant manifest

`custom_components/frakon_dashboard/manifest.json` must include the HACS identity keys and the explicit FRAKON runtime contract:

- `domain`
- `name`
- `version`
- `documentation`
- `issue_tracker`
- `codeowners`
- `integration_type: service`
- `iot_class: calculated`
- `config_flow: true`
- `single_config_entry: true`
- dependencies `http` + `lovelace`

The source manifest, HACS ZIP, Alpha Test Kit and installed integration are all checked for this contract. Keep `scripts/verify_manifest_contract.py` green before release work.

## 4. Brand assets

The integration ships local custom-integration brand assets:

```text
custom_components/frakon_dashboard/brand/icon.png
custom_components/frakon_dashboard/brand/icon@2x.png
```

These local assets satisfy the current HACS custom-integration repository brand requirement. Default HACS catalog inclusion is a separate process and its current inclusion checks may additionally require the integration to exist in `home-assistant/brands`; verify that requirement again immediately before a default-catalog submission.

Release invariants:

- [x] `icon.png` is a PNG and exactly 256×256
- [x] `icon@2x.png` is a PNG and exactly 512×512
- [x] source assets are checked by `scripts/verify_brand_assets.py`
- [x] brand packaging/documentation chain is checked by `scripts/verify_brand_release_chain.py`
- [x] HACS ZIP verification checks both packaged files and dimensions
- [x] Alpha Test Kit verification checks both packaged files and dimensions
- [x] installed Home Assistant self-check verifies both installed assets
- [ ] visually verify the integration icon in the real #11 installation on a Home Assistant version supporting local custom-integration brand assets

## 5. HACS validation Action

The official HACS validation workflow is already staged at:

```text
.github/workflows/hacs.yml
```

During Alpha it intentionally exposes only `workflow_dispatch`. Because the repository is private, a HACS validation attempt cannot represent a valid publication result.

Before public validation, expand the workflow to the current HACS-recommended trigger set:

```yaml
on:
  push:
  pull_request:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
```

The staged job already uses:

```yaml
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

Publication checklist:

- [x] HACS validation workflow file exists
- [x] category is `integration`
- [x] workflow is manual-only while the repository is private
- [ ] repository is public before interpreting a HACS run as publication evidence
- [ ] enable push / pull_request / daily schedule triggers for publication maintenance
- [ ] HACS validation Action passes without errors or ignored publication checks

Do not ignore the `description`, `issues` or `topics` checks just to obtain a green result. Fix the repository metadata instead.

## 6. Automated validation

A verified Alpha candidate must pass the complete private-repository preflight before #11 uses its artifact:

- [ ] FRAKON CI
- [ ] hassfest
- [ ] `scripts/verify_manifest_contract.py`
- [ ] `scripts/verify_brand_assets.py`
- [ ] `scripts/verify_brand_release_chain.py`
- [ ] `scripts/verify_dashboard_document_validation.py`
- [ ] `scripts/verify_document_size_parity.py`
- [ ] `scripts/verify_responsive_bundle_validation.py`
- [ ] `scripts/verify_responsive_write_lock.py`
- [ ] `scripts/verify_persistence_integrity_readiness.py`
- [ ] HACS release build and verification
- [ ] Alpha Test Kit build and verification
- [ ] Home Assistant compatibility/manual-install layout verification
- [ ] simulated Home Assistant installation self-check
- [ ] below-minimum Home Assistant rejection probe
- [ ] frontend tamper rejection/restoration probe

The live #11/PR evidence may mark this set complete for a specific immutable artifact. The checkboxes above remain intentionally generic because a later commit or public-release candidate must run them again for its own exact build identity.

Still required for the later **public publication candidate**:

- [ ] #11 real Home Assistant installation evidence is complete
- [ ] repository publication decision has been made and visibility is public
- [ ] repository topics are present
- [ ] HACS validation Action passes on the public repository
- [ ] CI and hassfest pass on the exact public release commit
- [ ] release ZIP is rebuilt/verified from the exact public release commit

The historical billing/spending-limit blocker is resolved. A future workflow that fails to execute still must never be counted as successful validation.

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
- [ ] verify the latest `home-assistant/brands` requirement for default inclusion and satisfy it if required
- [ ] submit the repository according to the current HACS default-repository process

## Separation from Alpha issue #11

Issue #11 is the real-install functional gate for the current Alpha artifact. It must not be blocked solely because the repository is intentionally still private or because public HACS metadata has not yet been enabled.

Conversely, passing #11 does **not** automatically mean FRAKON Dashboard is ready for public HACS publication. Public distribution requires this checklist as a separate release decision.
