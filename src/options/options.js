(() => {
  "use strict";

  const {
    getSettings,
    setSettings,
    resetSettings
  } = globalThis.XEnhancementSettings;

  const textarea = document.getElementById("custom-css");
  const status = document.getElementById("status");
  let statusTimer;

  function showStatus(text, isError = false) {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.style.color = isError ? "#fca5a5" : "#86efac";
    statusTimer = setTimeout(() => {
      status.textContent = "";
    }, 3000);
  }

  async function initialize() {
    try {
      const settings = await getSettings();
      textarea.value = settings.customCss;
    } catch (error) {
      showStatus("Could not load settings.", true);
      console.error(error);
    }
  }

  document.getElementById("save").addEventListener("click", async () => {
    try {
      await setSettings({ customCss: textarea.value });
      showStatus("Saved");
    } catch (error) {
      showStatus("Could not save CSS.", true);
      console.error(error);
    }
  });

  document.getElementById("reset").addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Reset every extension setting, including custom CSS and blocked keywords?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const settings = await resetSettings();
      textarea.value = settings.customCss;
      showStatus("All settings reset");
    } catch (error) {
      showStatus("Could not reset settings.", true);
      console.error(error);
    }
  });

  initialize();
})();
