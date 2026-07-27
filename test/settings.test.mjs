import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  resolve(import.meta.dirname, "../src/shared/settings.js"),
  "utf8"
);
const context = vm.createContext({});
vm.runInContext(source, context);

const {
  DEFAULT_SETTINGS,
  TOGGLE_DEFINITIONS,
  normalizeSettings
} = context.XEnhancementSettings;

test("defaults include a master switch and custom CSS", () => {
  assert.equal(DEFAULT_SETTINGS.enabled, true);
  assert.equal(DEFAULT_SETTINGS.customCss, "");
  assert.equal(DEFAULT_SETTINGS.hidePremiumPromotions, true);
  assert.ok(TOGGLE_DEFINITIONS.some(({ key }) => key === "enabled"));
});

test("normalizeSettings keeps valid values", () => {
  const settings = normalizeSettings({
    enabled: false,
    hideSidebar: true,
    customCss: "body { color: red; }"
  });

  assert.equal(settings.enabled, false);
  assert.equal(settings.hideSidebar, true);
  assert.equal(settings.customCss, "body { color: red; }");
});

test("normalizeSettings rejects invalid types and unknown keys", () => {
  const settings = normalizeSettings({
    enabled: "yes",
    hideSidebar: 1,
    customCss: false,
    unexpected: true
  });

  assert.equal(settings.enabled, DEFAULT_SETTINGS.enabled);
  assert.equal(settings.hideSidebar, DEFAULT_SETTINGS.hideSidebar);
  assert.equal(settings.customCss, DEFAULT_SETTINGS.customCss);
  assert.equal("unexpected" in settings, false);
});

test("every toggle maps to a boolean setting", () => {
  for (const { key } of TOGGLE_DEFINITIONS) {
    assert.equal(typeof DEFAULT_SETTINGS[key], "boolean", key);
  }
});
