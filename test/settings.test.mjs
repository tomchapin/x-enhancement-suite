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
  assert.equal(DEFAULT_SETTINGS.hideFeedAds, true);
  assert.equal(DEFAULT_SETTINGS.hideBoostedPosts, true);
  assert.equal(DEFAULT_SETTINGS.hideFeedWhoToFollow, false);
  assert.equal(DEFAULT_SETTINGS.hideNewPostsPopup, false);
  assert.equal(DEFAULT_SETTINGS.hidePostAnalyticsPromotions, false);
  assert.equal(DEFAULT_SETTINGS.hideSidebarPremium, true);
  assert.equal(DEFAULT_SETTINGS.hideSidebarAds, true);
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

test("compact timeline is no longer exposed or normalized", () => {
  assert.equal("compactTimeline" in DEFAULT_SETTINGS, false);
  assert.equal(
    TOGGLE_DEFINITIONS.some(({ key }) => key === "compactTimeline"),
    false
  );
  assert.equal(
    "compactTimeline" in normalizeSettings({ compactTimeline: true }),
    false
  );
});

test("migrates combined paid-content and Premium settings", () => {
  const settings = normalizeSettings({
    hidePromotedPosts: false,
    hidePremiumPromotions: false
  });

  assert.equal(settings.hideFeedAds, false);
  assert.equal(settings.hideBoostedPosts, false);
  assert.equal(settings.hideSidebarPremium, false);
});

test("groups granular sidebar toggles", () => {
  const sidebarKeys = TOGGLE_DEFINITIONS
    .filter(({ group }) => group === "Right sidebar")
    .map(({ key }) => key);

  assert.deepEqual(
    [...sidebarKeys],
    [
      "hideSidebar",
      "hideSidebarSearch",
      "hideSidebarPremium",
      "hideSidebarLive",
      "hideSidebarNews",
      "hideTrends",
      "hideWhoToFollow",
      "hideSidebarAds",
      "hideSidebarFooter"
    ]
  );
});

test("groups independent feed controls", () => {
  const feedKeys = TOGGLE_DEFINITIONS
    .filter(({ group }) => group === "Feed")
    .map(({ key }) => key);
  const whoToFollowToggle = TOGGLE_DEFINITIONS.find(
    ({ key }) => key === "hideFeedWhoToFollow"
  );

  assert.deepEqual(
    [...feedKeys],
    [
      "hideFeedAds",
      "hideBoostedPosts",
      "hideFeedWhoToFollow",
      "hideNewPostsPopup",
      "hidePostAnalyticsPromotions"
    ]
  );
  assert.equal(
    whoToFollowToggle.label,
    "Hide Who to Follow from feed"
  );
});
