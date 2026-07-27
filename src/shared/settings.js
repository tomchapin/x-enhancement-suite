(() => {
  "use strict";

  const STORAGE_KEY = "settings";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    hideFeedAds: true,
    hideBoostedPosts: true,
    hideFeedWhoToFollow: false,
    hideNewPostsPopup: false,
    hidePostAnalyticsPromotions: false,
    hideSidebar: false,
    hideSidebarSearch: false,
    hideSidebarPremium: true,
    hideSidebarLive: false,
    hideSidebarNews: false,
    hideTrends: false,
    hideWhoToFollow: false,
    hideSidebarAds: true,
    hideSidebarFooter: false,
    hidePremiumNav: false,
    hideGrokNav: false,
    customCss: ""
  });

  const TOGGLE_DEFINITIONS = Object.freeze([
    {
      key: "enabled",
      label: "Enable enhancements",
      description: "Master switch for every X modification.",
      group: "General"
    },
    {
      key: "hideFeedAds",
      label: "Hide feed ads",
      description: "Hides posts marked Ad, Promoted, or Sponsored.",
      group: "Feed"
    },
    {
      key: "hideBoostedPosts",
      label: "Hide boosted posts",
      description: "Hides posts specifically marked Boosted.",
      group: "Feed"
    },
    {
      key: "hideFeedWhoToFollow",
      label: "Hide feed Who to follow",
      description: "Removes inline account recommendations from the timeline.",
      group: "Feed"
    },
    {
      key: "hideNewPostsPopup",
      label: "Hide new-posts popup",
      description: "Removes the blue scroll-to-top notice for new posts.",
      group: "Feed"
    },
    {
      key: "hidePostAnalyticsPromotions",
      label: "Hide analytics promotions",
      description:
        "Removes post-analytics Premium upsells from feeds and posts.",
      group: "Feed"
    },
    {
      key: "hideSidebar",
      label: "Hide right sidebar",
      description: "Removes the entire secondary column.",
      group: "Right sidebar"
    },
    {
      key: "hideSidebarSearch",
      label: "Hide search",
      description: "Removes the sidebar search box.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideSidebarPremium",
      label: "Hide Premium card",
      description: "Removes the Subscribe to Premium card.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideSidebarLive",
      label: "Hide Live on X",
      description: "Removes the live broadcasts module.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideSidebarNews",
      label: "Hide Today’s News",
      description: "Removes the news module.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideTrends",
      label: "Hide trending topics",
      description: "Removes only the Trending now module.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideWhoToFollow",
      label: "Hide Who to follow",
      description: "Removes account recommendations.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideSidebarAds",
      label: "Hide sidebar ads",
      description: "Removes display-ad placements from the sidebar.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hideSidebarFooter",
      label: "Hide footer links",
      description: "Removes the sidebar’s legal and footer links.",
      group: "Right sidebar",
      nested: true
    },
    {
      key: "hidePremiumNav",
      label: "Hide Premium link",
      description: "Removes Premium from the primary navigation.",
      group: "Navigation"
    },
    {
      key: "hideGrokNav",
      label: "Hide Grok link",
      description: "Removes Grok from the primary navigation.",
      group: "Navigation"
    }
  ]);

  function normalizeSettings(value) {
    const candidate = value && typeof value === "object" ? value : {};
    const migrated = { ...candidate };
    const normalized = {};

    if (
      typeof migrated.hideFeedAds !== "boolean" &&
      typeof candidate.hidePromotedPosts === "boolean"
    ) {
      migrated.hideFeedAds = candidate.hidePromotedPosts;
    }

    if (
      typeof migrated.hideBoostedPosts !== "boolean" &&
      typeof candidate.hidePromotedPosts === "boolean"
    ) {
      migrated.hideBoostedPosts = candidate.hidePromotedPosts;
    }

    if (
      typeof migrated.hideSidebarPremium !== "boolean" &&
      typeof candidate.hidePremiumPromotions === "boolean"
    ) {
      migrated.hideSidebarPremium = candidate.hidePremiumPromotions;
    }

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      normalized[key] =
        typeof migrated[key] === typeof defaultValue
          ? migrated[key]
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
