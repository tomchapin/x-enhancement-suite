(() => {
  "use strict";

  const {
    STORAGE_KEY,
    getSettings,
    normalizeSettings
  } = globalThis.XEnhancementSettings;
  const {
    promotionTypeForLabel,
    sidebarModuleForHeading
  } = globalThis.XEnhancementRules;

  const ROOT_ATTRIBUTE_BY_SETTING = Object.freeze({
    enabled: "data-xes-enabled",
    hideFeedAds: "data-xes-hide-feed-ads",
    hideBoostedPosts: "data-xes-hide-boosted-posts",
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
