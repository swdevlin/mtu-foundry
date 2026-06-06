# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Foundry VTT module (v12 & v13 compatible) that imports stellar object data from the MyTravellerUniverse (MTU) API into Foundry journal entries. Written in vanilla ES6 JavaScript — no build step, no npm, no TypeScript.

## Development & Deployment

There are no build tools or test runners. Development is done by editing files directly and deploying to a local Foundry installation.

**Local deploy** (copies files to Foundry's modules directory):
```powershell
.\deploy.ps1
```

**Release** is automated via GitHub Actions (`.github/workflows/release.yaml`) — triggered on GitHub release publication, validates that the tag matches `module.json` version, then packages and uploads `my-traveller-universe.zip`.

To bump a release, update `version` in `module.json` and create a matching GitHub release tag.

## Architecture

All logic lives in `scripts/`. Files are loaded in this order (declared in `module.json`):
1. `mtu-lookups.js` — static lookup tables mapping Traveller UWP codes to human-readable text
2. `mtu-api.js` — MTU API client and data transformation functions
3. `import-dialog.js` — `MtuImportDialog` FormApplication class
4. `main.js` — Foundry hook registration and UI wiring

**Data flow for a new import:**
1. User clicks "Import MTU URL" in the Journal Directory → `MtuImportDialog` opens
2. Input parsed by `parseStellarObjectInput()` (accepts full URL or bare numeric ID)
3. `fetchStellarObject()` calls the MTU API with a bearer token
4. Raw payload transformed by `buildPlayerData()` and `buildGmData()`
5. Data rendered to HTML via Handlebars templates (`mtu-player.html`, `mtu-gm.html`)
6. Journal entry created with pages; Foundry flags store the source URL for later refresh

**Refresh flow:** Right-click a journal entry or page → "Refresh from MTU" → re-fetches and re-renders in place.

## Key Patterns

**v12/v13 compatibility** — `main.js` has conditional branches throughout. v12 uses jQuery-style DOM manipulation on `html[0]`; v13 uses native DOM on `html` directly. Always maintain both branches when touching UI code.

**Foundry flags** — Source metadata is stored on journal entries/pages using `setFlag('my-traveller-universe', ...)`. These flags are what enables the refresh context menu action.

**Localization** — All user-visible strings live in `lang/en.json` under `MTU.*` keys. Use `game.i18n.localize()` or `game.i18n.format()` rather than hardcoding strings.

**Settings** — Three world-scoped settings registered in `main.js`: `apiKey`, `campaignSlug`, `defaultFolderName`. Access via `game.settings.get('my-traveller-universe', key)`.

## Module Manifest

`module.json` is the authoritative source for the module ID (`my-traveller-universe`), Foundry compatibility range, and script load order. Keep `version` here in sync with release tags.
