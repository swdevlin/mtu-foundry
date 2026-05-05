# My Traveller Universe (MTU)

[![Foundry v12+](https://img.shields.io/badge/foundry-v12%2B-informational)](#compatibility)
[![Verified v13](https://img.shields.io/badge/foundry-v13-verified-success)](#compatibility)
[![Version](https://img.shields.io/github/v/release/swdevlin/mtu-foundry)](https://github.com/swdevlin/mtu-foundry/releases)
[![License](https://img.shields.io/github/license/swdevlin/mtu-foundry)](LICENSE)

Import and sync data from **My Traveller Universe** into Foundry journal entries.

https://mytravelleruniverse.net

---

## Overview

This module connects My Traveller Universe with [Foundry Virtual Tabletop](https://foundryvtt.com), allowing referees to bring generated star systems and stellar data directly into their worlds.

It creates structured journal entries with both player-facing and GM-only views, keeping sensitive information properly gated.

---

## Features

- Import MTU stellar objects using URL or ID
- Automatically creates multi-page journal entries:
  - Player data (live)
  - GM data (live, authenticated)
  - Player image
  - GM image (authenticated)
- Adds **Import MTU** button to the Journal Directory
- Adds right-click context options for:
  - Refreshing entries from MTU
  - Updating existing imports
- Secure GM data access via API key

---

## Usage

1. Open the **Journal Directory**
2. Click **Import MTU**
3. Paste either:
  - A full URL  
    `https://mytravelleruniverse.net/c/<campaign>/stellar_objects/<id>`
  - or just the numeric ID
4. The module creates a journal entry with linked MTU content

Imported entries are tagged, allowing future refresh without duplication.

---

## GM Image Handling

Foundry image pages load using a plain `src` and do not support custom headers.

Because MTU protects GM-only images, those pages are rendered as live MTU-backed views inside a dedicated viewer instead of standard image pages.

---

## Installation

Install the module through Foundry’s **Install Module** interface using the module browser.

---

## Settings

| Setting | Scope | Description |
|--------|------|-------------|
| MTU API Key | World | Used for authenticated GM-only requests |
| Default Journal Folder | World | Destination folder for imported entries |

---

## Compatibility

- Minimum: Foundry VTT v12
- Verified: Foundry VTT v13

---

## Limitations

- Requires access to MTU data
- GM-only pages require a valid API key
- Live pages depend on MTU availability

---

## Platform Compatibility & Licensing

This module is designed for use with [Foundry Virtual Tabletop](https://foundryvtt.com).

Foundry Virtual Tabletop is proprietary software and is not included with this module.  
Use of Foundry VTT is subject to the  
[Foundry Virtual Tabletop License Agreement](https://foundryvtt.com/article/license/).

This module is developed under the Foundry VTT Limited License for module development.

---

## Traveller Fair Use

This project makes use of material from the Traveller role-playing game system.

Traveller and related marks are owned by Mongoose Publishing.  
This project is not affiliated with or endorsed by Mongoose Publishing.

Use of Traveller-related content is in accordance with the  
[Traveller Fair Use Policy](https://cdn.shopify.com/s/files/1/0609/6139/0839/files/Traveller_2300AD_Twilight_2000_Fair_Use_Policy_2025.pdf)

---

## License (Module Code)

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for details.
