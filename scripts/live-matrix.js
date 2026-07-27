(async () => {
  const root = document.documentElement;
  const originalAttributes = new Map(
    [...root.attributes]
      .filter(({ name }) => name.startsWith("data-xes-"))
      .map(({ name, value }) => [name, value])
  );
  const originalScrollY = window.scrollY;
  const results = [];
  let feedFixture;

  const wait = async () => {
    await Promise.resolve();
    await Promise.resolve();
    void document.documentElement.offsetHeight;
  };
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };
  const isVisible = (element) => {
    if (!element) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return getComputedStyle(element).display !== "none" &&
      rect.width > 0 &&
      rect.height > 0;
  };
  const setAttribute = async (name, value) => {
    root.setAttribute(name, String(value));
    await wait();
  };

  try {
    const sidebarCases = [
      ["data-xes-hide-sidebar-search", "search"],
      ["data-xes-hide-sidebar-premium", "premium"],
      ["data-xes-hide-sidebar-live", "live"],
      ["data-xes-hide-sidebar-news", "news"],
      ["data-xes-hide-trends", "trends"],
      ["data-xes-hide-who-to-follow", "who"],
      ["data-xes-hide-sidebar-ads", "ads"],
      ["data-xes-hide-sidebar-footer", "footer"]
    ];

    await setAttribute("data-xes-enabled", true);
    await setAttribute("data-xes-hide-sidebar", false);

    for (const [attribute] of sidebarCases) {
      root.setAttribute(attribute, "false");
    }
    await wait();

    const slots = new Map(
      [...document.querySelectorAll("[data-xes-sidebar-item]")]
        .map((element) => [element.dataset.xesSidebarItem, element])
    );

    for (const [, itemName] of sidebarCases) {
      assert(slots.has(itemName), `Missing sidebar slot: ${itemName}`);
      assert(isVisible(slots.get(itemName)), `${itemName} should start visible`);
    }

    for (const [attribute, itemName] of sidebarCases) {
      await setAttribute(attribute, true);
      const target = slots.get(itemName);
      const rect = target.getBoundingClientRect();

      assert(
        getComputedStyle(target).display === "none" &&
          rect.width === 0 &&
          rect.height === 0,
        `${itemName} left a visible shell`
      );

      for (const [, siblingName] of sidebarCases) {
        if (siblingName !== itemName) {
          assert(
            isVisible(slots.get(siblingName)),
            `${itemName} incorrectly hid ${siblingName}`
          );
        }
      }

      results.push({
        feature: itemName,
        hiddenRect: [rect.width, rect.height],
        siblingsPreserved: true
      });
      await setAttribute(attribute, false);
    }

    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    const feed = document.querySelector('[data-testid="primaryColumn"]');
    assert(sidebar && feed, "Missing primary X columns");
    const feedWidthBefore = feed.getBoundingClientRect().width;

    await setAttribute("data-xes-hide-sidebar", true);
    const feedWidthAfter = feed.getBoundingClientRect().width;
    assert(
      getComputedStyle(sidebar).display === "none",
      "Whole sidebar did not hide"
    );
    assert(
      feedWidthAfter === feedWidthBefore,
      `Feed width changed from ${feedWidthBefore} to ${feedWidthAfter}`
    );
    results.push({
      feature: "whole sidebar",
      feedWidthBefore,
      feedWidthAfter
    });
    await setAttribute("data-xes-hide-sidebar", false);

    await setAttribute("data-xes-hide-who-to-follow", true);
    await setAttribute("data-xes-enabled", false);
    assert(
      isVisible(slots.get("who")),
      "Master switch did not restore a hidden module"
    );
    results.push({ feature: "master switch", restoredContent: true });
    await setAttribute("data-xes-enabled", true);
    await setAttribute("data-xes-hide-who-to-follow", false);

    const navCases = [
      [
        "data-xes-hide-premium-nav",
        'header a[href^="/i/premium"]',
        "Premium navigation"
      ],
      [
        "data-xes-hide-grok-nav",
        'header [data-testid="AppTabBar_Grok_Link"], header a[href^="/i/grok"]',
        "Grok navigation"
      ]
    ];

    for (const [attribute, selector, label] of navCases) {
      await setAttribute(attribute, false);
      const element = document.querySelector(selector);
      assert(element && isVisible(element), `Missing visible ${label}`);
      await setAttribute(attribute, true);
      assert(!isVisible(element), `${label} did not hide`);
      results.push({ feature: label, hidden: true });
      await setAttribute(attribute, false);
    }

    await setAttribute("data-xes-hide-feed-ads", false);
    await setAttribute("data-xes-hide-boosted-posts", false);
    await setAttribute("data-xes-hide-feed-who-to-follow", false);
    await setAttribute("data-xes-hide-new-posts-popup", false);
    await setAttribute("data-xes-hide-post-analytics-promotions", false);

    feedFixture = document.createElement("div");
    feedFixture.style.cssText =
      "position:fixed;left:0;top:0;width:200px;height:200px;z-index:-1";
    feedFixture.innerHTML = `
      <article data-testid="tweet" style="display:block;width:200px;height:40px">
        <span>Ad</span>
      </article>
      <article data-testid="tweet" style="display:block;width:200px;height:40px">
        <span>Boosted</span>
      </article>
      <div data-testid="cellInnerDiv"
        style="display:block;width:200px;height:40px">
        <h2 role="heading">Who to follow</h2>
      </div>
    `;
    feed.append(feedFixture);
    await wait();

    feedFixture.insertAdjacentHTML("beforeend", `
      <div data-testid="cellInnerDiv"
        style="display:block;width:200px;height:40px">
        <div data-testid="UserCell">Suggested account</div>
      </div>
      <div data-testid="cellInnerDiv"
        style="display:block;width:200px;height:40px">
        <div data-testid="UserCell">Another suggested account</div>
      </div>
      <div data-testid="cellInnerDiv"
        style="display:block;width:200px;height:40px">
        <a href="/i/connect_people">Show more</a>
      </div>
      <div data-testid="cellInnerDiv"
        style="display:block;width:200px;height:40px">
        <article data-testid="tweet">Following post</article>
      </div>
      <div data-xes-test="new-posts-overlay"
        style="position:absolute;display:block;width:200px;height:40px">
        <div role="status">
          <button
            aria-label="New posts are available. Push the period key to go to the them."
            role="button"
            style="display:block;width:160px;height:30px"
          >See new posts</button>
        </div>
      </div>
      <button
        data-xes-test="ordinary-feed-control"
        aria-label="Alice posted"
        role="button"
        style="display:block;width:160px;height:30px"
      >Alice posted</button>
      <article data-testid="tweet"
        style="display:block;width:200px;height:100px">
        <div data-xes-test="analytics-post-body"
          style="display:block;width:200px;height:30px">Post body</div>
        <div data-xes-test="analytics-promotion-wrapper"
          style="display:block;width:200px;height:60px;margin-bottom:16px">
          <div>
            <button role="button">Close</button>
            <img
              alt=""
              src="https://ton.twimg.com/onboarding/premium_nux/analytics_v1.png"
            >
            <div>
              <span>Access your post analytics</span>
              <a href="/i/account_analytics">Learn more</a>
            </div>
          </div>
        </div>
      </article>
    `);
    await wait();

    const adPost = feedFixture.children[0];
    const boostedPost = feedFixture.children[1];
    const feedWhoToFollowCells = [
      feedFixture.children[2],
      feedFixture.children[3],
      feedFixture.children[4],
      feedFixture.children[5]
    ];
    const followingPost = feedFixture.children[6];
    const newPostsOverlay = feedFixture.children[7];
    const ordinaryFeedControl = feedFixture.children[8];
    const analyticsPost = feedFixture.children[9];
    const analyticsPostBody = analyticsPost.querySelector(
      '[data-xes-test="analytics-post-body"]'
    );
    const analyticsPromotion = analyticsPost.querySelector(
      '[data-xes-test="analytics-promotion-wrapper"]'
    );
    assert(
      adPost.getAttribute("data-xes-promotion") === "ad",
      "MutationObserver did not classify the feed ad"
    );
    assert(
      boostedPost.getAttribute("data-xes-promotion") === "boosted",
      "MutationObserver did not classify the Boosted post"
    );
    assert(
      feedWhoToFollowCells.every(
        (cell) => cell.getAttribute("data-xes-feed-module") === "who"
      ),
      "MutationObserver did not classify every inline Who to follow cell"
    );
    assert(
      !followingPost.hasAttribute("data-xes-feed-module"),
      "Inline Who to follow classification leaked into the next post"
    );
    assert(
      newPostsOverlay.getAttribute("data-xes-feed-overlay") === "new-posts",
      "MutationObserver did not classify the new-posts overlay"
    );
    assert(
      !ordinaryFeedControl.hasAttribute("data-xes-feed-overlay"),
      "An ordinary feed control was misclassified as the new-posts overlay"
    );
    assert(
      analyticsPromotion.getAttribute("data-xes-promotion-card") ===
        "post-analytics",
      "MutationObserver did not classify the post-analytics promotion"
    );
    assert(isVisible(adPost), "Feed ad should start visible");
    assert(isVisible(boostedPost), "Boosted post should start visible");

    await setAttribute("data-xes-hide-feed-ads", true);
    assert(!isVisible(adPost), "Feed ad did not hide");
    assert(isVisible(boostedPost), "Feed ad toggle hid a Boosted post");
    await setAttribute("data-xes-hide-feed-ads", false);

    await setAttribute("data-xes-hide-boosted-posts", true);
    assert(isVisible(adPost), "Boosted toggle hid a feed ad");
    assert(!isVisible(boostedPost), "Boosted post did not hide");
    results.push({
      feature: "feed filters",
      feedAdsIndependent: true,
      boostedIndependent: true
    });
    await setAttribute("data-xes-hide-boosted-posts", false);

    assert(
      feedWhoToFollowCells.every(isVisible),
      "Every inline Who to follow cell should start visible"
    );
    assert(
      isVisible(slots.get("who")),
      "Sidebar Who to follow should start visible"
    );
    await setAttribute("data-xes-hide-feed-who-to-follow", true);
    assert(
      feedWhoToFollowCells.every((cell) => !isVisible(cell)),
      "Inline Who to follow module left visible cells"
    );
    assert(
      isVisible(followingPost),
      "Feed Who to follow toggle hid the following post"
    );
    assert(
      isVisible(slots.get("who")),
      "Feed Who to follow toggle hid the sidebar module"
    );
    results.push({
      feature: "feed Who to follow",
      hiddenCells: feedWhoToFollowCells.length,
      sidebarPreserved: true,
      followingPostPreserved: true
    });
    await setAttribute("data-xes-hide-feed-who-to-follow", false);

    assert(isVisible(newPostsOverlay), "New-posts overlay should start visible");
    assert(
      isVisible(ordinaryFeedControl),
      "Ordinary feed control should start visible"
    );
    await setAttribute("data-xes-hide-new-posts-popup", true);
    const hiddenOverlayRect = newPostsOverlay.getBoundingClientRect();
    assert(
      getComputedStyle(newPostsOverlay).display === "none" &&
        hiddenOverlayRect.width === 0 &&
        hiddenOverlayRect.height === 0,
      "New-posts popup left a visible overlay shell"
    );
    assert(
      isVisible(ordinaryFeedControl),
      "New-posts popup toggle hid an ordinary feed control"
    );
    results.push({
      feature: "new-posts popup",
      hiddenRect: [hiddenOverlayRect.width, hiddenOverlayRect.height],
      ordinaryFeedControlPreserved: true
    });
    await setAttribute("data-xes-hide-new-posts-popup", false);

    assert(
      isVisible(analyticsPromotion),
      "Post-analytics promotion should start visible"
    );
    assert(isVisible(analyticsPostBody), "Synthetic post body should be visible");
    await setAttribute("data-xes-hide-post-analytics-promotions", true);
    const hiddenPromotionRect = analyticsPromotion.getBoundingClientRect();
    assert(
      getComputedStyle(analyticsPromotion).display === "none" &&
        hiddenPromotionRect.width === 0 &&
        hiddenPromotionRect.height === 0,
      "Post-analytics promotion left a visible wrapper"
    );
    assert(
      isVisible(analyticsPostBody) && isVisible(analyticsPost),
      "Analytics promotion toggle hid the surrounding post"
    );
    results.push({
      feature: "post-analytics promotion",
      hiddenRect: [hiddenPromotionRect.width, hiddenPromotionRect.height],
      surroundingPostPreserved: true
    });
    await setAttribute("data-xes-hide-post-analytics-promotions", false);

    assert(
      !root.hasAttribute("data-xes-compact-timeline"),
      "Removed Compact timeline attribute is still present"
    );
    results.push({ feature: "Compact timeline removal", absent: true });

    return {
      passed: results.length,
      results
    };
  } finally {
    feedFixture?.remove();

    for (const { name } of [...root.attributes]) {
      if (name.startsWith("data-xes-") && !originalAttributes.has(name)) {
        root.removeAttribute(name);
      }
    }

    for (const [name, value] of originalAttributes) {
      root.setAttribute(name, value);
    }

    window.scrollTo(0, originalScrollY);
  }
})()
