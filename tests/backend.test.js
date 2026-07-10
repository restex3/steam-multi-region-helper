const assert = require("assert");
const fs = require("fs");
const path = require("path");

const backend = fs.readFileSync(path.join(__dirname, "..", "backend", "main.lua"), "utf8");
const packageJson = require("../package.json");

assert.match(backend, /local http = require\("http"\)/);
assert.match(backend, /local REQUEST_TIMEOUT_SECONDS = 5/);
assert.match(backend, /local REQUEST_BUDGET_SECONDS = 20/);
assert.match(backend, /http\.get\(url,\s*\{[\s\S]*timeout\s*=\s*REQUEST_TIMEOUT_SECONDS/);
assert.ok(backend.includes(`user_agent = "Steam-Multi-Region-Helper/${packageJson.version}"`));
assert.match(backend, /os\.difftime\(os\.time\(\), started_at\) >= REQUEST_BUDGET_SECONDS/);
assert.doesNotMatch(backend, /utils\.exec|curl\.exe/);

console.log("backend tests passed");
