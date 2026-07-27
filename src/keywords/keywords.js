(() => {
  "use strict";

  const {
    MAX_BLOCKED_KEYWORDS,
    getBlockedKeywords,
    getSettings,
    normalizeBlockedKeywords,
    setBlockedKeywords,
    setSettings
  } = globalThis.XEnhancementSettings;

  const form = document.getElementById("keyword-form");
  const input = document.getElementById("keyword");
  const list = document.getElementById("keyword-list");
  const count = document.getElementById("count");
  const emptyState = document.getElementById("empty-state");
  const clearAll = document.getElementById("clear-all");
  const caseSensitiveToggle = document.getElementById("case-sensitive");
  const status = document.getElementById("status");
  let blockedKeywords = [];
  let caseSensitive = false;
  let statusTimer;

  function showStatus(text, isError = false) {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.style.color = isError ? "#fca5a5" : "#86efac";
    statusTimer = setTimeout(() => {
      status.textContent = "";
    }, 3000);
  }

  function render() {
    list.replaceChildren();

    blockedKeywords.forEach((keyword, index) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.className = "keyword-text";
      text.textContent = keyword;

      const remove = document.createElement("button");
      remove.className = "remove";
      remove.type = "button";
      remove.dataset.index = String(index);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${keyword}`);

      item.append(text, remove);
      list.append(item);
    });

    const total = blockedKeywords.length;
    count.textContent = `${total} ${total === 1 ? "keyword" : "keywords"}`;
    emptyState.hidden = total > 0;
    list.hidden = total === 0;
    clearAll.disabled = total === 0;
  }

  async function save(next, confirmation) {
    blockedKeywords = await setBlockedKeywords(next, caseSensitive);
    render();
    showStatus(confirmation);
  }

  caseSensitiveToggle.addEventListener("change", async () => {
    const nextCaseSensitive = caseSensitiveToggle.checked;

    try {
      await setSettings({
        blockedKeywordsCaseSensitive: nextCaseSensitive
      });
      caseSensitive = nextCaseSensitive;

      if (!caseSensitive) {
        blockedKeywords = await setBlockedKeywords(
          blockedKeywords,
          caseSensitive
        );
        render();
      }

      showStatus(
        caseSensitive
          ? "Case-sensitive matching enabled"
          : "Case-sensitive matching disabled"
      );
    } catch (error) {
      caseSensitiveToggle.checked = caseSensitive;
      showStatus("Could not update matching behavior.", true);
      console.error(error);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const candidate = input.value.trim();

    if (!candidate) {
      showStatus("Enter a keyword or phrase.", true);
      input.focus();
      return;
    }

    if (blockedKeywords.length >= MAX_BLOCKED_KEYWORDS) {
      showStatus(`The list is limited to ${MAX_BLOCKED_KEYWORDS} keywords.`, true);
      return;
    }

    const next = normalizeBlockedKeywords(
      [...blockedKeywords, candidate],
      caseSensitive
    );

    if (next.length === blockedKeywords.length) {
      showStatus("That keyword is already on the list.", true);
      input.select();
      return;
    }

    try {
      await save(next, "Keyword added");
      input.value = "";
      input.focus();
    } catch (error) {
      showStatus("Could not save the keyword.", true);
      console.error(error);
    }
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-index]");

    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);

    try {
      await save(
        blockedKeywords.filter((_, itemIndex) => itemIndex !== index),
        "Keyword removed"
      );
    } catch (error) {
      showStatus("Could not remove the keyword.", true);
      console.error(error);
    }
  });

  clearAll.addEventListener("click", async () => {
    if (
      !window.confirm(
        `Remove all ${blockedKeywords.length} blocked keywords?`
      )
    ) {
      return;
    }

    try {
      await save([], "Blocked list cleared");
    } catch (error) {
      showStatus("Could not clear the blocked list.", true);
      console.error(error);
    }
  });

  getSettings()
    .then(async (settings) => {
      caseSensitive = settings.blockedKeywordsCaseSensitive;
      caseSensitiveToggle.checked = caseSensitive;
      blockedKeywords = await getBlockedKeywords(caseSensitive);
      render();
      input.focus();
    })
    .catch((error) => {
      showStatus("Could not load blocked keywords.", true);
      console.error(error);
    });
})();
