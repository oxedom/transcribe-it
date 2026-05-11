# Privacy Policy

**Effective date:** 2026-05-11

transcribed is a Chrome extension that adds a one-click button to copy a YouTube video's transcript with timestamps.

## Data collection

transcribed does not collect, store, transmit, or share any personal information or user data.

- No analytics, tracking, or telemetry.
- No data is sent to any remote server.
- No accounts, sign-in, or identifiers.
- No cookies are set or read.

## How it works

All processing happens locally in your browser:

1. When you click the button on a YouTube video page, the extension reads the transcript that YouTube has already loaded in the page.
2. The transcript text is formatted with timestamps.
3. The result is written to your local system clipboard using the standard browser clipboard API.

The transcript never leaves your device through this extension.

## Permissions

- `clipboardWrite` — used solely to copy the transcript to your clipboard when you click the button.
- `host_permissions` for `https://www.youtube.com/*` — used solely to inject the content script that adds the button on YouTube video pages.

The extension does not run on any other site.

## Third parties

transcribed does not use any third-party services, SDKs, or remote code.

## Changes

If this policy ever changes, the updated version will be published in this repository.

## Contact

Questions: open an issue on the project's GitHub repository.
