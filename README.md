# MTU Journals

A Foundry VTT v12-13 module for importing MyTravellerUniverse data into Foundry journals.

## What it does

- Adds an **Import MTU URL** button to the Journal Directory.
- Creates a journal entry from a URL like:
  - `https://mytravelleruniverse.net/c/revelation/stellar_objects/7873189`
- Can create:
  - a live player data page
  - a live GM data page
  - a standard player image page
  - a live GM image page
- Uses a bearer token for GM-only MTU fetches.

## Why the GM image is a live page instead of a normal image page

Foundry's built-in image pages load via a plain `src` URL. They do not send custom bearer headers, so a protected GM-only SVG cannot safely be a stock image page. This module therefore creates the GM image as a live MTU-backed page rendered in a viewer application.

## Installation

Copy this folder into:

`Data/modules/my-traveller-universe`

Then enable the module in your world.

## Settings

- **MTU API key**: client-side setting used when a GM opens authenticated pages.
- **Default journal folder**: world setting for imported entries.

## Notes

This is a practical first pass, not a polished marketplace package. The live MTU pages open in a dedicated viewer window from the journal sheet header.
