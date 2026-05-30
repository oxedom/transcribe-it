# Releasing

Releases to the Chrome Web Store are automated via
[`.github/workflows/release.yml`](../.github/workflows/release.yml).

## Cut a release

1. Bump the version in `manifest.json` (and `package.json` to match).
2. Commit the bump.
3. Tag and push:

   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

The workflow builds the CSS, zips the extension, and uploads + publishes it.
**Publishing submits to Google's review queue** — it can take from a few hours
to a few days to go live. You can watch progress in the Actions tab and in the
[Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole).

You can also trigger a run manually from the **Actions** tab
("Release to Chrome Web Store" → *Run workflow*).

## Required GitHub Actions secrets

Set under *Settings → Secrets and variables → Actions*:

| Secret | What it is |
| --- | --- |
| `CHROME_EXTENSION_ID` | The extension's ID (from the dashboard URL). |
| `CHROME_CLIENT_ID` | OAuth 2.0 client ID (Google Cloud Console). |
| `CHROME_CLIENT_SECRET` | OAuth 2.0 client secret. |
| `CHROME_REFRESH_TOKEN` | Long-lived OAuth refresh token with the `chromewebstore` scope. |

> The OAuth consent screen must be **In production** (not "Testing"), otherwise
> the refresh token expires after 7 days and the pipeline breaks.

## Regenerating the refresh token

If publishes start failing with an auth error, mint a new refresh token and
update the `CHROME_REFRESH_TOKEN` secret. See the Google OAuth flow used during
initial setup (Chrome Web Store API, scope
`https://www.googleapis.com/auth/chromewebstore`).
