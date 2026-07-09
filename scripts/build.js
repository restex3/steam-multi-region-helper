const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const core = fs.readFileSync(path.join(root, "src", "core.js"), "utf8");
const shell = fs.readFileSync(path.join(root, "src", "webkit-shell.js"), "utf8");
const outDir = path.join(root, ".millennium", "Dist");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "webkit.js"),
  `${core}\n\n${shell}\n`,
  "utf8"
);

console.log("built .millennium/Dist/webkit.js");
