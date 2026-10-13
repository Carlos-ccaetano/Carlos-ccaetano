export const tokens = Object.freeze({
  background: "#161614",
  panel: "#11110f",
  text: "#e9e5d8",
  muted: "#a29e92",
  accent: "#e8604f",
});

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
  const [red, green, blue] = channels.map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastReport() {
  return [
    { name: "cream text / background", ratio: contrastRatio(tokens.text, tokens.background), threshold: 4.5 },
    { name: "coral text / background", ratio: contrastRatio(tokens.accent, tokens.background), threshold: 4.5 },
    { name: "muted graphics / background", ratio: contrastRatio(tokens.muted, tokens.background), threshold: 3 },
  ];
}

export function assertContrast() {
  for (const pair of contrastReport()) {
    if (pair.ratio < pair.threshold) {
      throw new Error(`${pair.name} contrast ${pair.ratio.toFixed(2)} is below ${pair.threshold}:1`);
    }
  }
}
