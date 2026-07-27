(() => {
  "use strict";

  const FEED_AD_LABEL = /^(ad|promoted|sponsored)$/i;
  const BOOSTED_LABEL = /^boosted$/i;
  const NEW_POSTS_LABEL = /^(new posts are available(?:\.|$)|see new posts$)/i;
  const POST_ANALYTICS_PROMOTION_LABEL = /^access your post analytics$/i;
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

  function isNewPostsControlLabel(value) {
    return typeof value === "string" && NEW_POSTS_LABEL.test(value.trim());
  }

  function isPostAnalyticsPromotionLabel(value) {
    return (
      typeof value === "string" &&
      POST_ANALYTICS_PROMOTION_LABEL.test(value.trim())
    );
  }

  function findBlockedKeyword(
    textValues,
    blockedKeywords,
    caseSensitive = false
  ) {
    if (!Array.isArray(textValues) || !Array.isArray(blockedKeywords)) {
      return null;
    }

    let text = textValues
      .filter((value) => typeof value === "string")
      .join("\n")
      .normalize("NFKC");

    if (!text) {
      return null;
    }

    if (!caseSensitive) {
      text = text.toLocaleLowerCase();
    }

    return (
      blockedKeywords.find((keyword) => {
        if (typeof keyword !== "string") {
          return false;
        }

        let normalizedKeyword = keyword.normalize("NFKC").trim();

        if (!caseSensitive) {
          normalizedKeyword = normalizedKeyword.toLocaleLowerCase();
        }

        return normalizedKeyword && text.includes(normalizedKeyword);
      }) ?? null
    );
  }

  globalThis.XEnhancementRules = Object.freeze({
    promotionTypeForLabel,
    sidebarModuleForHeading,
    feedModuleForHeading,
    isNewPostsControlLabel,
    isPostAnalyticsPromotionLabel,
    findBlockedKeyword
  });
})();
