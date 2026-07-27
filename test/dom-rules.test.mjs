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

const { isPromotedLabel } = context.XEnhancementRules;

test("recognizes X paid-placement labels", () => {
  for (const label of ["Ad", "Promoted", "Boosted", "Sponsored"]) {
    assert.equal(isPromotedLabel(label), true, label);
  }

  assert.equal(isPromotedLabel("Advertisement tips"), false);
  assert.equal(isPromotedLabel(undefined), false);
});

test("hides presence-only promoted markers", () => {
  assert.match(
    contentCss,
    /article\[data-testid="tweet"\]\[data-xes-promoted\]/
  );
});

test("targets the current Premium subscription card", () => {
  assert.match(
    contentCss,
    /aside\[aria-label="Subscribe to Premium"\]/
  );
});
