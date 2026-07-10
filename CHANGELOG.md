# Changelog

## 0.1.2

- Replace the external `curl.exe` owned-game requests with Millennium's built-in HTTP client.
- Prevent visible Command Prompt windows during owned-game checks.
- Keep multi-account owned-game checks within Millennium's 30-second RPC limit by applying per-request and total time budgets.
- Add a regression test that rejects external command execution in the Lua backend.

## 0.1.1

- Add configurable display currency for approximate comparisons and best-current-price ranking.
- Add real Steam client screenshots to the README files, including a redacted settings example and owned-status example.
- Document DLC, bundle, edition, and package ownership-check limits.
- Update install and release docs for the 0.1.1 package.

## 0.1.0

- Add a Steam client store-page panel through Millennium.
- Compare current Steam Store prices for configured country codes.
- Check owned-game status through Steam Web API for configured SteamID64 accounts.
- Add customizable account rows with country/region presets and custom country-code support.
- Add a manual SteamDB link for historical-price review.
- Add local install and release packaging scripts.
- Rename the public plugin id to `steam-multi-region-helper`.
- Add English and Chinese documentation, contribution notes, and privacy/Steam boundary notes.
