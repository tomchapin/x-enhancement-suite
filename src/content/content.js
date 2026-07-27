(() => {
  "use strict";

  const {
    STORAGE_KEY,
    getSettings,
    normalizeSettings
  } = globalThis.XEnhancementSettings;

  const ROOT_ATTRIBUTE_BY_SETTING = Object.freeze({
    enabled: "data-xes-enabled",
    hidePromotedPosts: "data-xes-hide-promoted-posts",
    hideSidebar: "data-xes-hide-sidebar",
    hideTrends: "data-xes-hide-trends",
    hidePremiumNav: "data-xes-hide-premium-nav",
    hideGrokNav: "data-xes-hide-grok-nav",
    compactTimeline: "data-xes-compact-timeline"
  });

  const CUSTOM_STYLE_ID = "xes-custom-styles";
  const PROMOTED_MARKER = "data-xes-promoted";
  const PROMOTED_LABEL = /^(ad|promoted)$/i;

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

    if (currentSettings.enabled && currentSettings.hidePromotedPosts) {
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

  function isPromotedPost(article) {
    for (const element of article.querySelectorAll("span")) {
      const label = element.textContent?.trim();
      if (label && PROMOTED_LABEL.test(label)) {
        return true;
      }
    }
    return false;
  }

  function markPromotedPosts(root) {
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
      article.toggleAttribute(PROMOTED_MARKER, isPromotedPost(article));
    }
  }

  function scanForEnhancements(root) {
    markPromotedPosts(root);

    // Add future DOM transformations here. Keep each transformation idempotent:
    // X reuses and rerenders timeline nodes as users navigate and scroll.
  }

  function startObserver() {
    observer = new MutationObserver((mutations) => {
      if (!currentSettings?.enabled || !currentSettings.hidePromotedPosts) {
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
