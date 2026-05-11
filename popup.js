// popup.js — runs in the extension popup. defaults.js loaded before this script.

const { DEFAULT_SETTINGS, SETTINGS_KEY } = globalThis.TranscribeItDefaults;

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

  let saveTimer = null;
  els.promptText.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  });

  els.resetBtn.addEventListener("click", () => els.resetDialog.showModal());
  els.resetDialog.addEventListener("close", () => {
    if (els.resetDialog.returnValue === "confirm") {
      els.promptText.value = DEFAULT_SETTINGS.promptText;
      save();
    }
  });
}

init();
