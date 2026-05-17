import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve("dist");
const config = JSON.parse(fs.readFileSync(path.resolve("deploy.config.json"), "utf8"));
const base = getArgValue("--base") ?? config.githubPagesBasePath ?? "/";
const client = normalize(process.env.VITE_ADSENSE_CLIENT);
const slot = normalize(process.env.VITE_ADSENSE_SLOT_CONTENT);
const lockedClient = normalize(config?.adsense?.lockedClient);
const failures = [];

expectFile("index.html");
expectFile("app.webmanifest");
expectFile("sw.js");

const indexHtml = readText("index.html");
const manifest = JSON.parse(readText("app.webmanifest"));
const sw = readText("sw.js");
const allFiles = listFiles(distDir);
const searchable = allFiles
  .filter((file) => /\.(html|js|css|json|txt)$/.test(file))
  .map((file) => [file, fs.readFileSync(path.join(distDir, file), "utf8")]);

if (base !== "/") {
  expectFile("404.html");
  assert(indexHtml.includes(`${base}assets/`), `index.html does not reference assets under ${base}.`);
  assert(indexHtml.includes(`${base}app.webmanifest`), `index.html does not reference manifest under ${base}.`);
}

assert(manifest.start_url === "./", "manifest.start_url must be ./ for subpath PWA installs.");
assert(manifest.scope === "./", "manifest.scope must be ./ for subpath PWA installs.");
assert(sw.includes("self.registration.scope"), "service worker must derive cache URLs from registration scope.");
assert(!allFiles.some((file) => file.endsWith(".map")), "source map files must not be deployed.");

for (const [file, content] of searchable) {
  assert(!content.includes("sourceMappingURL"), `${file} contains sourceMappingURL.`);
  assert(!content.includes("VITE_ADSENSE"), `${file} contains raw VITE_ADSENSE variable name.`);
  assert(!/console\.[a-zA-Z_]+/.test(content), `${file} contains console.* calls.`);
  assert(!/\bdebugger\b/.test(content), `${file} contains debugger statements.`);
}

if (client) {
  assert(/^ca-pub-\d{16}$/.test(client), "VITE_ADSENSE_CLIENT format is invalid.");
  assert(/^\d{4,}$/.test(slot), "VITE_ADSENSE_SLOT_CONTENT format is invalid.");
  if (lockedClient) assert(client === lockedClient, `AdSense client mismatch. Expected ${lockedClient}, got ${client}.`);
}

if (failures.length) {
  console.error(`Deploy check failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deploy check passed.");

function getArgValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function expectFile(file) {
  assert(fs.existsSync(path.join(distDir, file)), `${file} is missing from dist.`);
}

function readText(file) {
  const filePath = path.join(distDir, file);
  expectFile(file);
  return fs.readFileSync(filePath, "utf8");
}

function listFiles(root, basePath = "") {
  return fs.readdirSync(root).flatMap((entry) => {
    const absolute = path.join(root, entry);
    const relative = path.join(basePath, entry);
    return fs.statSync(absolute).isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
