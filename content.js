(() => {
  const BTN_ID = "yt-transcribe-copy-btn";

  const STYLE = `
    #${BTN_ID} {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #C2761F;
      color: #ffffff;
      border: 1px solid #0F4D49;
      border-radius: 18px;
      padding: 0 14px;
      height: 36px;
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: background 0.15s ease, box-shadow 0.15s ease;
      white-space: nowrap;
    }
    #${BTN_ID}:hover { background: #D88A2E; }
    #${BTN_ID}:active { background: #A05F14; }
    #${BTN_ID}[disabled] { opacity: 0.7; cursor: default; }
    #${BTN_ID} svg { width: 20px; height: 20px; display: block; }
  `;

  const ICON_SVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
      // Try expanding description first ("...more"), then look again
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

  function formatTranscript(segments) {
    const lines = [];
    for (const seg of segments) {
      const ts = seg.querySelector(".segment-timestamp")?.textContent?.trim() || "";
      const text = seg.querySelector(".segment-text")?.textContent?.trim() || "";
      if (!text) continue;
      lines.push(`[${ts}] ${text}`);
    }
    return lines.join("\n");
  }

  async function copyTranscript(btn) {
    const original = btn.innerHTML;
    const setLabel = (html) => { btn.innerHTML = html; };
    btn.disabled = true;
    setLabel(`${ICON_SVG}<span>Loading…</span>`);

    try {
      const panel = await ensureTranscriptOpen();
      if (!panel) throw new Error("No transcript available for this video.");

      const segs = await waitFor(() => {
        const s = getSegments();
        return s.length ? s : null;
      }, { timeout: 10000 });

      if (!segs) throw new Error("No transcript available for this video.");

      const text = formatTranscript(segs);
      if (!text) throw new Error("Transcript is empty.");

      await navigator.clipboard.writeText(text);
      setLabel(`${ICON_SVG}<span>Copied ${segs.length} lines</span>`);
    } catch (e) {
      console.error("[transcribe-it]", e);
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

    // Prefer the like/share action row
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

  // Run on initial load and react to YouTube's SPA navigation
  tick();
  const obs = new MutationObserver(() => tick());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-finish", () => {
    setTimeout(tick, 300);
  });
})();
