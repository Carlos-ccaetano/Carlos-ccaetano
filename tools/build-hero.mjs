import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import * as simpleIcons from "simple-icons";
import { optimize } from "svgo";

import { assertContrast, contrastReport, tokens } from "./tokens.mjs";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const CONTENT_PATH = path.join(TOOL_DIR, "content.json");
const PIXEL_FONT_PATH = path.join(TOOL_DIR, "fonts", "Silkscreen-Regular.woff");
const MONO_FONT_PATH = path.join(TOOL_DIR, "fonts", "IBMPlexMono-Regular.woff");

export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1100;
export const MIN_TEXT_SIZE = 28;
export const PREVIEW_WIDTHS = [1600, 880, 343];

const ICON_EXPORTS = Object.freeze({
  Elixir: "siElixir",
  Phoenix: "siPhoenixframework",
  PostgreSQL: "siPostgresql",
  Docker: "siDocker",
  AWS: "siAmazonwebservices",
  "GitHub Actions": "siGithubactions",
  Python: "siPython",
});

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayText(value) {
  return value.replaceAll("'", "’");
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
    const text = displayText(value);
    const bounds = this.font.getPath(text, 0, 0, size).getBoundingBox();
    return this.atBaseline(text, x, top - bounds.y1, size, fill);
  }

  atBaseline(value, x, baseline, size, fill) {
    const text = displayText(value);
    const scale = size / this.font.unitsPerEm;
    const uses = [];
    let cursor = x;
    const characters = [...text];
    characters.forEach((character, index) => {
      const glyph = this.font.charToGlyph(character);
      if (character !== " ") {
        const id = `${this.prefix}-${character.codePointAt(0).toString(16)}`;
        if (!this.glyphs.has(id)) {
          const data = glyph.getPath(0, 0, this.font.unitsPerEm).toPathData(1);
          this.glyphs.set(id, data);
        }
        uses.push(`<use href="#${id}" transform="translate(${cursor.toFixed(1)} ${baseline.toFixed(1)}) scale(${scale.toFixed(5)})"/>`);
      }
      const nextCharacter = characters[index + 1];
      const nextGlyph = nextCharacter ? this.font.charToGlyph(nextCharacter) : null;
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
  const text = displayText(value);
  const width = outliner.font.getAdvanceWidth(text, size);
  return outlineAtTop(outliner, text, centerX - width / 2, top, size, fill);
}

function fittedTopOutline(outliner, value, x, top, targetHeight, fill) {
  const sampleSize = 100;
  const bounds = outliner.font.getPath(value, 0, 0, sampleSize).getBoundingBox();
  const size = (sampleSize * targetHeight) / (bounds.y2 - bounds.y1);
  return outlineAtTop(outliner, value, x, top, size, fill);
}

function wrapText(font, value, size, maxWidth) {
  const words = displayText(value).split(/\s+/);
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

function notchedFrame(x, y, width, height) {
  const notch = 16;
  const right = x + width;
  const bottom = y + height;
  return [
    `M${x + notch} ${y}H${right - notch}L${right} ${y + notch}`,
    `V${bottom - notch}L${right - notch} ${bottom}H${x + notch}`,
    `L${x} ${bottom - notch}V${y + notch}Z`,
  ].join("");
}

export function resolveStack(stack) {
  return stack.map((label) => {
    const exportName = ICON_EXPORTS[label];
    const icon = exportName ? simpleIcons[exportName] : undefined;
    return {
      label,
      icon,
      monogram: icon ? null : label.slice(0, 4).toUpperCase(),
    };
  });
}

export async function loadContent() {
  return JSON.parse(await fs.readFile(CONTENT_PATH, "utf8"));
}

export async function createHeroSvg(content) {
  content ??= await loadContent();
  assertContrast();
  const [pixelFont, monoFont] = await Promise.all([
    loadFont(PIXEL_FONT_PATH),
    loadFont(MONO_FONT_PATH),
  ]);
  const pixelOutliner = new GlyphOutliner(pixelFont, "pixel");
  const monoOutliner = new GlyphOutliner(monoFont, "mono");
  const parts = [];
  const margin = 64;
  const contentWidth = CANVAS_WIDTH - margin * 2;

  parts.push(`<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${tokens.background}"/>`);
  parts.push(`<rect x="24" y="24" width="1552" height="1052" rx="12" fill="none" stroke="${tokens.muted}" stroke-width="2"/>`);
  parts.push(fittedTopOutline(pixelOutliner, content.name, margin, 68, 88, tokens.text));
  parts.push(outlineAtTop(monoOutliner, content.role, margin, 184, 40, tokens.text));
  parts.push(`<rect x="${margin}" y="250" width="96" height="6" fill="${tokens.accent}"/>`);

  const aboutLines = wrapText(monoFont, content.about, 28, contentWidth);
  if (aboutLines.length > 4) throw new Error("About text exceeds four lines in the hero");
  aboutLines.forEach((line, index) => {
    parts.push(outlineAtTop(monoOutliner, line, margin, 288 + index * 43.4, 28, tokens.text));
  });

  const stackTop = 482;
  parts.push(outlineAtTop(pixelOutliner, "STACK", margin, stackTop, 32, tokens.accent));
  const stackLabelWidth = pixelFont.getAdvanceWidth("STACK", 32);
  parts.push(`<path d="M${margin + stackLabelWidth + 26} 503H1536" fill="none" stroke="${tokens.muted}" stroke-width="2"/>`);

  const gap = 20;
  const tileWidth = (contentWidth - gap * 4) / 5;
  const tileHeight = 164;
  const rowTops = [536, 720];
  const resolvedStack = resolveStack(content.stack);

  resolvedStack.forEach((item, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = margin + column * (tileWidth + gap);
    const y = rowTops[row];
    const centerX = x + tileWidth / 2;
    parts.push(`<g id="tile-${index}" data-x="${x.toFixed(1)}" data-y="${y}" data-width="${tileWidth.toFixed(1)}" data-height="${tileHeight}">`);
    parts.push(`<path d="${notchedFrame(x, y, tileWidth, tileHeight)}" fill="none" stroke="${tokens.muted}" stroke-width="2"/>`);
    if (item.icon) {
      const iconX = centerX - 48;
      const iconY = y + 18;
      parts.push(`<g transform="translate(${iconX.toFixed(1)} ${iconY}) scale(4)" fill="${tokens.text}"><path d="${item.icon.path}"/></g>`);
    } else {
      parts.push(centeredOutline(pixelOutliner, item.monogram, centerX, y + 42, 42, tokens.text));
    }
    parts.push(centeredOutline(monoOutliner, item.label, centerX, y + 126, 28, tokens.text));
    parts.push("</g>");
  });

  parts.push(`<path d="M${margin} 925H1536" fill="none" stroke="${tokens.muted}" stroke-width="2"/>`);
  parts.push(outlineAtTop(pixelOutliner, "CERTIFICATIONS", margin, 951, 30, tokens.accent));
  const certificationX = 420;
  const certificationWidth = 1536 - certificationX;
  const certificationLines = content.certifications.flatMap((certification) =>
    wrapText(monoFont, certification, 28, certificationWidth),
  );
  certificationLines.forEach((line, index) => {
    parts.push(outlineAtTop(monoOutliner, line, certificationX, 948 + index * 42, 28, tokens.text));
  });

  const title = `${content.name} — ${content.role}`;
  const source = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(content.alt)}</desc>`,
    `<defs>${pixelOutliner.definitions()}${monoOutliner.definitions()}</defs>`,
    ...parts,
    "</svg>",
  ].join("");

  const result = optimize(source, {
    multipass: true,
    floatPrecision: 1,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupIds: false,
            convertPathData: false,
            removeTitle: false,
            removeUnknownsAndDefaults: false,
            removeViewBox: false,
          },
        },
      },
    ],
  });
  if (result.error) throw new Error(result.error);
  return result.data;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export function createReadme(content) {
  const stack = content.stack.join(", ");
  const certifications = content.certifications.join("; ");
  return `<img alt="${escapeAttribute(content.alt)}" src="assets/hero.svg" width="100%">

[GitHub](${content.githubUrl})

<details><summary>Read as text</summary>

${content.about}

STACK: ${stack}

CERTIFICATIONS: ${certifications}

</details>

## 01 / SELECTED WORK

One system, two focused components: Tidewake handles delivery; Ironhold handles receiving and verification.

### [Tidewake](https://github.com/Carlos-ccaetano/Tidewake)

\`WEBHOOK DELIVERY · ELIXIR · PHOENIX · PUBLIC · EARLY\`

A webhook delivery service built around durable ingestion and recoverable background work.

- Persists events, delivery records, and the initial Oban job in one database transaction.
- Signs exact payload bytes with HMAC-SHA256 and records each delivery attempt.
- Recovers stale work and rejects unsafe resolved destinations before delivery.

**NOT YET:** Mature retry policies, secret rotation, or production operations.

### [Ironhold](https://github.com/Carlos-ccaetano/Ironhold)

\`WEBHOOK RECEIVER · ELIXIR · SECURITY · PUBLIC · EARLY\`

The companion receiver: it verifies webhook authenticity before accepting and persisting an event.

- Verifies HMAC-SHA256 signatures against the exact request body within a bounded timestamp window.
- Checks that header and payload event IDs agree before accepting the request.
- Stores accepted events under a unique ID with explicit duplicate and validation responses.

**NOT YET:** Broader replay controls, secret rotation, or production operations.
`;
}

export function createManualChecklist(content) {
  const bioLength = [...content.bio].length;
  return `# Manual checklist

## Confirm before publishing

- Confirm that \`${content.role}\` matches the CV and LinkedIn exactly.
- Confirm the personal details in the About text and all ten stack items.
- Confirm the API-RTA certification name and issuer exactly as shown on the certificate.
- Confirm whether the AWS certification is completed or in progress before adding it anywhere.
- Add LinkedIn only after confirming the exact public profile URL.

## Public profile

- Bio: \`${content.bio}\` (${bioLength}/160 characters)
- Location: \`${content.location}\`
- Website: use the confirmed LinkedIn URL.
- Company: use \`ATTRUS\` only if that is the company’s current official spelling.
- Upload the chosen avatar under Settings > Public profile and use the same image on LinkedIn.

## Pins and older repositories

- Start with Tidewake and Ironhold as one complementary system; add a third pin only if it is distinct and equally polished.
- Unpin \`atom-chess\`, which is a fork.
- Archive or restyle \`Email-Validator\`, \`Basic-Network-Scanner\`, \`IronLock-Password-Generator\`, and \`Login-Simulator-Project\` before featuring them.

## Account settings

- Enable two-factor authentication and “Include private contributions on my profile”.
- Add an SSH or GPG signing key and enable Vigilant mode.
- After merging, open the profile in a private window in light and dark themes; confirm the card, text disclosure, and profile placement.
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
  const renderer = new Resvg(svg, {
    background: tokens.background,
    fitTo: { mode: "width", value: width },
  });
  return renderer.render().asPng();
}

export async function build() {
  const content = await loadContent();
  const hero = await createHeroSvg(content);
  await writeIfChanged(path.join(ROOT, "assets", "hero.svg"), `${hero}\n`);
  await writeIfChanged(path.join(ROOT, "assets", "hero@2x.png"), await renderPng(hero, 3200));
  await writeIfChanged(path.join(ROOT, "README.md"), createReadme(content));
  await writeIfChanged(path.join(ROOT, "MANUAL_CHECKLIST.md"), createManualChecklist(content));

  const previewDirectory = path.join(TOOL_DIR, "preview");
  await fs.mkdir(previewDirectory, { recursive: true });
  for (const width of PREVIEW_WIDTHS) {
    await writeIfChanged(path.join(previewDirectory, `hero-${width}.png`), await renderPng(hero, width));
  }

  for (const pair of contrastReport()) {
    console.log(`${pair.name}: ${pair.ratio.toFixed(2)}:1`);
  }
  console.log("Generated hero SVG, PNG, README, checklist, and previews.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
