const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const target = "D:/Program Files (x86)/Steam/millennium/plugins/steam-region-buyer";
const included = ["package.json", "plugin.json", "README.md", ".millennium", "backend", "scripts", "src", "tests"];

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

for (const entry of included) {
  copyRecursive(path.join(root, entry), path.join(target, entry));
}

console.log(`installed to ${target}`);
