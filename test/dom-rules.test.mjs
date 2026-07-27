import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  resolve(import.meta.dirname, "../src/shared/dom-rules.js"),
  "utf8"
);
const contentCss = await readFile(
  resolve(import.meta.dirname, "../src/content/content.css"),
  "utf8"
);
const contentScript = await readFile(
  resolve(import.meta.dirname, "../src/content/content.js"),
  "utf8"
);
const context = vm.createContext({});
vm.runInContext(source, context);

const {
  promotionTypeForLabel,
  sidebarModuleForHeading,
  feedModuleForHeading
} = context.XEnhancementRules;

test("classifies feed ads separately from boosted posts", () => {
  for (const label of ["Ad", "Promoted", "Sponsored"]) {
    assert.equal(promotionTypeForLabel(label), "ad", label);
  }

  assert.equal(promotionTypeForLabel("Boosted"), "boosted");
  assert.equal(promotionTypeForLabel("Advertisement tips"), null);
  assert.equal(promotionTypeForLabel(undefined), null);
});

test("recognizes sidebar modules by their headings", () => {
  assert.equal(sidebarModuleForHeading("Live on X"), "live");
  assert.equal(sidebarModuleForHeading("Today’s News"), "news");
  assert.equal(sidebarModuleForHeading("Today's News"), "news");
  assert.equal(sidebarModuleForHeading("Who to follow"), null);
});

test("recognizes only the exact inline feed recommendation heading", () => {
  assert.equal(feedModuleForHeading("Who to follow"), "who");
  assert.equal(feedModuleForHeading(" Who to follow "), "who");
  assert.equal(feedModuleForHeading("Who should I follow?"), null);
  assert.equal(feedModuleForHeading(undefined), null);
});

test("uses independent feed ad and boosted selectors", () => {
  assert.match(contentCss, /data-xes-promotion="ad"/);
  assert.match(contentCss, /data-xes-promotion="boosted"/);
});

test("targets the complete inline Who to follow timeline cell", () => {
  assert.match(contentCss, /data-xes-hide-feed-who-to-follow/);
  assert.match(contentCss, /data-xes-feed-module="who"/);
  assert.match(
    contentScript,
    /primaryColumn"\] \[data-testid="cellInnerDiv"/
  );
});

test("targets complete marked sidebar slots without the broad Trending wrapper", () => {
  for (const item of [
    "search",
    "premium",
    "live",
    "news",
    "trends",
    "who",
    "ads",
    "footer"
  ]) {
    assert.match(contentCss, new RegExp(`data-xes-sidebar-item="${item}"`));
  }

  assert.doesNotMatch(contentCss, /aria-label\*="Trending"/);
});

test("compact timeline feature is completely removed", () => {
  assert.doesNotMatch(contentCss, /compact-timeline/);
  assert.doesNotMatch(contentCss, /max-height: 240px/);
});

test("hiding the sidebar does not resize the primary feed", () => {
  assert.doesNotMatch(
    contentCss,
    /data-xes-hide-sidebar[\s\S]*?\[data-testid="primaryColumn"\]/
  );
});
