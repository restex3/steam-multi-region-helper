# Contributing

Pull requests are welcome. Please keep this project small, readable, and honest about its limits.

## Project scope

Good fits:

- Improve the Steam client panel UI.
- Improve country/region presets.
- Improve install or troubleshooting docs.
- Fix owned-game checks that use Steam Web API.
- Fix current-price display that uses Steam's store responses.
- Add tests for parsing, settings, packaging, or compatibility.

Out of scope:

- Automatic purchasing.
- Bypassing regional restrictions.
- SteamDB scraping.
- Historical-low tracking through unofficial scraping.
- Collecting user data on a project server.
- Asking users for Steam passwords.

## Development setup

Run:

```powershell
npm test
npm run build
```

For local Steam testing:

```powershell
npm run install:local
```

For release packaging:

```powershell
npm run package
```

## Pull request checklist

- Keep changes focused.
- Do not commit API keys, SteamID64 values from real accounts, local usernames, or local paths.
- Add or update tests when behavior changes.
- Run `npm test` before opening the PR.
- Update `README.md`, `README.zh-CN.md`, or docs when user-facing behavior changes.

## Privacy checklist

Before pushing, scan for private data:

```powershell
rg -n "7656119|apikey|apiKey|Steam Web API Key|C:\\Users|E:\\\\.*Projects" .
```

This simple scan is not perfect, but it catches the common mistakes.
