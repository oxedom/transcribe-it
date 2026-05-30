// spotify.js — Spotify adapter for the transcribed Core engine.
//
// Spotify only exposes episode transcripts when logged in. The transcript lives
// behind a "Transcript" tab; clicking it renders a flat list that alternates
// between timestamp blocks and one-or-more text spans per timestamp. We anchor
// on stable data-testid attributes (never Spotify's hashed CSS classes) plus the
// timestamp-text shape, and walk the list structurally.

(() => {
  const { waitFor } = globalThis.TranscribedCore;

  const TS_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
  const isTs = (s) => TS_RE.test((s || "").trim());

  function getTimestampButtons() {
    return Array.from(document.querySelectorAll("button")).filter(b => isTs(b.textContent));
  }

  // Lowest common ancestor of every timestamp button = the transcript list.
  function getTranscriptContainer(tsButtons) {
    let c = tsButtons[0];
    while (
      c &&
      c.parentElement &&
      Array.from(c.querySelectorAll("button")).filter(b => isTs(b.textContent)).length < tsButtons.length
    ) {
      c = c.parentElement;
    }
    return c;
  }

  async function ensureTranscriptOpen() {
    // Already open if timestamp buttons are present.
    if (getTimestampButtons().length) return true;

    const tab = document.querySelector('[data-testid="transcript-tab"]');
    if (!tab) return null;
    tab.click();

    const ready = await waitFor(() => getTimestampButtons().length || null, { timeout: 8000 });
    return ready ? true : null;
  }

  function readSegments() {
    const tsButtons = getTimestampButtons();
    if (!tsButtons.length) return [];

    const container = getTranscriptContainer(tsButtons);
    if (!container) return [];

    // Walk children in order. A child holding a timestamp button starts a new
    // segment (its text is the untranslated speaker label — skip it). Other
    // children are text spans belonging to the current timestamp.
    const items = [];
    let curTs = "";
    for (const child of container.children) {
      const tsBtn = child.querySelector("button");
      if (tsBtn && isTs(tsBtn.textContent)) {
        curTs = tsBtn.textContent.trim();
        continue;
      }
      const span = child.querySelector("span");
      const text = (span ? span.textContent : child.textContent || "").trim();
      if (!text) continue;
      if (/generated automatically/i.test(text)) continue; // leading disclaimer
      items.push({ ts: curTs, text });
    }

    // Merge consecutive spans that share a timestamp into one line.
    const merged = [];
    for (const it of items) {
      const last = merged[merged.length - 1];
      if (last && last.ts === it.ts) last.text += " " + it.text;
      else merged.push({ ts: it.ts, text: it.text });
    }
    return merged;
  }

  globalThis.TranscribedCore.init({
    isTargetPage: () => location.pathname.startsWith("/episode/"),
    // Only inject when a transcript exists (the tab is present only when logged
    // in and a transcript is available).
    getInjectTarget: () =>
      document.querySelector('[data-testid="transcript-tab"]')
        ? document.querySelector('[data-testid="action-bar-row"]')
        : null,
    ensureTranscriptOpen,
    readSegments,
  });
})();
