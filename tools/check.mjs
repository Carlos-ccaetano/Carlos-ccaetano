import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { optimize } from "svgo";

import {
  CANVASES,
  EXPECTED_CERTIFICATIONS,
  EXPECTED_STACK,
  createProfileSvg,
  createReadme,
  loadContent,
} from "./build-hero.mjs";
import { assertContrast, contrastReport } from "./tokens.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const ICON_DIR = path.join(TOOL_DIR, "icons");

const EXPECTED_ABOUT = "I’m a backend developer working on payments in Elixir. I study API security too, mostly because breaking things teaches you how to build them better. When I’m away from the keyboard I’m usually on a trail, on a climbing wall, or practicing the saxophone (not well, but regularly).";
const EXPECTED_ROLE = "Software Engineer · Backend & Payments";
const ICON_COLOR_MARKERS = Object.freeze({
  "elixir.svg": ["#8d67af", "#26053d"],
  "phoenix.svg": ["#fd4f00"],
  "postgresql.svg": ["#336791"],
  "aws.svg": ["#f90"],
  "docker.svg": ["#00aada", "#23c2ee"],
  "java.svg": ["#0074bd", "#ea2d2e"],
  "spring-boot.svg": ["#77bc1f"],
  "github-actions.svg": ["#2088ff"],
  "linux.svg": [],
  "python.svg": ["#5a9fd4", "#ffd43b"],
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertArray(actual, expected, name) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${name} does not match the approved order`);
}

function localReferences(svg) {
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const references = [
    ...svg.matchAll(/url\(#([^)]+)\)/g),
    ...svg.matchAll(/(?:href|xlink:href)="#([^"]+)"/g),
  ].map((match) => match[1]);
  return references.filter((reference) => !ids.has(reference));
}

function checkSvg(svg, variant, content) {
  const canvas = CANVASES[variant];
  assert(Buffer.byteLength(svg) < 180 * 1024, `${variant} SVG exceeds 180 KB`);
  assert(svg.includes("<title"), `${variant} SVG title is missing`);
  assert(svg.includes("<desc"), `${variant} SVG description is missing`);
  assert(svg.includes(`viewBox="0 0 ${canvas.width} ${canvas.height}"`), `${variant} SVG viewBox is wrong`);
  assert(!/<text\b/i.test(svg), `${variant} SVG contains live text`);
  assert(!/<(?:filter|image|script|foreignObject|iframe)\b/i.test(svg), `${variant} SVG contains an unsafe or raster element`);
  assert(!/(?:href|src)=["'](?:https?:|data:|\/\/)/i.test(svg), `${variant} SVG contains an external reference`);
  assert(localReferences(svg).length === 0, `${variant} SVG contains a broken local reference`);
  assert(svg.includes(content.alt.replaceAll("&", "&amp;")), `${variant} SVG description is stale`);

  const icons = [...svg.matchAll(/data-icon="([^"]+)"/g)].map((match) => match[1]);
  assert(icons.length === 10, `${variant} SVG must contain ten vector logos`);
  assert(new Set(icons).size === 10, `${variant} SVG contains a duplicate vector logo`);
  assert(!/monogram/i.test(svg), `${variant} SVG contains a monogram fallback`);

  const tiles = [...svg.matchAll(new RegExp(`<g\\b[^>]*id="tile-${variant}-\\d+"[^>]*>`, "g"))];
  assert(tiles.length === 10, `${variant} SVG must contain ten stack tiles`);
  const positions = tiles.map((match) => ({
    row: Number(match[0].match(/data-row="(\d+)"/)[1]),
    column: Number(match[0].match(/data-column="(\d+)"/)[1]),
    label: match[0].match(/data-label="([^"]+)"/)[1],
  }));
  assert(positions.filter(({ row }) => row === 0).length === 5, `${variant} first row must contain five technologies`);
  assert(positions.filter(({ row }) => row === 1).length === 5, `${variant} second row must contain five technologies`);
  positions.forEach((position, index) => {
    assert(position.row === Math.floor(index / 5), `${variant} stack row order is wrong`);
    assert(position.column === index % 5, `${variant} stack column order is wrong`);
    assert(position.label === content.stack[index], `${variant} stack label order is wrong`);
  });

  const xmlCheck = optimize(svg, { multipass: false, plugins: [] });
  assert(!xmlCheck.error, `${variant} SVG is not well formed: ${xmlCheck.error}`);
}

async function checkIconSources() {
  const files = (await fs.readdir(ICON_DIR)).filter((file) => file.endsWith(".svg")).sort();
  const expectedFiles = Object.keys(ICON_COLOR_MARKERS).sort();
  assertArray(files, expectedFiles, "Icon source files");
  for (const file of files) {
    const source = (await fs.readFile(path.join(ICON_DIR, file), "utf8")).toLowerCase();
    assert(/<svg\b/.test(source) && /<path\b/.test(source), `${file} is not a path-based SVG`);
    assert(!/<(?:text|image|script|foreignobject|iframe)\b/i.test(source), `${file} contains live text, raster content, or scripting`);
    assert(!/(?:href|src)=["'](?:https?:|data:|\/\/)/i.test(source), `${file} contains an external reference`);
    for (const color of ICON_COLOR_MARKERS[file]) {
      assert(source.includes(color), `${file} is missing expected brand color ${color}`);
    }
  }
  await fs.access(path.join(ICON_DIR, "LICENSE-Devicon.txt"));
  await fs.access(path.join(TOOL_DIR, "fonts", "LICENSE-IBM-Plex-Mono.txt"));
  await fs.access(path.join(TOOL_DIR, "fonts", "LICENSE-Silkscreen.txt"));
}

async function assertMissing(relativePath) {
  try {
    await fs.access(path.join(ROOT, relativePath));
    throw new Error(`${relativePath} should have been removed`);
  } catch (error) {
    if (error.message.endsWith("should have been removed")) throw error;
    if (error.code !== "ENOENT") throw error;
  }
}

async function check() {
  assertContrast();
  const content = await loadContent();
  assert(content.name === "CARLOS CAETANO", "Profile name changed");
  assert(content.role === EXPECTED_ROLE, "Role does not match the approved wording");
  assert(content.about === EXPECTED_ABOUT, "About paragraph does not match the approved wording");
  assertArray(content.stack, EXPECTED_STACK, "Stack");
  assertArray(content.certifications, EXPECTED_CERTIFICATIONS, "Certifications");

  const expectedDesktop = `${await createProfileSvg(content, "desktop")}\n`;
  const expectedMobile = `${await createProfileSvg(content, "mobile")}\n`;
  const actualDesktop = await fs.readFile(path.join(ROOT, "assets", "hero.svg"), "utf8");
  const actualMobile = await fs.readFile(path.join(ROOT, "assets", "hero-mobile.svg"), "utf8");
  const actualReadme = await fs.readFile(path.join(ROOT, "README.md"), "utf8");

  assert(actualDesktop === expectedDesktop, "assets/hero.svg diverges from the generator");
  assert(actualMobile === expectedMobile, "assets/hero-mobile.svg diverges from the generator");
  assert(actualReadme === createReadme(content), "README.md diverges from tools/content.json");
  checkSvg(actualDesktop, "desktop", content);
  checkSvg(actualMobile, "mobile", content);
  await checkIconSources();

  assert(actualReadme.split("\n").length - 1 < 30, "README.md exceeds 30 lines");
  assert(actualReadme.includes('<source media="(max-width: 600px)" srcset="assets/hero-mobile.svg">'), "README mobile source is missing");
  assert(actualReadme.includes('src="assets/hero.svg"'), "README desktop source is missing");
  assert(actualReadme.includes(content.about), "Accessible text equivalent is missing the About paragraph");
  for (const technology of EXPECTED_STACK) assert(actualReadme.includes(technology), `README is missing ${technology}`);
  for (const certification of EXPECTED_CERTIFICATIONS) assert(actualReadme.includes(certification), `README is missing ${certification}`);
  assert(!/selected work|tidewake|ironhold|stats|skill rating|\bcore\b|\badditional\b|linkedin|github\.com|belo horizonte|attrus/i.test(actualReadme), "README contains explicitly excluded content");
  assert(!/certified aws|aws certified/i.test(actualReadme), "AWS certification is presented as earned");
  assert(!/\b(?:ecto|oban)\b/i.test(actualReadme), "README contains an unrequested technology");

  const sources = [...actualReadme.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((match) => match[1]);
  for (const source of sources) await fs.access(path.join(ROOT, source));
  assertArray((await fs.readdir(path.join(ROOT, "assets"))).sort(), ["hero-mobile.svg", "hero.svg"], "Generated assets");
  await assertMissing("MANUAL_CHECKLIST.md");
  await assertMissing("assets/hero@2x.png");

  const sourceFiles = [
    "README.md",
    "tools/content.json",
    "tools/tokens.mjs",
    "tools/build-hero.mjs",
    "tools/check.mjs",
    "tools/README.md",
  ];
  const combined = (await Promise.all(sourceFiles.map((file) => fs.readFile(path.join(ROOT, file), "utf8")))).join("\n");
  const placeholders = ["<FI" + "LL", "SE" + "U_", "TO" + "DO", "FIX" + "ME", "lo" + "rem", "your" + "-handle"];
  assert(!placeholders.some((token) => combined.toLowerCase().includes(token.toLowerCase())), "Placeholder text found");
  assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(combined), "Emoji found");

  for (const pair of contrastReport()) console.log(`${pair.name}: ${pair.ratio.toFixed(2)}:1`);
  console.log(`hero.svg: ${Buffer.byteLength(actualDesktop)} bytes`);
  console.log(`hero-mobile.svg: ${Buffer.byteLength(actualMobile)} bytes`);
  console.log("desktop body text at 800px: 13.8px");
  console.log("mobile body text at 343px: 13.8px; labels: at least 9px");
  console.log("vector logos: 10 Devicon sources, no raster fallbacks or monograms");
  console.log("All profile checks passed.");
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
