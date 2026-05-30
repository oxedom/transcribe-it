// core.js — site-agnostic transcript-copy engine.
//
// Owns the button UI, clipboard write, prompt-prepend, settings, and the
// inject + observe loop. Site-specific DOM logic lives in an "adapter" that
// each per-site script (youtube.js, spotify.js) passes to Core.init().
//
// Adapter interface:
//   isTargetPage(): boolean                       — on a transcribable page?
//   getInjectTarget(): Element | null             — node to append the button to
//   ensureTranscriptOpen(): Promise<truthy|null>  — open panel/tab; null = unavailable
//   readSegments(): Promise<{ts, text}[]>         — ordered raw segments
//   observeNavigation?(cb): void                  — optional SPA-nav hook

(() => {
  const BTN_ID = "yt-transcribe-copy-btn";
  const STYLE_ID = "yt-transcribe-style";
  const { DEFAULT_SETTINGS, SETTINGS_KEY, CHAT_TARGETS } = globalThis.TranscribedDefaults;

  const STYLE = `
    #${BTN_ID} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #C2761F;
      color: #ffffff;
      border: 1px solid #0F4D49;
      border-radius: 18px;
      padding: 0 14px;
      height: 36px;
      min-width: 180px;
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 8px;
      transition: background 0.15s ease;
      white-space: nowrap;
    }
    #${BTN_ID}:hover { background: #D08731; }
    #${BTN_ID}:active { background: #A66419; }
    #${BTN_ID}[disabled] { opacity: 0.8; cursor: default; }
    #${BTN_ID} svg { width: 20px; height: 20px; display: block; }
    @keyframes yt-transcribe-spin { to { transform: rotate(360deg); } }
    #${BTN_ID} .yt-transcribe-spinner { animation: yt-transcribe-spin 0.9s linear infinite; }
  `;

  const ICON_SVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 19 57 L 19 21 A 8 8 0 0 1 27 13 L 56 13"/>
        <rect x="31" y="22" width="50" height="70" rx="8"/>
      </g>
    </svg>
  `;

  const SPINNER_SVG = `
    <svg class="yt-transcribe-spinner" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#ffffff" stroke-width="3" fill="none" stroke-dasharray="42 18" stroke-linecap="round"/>
    </svg>
  `;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
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

  async function copyTranscript(adapter, btn) {
    const original = btn.innerHTML;
    const setLabel = (html) => { btn.innerHTML = html; };
    btn.disabled = true;
    setLabel(`${SPINNER_SVG}<span>Copying…</span>`);

    try {
      const settings = await loadSettings();

      const opened = await adapter.ensureTranscriptOpen();
      if (!opened) throw new Error("No transcript available");

      const raw = await adapter.readSegments();
      if (!raw.length) throw new Error("No transcript available");

      const items = raw.filter(s => s.text);
      if (!items.length) throw new Error("Transcript is empty");

      const body = formatTranscript(items);
      const trimmedPrompt = settings.promptText.trim();
      const out = settings.prependPrompt && trimmedPrompt
        ? `${trimmedPrompt}\n\n${body}`
        : body;

      await navigator.clipboard.writeText(out);

      if (settings.openChatAfterCopy) {
        const target = CHAT_TARGETS[settings.chatTarget];
        if (target) window.open(target.url, "_blank", "noopener");
      }

      setLabel(`${ICON_SVG}<span>Copied</span>`);
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

  function buildButton(adapter) {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.title = "Copy transcript with timestamps";
    btn.innerHTML = `${ICON_SVG}<span>Copy transcript</span>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyTranscript(adapter, btn);
    });
    return btn;
  }

  function insertButton(adapter) {
    if (document.getElementById(BTN_ID)) return true;
    const target = adapter.getInjectTarget();
    if (!target) return false;
    target.appendChild(buildButton(adapter));
    return true;
  }

  function init(adapter) {
    function tick() {
      if (!adapter.isTargetPage()) return;
      injectStyle();
      insertButton(adapter);
    }

    tick();
    const obs = new MutationObserver(() => tick());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    if (adapter.observeNavigation) {
      adapter.observeNavigation(() => setTimeout(tick, 300));
    }
  }

  // Shared helpers adapters may reuse (e.g. waiting for lazy DOM).
  globalThis.TranscribedCore = { init, waitFor, sleep };
})();
