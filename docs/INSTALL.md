# Installation

Steam Multi-Region Helper is a small Millennium plugin for the Steam desktop client.

## Requirements

- Windows Steam desktop client.
- Millennium installed in your Steam folder.
- A Steam Web API key if you want owned-game checks.
- The SteamID64 for each account you want to check.

## Install from a release zip

1. Download `steam-multi-region-helper-v0.1.0.zip` from the GitHub release.
2. Close Steam completely.
3. Open your Steam Millennium plugin folder:

   `D:\Program Files (x86)\Steam\millennium\plugins`

4. Extract the zip so the folder below exists:

   `D:\Program Files (x86)\Steam\millennium\plugins\steam-region-buyer`

5. Start Steam.
6. Open a Steam store app page such as:

   `https://store.steampowered.com/app/1091500/`

7. Open the helper settings panel, add your API key, and add the accounts you want to compare.

## Find your Steam Web API key

Open:

`https://steamcommunity.com/dev/apikey`

Create a key for personal use. The plugin stores it in Steam client's local storage on your own machine.

## Find a SteamID64

Open a profile URL like:

`https://steamcommunity.com/profiles/76561198000000000/`

The 17-digit number is the SteamID64.

For custom profile URLs, open the profile in a browser and use Steam's profile details page or a SteamID lookup website to convert it to SteamID64.

## Country and region codes

The settings panel has presets for common Steam country codes such as China, Russia, Turkey/MENA, Ukraine, Japan, United States, and several others.

You can still choose `Custom country code` and enter any two-letter Steam country code manually. This is useful because Steam regional pricing coverage changes over time.

## Troubleshooting

- If the panel does not appear, make sure you are on a real `/app/<appid>/` store page. The panel intentionally does not appear on age-check pages.
- If owned status does not load, check that the API key is valid and the account's game details are visible to the Steam Web API.
- If a regional price is missing, Steam may not have a public price for that country code, or the game may not be available in that region.
- If Steam clears or disables the plugin, close Steam, reinstall the release folder, and confirm Millennium lists the plugin as enabled.
