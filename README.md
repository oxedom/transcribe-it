# transcribe-it 📋

A tiny Chrome extension that adds a one-click **Copy transcript** button to every YouTube video — full transcript with timestamps, straight to your clipboard.

## The problem

YouTube's built-in transcript flow is annoying:

1. Click `...more` to expand the description.
2. Scroll down and click **Show transcript**.
3. Scroll the side panel manually.
4. Select all the text by hand and `Ctrl+C`.

That's four steps and a hand-selection every time you want to feed a video into an LLM, search a quote, or save a reference.

## The fix

transcribe-it injects a purple **Copy transcript** button right next to Like / Share. One click and the entire transcript — timestamps included — is on your clipboard.

```
[0:00] Never gonna give you up
[0:04] Never gonna let you down
[0:08] Never gonna run around and desert you
...
```

## How it works 🛠️

It's pure client-side DOM automation — no servers, no API keys, no tracking.

1. Detects when you're on a `/watch` page and injects the button into the action row.
2. On click, programmatically opens YouTube's native transcript panel (clicking "Show transcript" for you, expanding the description first if needed).
3. Waits for the `<ytd-transcript-segment-renderer>` elements to hydrate.
4. Reads each segment's `.segment-timestamp` and `.segment-text`, joins them as `[mm:ss] text` lines, and writes the result via `navigator.clipboard.writeText`.
5. The button briefly flips to `Copied N lines` so you know it worked.

It also listens for YouTube's `yt-navigate-finish` SPA event so the button reappears when you switch videos without a full reload.

## Install 🚀

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Refresh any open YouTube tab — the purple button shows up next to Like / Share.

Works in any Chromium-based browser (Chrome, Edge, Brave, Arc).

## Limitations

- Only works on videos that actually have a transcript (manual or auto-generated captions).
- If a video has no captions in any language, the button will say `No transcript available`.
- Tested on the standard YouTube watch page; YouTube Music and Shorts are out of scope.

## Files

- `manifest.json` — Manifest V3 config, single `clipboardWrite` permission.
- `content.js` — the entire extension, ~190 lines, no build step, no dependencies.

That's it. Keep it simple. ✨
