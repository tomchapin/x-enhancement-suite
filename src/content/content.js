(() => {
  "use strict";

  const {
    STORAGE_KEY,
    getSettings,
    normalizeSettings
  } = globalThis.XEnhancementSettings;
  const {
    promotionTypeForLabel,
    sidebarModuleForHeading,
    feedModuleForHeading,
    isNewPostsControlLabel,
    isPostAnalyticsPromotionLabel
  } = globalThis.XEnhancementRules;

  const ROOT_ATTRIBUTE_BY_SETTING = Object.freeze({
    enabled: "data-xes-enabled",
    hideFeedAds: "data-xes-hide-feed-ads",
    hideBoostedPosts: "data-xes-hide-boosted-posts",
    hideFeedWhoToFollow: "data-xes-hide-feed-who-to-follow",
    hideNewPostsPopup: "data-xes-hide-new-posts-popup",
    hidePostAnalyticsPromotions:
      "data-xes-hide-post-analytics-promotions",
    hideSidebar: "data-xes-hide-sidebar",
    hideSidebarSearch: "data-xes-hide-sidebar-search",
    hideSidebarPremium: "data-xes-hide-sidebar-premium",
    hideSidebarLive: "data-xes-hide-sidebar-live",
    hideSidebarNews: "data-xes-hide-sidebar-news",
    hideTrends: "data-xes-hide-trends",
    hideWhoToFollow: "data-xes-hide-who-to-follow",
    hideSidebarAds: "data-xes-hide-sidebar-ads",
    hideSidebarFooter: "data-xes-hide-sidebar-footer",
    hidePremiumNav: "data-xes-hide-premium-nav",
    hideGrokNav: "data-xes-hide-grok-nav"
  });

  const CUSTOM_STYLE_ID = "xes-custom-styles";
  const PROMOTION_ATTRIBUTE = "data-xes-promotion";
  const FEED_MODULE_ATTRIBUTE = "data-xes-feed-module";
  const FEED_OVERLAY_ATTRIBUTE = "data-xes-feed-overlay";
  const PROMOTION_CARD_ATTRIBUTE = "data-xes-promotion-card";
  const SIDEBAR_ITEM_ATTRIBUTE = "data-xes-sidebar-item";
  const SIDEBAR_ITEM_SELECTORS = Object.freeze({
    search: 'form[role="search"][aria-label="Search"]',
    premium: 'aside[aria-label="Subscribe to Premium"]',
    trends: 'section:has([aria-label="Timeline: Trending now"])',
    who: 'aside[aria-label="Who to follow"]',
    ads: '[data-testid$="SspAd"]',
    footer: 'nav[aria-label="Footer"]'
  });

  let currentSettings;
  let observer;

  function applySettings(settings) {
    currentSettings = normalizeSettings(settings);

    for (const [key, attribute] of Object.entries(ROOT_ATTRIBUTE_BY_SETTING)) {
      document.documentElement.setAttribute(
        attribute,
        String(currentSettings[key])
      );
    }

    applyCustomCss(currentSettings.customCss);

    if (currentSettings.enabled) {
      scanForEnhancements(document);
    }
  }

  function applyCustomCss(css) {
    let style = document.getElementById(CUSTOM_STYLE_ID);

    if (!css) {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = CUSTOM_STYLE_ID;
      (document.head || document.documentElement).append(style);
    }

    style.textContent = css;
    style.disabled = !currentSettings.enabled;
  }

  function promotionTypeForPost(article) {
    for (const element of article.querySelectorAll("span")) {
      const type = promotionTypeForLabel(element.textContent);
      if (type) {
        return type;
      }
    }

    return null;
  }

  function markPaidPosts(root) {
    const articles = new Set();

    if (root instanceof Element) {
      const containingArticle = root.closest('article[data-testid="tweet"]');
      if (containingArticle) {
        articles.add(containingArticle);
      }
    }

    if (typeof root.querySelectorAll === "function") {
      for (const article of root.querySelectorAll('article[data-testid="tweet"]')) {
        articles.add(article);
      }
    }

    for (const article of articles) {
      const type = promotionTypeForPost(article);
      if (type) {
        article.setAttribute(PROMOTION_ATTRIBUTE, type);
      } else {
        article.removeAttribute(PROMOTION_ATTRIBUTE);
      }
    }
  }

  function markFeedModules(root) {
    for (const heading of matchingElements(root, 'h2[role="heading"]')) {
      const moduleName = feedModuleForHeading(heading.textContent);
      const headingCell = heading.closest(
        '[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]'
      );

      if (moduleName && headingCell) {
        headingCell.setAttribute(FEED_MODULE_ATTRIBUTE, moduleName);
        markFollowingFeedModuleCells(headingCell, moduleName);
      }
    }

    const cells = new Set();

    if (root instanceof Element) {
      const containingCell = root.closest(
        '[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]'
      );
      if (containingCell) {
        cells.add(containingCell);
      }
    }

    if (typeof root.querySelectorAll === "function") {
      for (const cell of root.querySelectorAll(
        '[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]'
      )) {
        cells.add(cell);
      }
    }

    for (const cell of cells) {
      const previousCell = cell.previousElementSibling;

      if (
        previousCell?.getAttribute(FEED_MODULE_ATTRIBUTE) === "who" &&
        isWhoToFollowContinuationCell(cell)
      ) {
        cell.setAttribute(FEED_MODULE_ATTRIBUTE, "who");
      }
    }
  }

  function isWhoToFollowContinuationCell(cell) {
    if (cell.querySelector('[data-testid="UserCell"]')) {
      return true;
    }

    return [...cell.querySelectorAll('a, [role="link"]')].some(
      (link) => link.textContent.trim() === "Show more"
    );
  }

  function markFollowingFeedModuleCells(headingCell, moduleName) {
    if (moduleName !== "who") {
      return;
    }

    let cell = headingCell.nextElementSibling;

    while (
      cell?.matches('[data-testid="cellInnerDiv"]') &&
      isWhoToFollowContinuationCell(cell)
    ) {
      cell.setAttribute(FEED_MODULE_ATTRIBUTE, moduleName);
      cell = cell.nextElementSibling;
    }
  }

  function newPostsOverlayFor(control) {
    const primaryColumn = control.closest('[data-testid="primaryColumn"]');

    if (!primaryColumn) {
      return null;
    }

    const status = control.closest('[role="status"]');
    let candidate = status ?? control;

    while (
      candidate.parentElement &&
      candidate.parentElement !== primaryColumn
    ) {
      candidate = candidate.parentElement;
      const position = getComputedStyle(candidate).position;

      if (position === "absolute" || position === "fixed") {
        return candidate;
      }
    }

    return status ?? control;
  }

  function markFeedOverlays(root) {
    for (const control of matchingElements(root, '[role="button"][aria-label]')) {
      if (!isNewPostsControlLabel(control.getAttribute("aria-label"))) {
        continue;
      }

      newPostsOverlayFor(control)?.setAttribute(
        FEED_OVERLAY_ATTRIBUTE,
        "new-posts"
      );
    }
  }

  function postAnalyticsPromotionFor(link) {
    const article = link.closest('article[data-testid="tweet"]');

    if (!article) {
      return null;
    }

    let card = link;

    while (card.parentElement && card.parentElement !== article) {
      card = card.parentElement;
      const hasHeading = [...card.querySelectorAll("span")].some((element) =>
        isPostAnalyticsPromotionLabel(element.textContent)
      );

      const hasDirectCloseButton = [...card.children].some((element) =>
        element.matches('button[role="button"]')
      );

      if (hasHeading && hasDirectCloseButton) {
        const wrapper = card.parentElement;

        return wrapper !== article && wrapper.children.length === 1
          ? wrapper
          : card;
      }
    }

    return null;
  }

  function markPromotionCards(root) {
    const links = matchingElements(root, 'a[href="/i/account_analytics"]');

    if (root instanceof Element) {
      const containingArticle = root.closest('article[data-testid="tweet"]');
      const existingLink = containingArticle?.querySelector(
        'a[href="/i/account_analytics"]'
      );

      if (existingLink) {
        links.add(existingLink);
      }
    }

    for (const link of links) {
      postAnalyticsPromotionFor(link)?.setAttribute(
        PROMOTION_CARD_ATTRIBUTE,
        "post-analytics"
      );
    }
  }

  function matchingElements(root, selector) {
    const elements = new Set();

    if (root instanceof Element && root.matches(selector)) {
      elements.add(root);
    }

    if (typeof root.querySelectorAll === "function") {
      for (const element of root.querySelectorAll(selector)) {
        elements.add(element);
      }
    }

    return elements;
  }

  function sidebarSlotFor(element) {
    const region = element.closest(
      '[data-testid="sidebarColumn"] [aria-label="Trending"]'
    );

    if (!region) {
      return null;
    }

    let slot = element;

    while (
      slot.parentElement &&
      slot.parentElement.parentElement !== region
    ) {
      slot = slot.parentElement;
    }

    return slot.parentElement?.parentElement === region ? slot : null;
  }

  function markSidebarItem(element, itemName) {
    const slot = sidebarSlotFor(element);
    slot?.setAttribute(SIDEBAR_ITEM_ATTRIBUTE, itemName);
  }

  function markSidebarItems(root) {
    for (const [itemName, selector] of Object.entries(SIDEBAR_ITEM_SELECTORS)) {
      for (const element of matchingElements(root, selector)) {
        markSidebarItem(element, itemName);
      }
    }

    const headings = new Set();

    if (
      root instanceof Element &&
      root.matches('h2[role="heading"]')
    ) {
      headings.add(root);
    }

    if (typeof root.querySelectorAll === "function") {
      for (const heading of root.querySelectorAll('h2[role="heading"]')) {
        headings.add(heading);
      }
    }

    for (const heading of headings) {
      const moduleName = sidebarModuleForHeading(heading.textContent);
      const module = heading.parentElement?.parentElement;

      if (moduleName && module) {
        markSidebarItem(module, moduleName);
      }
    }
  }

  function scanForEnhancements(root) {
    markPaidPosts(root);
    markFeedModules(root);
    markFeedOverlays(root);
    markPromotionCards(root);
    markSidebarItems(root);

    // Add future DOM transformations here. Keep each transformation idempotent:
    // X reuses and rerenders timeline nodes as users navigate and scroll.
  }

  function startObserver() {
    observer = new MutationObserver((mutations) => {
      if (!currentSettings?.enabled) {
        return;
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            scanForEnhancements(node);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }

    applySettings(changes[STORAGE_KEY].newValue);
  });

  getSettings()
    .then((settings) => {
      applySettings(settings);
      startObserver();
    })
    .catch((error) => {
      console.error("[X Enhancement Suite] Failed to initialize.", error);
    });

  window.addEventListener("pagehide", () => observer?.disconnect(), {
    once: true
  });
})();
