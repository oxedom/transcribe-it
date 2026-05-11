import { test, expect, chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, "..", "..");

// A YouTube talk with a stable English transcript.
// Replace if it ever becomes unavailable.
const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=arj7oStGLkU";

async function launchWithExtension() {
  const userDataDir = path.resolve(__dirname, ".user-data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      "--no-first-run",
    ],
  });
  const [serviceWorker] = context.serviceWorkers();
  const sw = serviceWorker ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(sw.url()).host;
  return { context, extensionId };
}

async function setSettings(context, extensionId, settings) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.evaluate(async (s) => {
    await chrome.storage.sync.set({ transcribeItSettings: s });
  }, settings);
  await popup.close();
}

async function readClipboard(page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

test("transcript copy honours settings across all 4 combinations", async () => {
  const { context, extensionId } = await launchWithExtension();
  try {
    const page = await context.newPage();
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "https://www.youtube.com",
    });

    await page.goto(TEST_VIDEO_URL);
    await page.locator("#yt-transcribe-copy-btn").waitFor({ timeout: 15000 });

    // Seek to a known time used by the timestamp-on cases.
    await page.evaluate(() => {
      const v = document.querySelector("video");
      v.pause();
      v.currentTime = 30;
    });

    const combos = [
      { copyUpToCurrentTime: false, prependPrompt: false, promptText: "TEST_PROMPT" },
      { copyUpToCurrentTime: false, prependPrompt: true, promptText: "TEST_PROMPT" },
      { copyUpToCurrentTime: true, prependPrompt: false, promptText: "TEST_PROMPT" },
      { copyUpToCurrentTime: true, prependPrompt: true, promptText: "TEST_PROMPT" },
    ];

    for (const s of combos) {
      await setSettings(context, extensionId, s);
      await page.bringToFront();
      await page.click("#yt-transcribe-copy-btn");

      // Wait for the success label to appear (label contains "Copied")
      await expect(page.locator("#yt-transcribe-copy-btn")).toContainText(/Copied/i, {
        timeout: 15000,
      });

      const text = await readClipboard(page);

      if (s.prependPrompt) {
        expect(text.startsWith("TEST_PROMPT\n\n")).toBe(true);
      } else {
        expect(text.startsWith("TEST_PROMPT")).toBe(false);
      }

      // First content line after any prompt should be a "[timestamp] text" line.
      const body = s.prependPrompt ? text.slice("TEST_PROMPT\n\n".length) : text;
      expect(body).toMatch(/^\[\d+:\d{2}(?::\d{2})?\] /m);

      if (s.copyUpToCurrentTime) {
        // No segment timestamp in the body should exceed 30 seconds.
        const lines = body.split("\n").filter(Boolean);
        for (const line of lines) {
          const m = line.match(/^\[(\d+(?::\d+)+)\]/);
          if (!m) continue;
          const parts = m[1].split(":").map(Number);
          const secs = parts.reduce((acc, n) => acc * 60 + n, 0);
          expect(secs).toBeLessThanOrEqual(30);
        }
      }
    }
  } finally {
    await context.close();
  }
});
