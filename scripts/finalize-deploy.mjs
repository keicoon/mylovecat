import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve("dist");
const configPath = path.resolve("deploy.config.json");
const isPagesBuild = process.argv.includes("--pages");

const config = readJson(configPath);
const client = normalize(process.env.VITE_ADSENSE_CLIENT);
const slot = normalize(process.env.VITE_ADSENSE_SLOT_CONTENT);
const lockedClient = normalize(config?.adsense?.lockedClient);
const publicRoutes = ["about", "guide", "cat-health-log-template", "privacy", "terms"];

if (!fs.existsSync(distDir)) {
  fail("dist directory does not exist. Run vite build first.");
}

writePublicRouteFallbacks();

if (isPagesBuild) {
  fs.copyFileSync(path.join(distDir, "index.html"), path.join(distDir, "404.html"));
}

if (client) {
  assert(/^ca-pub-\d{16}$/.test(client), "VITE_ADSENSE_CLIENT must match ca-pub-0000000000000000.");
  if (slot) assert(/^\d{4,}$/.test(slot), "VITE_ADSENSE_SLOT_CONTENT must be a numeric ad slot id when set.");

  if (lockedClient) {
    assert(client === lockedClient, `AdSense client mismatch. Expected ${lockedClient}, got ${client}.`);
  }
}

function writePublicRouteFallbacks() {
  const indexPath = path.join(distDir, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8");

  for (const route of publicRoutes) {
    const routeDir = path.join(distDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, "index.html"), indexHtml);
  }
}

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  console.error(`Deploy finalization failed: ${message}`);
  process.exit(1);
}
