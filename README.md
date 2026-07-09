# Steam Multi-Region Helper

A small Millennium plugin for the Steam desktop client.

It shows current Steam prices and owned status for the regions/accounts you configure. It is meant for users who already own multiple Steam accounts and want a quick way to avoid duplicate purchases.

![Status](https://img.shields.io/badge/status-v0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20Steam-66c0f4)

## What it does

- Adds a compact panel to Steam store app pages.
- Lets you configure any number of region/account rows.
- Provides country/region presets and still allows custom two-letter Steam country codes.
- Each row has a display name, Steam country code, and optional SteamID64.
- Compares current Steam Store prices through Steam's store appdetails endpoint.
- Checks owned games through Steam Web API when a SteamID64 is provided.
- Links to SteamDB for manual historical-price checks.

## What it does not do

- It does not buy games.
- It does not bypass region restrictions.
- It does not scrape SteamDB.
- It does not try to determine historical lows.

## Data sources

- Current prices: `https://store.steampowered.com/api/appdetails`
- Owned games: `https://api.steampowered.com/IPlayerService/GetOwnedGames`
- Exchange rates: `https://open.er-api.com/v6/latest/CNY`
- Historical price checks: manual SteamDB link only

## Install

See [docs/INSTALL.md](docs/INSTALL.md).

Short version:

1. Install Millennium for the Steam desktop client.
2. Download a release zip.
3. Extract it into your Steam Millennium plugin folder.
4. Restart Steam and enable the plugin.
5. Open a Steam store app page and configure the helper.

## Development

```powershell
npm test
npm run build
npm run install:local
npm run package
```

`npm run package` creates:

`release\steam-multi-region-helper-v0.1.0.zip`

## Local install path

This working copy is intended to be copied into:

`D:\Program Files (x86)\Steam\millennium\plugins\steam-region-buyer`

The plugin id is still `steam-region-buyer` for local compatibility with the existing installed copy.
