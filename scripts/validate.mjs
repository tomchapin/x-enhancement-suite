import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8")
);
const packageJson = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8")
);

assert.equal(manifest.manifest_version, 3, "manifest_version must be 3");
assert.equal(
  manifest.version,
  packageJson.version,
  "manifest and package versions must match"
);
assert.deepEqual(
  manifest.permissions,
  ["storage"],
  "the extension should keep its requested permissions minimal"
);

const referencedFiles = new Set([
  manifest.action.default_popup,
  manifest.options_page,
  "src/keywords/keywords.html",
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon)
]);

for (const contentScript of manifest.content_scripts) {
  for (const file of [...(contentScript.js ?? []), ...(contentScript.css ?? [])]) {
    referencedFiles.add(file);
  }
}

for (const file of referencedFiles) {
  await access(resolve(root, file));
}

for (const htmlFile of [
  manifest.action.default_popup,
  manifest.options_page,
  "src/keywords/keywords.html"
]) {
  const html = await readFile(resolve(root, htmlFile), "utf8");
  assert.ok(
    !/\b(?:src|href)=["']https?:\/\//i.test(html),
    `${htmlFile} must not load remote extension resources`
  );

  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    assert.match(
      script[1],
      /\bsrc=["'][^"']+["']/i,
      `${htmlFile} scripts must reference local source files`
    );
    assert.equal(
      script[2].trim(),
      "",
      `${htmlFile} must not contain inline script content`
    );
  }
}

console.log(
  `Validated Manifest V${manifest.manifest_version} ${manifest.name} v${manifest.version}`
);
console.log(`Checked ${referencedFiles.size} referenced extension files`);
