# Playwright happy-path tests

Loads the unpacked extension into a real Chromium instance and verifies
the four toggle combinations end-to-end on a YouTube video with a known
transcript.

## Run

```
npm run build      # ensure popup.css is fresh
npm test
```

The test uses a video with a public, stable transcript. If it ever breaks
because the test video changed, swap `TEST_VIDEO_URL` in `popup.spec.mjs`
for another video that has a transcript panel available.
