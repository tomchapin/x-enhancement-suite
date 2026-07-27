import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const keywordsHtml = await readFile(
  resolve(import.meta.dirname, "../src/keywords/keywords.html"),
  "utf8"
);
const keywordsSource = await readFile(
  resolve(import.meta.dirname, "../src/keywords/keywords.js"),
  "utf8"
);
const popupHtml = await readFile(
  resolve(import.meta.dirname, "../src/popup/popup.html"),
  "utf8"
);
const popupSource = await readFile(
  resolve(import.meta.dirname, "../src/popup/popup.js"),
  "utf8"
);

test("popup links to the dedicated blocked-keywords page", () => {
  assert.doesNotMatch(popupHtml, /id="open-keywords"/);
  assert.match(popupSource, /definition\.actionPage/);
  assert.match(popupSource, /action\.id = "open-keywords"/);
  assert.match(popupSource, /chrome\.tabs\.create/);
});

test("blocked-keywords page supports add, remove, and clear operations", () => {
  assert.match(keywordsHtml, /id="keyword-form"/);
  assert.match(keywordsHtml, /id="keyword-list"/);
  assert.match(keywordsHtml, /id="clear-all"/);
  assert.match(keywordsSource, /setBlockedKeywords/);
  assert.match(keywordsSource, /Keyword added/);
  assert.match(keywordsSource, /Keyword removed/);
  assert.match(keywordsSource, /Blocked list cleared/);
});

test("blocked-keywords page controls case-sensitive matching", () => {
  assert.match(keywordsHtml, /id="case-sensitive"/);
  assert.match(keywordsHtml, /Case-sensitive matching/);
  assert.match(keywordsSource, /blockedKeywordsCaseSensitive/);
  assert.match(keywordsSource, /setSettings/);
});
