# Release Guide

## Prepare a local release

Run:

```powershell
npm test
npm run package
```

The release zip is written to:

`release\steam-multi-region-helper-v0.1.0.zip`

## Release contents

The zip contains the plugin folder expected by Millennium:

`steam-multi-region-helper`

It includes:

- `plugin.json`
- `.millennium`
- `backend`
- `README.md`
- `README.zh-CN.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `CHANGELOG.md`
- `docs`

It does not include the development test suite or local install script.

## GitHub release checklist

1. Confirm `npm test` passes.
2. Confirm `npm run package` creates the zip.
3. Create a GitHub release tag such as `v0.1.0`.
4. Upload `release\steam-multi-region-helper-v0.1.0.zip`.
5. In the release notes, state clearly that the plugin only compares current Steam prices and owned status.
6. Mention that SteamDB historical lows should still be checked manually.
7. Mention that this is an unofficial third-party plugin and users should review Steam/Millennium risks themselves.
