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

    feedFixture = document.createElement("div");
    feedFixture.style.cssText =
      "position:fixed;left:0;top:0;width:200px;height:150px;z-index:-1";
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

    const adPost = feedFixture.children[0];
    const boostedPost = feedFixture.children[1];
    const feedWhoToFollow = feedFixture.children[2];
    assert(
      adPost.getAttribute("data-xes-promotion") === "ad",
      "MutationObserver did not classify the feed ad"
    );
    assert(
      boostedPost.getAttribute("data-xes-promotion") === "boosted",
      "MutationObserver did not classify the Boosted post"
    );
    assert(
      feedWhoToFollow.getAttribute("data-xes-feed-module") === "who",
      "MutationObserver did not classify the inline Who to follow module"
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
      isVisible(feedWhoToFollow),
      "Inline Who to follow should start visible"
    );
    assert(
      isVisible(slots.get("who")),
      "Sidebar Who to follow should start visible"
    );
    await setAttribute("data-xes-hide-feed-who-to-follow", true);
    assert(
      !isVisible(feedWhoToFollow),
      "Inline Who to follow module did not hide"
    );
    assert(
      isVisible(slots.get("who")),
      "Feed Who to follow toggle hid the sidebar module"
    );
    results.push({
      feature: "feed Who to follow",
      hidden: true,
      sidebarPreserved: true
    });

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
