const assert = require("assert");
const release = require("../scripts/package-release.js");

assert.strictEqual(
  release.makeReleaseFolderName({ name: "steam-multi-region-helper" }),
  "steam-multi-region-helper"
);
assert.strictEqual(release.makeReleaseZipName("0.1.2"), "steam-multi-region-helper-v0.1.2.zip");

assert.deepStrictEqual(
  release.getReleaseEntries().map((entry) => entry.source),
  ["plugin.json", "README.md", "README.zh-CN.md", "CONTRIBUTING.md", "LICENSE", "CHANGELOG.md", "docs", ".millennium", "backend"]
);

assert.strictEqual(
  release.collectFiles({ source: "docs" }, "steam-multi-region-helper").some((entry) =>
    entry.zipPath.includes("docs/assets/")
  ),
  false
);

console.log("release tests passed");
