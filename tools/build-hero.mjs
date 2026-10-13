import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import { optimize } from "svgo";

import { assertContrast, contrastReport, tokens } from "./tokens.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const CONTENT_PATH = path.join(TOOL_DIR, "content.json");
const ICON_DIR = path.join(TOOL_DIR, "icons");
const PIXEL_FONT_PATH = path.join(TOOL_DIR, "fonts", "Silkscreen-Regular.woff");
const MONO_FONT_PATH = path.join(TOOL_DIR, "fonts", "IBMPlexMono-Regular.woff");

export const CANVASES = Object.freeze({
  desktop: Object.freeze({ width: 1280, height: 995 }),
  mobile: Object.freeze({ width: 360, height: 715 }),
});

export const PREVIEW_WIDTHS = Object.freeze({
  desktop: [1280, 800],
  mobile: [360, 343],
});

export const EXPECTED_STACK = Object.freeze([
  "Elixir",
  "Phoenix",
  "PostgreSQL",
  "AWS",
  "Docker",
  "Java",
  "Spring Boot",
  "GitHub Actions",
  "Linux",
  "Python",
]);

export const EXPECTED_CERTIFICATIONS = Object.freeze([
  "API-RTA · CyberWarFare Labs",
  "AWS Solutions Architect – Associate · in progress",
]);

const ICON_FILES = Object.freeze({
  Elixir: "elixir.svg",
  Phoenix: "phoenix.svg",
  PostgreSQL: "postgresql.svg",
  AWS: "aws.svg",
  Docker: "docker.svg",
  Java: "java.svg",
  "Spring Boot": "spring-boot.svg",
  "GitHub Actions": "github-actions.svg",
  Linux: "linux.svg",
  Python: "python.svg",
});

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeXml(value).replaceAll("'", "&apos;");
}

function loadFont(fontPath) {
  return new Promise((resolve, reject) => {
    opentype.load(fontPath, (error, font) => {
      if (error) reject(error);
      else resolve(font);
    });
  });
}

class GlyphOutliner {
  constructor(font, prefix) {
    this.font = font;
    this.prefix = prefix;
    this.glyphs = new Map();
  }

  atTop(value, x, top, size, fill) {
    const bounds = this.font.getPath(value, 0, 0, size).getBoundingBox();
    return this.atBaseline(value, x, top - bounds.y1, size, fill);
  }

  atBaseline(value, x, baseline, size, fill) {
    const scale = size / this.font.unitsPerEm;
    const uses = [];
    let cursor = x;
    const characters = [...value];
    characters.forEach((character, index) => {
      const glyph = this.font.charToGlyph(character);
      if (character !== " ") {
        const id = `${this.prefix}-${character.codePointAt(0).toString(16)}`;
        if (!this.glyphs.has(id)) {
          this.glyphs.set(id, glyph.getPath(0, 0, this.font.unitsPerEm).toPathData(1));
        }
        uses.push(`<use href="#${id}" transform="translate(${cursor.toFixed(1)} ${baseline.toFixed(1)}) scale(${scale.toFixed(5)})"/>`);
      }
      const next = characters[index + 1];
      const nextGlyph = next ? this.font.charToGlyph(next) : null;
      const kerning = nextGlyph ? this.font.getKerningValue(glyph, nextGlyph) : 0;
      cursor += ((glyph.advanceWidth || this.font.unitsPerEm) + kerning) * scale;
    });
    return `<g fill="${fill}">${uses.join("")}</g>`;
  }

  definitions() {
    return [...this.glyphs.entries()]
      .map(([id, data]) => `<path id="${id}" d="${data}"/>`)
      .join("");
  }
}

function outlineAtTop(outliner, value, x, top, size, fill) {
  return outliner.atTop(value, x, top, size, fill);
}

function centeredOutline(outliner, value, centerX, top, size, fill) {
  const width = outliner.font.getAdvanceWidth(value, size);
  return outlineAtTop(outliner, value, centerX - width / 2, top, size, fill);
}

function fittedTopOutlineWithin(outliner, value, x, top, targetHeight, maxWidth, fill) {
  const sampleSize = 100;
  const bounds = outliner.font.getPath(value, 0, 0, sampleSize).getBoundingBox();
  const size = (sampleSize * targetHeight) / (bounds.y2 - bounds.y1);
  const width = outliner.font.getAdvanceWidth(value, size);
  const scaleX = Math.min(1, maxWidth / width);
  const outline = outlineAtTop(outliner, value, x, top, size, fill);
  return `<g transform="translate(${x} 0) scale(${scaleX.toFixed(5)} 1) translate(${-x} 0)">${outline}</g>`;
}

function fitTextSize(font, value, preferredSize, maxWidth) {
  const width = font.getAdvanceWidth(value, preferredSize);
  return width <= maxWidth ? preferredSize : preferredSize * maxWidth / width;
}

function wrapText(font, value, size, maxWidth) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.getAdvanceWidth(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function prefixIds(source, prefix) {
  let result = source;
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of ids) {
    result = result
      .replaceAll(`id="${id}"`, `id="${prefix}-${id}"`)
      .replaceAll(`url(#${id})`, `url(#${prefix}-${id})`)
      .replaceAll(`href="#${id}"`, `href="#${prefix}-${id}"`)
      .replaceAll(`xlink:href="#${id}"`, `xlink:href="#${prefix}-${id}"`);
  }
  return result;
}

export async function loadIcons() {
  const entries = await Promise.all(EXPECTED_STACK.map(async (label) => {
    const file = ICON_FILES[label];
    const source = await fs.readFile(path.join(ICON_DIR, file), "utf8");
    const match = source.match(/<svg\b[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>\s*$/i);
    if (!match) throw new Error(`${file} has no readable SVG viewBox`);
    const slug = file.replace(/\.svg$/, "");
    const body = prefixIds(match[2], `icon-${slug}`);
    return [label, { label, slug, file, viewBox: match[1], body }];
  }));
  return Object.fromEntries(entries);
}

function iconSvg(icon, x, y, width, height) {
  const inheritedFill = icon.slug === "linux" ? ' fill="#fcc624"' : "";
  return `<svg data-icon="${icon.slug}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${icon.viewBox}" preserveAspectRatio="xMidYMid meet"${inheritedFill}>${icon.body}</svg>`;
}

function dottedEdges(width, height, bandWidth) {
  const right = width - bandWidth;
  return [
    `<rect width="${bandWidth}" height="${height}" fill="url(#dots)"/>`,
    `<rect x="${right}" width="${bandWidth}" height="${height}" fill="url(#dots)"/>`,
  ].join("");
}

function desktopArtwork(content, pixel, mono, icons) {
  const parts = [];
  parts.push(`<rect width="1280" height="995" fill="${tokens.background}"/>`);
  parts.push(dottedEdges(1280, 995, 80));
  parts.push(fittedTopOutlineWithin(pixel, content.name, 80, 60, 75, 880, tokens.text));
  parts.push(outlineAtTop(mono, content.role, 80, 163, 26, tokens.text));
  parts.push(`<rect x="80" y="207" width="68" height="5" fill="${tokens.accent}"/>`);

  const aboutLines = wrapText(mono.font, content.about, 22, 1100);
  if (aboutLines.length !== 4) throw new Error(`Desktop About must occupy four lines, found ${aboutLines.length}`);
  aboutLines.forEach((line, index) => {
    parts.push(outlineAtTop(mono, line, 80, 229 + index * 34, 22, tokens.text));
  });

  parts.push(outlineAtTop(pixel, "STACK", 80, 409, 40, tokens.text));
  parts.push(`<line x1="240" y1="435" x2="1180" y2="435" stroke="${tokens.muted}" stroke-width="1.2"/>`);
  parts.push(`<rect x="1172" y="430" width="8" height="8" fill="${tokens.accent}"/>`);

  const cardWidth = 180;
  const cardHeight = 126;
  const columnStep = 227;
  const rowTops = [463, 649];
  content.stack.forEach((label, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = 80 + column * columnStep;
    const y = rowTops[row];
    const centerX = x + cardWidth / 2;
    parts.push(`<g id="tile-desktop-${index}" data-row="${row}" data-column="${column}" data-label="${escapeAttribute(label)}">`);
    parts.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" fill="${tokens.panel}" stroke="${tokens.muted}" stroke-width="1.25"/>`);
    parts.push(`<path d="M${x} ${y + 14}V${y}H${x + 14}M${x + 166} ${y}H${x + 180}V${y + 14}M${x} ${y + 112}V${y + 126}H${x + 14}M${x + 166} ${y + 126}H${x + 180}V${y + 112}" fill="none" stroke="${tokens.accent}" stroke-width="3"/>`);
    parts.push(iconSvg(icons[label], x + 35, y + 10, 110, 102));
    parts.push(centeredOutline(mono, label, centerX, y + 139, 21, tokens.text));
    parts.push("</g>");
  });

  parts.push(`<line x1="80" y1="855" x2="1180" y2="855" stroke="${tokens.muted}" stroke-width="1"/>`);
  parts.push(`<rect x="80" y="880" width="8" height="8" fill="${tokens.accent}"/>`);
  parts.push(outlineAtTop(pixel, "CERTIFICATIONS", 104, 883, 19, tokens.accent));
  content.certifications.forEach((certification, index) => {
    parts.push(outlineAtTop(mono, certification, 395, 883 + index * 31, 19, tokens.text));
  });
  parts.push(`<line x1="80" y1="953" x2="1180" y2="953" stroke="${tokens.muted}" stroke-width="1"/>`);
  return parts;
}

function mobileLabelLines(label) {
  if (label === "PostgreSQL") return ["Postgre", "SQL"];
  if (label === "Spring Boot") return ["Spring", "Boot"];
  if (label === "GitHub Actions") return ["GitHub", "Actions"];
  return [label];
}

function mobileArtwork(content, pixel, mono, icons) {
  const parts = [];
  const margin = 20;
  const contentWidth = 320;
  parts.push(`<rect width="360" height="715" fill="${tokens.background}"/>`);
  parts.push(dottedEdges(360, 715, 12));
  parts.push(fittedTopOutlineWithin(pixel, content.name, margin, 18, 31, contentWidth, tokens.text));
  const roleSize = fitTextSize(mono.font, content.role, 14, contentWidth);
  parts.push(outlineAtTop(mono, content.role, margin, 65, roleSize, tokens.text));
  parts.push(`<rect x="20" y="95" width="52" height="4" fill="${tokens.accent}"/>`);

  const aboutSize = 14.5;
  const aboutLineHeight = 21.5;
  const aboutLines = wrapText(mono.font, content.about, aboutSize, contentWidth);
  const aboutTop = 116;
  aboutLines.forEach((line, index) => {
    parts.push(outlineAtTop(mono, line, margin, aboutTop + index * aboutLineHeight, aboutSize, tokens.text));
  });

  const stackTop = aboutTop + aboutLines.length * aboutLineHeight + 25;
  parts.push(outlineAtTop(pixel, "STACK", margin, stackTop, 22, tokens.text));
  parts.push(`<line x1="100" y1="${stackTop + 14}" x2="340" y2="${stackTop + 14}" stroke="${tokens.muted}" stroke-width="1"/>`);
  parts.push(`<rect x="335" y="${stackTop + 10}" width="5" height="5" fill="${tokens.accent}"/>`);

  const gap = 6;
  const cardWidth = (contentWidth - gap * 4) / 5;
  const cardHeight = 70;
  const rowStep = 108;
  const gridTop = stackTop + 38;
  content.stack.forEach((label, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = margin + column * (cardWidth + gap);
    const y = gridTop + row * rowStep;
    const centerX = x + cardWidth / 2;
    parts.push(`<g id="tile-mobile-${index}" data-row="${row}" data-column="${column}" data-label="${escapeAttribute(label)}">`);
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cardWidth.toFixed(1)}" height="${cardHeight}" fill="${tokens.panel}" stroke="${tokens.muted}" stroke-width="1"/>`);
    parts.push(`<path d="M${x.toFixed(1)} ${(y + 9).toFixed(1)}V${y.toFixed(1)}H${(x + 9).toFixed(1)}M${(x + cardWidth - 9).toFixed(1)} ${y.toFixed(1)}H${(x + cardWidth).toFixed(1)}V${(y + 9).toFixed(1)}M${x.toFixed(1)} ${(y + cardHeight - 9).toFixed(1)}V${(y + cardHeight).toFixed(1)}H${(x + 9).toFixed(1)}M${(x + cardWidth - 9).toFixed(1)} ${(y + cardHeight).toFixed(1)}H${(x + cardWidth).toFixed(1)}V${(y + cardHeight - 9).toFixed(1)}" fill="none" stroke="${tokens.accent}" stroke-width="2"/>`);
    parts.push(iconSvg(icons[label], (x + 8).toFixed(1), (y + 6).toFixed(1), (cardWidth - 16).toFixed(1), 57));
    mobileLabelLines(label).forEach((line, lineIndex) => {
      const size = fitTextSize(mono.font, line, 10.5, cardWidth - 3);
      if (size < 9.5) throw new Error(`Mobile label is too small: ${line}`);
      parts.push(centeredOutline(mono, line, centerX, y + 76 + lineIndex * 12, size, tokens.text));
    });
    parts.push("</g>");
  });

  const certificationLineY = gridTop + rowStep + 105;
  parts.push(`<line x1="20" y1="${certificationLineY}" x2="340" y2="${certificationLineY}" stroke="${tokens.muted}" stroke-width="1"/>`);
  parts.push(`<rect x="20" y="${certificationLineY + 20}" width="6" height="6" fill="${tokens.accent}"/>`);
  parts.push(outlineAtTop(pixel, "CERTIFICATIONS", 34, certificationLineY + 18, 15, tokens.accent));
  let certificationTop = certificationLineY + 49;
  for (const certification of content.certifications) {
    const lines = wrapText(mono.font, certification, 12.5, contentWidth);
    for (const line of lines) {
      parts.push(outlineAtTop(mono, line, margin, certificationTop, 12.5, tokens.text));
      certificationTop += 18;
    }
    certificationTop += 4;
  }
  parts.push(`<line x1="20" y1="${certificationTop + 5}" x2="340" y2="${certificationTop + 5}" stroke="${tokens.muted}" stroke-width="1"/>`);
  return parts;
}

export async function loadContent() {
  return JSON.parse(await fs.readFile(CONTENT_PATH, "utf8"));
}

export async function createProfileSvg(content, variant) {
  content ??= await loadContent();
  const canvas = CANVASES[variant];
  if (!canvas) throw new Error(`Unknown profile variant: ${variant}`);
  assertContrast();
  const [pixelFont, monoFont, icons] = await Promise.all([
    loadFont(PIXEL_FONT_PATH),
    loadFont(MONO_FONT_PATH),
    loadIcons(),
  ]);
  const pixel = new GlyphOutliner(pixelFont, `pixel-${variant}`);
  const mono = new GlyphOutliner(monoFont, `mono-${variant}`);
  const artwork = variant === "desktop"
    ? desktopArtwork(content, pixel, mono, icons)
    : mobileArtwork(content, pixel, mono, icons);
  const title = `${content.name} — ${content.role}`;
  const source = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(content.alt)}</desc>`,
    `<defs><pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="${tokens.muted}" opacity=".28"/></pattern>${pixel.definitions()}${mono.definitions()}</defs>`,
    ...artwork,
    "</svg>",
  ].join("");

  const result = optimize(source, {
    multipass: true,
    floatPrecision: 2,
    plugins: [{
      name: "preset-default",
      params: { overrides: {
        cleanupIds: false,
        convertPathData: false,
        removeTitle: false,
        removeUnknownsAndDefaults: false,
        removeViewBox: false,
      } },
    }],
  });
  if (result.error) throw new Error(result.error);
  return result.data;
}

export function createReadme(content) {
  return `<picture>
  <source media="(max-width: 600px)" srcset="assets/hero-mobile.svg">
  <img src="assets/hero.svg" width="100%" alt="${escapeAttribute(content.alt)}">
</picture>

<details>
<summary>Read as text</summary>

**${content.name}**

${content.role}

${content.about}

**Stack:** ${content.stack.join(", ")}

**Certifications:** ${content.certifications.join("; ")}

</details>
`;
}

async function writeIfChanged(filePath, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let current;
  try {
    current = await fs.readFile(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!current || !current.equals(buffer)) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }
}

async function renderPng(svg, width) {
  return new Resvg(svg, {
    background: tokens.background,
    fitTo: { mode: "width", value: width },
  }).render().asPng();
}

export async function build() {
  const content = await loadContent();
  const [desktop, mobile] = await Promise.all([
    createProfileSvg(content, "desktop"),
    createProfileSvg(content, "mobile"),
  ]);
  await writeIfChanged(path.join(ROOT, "assets", "hero.svg"), `${desktop}\n`);
  await writeIfChanged(path.join(ROOT, "assets", "hero-mobile.svg"), `${mobile}\n`);
  await writeIfChanged(path.join(ROOT, "README.md"), createReadme(content));

  const previewDirectory = path.join(TOOL_DIR, "preview");
  await fs.mkdir(previewDirectory, { recursive: true });
  for (const [variant, widths] of Object.entries(PREVIEW_WIDTHS)) {
    const svg = variant === "desktop" ? desktop : mobile;
    for (const width of widths) {
      await writeIfChanged(path.join(previewDirectory, `${variant}-${width}.png`), await renderPng(svg, width));
    }
  }

  for (const pair of contrastReport()) console.log(`${pair.name}: ${pair.ratio.toFixed(2)}:1`);
  console.log("Generated desktop/mobile SVGs, README, and local previews.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
