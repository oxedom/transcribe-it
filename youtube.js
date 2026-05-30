// youtube.js — YouTube adapter for the transcribed Core engine.
//
// Injects the Copy-transcript button into the watch-page action row, opens
// YouTube's native transcript panel, and reads its segments.

(() => {
  const { waitFor, sleep } = globalThis.TranscribedCore;

  const PANEL_SELECTOR =
    'ytd-engagement-panel-section-list-renderer[target-id="PAmodern_transcript_view"], ' +
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]';

  function getTranscriptPanel() {
    const panels = document.querySelectorAll(PANEL_SELECTOR);
    const expanded = Array.from(panels).find(
      p => p.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"
    );
    return expanded || panels[0] || null;
  }

  function getSegmentNodes() {
    return document.querySelectorAll(
      "transcript-segment-view-model, ytd-transcript-segment-renderer"
    );
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

  function readSegmentNode(seg) {
    if (seg.tagName === "TRANSCRIPT-SEGMENT-VIEW-MODEL") {
      const ts = seg.querySelector(".ytwTranscriptSegmentViewModelTimestamp")?.textContent?.trim() || "";
      const text = seg.querySelector('span[role="text"]')?.textContent?.trim() || "";
      return { ts, text };
    }
    const ts = seg.querySelector(".segment-timestamp")?.textContent?.trim() || "";
    const text = seg.querySelector(".segment-text")?.textContent?.trim() || "";
    return { ts, text };
  }

  async function readSegments() {
    const nodes = await waitFor(() => {
      const s = getSegmentNodes();
      return s.length ? s : null;
    }, { timeout: 10000 });
    if (!nodes) return [];
    return Array.from(nodes).map(readSegmentNode);
  }

  globalThis.TranscribedCore.init({
    isTargetPage: () => location.pathname === "/watch",
    getInjectTarget: () =>
      document.querySelector("ytd-watch-metadata #top-level-buttons-computed") ||
      document.querySelector("#actions #top-level-buttons-computed") ||
      document.querySelector("ytd-watch-metadata #actions"),
    ensureTranscriptOpen,
    readSegments,
    observeNavigation: (cb) => document.addEventListener("yt-navigate-finish", cb),
  });
})();
