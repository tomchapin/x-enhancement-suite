# X Enhancement Suite

A private, dependency-free Chrome extension for making personal DOM and style
changes on [X](https://x.com).

The starter extension includes:

- One-click enable/disable from the toolbar
- Independent filtering for feed ads and Boosted posts
- Granular controls for search, Premium, Live on X, news, trends, Who to
  follow, sidebar ads, and footer links
- Custom CSS for personal tweaks
- Settings synchronized through Chrome
- Live updates in already-open X tabs
- MutationObserver-based handling for X's dynamically rendered timeline

## Install locally

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository's root directory.
6. Pin **X Enhancement Suite** from Chrome's Extensions menu.

After changing extension source files, click the extension's reload button on
`chrome://extensions`, then refresh any open X tabs.

## Customize it

The toolbar popup controls the built-in enhancements. Click **Custom CSS** in
the popup to add personal styles without changing source files.

For JavaScript DOM changes, add a focused function to
[`src/content/content.js`](src/content/content.js) and call it from
`scanForEnhancements()`. Prefer stable accessibility attributes and
`data-testid` values over generated class names, which change frequently on X.

Built-in visual rules live in
[`src/content/content.css`](src/content/content.css). Each rule is gated by a
`data-xes-*` attribute set on the root `<html>` element.

## Development

The project intentionally has no runtime or development dependencies. Node.js
20 or newer is recommended for the included tooling.

```sh
npm test
npm run validate
npm run package
```

`npm run package` creates a versioned ZIP in `dist/`. The unpacked repository
remains the easiest way to install this private extension.

### Inspect a separate debug Chrome instance

For live DOM debugging without disturbing your normal browser, launch Chrome
for Testing with a temporary profile, `--remote-debugging-port=9229`, and this
repository passed to `--load-extension`. Then evaluate a JavaScript expression
against its X tab through the Chrome DevTools Protocol:

```sh
npm run cdp -- 'document.title'
```

For longer probes, save the expression in a temporary file and pass
`--file probe.js`. Set `CDP_PORT` or `CDP_URL_PREFIX` to override the default
debugging port or target URL.

With an authenticated X tab open in that isolated browser, run the complete
live feature matrix:

```sh
npm run live-test
```

The matrix verifies every toggle, complete sidebar-slot collapse, sibling
preservation, unchanged feed width, independent Ad/Boosted filtering, and
master-switch behavior.

## Privacy and permissions

The extension runs only on `x.com` and `twitter.com`. It requests Chrome's
`storage` permission solely to persist extension settings. It does not make
network requests, collect analytics, or transmit browsing data.

## Notes

X is a frequently changing single-page application. Selectors may occasionally
need updates after X changes its markup. This project is intended for personal
use and is not affiliated with X Corp.
