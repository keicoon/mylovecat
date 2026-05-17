import type { CustomTheme, ThemeColorKey, ThemeMode } from "./types";

export const themeColorKeys: ThemeColorKey[] = [
  "ink",
  "muted",
  "line",
  "softLine",
  "surface",
  "surface2",
  "base",
  "brand",
  "brandText",
  "green",
  "mint",
  "coral",
  "amber",
  "violet",
];

export const themeColorLabels: Record<ThemeColorKey, string> = {
  ink: "본문",
  muted: "보조 텍스트",
  line: "선",
  softLine: "옅은 선",
  surface: "표면",
  surface2: "보조 표면",
  base: "배경",
  brand: "브랜드",
  brandText: "브랜드 글자",
  green: "주 색상",
  mint: "민트",
  coral: "코랄",
  amber: "앰버",
  violet: "바이올렛",
};

export const themeColorToCssVar: Record<ThemeColorKey, string> = {
  ink: "--ink",
  muted: "--muted",
  line: "--line",
  softLine: "--soft-line",
  surface: "--surface",
  surface2: "--surface-2",
  base: "--base",
  brand: "--brand",
  brandText: "--brand-ink",
  green: "--green",
  mint: "--mint",
  coral: "--coral",
  amber: "--amber",
  violet: "--violet",
};

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark" || value === "calico" || value === "custom";
}

export function normalizeCustomTheme(value: unknown): CustomTheme | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Partial<CustomTheme>;
  if (candidate.schemaVersion !== 1 || candidate.app !== "mylovecat-theme") return undefined;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) return undefined;
  if (!candidate.colors || typeof candidate.colors !== "object") return undefined;

  const colors: CustomTheme["colors"] = {};
  for (const key of themeColorKeys) {
    const color = candidate.colors[key];
    if (typeof color === "string" && hexColorPattern.test(color.trim())) {
      colors[key] = color.trim();
    }
  }

  if (Object.keys(colors).length < 6) return undefined;

  return {
    schemaVersion: 1,
    app: "mylovecat-theme",
    name: candidate.name.trim().slice(0, 32),
    colors,
  };
}

export function buildThemeTemplate(): CustomTheme {
  return {
    schemaVersion: 1,
    app: "mylovecat-theme",
    name: "Mint Kitty",
    colors: {
      ink: "#22302d",
      muted: "#66727a",
      line: "#dbe7ea",
      softLine: "#edf4f6",
      surface: "#ffffff",
      surface2: "#f0f8f6",
      base: "#f8fbfb",
      brand: "#283d3a",
      brandText: "#ffffff",
      green: "#168f83",
      mint: "#74d6c5",
      coral: "#ff6f91",
      amber: "#f6bf4f",
      violet: "#8c73ff",
    },
  };
}

export function applyCustomThemeToRoot(root: HTMLElement, theme?: CustomTheme) {
  for (const key of themeColorKeys) {
    root.style.removeProperty(themeColorToCssVar[key]);
  }

  root.style.removeProperty("--body-bg");

  if (!theme) return;

  for (const key of themeColorKeys) {
    const color = theme.colors[key];
    if (color) root.style.setProperty(themeColorToCssVar[key], color);
  }

  const base = theme.colors.base ?? "#f8fbfb";
  const mint = theme.colors.mint ?? "#74d6c5";
  const coral = theme.colors.coral ?? "#ff6f91";
  const violet = theme.colors.violet ?? "#8c73ff";
  root.style.setProperty(
    "--body-bg",
    `linear-gradient(135deg, ${hexToRgba(mint, 0.18)}, transparent 34%), linear-gradient(225deg, ${hexToRgba(
      coral,
      0.13,
    )}, transparent 30%), linear-gradient(45deg, ${hexToRgba(violet, 0.08)}, transparent 36%), ${base}`,
  );
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const value = Number.parseInt(normalized.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
