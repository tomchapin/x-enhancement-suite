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
  feedModuleForHeading,
  isNewPostsControlLabel,
  isPostAnalyticsPromotionLabel
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

test("recognizes X's dedicated new-posts control labels", () => {
  assert.equal(
    isNewPostsControlLabel(
      "New posts are available. Push the period key to go to the them."
    ),
    true
  );
  assert.equal(isNewPostsControlLabel("See new posts"), true);
  assert.equal(isNewPostsControlLabel("Alice posted"), false);
  assert.equal(isNewPostsControlLabel("New posts from Alice"), false);
  assert.equal(isNewPostsControlLabel(undefined), false);
});

test("recognizes only the post-analytics promotion heading", () => {
  assert.equal(
    isPostAnalyticsPromotionLabel("Access your post analytics"),
    true
  );
  assert.equal(isPostAnalyticsPromotionLabel("Post analytics"), false);
  assert.equal(isPostAnalyticsPromotionLabel("View post analytics"), false);
  assert.equal(isPostAnalyticsPromotionLabel(undefined), false);
});

test("uses independent feed ad and boosted selectors", () => {
  assert.match(contentCss, /data-xes-promotion="ad"/);
  assert.match(contentCss, /data-xes-promotion="boosted"/);
});

test("targets every bounded inline Who to follow timeline cell", () => {
  assert.match(contentCss, /data-xes-hide-feed-who-to-follow/);
  assert.match(contentCss, /data-xes-feed-module="who"/);
  assert.match(
    contentScript,
    /primaryColumn"\] \[data-testid="cellInnerDiv"/
  );
  assert.match(contentScript, /data-testid="UserCell"/);
  assert.match(contentScript, /link\.textContent\.trim\(\) === "Show more"/);
  assert.match(contentScript, /previousCell\?\.getAttribute/);
});

test("targets the complete marked new-posts overlay", () => {
  assert.match(contentCss, /data-xes-hide-new-posts-popup/);
  assert.match(contentCss, /data-xes-feed-overlay="new-posts"/);
  assert.match(contentScript, /position === "absolute"/);
  assert.match(contentScript, /closest\('\[role="status"\]'\)/);
});

test("targets the complete post-analytics promotion wrapper", () => {
  assert.match(contentCss, /data-xes-hide-post-analytics-promotions/);
  assert.match(contentCss, /data-xes-promotion-card="post-analytics"/);
  assert.match(contentScript, /a\[href="\/i\/account_analytics"\]/);
  assert.match(contentScript, /element\.matches\('button\[role="button"\]'\)/);
  assert.match(contentScript, /containingArticle\?\.querySelector/);
  assert.match(contentScript, /wrapper\.children\.length === 1/);
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
