(() => {
  "use strict";

  const {
    TOGGLE_DEFINITIONS,
    getSettings,
    setSettings
  } = globalThis.XEnhancementSettings;

  const settingsContainer = document.getElementById("settings");
  const message = document.getElementById("message");

  function buildSetting(definition, checked) {
    const row = document.createElement("div");
    row.className = "setting";
    row.dataset.setting = definition.key;

    const labelText = document.createElement("div");
    labelText.className = "setting-label";
    labelText.textContent = definition.label;

    const description = document.createElement("div");
    description.className = "setting-description";
    description.textContent = definition.description;

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.setAttribute("aria-label", definition.label);

    const switchVisual = document.createElement("span");
    switchVisual.setAttribute("aria-hidden", "true");

    input.addEventListener("change", async () => {
      message.textContent = "";
      input.disabled = true;

      try {
        const next = await setSettings({ [definition.key]: input.checked });
        updateDisabledState(next.enabled);
      } catch (error) {
        input.checked = !input.checked;
        message.textContent = "Could not save this setting.";
        console.error(error);
      } finally {
        input.disabled = false;
      }
    });

    switchLabel.append(input, switchVisual);
    row.append(labelText, description, switchLabel);
    return row;
  }

  function updateDisabledState(enabled) {
    for (const row of settingsContainer.querySelectorAll(".setting")) {
      if (row.dataset.setting !== "enabled") {
        row.classList.toggle("is-disabled", !enabled);
      }
    }
  }

  async function initialize() {
    try {
      const settings = await getSettings();

      for (const definition of TOGGLE_DEFINITIONS) {
        settingsContainer.append(
          buildSetting(definition, settings[definition.key])
        );
      }

      updateDisabledState(settings.enabled);
    } catch (error) {
      message.textContent = "Could not load extension settings.";
      console.error(error);
    }
  }

  document.getElementById("open-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  initialize();
})();
