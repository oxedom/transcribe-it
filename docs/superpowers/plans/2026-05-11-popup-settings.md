# Popup Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toolbar popup with two persistent settings — copy-up-to-current-playback-time and prepend-prompt — and wire them into the existing copy-transcript flow.

**Architecture:** A single-key `chrome.storage.sync` settings object is read by `content.js` at click time and written by `popup.js` on input change. Defaults live in a shared `defaults.js` loaded by both surfaces. Popup is plain HTML styled with precompiled Tailwind using shadcn design tokens.

**Tech Stack:** Manifest V3 Chrome extension, vanilla JS (no framework), Tailwind CSS 3 (precompiled), Playwright CLI for happy-path verification.

**Spec:** `docs/superpowers/specs/2026-05-11-popup-settings-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `defaults.js` | new | Export `DEFAULT_PROMPT` (long string) and `DEFAULT_SETTINGS` (object). Sole source of truth for defaults. |
| `popup.html` | new | Markup for settings popup: two switches, textarea, reset button, confirm dialog. |
| `popup.js` | new | Load/save settings, wire form events, dark-mode class toggle, reset dialog. |
| `src/input.css` | new | Tailwind directives + shadcn light/dark tokens. |
| `popup.css` | new (generated, committed) | Compiled Tailwind output. |
| `tailwind.config.js` | new | Tailwind config: content globs, `darkMode: 'class'`, HSL color mappings to tokens. |
| `package.json` | new | Dev-dep `tailwindcss`, scripts `build`/`watch`. |
| `.gitignore` | new | Ignore `node_modules/`. |
| `manifest.json` | modify | Bump version, add `storage` permission, add `action.default_popup`, prepend `defaults.js` to content_scripts. |
| `content.js` | modify | Read settings on click, filter segments by `currentTime`, prepend prompt, update success label. |
| `README.md` | modify | Document popup, settings behavior, build steps. |
| `tests/playwright/popup.spec.mjs` | new | Playwright happy-path check across the four toggle combinations. |
| `tests/playwright/README.md` | new | How to run the Playwright tests. |

---

## Task 1: Add defaults module

**Files:**
- Create: `defaults.js`

- [ ] **Step 1: Create `defaults.js` with the shipped default prompt and settings object**

```js
// defaults.js — shared between popup and content script.
// Loaded as a plain script (no module system) so both contexts can use it.

const DEFAULT_PROMPT = `I'll paste a YouTube transcript or article. Convert it into a readable HTML document optimized for reading instead of watching/scrolling the original. Requirements:
Content:

    Lead with a TL;DR (3–5 bullets — actual takeaways, not "the author discusses X")
    Then a structured breakdown with descriptive section headers organized logically, not chronologically
    Summarize, but don't lose information density. Preserve specific claims, numbers, names, examples, and any concrete prompts/code/commands verbatim — those are usually the highest-signal parts and summarization tends to flatten them
    English by default
    Cut filler, false starts, ads, sponsor reads, repetition, and throat-clearing
    End with a "Notable" section: counterintuitive points, hot takes, surprising data, or memorable quotes

    If the source has an FAQ or Q&A, preserve it as its own section — don't fold it into prose
    Format — single HTML file using Tailwind via CDN:
    <script src="https://cdn.tailwindcss.com"></script> in the head
    Readable typography: serif or well-chosen sans for body, generous line-height (leading-relaxed or leading-7), max-w-3xl centered, prose-like spacing
    Clear visual hierarchy: distinct heading sizes, subtle dividers between sections, callout boxes for TL;DR and Notable
    Code blocks and example prompts in monospace with proper background and padding — these need to look quotable, not buried
    Mobile responsive

    No external images, no JS frameworks, no build step — pure HTML + Tailwind CDN + minimal vanilla JS only if the toggle needs it
    Behavior:
    Ask before starting if the source is unusually long, low-signal, or ambiguous in scope
    Output the HTML as a file I can save, not inline in chat`;

const DEFAULT_SETTINGS = {
  copyUpToCurrentTime: false,
  prependPrompt: true,
  promptText: DEFAULT_PROMPT,
};

const SETTINGS_KEY = "transcribedSettings";

// Expose on globalThis so both content-script and popup contexts can read them
// without an ES module loader.
globalThis.TranscribedDefaults = { DEFAULT_PROMPT, DEFAULT_SETTINGS, SETTINGS_KEY };
```

- [ ] **Step 2: Manually verify the file loads in a browser**

Run: open `defaults.js` in any browser tab via `file://` or paste contents into DevTools console.
Expected: `TranscribedDefaults.DEFAULT_SETTINGS.prependPrompt === true` evaluates to `true`.

- [ ] **Step 3: Commit**

```bash
git add defaults.js
git commit -m "feat: add shared defaults module for popup settings"
```

---

## Task 2: Set up Tailwind build pipeline

**Files:**
- Create: `package.json`
- Create: `tailwind.config.js`
- Create: `src/input.css`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "transcribed",
  "version": "1.1.0",
  "private": true,
  "scripts": {
    "build": "tailwindcss -i src/input.css -o popup.css --minify",
    "watch": "tailwindcss -i src/input.css -o popup.css --watch"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0"
  }
}
```

- [ ] **Step 3: Create `tailwind.config.js` that maps the shadcn HSL tokens to Tailwind color names**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./popup.html", "./popup.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create `src/input.css` with the user-provided shadcn tokens**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 36 45% 97%;
    --foreground: 180 5% 12%;
    --card: 0 0% 100%;
    --card-foreground: 180 5% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 180 5% 12%;
    --primary: 175 66% 18%;
    --primary-foreground: 0 0% 98%;
    --secondary: 36 20% 93%;
    --secondary-foreground: 180 5% 12%;
    --muted: 36 20% 93%;
    --muted-foreground: 169 7% 40%;
    --accent: 32 65% 46%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 36 18% 88%;
    --input: 36 18% 88%;
    --ring: 175 66% 18%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 20% 7%;
    --foreground: 210 15% 88%;
    --card: 220 18% 11%;
    --card-foreground: 210 15% 88%;
    --popover: 220 18% 11%;
    --popover-foreground: 210 15% 88%;
    --primary: 175 55% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 16%;
    --secondary-foreground: 210 12% 80%;
    --muted: 220 14% 16%;
    --muted-foreground: 215 10% 50%;
    --accent: 32 60% 52%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 65% 48%;
    --destructive-foreground: 0 0% 98%;
    --border: 220 12% 17%;
    --input: 220 14% 20%;
    --ring: 175 55% 40%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
}

/* Switch component (shadcn-style, no React) */
@layer components {
  .switch-root {
    @apply relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors;
    @apply bg-input;
  }
  .switch-root[data-state="checked"] {
    @apply bg-primary;
  }
  .switch-thumb {
    @apply pointer-events-none block h-4 w-4 rounded-full bg-background shadow-md ring-0 transition-transform;
    transform: translateX(2px);
  }
  .switch-root[data-state="checked"] .switch-thumb {
    transform: translateX(18px);
  }
}
```

- [ ] **Step 5: Install and run the build**

Run: `npm install && npm run build`
Expected: `popup.css` file is created in the repo root. No errors.

- [ ] **Step 6: Verify `popup.css` is non-empty**

Run: `wc -c popup.css`
Expected: a number greater than 1000 (the file contains minified Tailwind base + utilities).

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tailwind.config.js src/input.css popup.css
git commit -m "build: add Tailwind pipeline with shadcn design tokens"
```

---

## Task 3: Build popup HTML

**Files:**
- Create: `popup.html`

- [ ] **Step 1: Write `popup.html` with the full settings layout and confirm dialog**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>transcribed settings</title>
    <link rel="stylesheet" href="popup.css" />
    <style>
      /* Popup is fixed-width; the body provides the visible chrome. */
      html, body { width: 360px; }
      body { margin: 0; }
    </style>
  </head>
  <body class="bg-background text-foreground">
    <main class="p-4 space-y-4">
      <header>
        <h1 class="text-base font-semibold">transcribed</h1>
        <p class="text-xs text-muted-foreground">Settings</p>
      </header>

      <section class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <label for="toggle-up-to" class="text-sm font-medium">Copy only up to current time</label>
            <p class="text-xs text-muted-foreground">Stops at the video's current playback position.</p>
          </div>
          <button
            id="toggle-up-to"
            type="button"
            role="switch"
            aria-checked="false"
            class="switch-root"
            data-state="unchecked"
          >
            <span class="switch-thumb"></span>
          </button>
        </div>

        <div class="flex items-start justify-between gap-3">
          <label for="toggle-prepend" class="text-sm font-medium">Prepend prompt to clipboard</label>
          <button
            id="toggle-prepend"
            type="button"
            role="switch"
            aria-checked="true"
            class="switch-root"
            data-state="checked"
          >
            <span class="switch-thumb"></span>
          </button>
        </div>
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="prompt-text" class="text-sm font-medium">Prompt</label>
          <button
            id="reset-btn"
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Reset to default
          </button>
        </div>
        <textarea
          id="prompt-text"
          rows="10"
          class="w-full rounded-md border border-input bg-card text-card-foreground p-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          spellcheck="false"
        ></textarea>
      </section>

      <p
        id="saved-indicator"
        class="text-xs text-muted-foreground opacity-0 transition-opacity"
        aria-live="polite"
      >
        Saved
      </p>
    </main>

    <dialog
      id="reset-dialog"
      class="rounded-lg border border-border bg-popover text-popover-foreground p-0 backdrop:bg-black/40 max-w-xs"
    >
      <form method="dialog" class="p-4 space-y-3">
        <h2 class="text-sm font-semibold">Reset prompt to default?</h2>
        <p class="text-xs text-muted-foreground">
          This will replace the current prompt text. This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <button
            value="cancel"
            class="px-3 py-1.5 text-xs rounded-md border border-input hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            value="confirm"
            class="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
          >
            Reset
          </button>
        </div>
      </form>
    </dialog>

    <script src="defaults.js"></script>
    <script src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Rebuild CSS so any new utility classes are picked up**

Run: `npm run build`
Expected: `popup.css` regenerates with no errors.

- [ ] **Step 3: Commit**

```bash
git add popup.html popup.css
git commit -m "feat: add settings popup markup"
```

---

## Task 4: Wire popup behavior

**Files:**
- Create: `popup.js`

- [ ] **Step 1: Write `popup.js` to load/save settings, handle toggles and reset dialog**

```js
// popup.js — runs in the extension popup. defaults.js loaded before this script.

const { DEFAULT_SETTINGS, SETTINGS_KEY } = globalThis.TranscribedDefaults;

const els = {
  toggleUpTo: document.getElementById("toggle-up-to"),
  togglePrepend: document.getElementById("toggle-prepend"),
  promptText: document.getElementById("prompt-text"),
  resetBtn: document.getElementById("reset-btn"),
  resetDialog: document.getElementById("reset-dialog"),
  savedIndicator: document.getElementById("saved-indicator"),
};

function applyTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
}

function setSwitch(el, on) {
  el.dataset.state = on ? "checked" : "unchecked";
  el.setAttribute("aria-checked", on ? "true" : "false");
}

function readSwitch(el) {
  return el.dataset.state === "checked";
}

function render(settings) {
  setSwitch(els.toggleUpTo, settings.copyUpToCurrentTime);
  setSwitch(els.togglePrepend, settings.prependPrompt);
  els.promptText.value = settings.promptText;
}

function currentSettings() {
  return {
    copyUpToCurrentTime: readSwitch(els.toggleUpTo),
    prependPrompt: readSwitch(els.togglePrepend),
    promptText: els.promptText.value,
  };
}

let savedTimeout = null;
function flashSaved() {
  els.savedIndicator.style.opacity = "1";
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => {
    els.savedIndicator.style.opacity = "0";
  }, 1200);
}

async function save() {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: currentSettings() });
  flashSaved();
}

async function init() {
  applyTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
  render(settings);

  for (const sw of [els.toggleUpTo, els.togglePrepend]) {
    sw.addEventListener("click", () => {
      setSwitch(sw, !readSwitch(sw));
      save();
    });
  }

  els.promptText.addEventListener("input", save);

  els.resetBtn.addEventListener("click", () => els.resetDialog.showModal());
  els.resetDialog.addEventListener("close", () => {
    if (els.resetDialog.returnValue === "confirm") {
      els.promptText.value = DEFAULT_SETTINGS.promptText;
      save();
    }
  });
}

init();
```

- [ ] **Step 2: Commit**

```bash
git add popup.js
git commit -m "feat: implement popup settings logic and reset dialog"
```

---

## Task 5: Update manifest

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Replace `manifest.json` contents**

```json
{
  "manifest_version": 3,
  "name": "transcribed",
  "version": "1.1.0",
  "description": "Adds a one-click button to copy a YouTube video's transcript with timestamps.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["clipboardWrite", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["defaults.js", "content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Sanity-check the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))"`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: wire popup and storage permission into manifest"
```

---

## Task 6: Apply settings in content script

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add helpers and rewrite `copyTranscript` to use settings**

Replace the entire contents of `content.js` with:

```js
(() => {
  const BTN_ID = "yt-transcribe-copy-btn";
  const { DEFAULT_SETTINGS, SETTINGS_KEY } = globalThis.TranscribedDefaults;

  const STYLE = `
    #${BTN_ID} {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0F4D49;
      color: #ffffff;
      border: none;
      border-radius: 18px;
      padding: 0 14px;
      height: 36px;
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 8px;
      transition: background 0.15s ease;
      white-space: nowrap;
    }
    #${BTN_ID}:hover { background: #14625C; }
    #${BTN_ID}:active { background: #0A3835; }
    #${BTN_ID}[disabled] { opacity: 0.7; cursor: default; }
    #${BTN_ID} svg { width: 20px; height: 20px; display: block; }
  `;

  const ICON_SVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#C2761F" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 19 57 L 19 21 A 8 8 0 0 1 27 13 L 56 13"/>
        <rect x="31" y="22" width="50" height="70" rx="8"/>
      </g>
    </svg>
  `;

  function injectStyle() {
    if (document.getElementById("yt-transcribe-style")) return;
    const s = document.createElement("style");
    s.id = "yt-transcribe-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function waitFor(fn, { timeout = 8000, interval = 150 } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const v = fn();
      if (v) return v;
      await sleep(interval);
    }
    return null;
  }

  function getTranscriptPanel() {
    return document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
    );
  }

  function getSegments() {
    return document.querySelectorAll("ytd-transcript-segment-renderer");
  }

  async function ensureTranscriptOpen() {
    let panel = getTranscriptPanel();
    if (panel && panel.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED") {
      return panel;
    }

    const descBtn = document.querySelector(
      "ytd-video-description-transcript-section-renderer button"
    );
    if (descBtn) {
      descBtn.click();
    } else {
      const expand = document.querySelector("tp-yt-paper-button#expand");
      if (expand) {
        expand.click();
        await sleep(400);
        const retry = document.querySelector(
          "ytd-video-description-transcript-section-renderer button"
        );
        if (retry) retry.click();
      }
    }

    panel = await waitFor(() => {
      const p = getTranscriptPanel();
      return p && p.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED" ? p : null;
    });
    return panel;
  }

  function parseTs(ts) {
    if (!ts) return null;
    const parts = ts.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }

  function readSegment(seg) {
    const ts = seg.querySelector(".segment-timestamp")?.textContent?.trim() || "";
    const text = seg.querySelector(".segment-text")?.textContent?.trim() || "";
    return { ts, text };
  }

  function filterSegmentsByTime(segments, currentTime) {
    if (!Number.isFinite(currentTime) || currentTime <= 0) {
      return Array.from(segments).map(readSegment).filter(s => s.text);
    }
    const out = [];
    for (const seg of segments) {
      const parsed = readSegment(seg);
      if (!parsed.text) continue;
      const tSec = parseTs(parsed.ts);
      if (tSec === null || tSec <= currentTime) out.push(parsed);
    }
    return out;
  }

  function formatTranscript(items) {
    return items
      .map(({ ts, text }) => (ts ? `[${ts}] ${text}` : text))
      .join("\n");
  }

  async function loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  function buildSuccessLabel(count, lastTs, settings) {
    const parts = [`Copied ${count} lines`];
    if (settings.prependPrompt && settings.promptText.trim()) parts.push("+ prompt");
    if (settings.copyUpToCurrentTime && lastTs) parts.push(`(up to ${lastTs})`);
    return parts.join(" ");
  }

  async function copyTranscript(btn) {
    const original = btn.innerHTML;
    const setLabel = (html) => { btn.innerHTML = html; };
    btn.disabled = true;
    setLabel(`${ICON_SVG}<span>Loading…</span>`);

    try {
      const settings = await loadSettings();

      const panel = await ensureTranscriptOpen();
      if (!panel) throw new Error("No transcript available for this video.");

      const segs = await waitFor(() => {
        const s = getSegments();
        return s.length ? s : null;
      }, { timeout: 10000 });
      if (!segs) throw new Error("No transcript available for this video.");

      const video = document.querySelector("video");
      const currentTime = settings.copyUpToCurrentTime && video ? video.currentTime : 0;
      const items = filterSegmentsByTime(segs, currentTime);
      if (!items.length) throw new Error("Transcript is empty.");

      const body = formatTranscript(items);
      const trimmedPrompt = settings.promptText.trim();
      const out = settings.prependPrompt && trimmedPrompt
        ? `${trimmedPrompt}\n\n${body}`
        : body;

      await navigator.clipboard.writeText(out);

      const lastTs = settings.copyUpToCurrentTime ? items[items.length - 1].ts : "";
      setLabel(`${ICON_SVG}<span>${buildSuccessLabel(items.length, lastTs, settings)}</span>`);
    } catch (e) {
      console.error("[transcribed]", e);
      setLabel(`${ICON_SVG}<span>${e.message || "Failed"}</span>`);
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        setLabel(original);
      }, 2000);
    }
  }

  function buildButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.title = "Copy transcript with timestamps";
    btn.innerHTML = `${ICON_SVG}<span>Copy transcript</span>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyTranscript(btn);
    });
    return btn;
  }

  function insertButton() {
    if (document.getElementById(BTN_ID)) return true;
    const target =
      document.querySelector("ytd-watch-metadata #top-level-buttons-computed") ||
      document.querySelector("#actions #top-level-buttons-computed") ||
      document.querySelector("ytd-watch-metadata #actions");
    if (!target) return false;
    target.appendChild(buildButton());
    return true;
  }

  function isWatchPage() {
    return location.pathname === "/watch";
  }

  function tick() {
    if (!isWatchPage()) return;
    injectStyle();
    insertButton();
  }

  tick();
  const obs = new MutationObserver(() => tick());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-finish", () => {
    setTimeout(tick, 300);
  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add content.js
git commit -m "feat: apply popup settings to transcript copy"
```

---

## Task 7: Playwright happy-path tests

**Files:**
- Create: `tests/playwright/popup.spec.mjs`
- Create: `tests/playwright/README.md`
- Modify: `package.json` (add dev-dep and script)

- [ ] **Step 1: Add Playwright dev-dep and `test` script to `package.json`**

```json
{
  "name": "transcribed",
  "version": "1.1.0",
  "private": true,
  "scripts": {
    "build": "tailwindcss -i src/input.css -o popup.css --minify",
    "watch": "tailwindcss -i src/input.css -o popup.css --watch",
    "test": "playwright test"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "@playwright/test": "^1.45.0"
  }
}
```

Run: `npm install && npx playwright install chromium`
Expected: completes without errors. A `playwright` browsers cache is populated.

- [ ] **Step 2: Create `tests/playwright/README.md`**

```markdown
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
```

- [ ] **Step 3: Create `tests/playwright/popup.spec.mjs`**

```js
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
    await chrome.storage.sync.set({ transcribedSettings: s });
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
```

- [ ] **Step 4: Build CSS and run the tests**

Run: `npm run build && npm test`
Expected: 1 test passes. If YouTube has rate-limited or the video changed, the test will time out — swap the URL and re-run.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/playwright/
git commit -m "test: add Playwright happy-path for popup settings"
```

---

## Task 8: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current `README.md` to preserve existing content**

Run: `cat README.md`
Expected: existing content displayed.

- [ ] **Step 2: Append a "Settings" section and a "Development" section to the README**

Edit the README so that, after the existing usage description, it includes:

```markdown
## Settings

Click the transcribed icon in the Chrome toolbar to open the settings popup:

- **Copy only up to current time** — when on, copy stops at the video's current playback position. Default: off.
- **Prepend prompt to clipboard** — when on, the editable prompt is placed at the top of the clipboard (followed by a blank line, then the transcript). Default: on.
- **Prompt** — editable textarea. "Reset to default" restores the shipped prompt after a confirmation dialog.

Settings auto-save and sync across your Chrome installs via `chrome.storage.sync`.

## Development

The popup uses precompiled Tailwind. After editing `src/input.css`, `popup.html`, or `popup.js`:

```bash
npm install      # one-time
npm run build    # rebuild popup.css
npm run watch    # rebuild on save during development
```

`popup.css` is committed so the extension loads from a fresh checkout without `npm install`.

### Tests

```bash
npm install
npx playwright install chromium
npm test
```
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document popup settings and build/test workflow"
```

---

## Task 9: Manual smoke check

**Files:** none (manual verification)

- [ ] **Step 1: Load the unpacked extension in Chrome**

Open `chrome://extensions`, enable Developer Mode, "Load unpacked" → select the repo directory.
Expected: extension loads, no errors, toolbar icon visible.

- [ ] **Step 2: Open the popup**

Click the transcribed toolbar icon.
Expected: popup opens. Width ~360px. "Copy only up to current time" is OFF, "Prepend prompt to clipboard" is ON, textarea is populated with the default prompt.

- [ ] **Step 3: Verify auto-save**

Toggle "Copy only up to current time" on, close the popup, re-open it.
Expected: toggle is still on.

- [ ] **Step 4: Verify reset dialog**

Edit the textarea (add "XYZ" at the end). Click "Reset to default". Click Cancel.
Expected: textarea still contains "XYZ".
Click "Reset to default" again, click Reset.
Expected: textarea matches the default prompt exactly.

- [ ] **Step 5: Verify dark mode**

Switch OS theme to dark, close and reopen popup.
Expected: popup renders in dark theme.

- [ ] **Step 6: Verify end-to-end copy on YouTube**

Open a YouTube video with a transcript. Click the Copy transcript button. Paste into a text editor.
Expected: clipboard contains the prompt, then a blank line, then `[0:00] line one` etc.

- [ ] **Step 7: Verify timestamp filter end-to-end**

In the popup, turn "Copy only up to current time" ON. On a YouTube video, seek to ~30 seconds, then click Copy transcript.
Expected: clipboard contains the prompt + transcript lines whose timestamps are all <= 0:30. The button label briefly shows `Copied N lines + prompt (up to 0:30)` (or similar).

- [ ] **Step 8: No additional commit required.**

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| `DEFAULT_PROMPT` / `DEFAULT_SETTINGS` | Task 1 |
| Tailwind build, shadcn tokens | Task 2 |
| Popup UI (header, toggles, textarea, reset) | Tasks 3, 4 |
| Reset confirm dialog | Tasks 3, 4 |
| Auto-save + Saved indicator | Task 4 |
| Dark mode via `prefers-color-scheme` | Task 4 |
| Empty-prompt edge case (skip prepend) | Task 6 |
| Timestamp parsing & filtering | Task 6 |
| Clipboard assembly (prompt + blank line + transcript) | Task 6 |
| Button label feedback (4 variants) | Task 6 |
| `manifest.json` updates (permission + action) | Task 5 |
| Playwright happy-path | Task 7 |
| Manual edge cases | Task 9 |
| README updates | Task 8 |

No spec gaps.

**Placeholder scan:** no TBD/TODO/"implement later" left in the plan. Every code step shows the actual code.

**Type/name consistency:**
- `SETTINGS_KEY` / `DEFAULT_SETTINGS` / `DEFAULT_PROMPT` used consistently across `defaults.js`, `popup.js`, `content.js`.
- Element IDs (`toggle-up-to`, `toggle-prepend`, `prompt-text`, `reset-btn`, `reset-dialog`, `saved-indicator`) used identically in `popup.html` and `popup.js`.
- `buildSuccessLabel(count, lastTs, settings)` defined and called in `content.js` with the same signature.
- Settings object shape (`copyUpToCurrentTime` / `prependPrompt` / `promptText`) consistent across spec, popup, content, tests.
