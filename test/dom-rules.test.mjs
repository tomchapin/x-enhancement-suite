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
const context = vm.createContext({});
vm.runInContext(source, context);

const {
  promotionTypeForLabel,
  sidebarModuleForHeading
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

test("uses independent feed ad and boosted selectors", () => {
  assert.match(contentCss, /data-xes-promotion="ad"/);
  assert.match(contentCss, /data-xes-promotion="boosted"/);
});

test("targets granular sidebar modules without the broad Trending wrapper", () => {
  assert.match(contentCss, /Timeline: Trending now/);
  assert.match(contentCss, /data-testid\$="SspAd"/);
  assert.match(contentCss, /aria-label="Who to follow"/);
  assert.doesNotMatch(contentCss, /aria-label\*="Trending"/);
});

test("compact mode caps media previews", () => {
  assert.match(contentCss, /max-height: 240px !important/);
});
