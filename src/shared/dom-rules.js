(() => {
  "use strict";

  const PROMOTED_LABEL = /^(ad|promoted|boosted|sponsored)$/i;

  function isPromotedLabel(value) {
    return (
      typeof value === "string" && PROMOTED_LABEL.test(value.trim())
    );
  }

  globalThis.XEnhancementRules = Object.freeze({
    isPromotedLabel
  });
})();
