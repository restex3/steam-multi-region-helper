const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "release");

function makeReleaseFolderName(pluginJson) {
  return pluginJson.name;
}

function makeReleaseZipName(version) {
  return `steam-multi-region-helper-v${version}.zip`;
}

function getReleaseEntries() {
  return [
    { source: "plugin.json" },
    { source: "README.md" },
    { source: "README.zh-CN.md" },
    { source: "CONTRIBUTING.md" },
    { source: "LICENSE" },
    { source: "CHANGELOG.md" },
    { source: "docs" },
    { source: ".millennium" },
    { source: "backend" },
  ];
}

function collectFiles(entry, folderName) {
  const sourcePath = path.join(root, entry.source);
  if (!fs.existsSync(sourcePath)) return [];

  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) {
    return [{ sourcePath, zipPath: `${folderName}/${entry.source.replaceAll("\\", "/")}` }];
  }

  const files = [];
  const walk = (current) => {
    for (const name of fs.readdirSync(current)) {
      const child = path.join(current, name);
      const childStat = fs.statSync(child);
      if (childStat.isDirectory()) {
        walk(child);
      } else if (childStat.isFile()) {
        const relative = path.relative(root, child).replaceAll("\\", "/");
        if (!relative.startsWith("docs/assets/")) {
          files.push({ sourcePath: child, zipPath: `${folderName}/${relative}` });
        }
      }
    }
  };
  walk(sourcePath);
  return files;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function zipFiles(files, destination) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const { dosTime, dosDate } = dosDateTime(now);

  for (const file of files) {
    const name = Buffer.from(file.zipPath, "utf8");
    const source = fs.readFileSync(file.sourcePath);
    const compressed = zlib.deflateRawSync(source, { level: 9 });
    const checksum = crc32(source);

    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(8),
      writeUInt16(dosTime),
      writeUInt16(dosDate),
      writeUInt32(checksum),
      writeUInt32(compressed.length),
      writeUInt32(source.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
    ]);

    localParts.push(localHeader, compressed);

    const centralHeader = Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(8),
      writeUInt16(dosTime),
      writeUInt16(dosDate),
      writeUInt32(checksum),
      writeUInt32(compressed.length),
      writeUInt32(source.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.concat([...localParts, centralDirectory, end]));
}

function createReleasePackage() {
  const pluginJson = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const folderName = makeReleaseFolderName(pluginJson);
  const zipName = makeReleaseZipName(packageJson.version);
  const files = getReleaseEntries().flatMap((entry) => collectFiles(entry, folderName));
  const destination = path.join(distDir, zipName);

  if (files.length === 0) {
    throw new Error("No release files found");
  }

  fs.rmSync(distDir, { recursive: true, force: true });
  zipFiles(files, destination);
  return { destination, fileCount: files.length };
}

if (require.main === module) {
  const result = createReleasePackage();
  console.log(`created ${result.destination}`);
  console.log(`included ${result.fileCount} files`);
}

module.exports = {
  makeReleaseFolderName,
  makeReleaseZipName,
  getReleaseEntries,
  collectFiles,
  createReleasePackage,
};
