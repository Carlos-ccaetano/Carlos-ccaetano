import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { optimize } from "svgo";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MIN_TEXT_SIZE,
  createHeroSvg,
  createManualChecklist,
  createReadme,
  loadContent,
  resolveStack,
} from "./build-hero.mjs";
import { assertContrast, contrastReport } from "./tokens.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check() {
  assertContrast();
  const content = await loadContent();
  const expectedHero = `${await createHeroSvg(content)}\n`;
  const actualHero = await fs.readFile(path.join(ROOT, "assets", "hero.svg"), "utf8");
  const actualReadme = await fs.readFile(path.join(ROOT, "README.md"), "utf8");
  const actualChecklist = await fs.readFile(path.join(ROOT, "MANUAL_CHECKLIST.md"), "utf8");

  assert(actualHero === expectedHero, "assets/hero.svg diverges from tools/content.json");
  assert(actualReadme === createReadme(content), "README.md diverges from tools/content.json");
  assert(actualChecklist === createManualChecklist(content), "MANUAL_CHECKLIST.md diverges from tools/content.json");
  assert(Buffer.byteLength(actualHero) < 120 * 1024, "assets/hero.svg exceeds 120 KB");
  assert(actualHero.includes("<title"), "SVG title is missing");
  assert(actualHero.includes("<desc"), "SVG description is missing");
  assert(actualHero.includes('viewBox="0 0 1600 1100"'), "SVG viewBox is missing");
  assert(!/<text\b/i.test(actualHero), "SVG contains a <text> element");
  assert(!/<(?:filter|image|script)\b/i.test(actualHero), "SVG contains a forbidden element");
  assert(!/<(?:linearGradient|radialGradient)\b|\bopacity=/i.test(actualHero), "SVG contains a gradient or opacity trick");
  assert(!/(?:href|src)=["'](?:https?:|data:|\/\/)/i.test(actualHero), "SVG contains an external reference");
  const decodedHero = actualHero.replaceAll("&apos;", "'");
  assert(decodedHero.includes(content.about), "About text is missing from SVG metadata");
  assert(actualReadme.includes(content.about), "About text is missing from README");
  const tileTags = actualHero.match(/<g\b[^>]*id="tile-\d+"[^>]*>/g) || [];
  assert(tileTags.length === 10, "SVG must contain ten stack tiles");
  const tiles = tileTags.map((tag) => Object.fromEntries(
    [...tag.matchAll(/data-(x|y|width|height)="([^"]+)"/g)]
      .map((match) => [match[1], Number(match[2])]),
  ));
  assert(new Set(tiles.map((tile) => tile.width)).size === 1, "Stack tile widths differ");
  assert(new Set(tiles.map((tile) => tile.height)).size === 1, "Stack tile heights differ");
  const rows = [...new Set(tiles.map((tile) => tile.y))];
  assert(rows.length === 2, "Stack grid must contain two rows");
  for (const row of rows) {
    const positions = tiles.filter((tile) => tile.y === row).map((tile) => tile.x).sort((a, b) => a - b);
    assert(positions.length === 5, "Each stack row must contain five tiles");
    const steps = positions.slice(1).map((position, index) => (position - positions[index]).toFixed(1));
    assert(new Set(steps).size === 1, "Stack tile spacing differs");
  }

  const xmlCheck = optimize(actualHero, { multipass: false, plugins: [] });
  assert(!xmlCheck.error, `SVG is not well formed: ${xmlCheck.error}`);

  const png = await fs.readFile(path.join(ROOT, "assets", "hero@2x.png"));
  const pngWidth = png.readUInt32BE(16);
  const pngHeight = png.readUInt32BE(20);
  assert(pngWidth === 3200 && pngHeight === 2200, "hero@2x.png must be 3200x2200");

  const sourceFiles = [
    "README.md",
    "MANUAL_CHECKLIST.md",
    "tools/content.json",
    "tools/tokens.mjs",
    "tools/build-hero.mjs",
    "tools/check.mjs",
    "tools/README.md",
  ];
  const combined = (
    await Promise.all(sourceFiles.map((file) => fs.readFile(path.join(ROOT, file), "utf8")))
  ).join("\n");
  assert(actualReadme.split("\n").length - 1 < 80, "README.md exceeds 80 lines");
  assert(content.about && actualReadme.split(content.about).length - 1 >= 2, "About text must appear in alt text and details");
  const placeholderTokens = [
    "<FI" + "LL",
    "SE" + "U_",
    "TO" + "DO",
    "FIX" + "ME",
    "lo" + "rem",
    "your" + "-handle",
  ];
  assert(
    !placeholderTokens.some((token) => combined.toLowerCase().includes(token.toLowerCase())),
    "Placeholder text found",
  );
  assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(combined), "Emoji found");

  for (const source of [...actualReadme.matchAll(/src="([^"]+)"/g)].map((match) => match[1])) {
    await fs.access(path.join(ROOT, source));
  }

  for (const pair of contrastReport()) {
    console.log(`${pair.name}: ${pair.ratio.toFixed(2)}:1`);
  }
  const monograms = resolveStack(content.stack)
    .filter((item) => item.monogram)
    .map((item) => item.label);
  console.log(`hero.svg: ${Buffer.byteLength(actualHero)} bytes`);
  console.log(`smallest nominal text: ${MIN_TEXT_SIZE}px; at 880px: ${(MIN_TEXT_SIZE * 880 / CANVAS_WIDTH).toFixed(1)}px; at 343px: ${(MIN_TEXT_SIZE * 343 / CANVAS_WIDTH).toFixed(1)}px`);
  console.log(`preview heights: ${CANVAS_HEIGHT}px, ${Math.round(CANVAS_HEIGHT * 880 / CANVAS_WIDTH)}px, ${Math.round(CANVAS_HEIGHT * 343 / CANVAS_WIDTH)}px`);
  console.log(`monogram tiles: ${monograms.join(", ") || "none"}`);
  console.log("All profile checks passed.");
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
