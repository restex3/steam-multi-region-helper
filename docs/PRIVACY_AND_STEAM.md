# Privacy and Steam Notes

Steam Multi-Region Helper is an unofficial third-party Millennium plugin. It is not affiliated with, endorsed by, or supported by Valve or Steam.

## What data stays local

The plugin stores these settings in local Steam client web storage on your machine:

- Steam Web API key
- configured account labels
- configured two-letter country codes
- configured SteamID64 values
- short-lived exchange-rate cache
- owned-game cache used by the panel

The project does not operate a server and does not upload those settings to the project author.

## What network requests it makes

The plugin may request:

- Steam Store app details for current regional price display.
- Steam Web API `GetOwnedGames` responses when you provide an API key and SteamID64.
- Exchange-rate data from `open.er-api.com`.
- SteamDB only when you manually open the link.

## What it avoids

- No Steam password collection.
- No automatic purchasing.
- No regional-restriction bypass.
- No SteamDB scraping.
- No project-run telemetry.

## Ownership check limits

Owned status is checked by appid through Steam Web API. DLC, bundles, editions, and package pages can have more complicated ownership rules than a single appid. Treat owned status as a quick store-page hint, not as a full entitlement audit for every DLC or package case.

## Steam risk boundary

Third-party Steam client plugins can carry compatibility and account-policy risk. This project tries to stay narrow and read-only, but it cannot provide legal or account-safety guarantees.

Review Steam's current agreements, Steam Web API terms, and Millennium's own documentation before using the plugin.
