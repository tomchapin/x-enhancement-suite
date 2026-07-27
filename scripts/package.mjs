import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8")
);
const outputDirectory = resolve(root, "dist");
const output = resolve(
  outputDirectory,
  `x-enhancement-suite-v${manifest.version}.zip`
);
const stagingRoot = await mkdtemp(resolve(tmpdir(), "xes-package-"));
const stagingDirectory = resolve(stagingRoot, "x-enhancement-suite");

const includedPaths = [
  "manifest.json",
  "README.md",
  "assets",
  "src"
];

try {
  await mkdir(stagingDirectory, { recursive: true });

  for (const path of includedPaths) {
    await cp(resolve(root, path), resolve(stagingDirectory, path), {
      recursive: true
    });
  }

  await mkdir(outputDirectory, { recursive: true });
  await rm(output, { force: true });
  await execFileAsync("zip", ["-qr", output, basename(stagingDirectory)], {
    cwd: stagingRoot
  });

  console.log(`Created ${output}`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
