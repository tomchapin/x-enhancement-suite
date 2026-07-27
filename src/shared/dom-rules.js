(() => {
  "use strict";

  const FEED_AD_LABEL = /^(ad|promoted|sponsored)$/i;
  const BOOSTED_LABEL = /^boosted$/i;
  const SIDEBAR_MODULE_BY_HEADING = Object.freeze({
    "Live on X": "live",
    "Today's News": "news",
    "Today’s News": "news"
  });
  const FEED_MODULE_BY_HEADING = Object.freeze({
    "Who to follow": "who"
  });

  function promotionTypeForLabel(value) {
    if (typeof value !== "string") {
      return null;
    }

    const label = value.trim();

    if (BOOSTED_LABEL.test(label)) {
      return "boosted";
    }

    return FEED_AD_LABEL.test(label) ? "ad" : null;
  }

  function sidebarModuleForHeading(value) {
    return typeof value === "string"
      ? SIDEBAR_MODULE_BY_HEADING[value.trim()] ?? null
      : null;
  }

  function feedModuleForHeading(value) {
    return typeof value === "string"
      ? FEED_MODULE_BY_HEADING[value.trim()] ?? null
      : null;
  }

  globalThis.XEnhancementRules = Object.freeze({
    promotionTypeForLabel,
    sidebarModuleForHeading,
    feedModuleForHeading
  });
})();
