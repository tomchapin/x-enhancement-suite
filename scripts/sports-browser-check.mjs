import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Run only against the isolated Chrome for Testing described in README.md.
// This test uses a local fixture, not an authenticated live X page.
const port = process.env.CDP_PORT ?? "9229";
const root = resolve(import.meta.dirname, "..");
const panel = await readFile(
  process.env.SPORTS_PANEL_HTML ?? resolve(root, "test/fixtures/nfl-sidebar.html"),
  "utf8"
);
const target = await (await fetch(
  `http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }
)).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
  else callbacks.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
};

try {
  const { frameTree } = await send("Page.getFrameTree");
  await send("Page.setDocumentContent", {
    frameId: frameTree.frame.id,
    html: `<!doctype html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
      <style>
        #primary { width: 600px; }
        #sports, #outside > div, #direct > div, #direct-parent > div { border: 1px solid gray; margin: 12px; padding: 8px; width: 350px; }
        #sibling { border: 1px solid gray; padding: 8px; width: 350px; }
      </style></head><body>
      <main id="primary" data-testid="primaryColumn">Feed ${panel}</main>
      <div data-testid="sidebarColumn"><section aria-label="Trending"><div>
        <div id="sports">${panel}</div>
        <div id="sibling"><aside aria-label="Who to follow"><h2 role="heading">Who to follow</h2></aside></div>
      </div></section><div id="outside">${panel}</div>
      <section id="direct" aria-label="Trending">${panel}<div id="direct-sibling">Direct-region sibling</div></section>
      <section aria-label="Trending"><div id="direct-parent">${panel}<div id="direct-parent-sibling">Sibling inside stack</div></div></section>
      </div>
      <div id="settings"></div><div id="message"></div><button id="open-options"></button>
      </body></html>`
  });
  // Only Chrome storage is mocked. The DOM, CSS, observer, settings, and popup
  // run their unmodified source in the real browser.
  await evaluate(`globalThis.testStored = {};
    globalThis.testListeners = [];
    globalThis.chrome = { storage: {
      sync: {
        get: async key => ({ [key]: testStored[key] }),
        set: async values => {
          const changes = Object.fromEntries(Object.entries(values).map(([key,newValue]) =>
            [key,{oldValue:testStored[key],newValue}]));
          Object.assign(testStored,values);
          for (const listener of testListeners) listener(changes,"sync");
        }
      }, onChanged: { addListener: fn => testListeners.push(fn) }
    }, runtime: { openOptionsPage() {} } };`);
  for (const file of ["src/shared/settings.js", "src/shared/dom-rules.js", "src/content/content.js", "src/popup/popup.js"]) {
    await evaluate(await readFile(resolve(root, file), "utf8"));
  }
  const css = await readFile(resolve(root, "src/content/content.css"), "utf8");
  await evaluate(`{ const style = document.createElement("style"); style.textContent = ${JSON.stringify(css)}; document.head.append(style); }`);
  const result = await evaluate(`(async () => {
    const assert = (value,message) => { if (!value) throw Error(message); };
    const settle = () => new Promise(resolve => setTimeout(resolve,50));
    const visible = e => { const r=e.getBoundingClientRect();return getComputedStyle(e).display!=="none" && r.width>0 && r.height>0; };
    const hidden = e => { const r=e.getBoundingClientRect();return getComputedStyle(e).display==="none" && r.width===0 && r.height===0; };
    const sports = document.getElementById("sports");
    const sibling = document.getElementById("sibling");
    const outside = document.querySelector("#outside > div");
    const direct = document.querySelector("#direct > div");
    const directParent = document.querySelector("#direct-parent > div");
    const feed = document.getElementById("primary");
    const width = feed.getBoundingClientRect().width;
    await settle();
    const toggle = document.querySelector('[data-setting="hideSidebarSports"] input');
    assert(toggle && !toggle.checked,"Sports must start off in the generated popup");
    await XEnhancementSettings.setSettings({enabled:true,hideSidebarSports:false});
    await settle();
    assert(sports.dataset.xesSidebarItem==="sports","Complete Trending slot was not marked");
    assert(outside.dataset.xesSidebarItem==="sports","Standalone panel wrapper was not marked");
    assert(direct.dataset.xesSidebarItem==="sports","Direct-region card was not marked; the empty tracker must not be the hidden target");
    assert(directParent.dataset.xesSidebarItem==="sports","Card without an extra slot wrapper was not marked");
    assert(visible(sports) && visible(outside),"Off state should preserve both sports panels");
    assert(!feed.querySelector('[data-xes-sidebar-item="sports"]'),"A feed post was mistaken for a sidebar panel");
    const before = sports.getBoundingClientRect();
    toggle.click();
    await settle();
    assert(testStored.settings.hideSidebarSports===true,"Popup did not save the sports toggle");
    assert(hidden(sports) && hidden(outside) && hidden(direct) && hidden(directParent),"Sports toggle left a visible card or layout slot");
    assert(visible(document.getElementById("direct-sibling")) && visible(document.getElementById("direct-parent-sibling")),"Sports toggle hid a neighboring module in a shallow stack");
    assert(visible(sibling),"Sports toggle hid an unrelated module");
    assert(visible(feed) && feed.getBoundingClientRect().width===width,"Sports toggle changed the feed");
    await XEnhancementSettings.setSettings({enabled:false});
    assert(visible(sports) && visible(outside) && visible(direct) && visible(directParent),"Master switch did not restore sports");
    await XEnhancementSettings.setSettings({enabled:true});
    const added = sports.cloneNode(true);
    added.id="added-sports";
    added.removeAttribute("data-xes-sidebar-item");
    sports.parentElement.append(added);
    await settle();
    assert(hidden(added) && added.dataset.xesSidebarItem==="sports","Asynchronously inserted panel was not hidden");
    await XEnhancementSettings.setSettings({hideSidebarSports:false});
    assert(visible(sports) && visible(outside) && visible(added),"Turning sports off did not restore cards");
    const sportsSetting = document.querySelector('[data-setting="hideSidebarSports"]');
    assert(sportsSetting.classList.contains("is-nested"),"Sports option must be nested under sidebar controls");
    await XEnhancementSettings.setSettings({hideWhoToFollow:true});
    assert(hidden(sibling) && visible(sports),"Existing sidebar filter also hid the sports panel");
    await XEnhancementSettings.setSettings({hideSidebarSports:true});
    assert(hidden(sibling) && hidden(sports),"Sports and existing sidebar filters are not independent");
    return { popupSave:true, completeSlotHidden:[0,0], standalonePanelHidden:[0,0],
      directRegionCardHidden:[0,0], unwrappedStackCardHidden:[0,0],
      siblingsPreserved:true, masterRestores:true, toggleRestores:true,
      asynchronousInsertion:true, feedWidth:width, independentFilters:true,
      visibleSlotBefore:[before.width,before.height] };
  })()`);
  assert.ok(result.popupSave);
  console.log(JSON.stringify({fixture: process.env.SPORTS_PANEL_HTML ?? "reported NFL structural excerpt", ...result}, null, 2));
} finally {
  await send("Target.closeTarget", { targetId: target.id });
  socket.close();
}
