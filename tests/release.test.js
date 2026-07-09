const assert = require("assert");
const release = require("../scripts/package-release.js");

assert.strictEqual(release.makeReleaseFolderName({ name: "steam-region-buyer" }), "steam-region-buyer");
assert.strictEqual(release.makeReleaseZipName("0.1.0"), "steam-multi-region-helper-v0.1.0.zip");

assert.deepStrictEqual(
  release.getReleaseEntries().map((entry) => entry.source),
  ["plugin.json", "README.md", "LICENSE", "CHANGELOG.md", "docs", ".millennium", "backend"]
);

console.log("release tests passed");
