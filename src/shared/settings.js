(() => {
  "use strict";

  const STORAGE_KEY = "settings";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    hidePromotedPosts: true,
    hideSidebar: false,
    hideTrends: false,
    hidePremiumPromotions: true,
    hideGrokNav: false,
    compactTimeline: false,
    customCss: ""
  });

  const TOGGLE_DEFINITIONS = Object.freeze([
    {
      key: "enabled",
      label: "Enable enhancements",
      description: "Master switch for every X modification."
    },
    {
      key: "hidePromotedPosts",
      label: "Hide promoted posts",
      description: "Hides timeline posts marked Ad or Promoted."
    },
    {
      key: "hideSidebar",
      label: "Hide right sidebar",
      description: "Removes the entire secondary column."
    },
    {
      key: "hideTrends",
      label: "Hide trending topics",
      description: "Keeps the sidebar but removes trending timelines."
    },
    {
      key: "hidePremiumPromotions",
      label: "Hide Premium promotions",
      description: "Removes Premium upsells and its navigation link."
    },
    {
      key: "hideGrokNav",
      label: "Hide Grok link",
      description: "Removes Grok from the primary navigation."
    },
    {
      key: "compactTimeline",
      label: "Compact timeline",
      description: "Reduces spacing between timeline items."
    }
  ]);

  function normalizeSettings(value) {
    const candidate = value && typeof value === "object" ? value : {};
    const normalized = {};

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      normalized[key] =
        typeof candidate[key] === typeof defaultValue
          ? candidate[key]
          : defaultValue;
    }

    return normalized;
  }

  async function getSettings() {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    return normalizeSettings(stored[STORAGE_KEY]);
  }

  async function setSettings(patch) {
    const current = await getSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
    return next;
  }

  async function resetSettings() {
    const defaults = normalizeSettings(DEFAULT_SETTINGS);
    await chrome.storage.sync.set({ [STORAGE_KEY]: defaults });
    return defaults;
  }

  globalThis.XEnhancementSettings = Object.freeze({
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    TOGGLE_DEFINITIONS,
    normalizeSettings,
    getSettings,
    setSettings,
    resetSettings
  });
})();
