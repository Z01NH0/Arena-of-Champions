/**
 * Code-native 16-bit renderer helpers for Riftbound.
 *
 * Everything in this module is drawn with Canvas primitives. There are no
 * image, font or SVG dependencies, so the game can keep its single-bundle,
 * offline-friendly character while still getting a coherent pixel-art look.
 */

export const PIXEL_UNIT = 4;

export type PixelTeam = "red" | "blue";
export type PixelChampionStyle =
  | "mystic"
  | "ranger"
  | "guardian"
  | "assassin"
  | "chronomancer"
  | "monk"
  | "necromancer"
  | "alchemist"
  | "boss";
export type PixelArenaTheme = "rift" | "forge" | "clockwork" | "boss";
export type PixelParticleShape = "circle" | "square" | "spark" | "shard" | "smoke" | "star";
export type PixelProjectileKind = "fire" | "arrow" | "shell" | "time" | "lightning" | "soul" | "vial" | "shade" | "bone";
export type PixelZoneKind = "fire" | "poison" | "storm" | "time" | "meteor" | "arrow-rain" | "vent" | "rift" | "heal" | "boss";
export type PixelPickupKind = "core" | "repair" | "overdrive";
export type PixelSummonKind = "wisp" | "titan";

export type PixelCell = {
  x: number;
  y: number;
  color: string;
  width?: number;
  height?: number;
};

export type PixelChampionOptions = {
  x: number;
  y: number;
  angle: number;
  style: PixelChampionStyle;
  accent: string;
  accent2: string;
  team: PixelTeam;
  phase: number;
  attackFlash?: number;
  hitFlash?: number;
  shield?: number;
  stealth?: number;
  radius?: number;
  scale?: number;
  alpha?: number;
  includeShadow?: boolean;
  includeTeamMarker?: boolean;
};

export type PixelChampionBodyOptions = Omit<
  PixelChampionOptions,
  "x" | "y" | "angle" | "radius" | "shield" | "stealth" | "includeShadow" | "includeTeamMarker"
>;

export type PixelBossOptions = {
  x: number;
  y: number;
  angle: number;
  phase: number;
  healthRatio?: number;
  attackFlash?: number;
  enraged?: boolean;
  scale?: number;
  alpha?: number;
  primary?: string;
  secondary?: string;
};

export type PixelArenaTilesOptions = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  theme: PixelArenaTheme;
  tileSize?: number;
  seed?: number;
  time?: number;
  fillBackground?: boolean;
};

export type PixelObjectiveOptions = {
  x: number;
  y: number;
  radius: number;
  time: number;
  owner?: PixelTeam | "neutral";
  contested?: boolean;
  captureRatio?: number;
};

export type PixelParticleOptions = {
  x: number;
  y: number;
  z?: number;
  vx?: number;
  vy?: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape?: PixelParticleShape;
  seed?: number;
};

export type PixelUltimateSigilOptions = {
  x: number;
  y: number;
  radius: number;
  color: string;
  secondary?: string;
  phase: number;
  alpha?: number;
  style?: PixelChampionStyle | "boss";
};

export type PixelCoverOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  healthRatio: number;
  destructible: boolean;
  accent: string;
  id?: number;
  theme?: PixelArenaTheme;
};

export type PixelProjectileOptions = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  kind: PixelProjectileKind;
  trail?: readonly { x: number; y: number }[];
  phase?: number;
  alpha?: number;
};

export type PixelZoneOptions = {
  x: number;
  y: number;
  radius: number;
  color: string;
  kind: PixelZoneKind;
  lifeRatio: number;
  active: boolean;
  time: number;
  id?: number;
  alpha?: number;
};

export type PixelPickupOptions = {
  x: number;
  y: number;
  kind: PixelPickupKind;
  phase: number;
  color?: string;
  alpha?: number;
};

export type PixelSummonOptions = {
  x: number;
  y: number;
  radius: number;
  kind: PixelSummonKind;
  accent: string;
  accent2: string;
  phase: number;
  team?: PixelTeam;
  angle?: number;
  healthRatio?: number;
  alpha?: number;
};

type Rgb = { r: number; g: number; b: number };

export const PIXEL_PALETTES = {
  ink: "#090b12",
  deepest: "#0e1019",
  outline: "#151827",
  bone: "#f5e6c8",
  skin: "#d9a879",
  skinLight: "#f2cf9d",
  metal: "#a9b0c3",
  metalLight: "#e5e8ef",
  shadow: "rgba(3, 5, 10, .58)",
  teams: {
    red: "#ff5c62",
    redLight: "#ffb06b",
    blue: "#51b9ff",
    blueLight: "#86f0ff",
  },
  effects: {
    fire: ["#8f2528", "#ef4d2f", "#ff9b3d", "#fff0a8"],
    storm: ["#264eb8", "#34c6eb", "#8df7ff", "#f4ffff"],
    poison: ["#325427", "#67b348", "#a9ed62", "#e7ff9c"],
    void: ["#2b174a", "#6f3ba3", "#c05ee8", "#f4b7ff"],
    time: ["#51461a", "#c3a62c", "#f3dc62", "#edffff"],
  },
  arenas: {
    rift: {
      void: "#080c18",
      grout: "#111a2d",
      low: "#18243a",
      high: "#243a4c",
      accent: "#54cfd0",
      sparkle: "#b8ffff",
    },
    forge: {
      void: "#130a08",
      grout: "#25100d",
      low: "#382019",
      high: "#553126",
      accent: "#f16b3f",
      sparkle: "#ffd36a",
    },
    clockwork: {
      void: "#0b0d14",
      grout: "#1b1d29",
      low: "#292c39",
      high: "#424250",
      accent: "#d9bd53",
      sparkle: "#fff0a8",
    },
    boss: {
      void: "#090510",
      grout: "#1b1027",
      low: "#2c1739",
      high: "#44204e",
      accent: "#d64c73",
      sparkle: "#ffb0c8",
    },
  },
} as const;

const TAU = Math.PI * 2;

export function snapPixel(value: number, unit = PIXEL_UNIT) {
  return Math.round(value / unit) * unit;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function parseHex(color: string): Rgb | null {
  const value = color.trim().replace(/^#/, "");
  if (value.length !== 3 && value.length !== 6) return null;
  const expanded = value.length === 3 ? value.split("").map((character) => character + character).join("") : value;
  const parsed = Number.parseInt(expanded, 16);
  if (!Number.isFinite(parsed)) return null;
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function toHex({ r, g, b }: Rgb) {
  const channel = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function mixPixelColor(color: string, target: string, amount: number) {
  const fromRgb = parseHex(color);
  const toRgb = parseHex(target);
  if (!fromRgb || !toRgb) return color;
  const ratio = clamp(amount, 0, 1);
  return toHex({
    r: fromRgb.r + (toRgb.r - fromRgb.r) * ratio,
    g: fromRgb.g + (toRgb.g - fromRgb.g) * ratio,
    b: fromRgb.b + (toRgb.b - fromRgb.b) * ratio,
  });
}

export function pixelColorRamp(color: string) {
  return {
    darkest: mixPixelColor(color, PIXEL_PALETTES.ink, 0.72),
    dark: mixPixelColor(color, PIXEL_PALETTES.ink, 0.44),
    base: color,
    light: mixPixelColor(color, "#ffffff", 0.34),
    shine: mixPixelColor(color, "#ffffff", 0.68),
  };
}

function fillPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  unit = PIXEL_UNIT,
) {
  ctx.fillStyle = color;
  ctx.fillRect(snapPixel(x, unit), snapPixel(y, unit), Math.max(unit, snapPixel(width, unit)), Math.max(unit, snapPixel(height, unit)));
}

export function drawOutlinedPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  outline: string = PIXEL_PALETTES.ink,
  outlineWidth = PIXEL_UNIT,
) {
  fillPixelRect(ctx, x - outlineWidth, y - outlineWidth, width + outlineWidth * 2, height + outlineWidth * 2, outline);
  fillPixelRect(ctx, x, y, width, height, fill);
}

/** Draws a list of sprite cells and an optional one-cell contour. */
export function drawPixelCells(
  ctx: CanvasRenderingContext2D,
  cells: readonly PixelCell[],
  options: { unit?: number; outline?: string | false; offsetX?: number; offsetY?: number } = {},
) {
  const unit = options.unit ?? PIXEL_UNIT;
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  if (options.outline !== false) {
    const occupied = new Set<string>();
    for (const cell of cells) {
      const width = cell.width ?? 1;
      const height = cell.height ?? 1;
      for (let x = 0; x < width; x += 1) for (let y = 0; y < height; y += 1) occupied.add(`${cell.x + x},${cell.y + y}`);
    }
    ctx.fillStyle = options.outline ?? PIXEL_PALETTES.ink;
    for (const key of occupied) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        if (!occupied.has(`${x + dx},${y + dy}`)) {
          ctx.fillRect(snapPixel(offsetX + (x + dx) * unit, unit), snapPixel(offsetY + (y + dy) * unit, unit), unit, unit);
        }
      }
    }
  }
  for (const cell of cells) {
    ctx.fillStyle = cell.color;
    ctx.fillRect(
      snapPixel(offsetX + cell.x * unit, unit),
      snapPixel(offsetY + cell.y * unit, unit),
      (cell.width ?? 1) * unit,
      (cell.height ?? 1) * unit,
    );
  }
}

function drawPixelDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  unit = PIXEL_UNIT,
) {
  const rows = Math.max(1, Math.round(radiusY / unit));
  ctx.fillStyle = fill;
  for (let row = -rows; row <= rows; row += 1) {
    const normalized = row / rows;
    const half = Math.max(unit, snapPixel(radiusX * Math.sqrt(Math.max(0, 1 - normalized * normalized)), unit));
    ctx.fillRect(snapPixel(x - half, unit), snapPixel(y + row * unit, unit), half * 2 + unit, unit);
  }
}

export function drawOutlinedPixelDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  outline: string = PIXEL_PALETTES.ink,
  unit = PIXEL_UNIT,
) {
  drawPixelDisc(ctx, x, y, radiusX + unit, radiusY + unit, outline, unit);
  drawPixelDisc(ctx, x, y, radiusX, radiusY, fill, unit);
}

function drawPixelDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  outline: string = PIXEL_PALETTES.ink,
  unit = PIXEL_UNIT,
) {
  const steps = Math.max(1, Math.round(radius / unit));
  for (let row = -steps - 1; row <= steps + 1; row += 1) {
    const half = Math.max(0, steps + 1 - Math.abs(row));
    fillPixelRect(ctx, x - half * unit, y + row * unit, half * unit * 2 + unit, unit, outline, unit);
  }
  for (let row = -steps; row <= steps; row += 1) {
    const half = Math.max(0, steps - Math.abs(row));
    fillPixelRect(ctx, x - half * unit, y + row * unit, half * unit * 2 + unit, unit, fill, unit);
  }
}

function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  thickness = PIXEL_UNIT,
) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, thickness * 0.72)));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps;
    fillPixelRect(
      ctx,
      fromX + (toX - fromX) * ratio - thickness / 2,
      fromY + (toY - fromY) * ratio - thickness / 2,
      thickness,
      thickness,
      color,
      Math.max(1, thickness / 2),
    );
  }
}

function drawPixelRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
  segments: number,
  offset = 0,
  skipEvery = 0,
  size = PIXEL_UNIT,
) {
  for (let index = 0; index < segments; index += 1) {
    if (skipEvery > 0 && index % skipEvery === 0) continue;
    const angle = index / segments * TAU + offset;
    fillPixelRect(ctx, x + Math.cos(angle) * radiusX - size / 2, y + Math.sin(angle) * radiusY - size / 2, size, size, color, Math.max(1, size / 2));
  }
}

export function drawPixelShadow(
  ctx: CanvasRenderingContext2D,
  options: { x: number; y: number; radiusX: number; radiusY?: number; alpha?: number; stepped?: boolean },
) {
  const { x, y, radiusX } = options;
  const radiusY = options.radiusY ?? radiusX * 0.4;
  ctx.save();
  ctx.globalAlpha *= options.alpha ?? 0.58;
  drawPixelDisc(ctx, x, y, radiusX, radiusY, "#03050a", options.stepped === false ? 2 : PIXEL_UNIT);
  ctx.globalAlpha *= 0.45;
  drawPixelDisc(ctx, x - radiusX * 0.12, y - PIXEL_UNIT, radiusX * 0.68, radiusY * 0.55, "#0c1020", PIXEL_UNIT);
  ctx.restore();
}

function teamColor(team: PixelTeam) {
  return team === "red" ? PIXEL_PALETTES.teams.red : PIXEL_PALETTES.teams.blue;
}

export function drawPixelTeamMarker(
  ctx: CanvasRenderingContext2D,
  options: { x: number; y: number; radius: number; team: PixelTeam; phase?: number; alpha?: number },
) {
  const unit = PIXEL_UNIT;
  const color = teamColor(options.team);
  const phase = options.phase ?? 0;
  const points = 20;
  ctx.save();
  ctx.globalAlpha *= options.alpha ?? 0.82;
  for (let index = 0; index < points; index += 1) {
    if ((index + Math.floor(phase * 3)) % 3 === 0) continue;
    const angle = index / points * TAU;
    fillPixelRect(
      ctx,
      options.x + Math.cos(angle) * options.radius - unit / 2,
      options.y + Math.sin(angle) * options.radius * 0.58 - unit / 2,
      unit,
      unit,
      index % 4 === 0 ? mixPixelColor(color, "#ffffff", 0.45) : color,
    );
  }
  ctx.restore();
}

function applyCardinalFacing(ctx: CanvasRenderingContext2D, angle: number) {
  const facing = Math.round(angle / (Math.PI / 2));
  ctx.rotate(facing * (Math.PI / 2));
}

function drawCommonBody(
  ctx: CanvasRenderingContext2D,
  style: PixelChampionStyle,
  primary: ReturnType<typeof pixelColorRamp>,
  secondary: ReturnType<typeof pixelColorRamp>,
  frame: number,
  attack: number,
) {
  const walk = frame % 2 === 0 ? PIXEL_UNIT : -PIXEL_UNIT;
  const heavy = style === "guardian";
  const robe = ["mystic", "assassin", "chronomancer", "necromancer"].includes(style);

  if (robe) {
    const capeColor = style === "assassin" ? secondary.darkest : primary.darkest;
    drawPixelCells(ctx, [
      { x: -7, y: -4, width: 4, height: 2, color: capeColor },
      { x: -8, y: -2, width: 5, height: 4, color: capeColor },
      { x: -7, y: 2, width: 4, height: 2, color: primary.dark },
      { x: -8, y: frame % 3 === 0 ? 4 : 3, width: 2, height: 1, color: primary.base },
    ], { outline: PIXEL_PALETTES.ink });
  }

  drawOutlinedPixelRect(ctx, -18 + walk, -17, 16, 12, primary.darkest);
  drawOutlinedPixelRect(ctx, -18 - walk, 7, 16, 12, primary.darkest);
  fillPixelRect(ctx, -10 + walk, -13, 8, 4, primary.light);
  fillPixelRect(ctx, -10 - walk, 11, 8, 4, primary.light);

  const bodyWidth = heavy ? 48 : 40;
  const bodyHeight = heavy ? 48 : 40;
  drawOutlinedPixelDisc(ctx, -1, 0, bodyWidth / 2, bodyHeight / 2, primary.dark);
  fillPixelRect(ctx, -17, -12, heavy ? 32 : 28, 8, primary.base);
  fillPixelRect(ctx, -13, -4, heavy ? 32 : 28, 12, primary.dark);
  fillPixelRect(ctx, -9, 8, heavy ? 24 : 20, 4, secondary.base);
  fillPixelRect(ctx, -13, -12, 8, 4, primary.light);
  fillPixelRect(ctx, -1, -8, 4, 12, secondary.light);

  const headRadius = heavy ? 13 : 11;
  drawOutlinedPixelDisc(ctx, 13, 0, headRadius, headRadius - 2, PIXEL_PALETTES.skin);
  fillPixelRect(ctx, 10, -8, 12, 4, PIXEL_PALETTES.skinLight);
  fillPixelRect(ctx, 18, -5, 4, 4, PIXEL_PALETTES.ink);
  fillPixelRect(ctx, 18, 5, 4, 4, PIXEL_PALETTES.ink);

  const armReach = attack > 0 ? Math.ceil(attack * 2) * PIXEL_UNIT : 0;
  drawOutlinedPixelRect(ctx, -1, -25 - armReach, 20, 9, secondary.dark);
  drawOutlinedPixelRect(ctx, -1, 16 + armReach, 20, 9, secondary.dark);
}

function drawMysticGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number, phase: number) {
  const reach = Math.ceil(attack * 3) * PIXEL_UNIT;
  fillPixelRect(ctx, 5, -29, 40 + reach, 4, secondary.light);
  drawOutlinedPixelDisc(ctx, 45 + reach, -27, 7, 7, primary.light);
  const flicker = Math.floor(phase * 6) % 2 ? 4 : 0;
  drawPixelCells(ctx, [
    { x: 11 + reach / 4, y: -10, color: primary.base },
    { x: 12 + reach / 4, y: -11 - flicker / 4, color: secondary.light },
    { x: 13 + reach / 4, y: -10, color: primary.light },
    { x: 12 + reach / 4, y: -9, color: secondary.base },
  ], { outline: false });
}

function drawRangerGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number) {
  const reach = Math.ceil(attack * 4) * PIXEL_UNIT;
  drawPixelCells(ctx, [
    { x: 5, y: -7, width: 2, color: secondary.light },
    { x: 7, y: -6, color: secondary.base },
    { x: 8, y: -5, color: secondary.base },
    { x: 9, y: -4, color: secondary.dark },
    { x: 9, y: 4, color: secondary.dark },
    { x: 8, y: 5, color: secondary.base },
    { x: 7, y: 6, color: secondary.base },
    { x: 5, y: 7, width: 2, color: secondary.light },
  ], { outline: PIXEL_PALETTES.ink });
  fillPixelRect(ctx, 23, -24, 4, 48, PIXEL_PALETTES.bone);
  fillPixelRect(ctx, 0, -2, 48 + reach, 4, primary.light);
  fillPixelRect(ctx, 46 + reach, -6, 8, 12, secondary.shine);
}

function drawGuardianGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number) {
  const reach = Math.ceil(attack * 2) * PIXEL_UNIT;
  drawOutlinedPixelDisc(ctx, 13, -27, 20, 18, secondary.dark);
  fillPixelRect(ctx, 5, -33, 20, 8, secondary.base);
  fillPixelRect(ctx, 13, -37, 4, 28, secondary.light);
  fillPixelRect(ctx, 6, 19, 44 + reach, 7, primary.light);
  drawOutlinedPixelRect(ctx, 44 + reach, 13, 14, 18, secondary.base);
  fillPixelRect(ctx, 48 + reach, 17, 6, 10, secondary.shine);
}

function drawAssassinGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number) {
  const reach = 12 + Math.ceil(attack * 5) * PIXEL_UNIT;
  for (const side of [-1, 1]) {
    fillPixelRect(ctx, 7, side * 19 - 2, 30 + reach, 4, secondary.light);
    drawPixelCells(ctx, [
      { x: 10 + reach / 4, y: side * 5, width: 3, color: PIXEL_PALETTES.metalLight },
      { x: 13 + reach / 4, y: side * 5 - (side > 0 ? 1 : 0), color: PIXEL_PALETTES.bone },
    ], { outline: PIXEL_PALETTES.ink });
  }
  fillPixelRect(ctx, 8, -9, 16, 4, primary.light);
}

function drawChronomancerGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number, phase: number) {
  const reach = Math.ceil(attack * 3) * PIXEL_UNIT;
  fillPixelRect(ctx, 7, -3, 45 + reach, 6, secondary.light);
  drawOutlinedPixelDisc(ctx, 50 + reach, 0, 10, 10, primary.dark);
  const hand = Math.floor(phase * 8) % 8;
  const angle = hand / 8 * TAU;
  fillPixelRect(ctx, 50 + reach + Math.cos(angle) * 7 - 2, Math.sin(angle) * 7 - 2, 8, 4, secondary.shine);
  for (let index = 0; index < 8; index += 1) {
    const orbit = index / 8 * TAU + phase * 0.7;
    fillPixelRect(ctx, Math.cos(orbit) * 31, Math.sin(orbit) * 24, 4, 4, index % 2 ? primary.light : secondary.light);
  }
}

function drawMonkGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number) {
  const reach = Math.ceil(attack * 5) * PIXEL_UNIT;
  for (const side of [-1, 1]) {
    fillPixelRect(ctx, 8, side * 18 - 4, 27 + reach, 8, primary.light);
    drawOutlinedPixelDisc(ctx, 37 + reach, side * 18, 9, 8, secondary.light);
    fillPixelRect(ctx, 38 + reach, side * 18 - 3, 8, 4, "#f6ffff");
  }
}

function drawNecromancerGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number, phase: number) {
  const reach = Math.ceil(attack * 2) * PIXEL_UNIT;
  fillPixelRect(ctx, 4, 20, 48 + reach, 5, secondary.light);
  drawOutlinedPixelDisc(ctx, 50 + reach, 22, 11, 10, primary.base);
  fillPixelRect(ctx, 48 + reach, 17, 4, 4, PIXEL_PALETTES.ink);
  fillPixelRect(ctx, 55 + reach, 21, 4, 4, PIXEL_PALETTES.ink);
  const bob = Math.floor(phase * 4) % 2 ? 4 : 0;
  fillPixelRect(ctx, -27, -19 - bob, 8, 8, primary.light);
  fillPixelRect(ctx, -32, -15 - bob, 4, 4, secondary.shine);
}

function drawAlchemistGear(ctx: CanvasRenderingContext2D, primary: ReturnType<typeof pixelColorRamp>, secondary: ReturnType<typeof pixelColorRamp>, attack: number, phase: number) {
  drawOutlinedPixelRect(ctx, -29, -17, 16, 34, primary.dark);
  fillPixelRect(ctx, -25, -13, 8, 8, primary.light);
  fillPixelRect(ctx, -25, 4, 8, 8, secondary.base);
  const reach = Math.ceil(attack * 4) * PIXEL_UNIT;
  fillPixelRect(ctx, 8, 11, 36 + reach, 6, secondary.light);
  drawOutlinedPixelRect(ctx, 42 + reach, 5, 15, 18, primary.base);
  const bubble = Math.floor(phase * 7) % 3;
  fillPixelRect(ctx, 45 + reach + bubble * 2, 8 - bubble * 3, 4, 4, primary.shine);
}

/**
 * Draw a champion at the current origin facing right. The caller may use this
 * when it already owns world transforms, cutscene scaling or depth sorting.
 */
export function drawPixelChampionBody(ctx: CanvasRenderingContext2D, options: PixelChampionBodyOptions) {
  const primary = pixelColorRamp(options.hitFlash ? "#ffffff" : options.accent);
  const secondary = pixelColorRamp(options.hitFlash ? "#f3f6ff" : options.accent2);
  const attack = clamp(options.attackFlash ?? 0, 0, 1);
  const frame = Math.floor(options.phase * 5) % 4;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale(options.scale ?? 1, options.scale ?? 1);
  ctx.globalAlpha *= options.alpha ?? 1;
  drawCommonBody(ctx, options.style, primary, secondary, frame, attack);
  switch (options.style) {
    case "mystic": drawMysticGear(ctx, primary, secondary, attack, options.phase); break;
    case "ranger": drawRangerGear(ctx, primary, secondary, attack); break;
    case "guardian": drawGuardianGear(ctx, primary, secondary, attack); break;
    case "assassin": drawAssassinGear(ctx, primary, secondary, attack); break;
    case "chronomancer": drawChronomancerGear(ctx, primary, secondary, attack, options.phase); break;
    case "monk": drawMonkGear(ctx, primary, secondary, attack); break;
    case "necromancer": drawNecromancerGear(ctx, primary, secondary, attack, options.phase); break;
    case "alchemist": drawAlchemistGear(ctx, primary, secondary, attack, options.phase); break;
    case "boss": break;
  }
  ctx.restore();
}

/** Draws a complete depth-sortable top-down champion sprite. */
export function drawPixelChampion(ctx: CanvasRenderingContext2D, options: PixelChampionOptions) {
  const radius = options.radius ?? 27;
  const alpha = (options.alpha ?? 1) * (options.stealth ? 0.38 : 1);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  if (options.includeShadow !== false) drawPixelShadow(ctx, { x: options.x, y: options.y + radius * 0.68, radiusX: radius * 1.25, radiusY: radius * 0.43 });
  if (options.includeTeamMarker !== false) drawPixelTeamMarker(ctx, { x: options.x, y: options.y + 3, radius: radius + 12, team: options.team, phase: options.phase });
  if (options.shield && options.shield > 0) {
    const shieldColor = options.team === "red" ? PIXEL_PALETTES.teams.redLight : PIXEL_PALETTES.teams.blueLight;
    for (let index = 0; index < 24; index += 1) {
      if ((index + Math.floor(options.phase * 5)) % 4 === 0) continue;
      const angle = index / 24 * TAU;
      fillPixelRect(ctx, options.x + Math.cos(angle) * (radius + 18), options.y + Math.sin(angle) * (radius + 13), 4, 4, shieldColor);
    }
  }
  ctx.translate(snapPixel(options.x), snapPixel(options.y - 5));
  applyCardinalFacing(ctx, options.angle);
  drawPixelChampionBody(ctx, options);
  ctx.restore();
}

function drawBossBody(ctx: CanvasRenderingContext2D, options: PixelBossOptions) {
  const primary = pixelColorRamp(options.primary ?? (options.enraged ? "#ef3d60" : "#8037ad"));
  const secondary = pixelColorRamp(options.secondary ?? (options.enraged ? "#ffb13b" : "#46d8d2"));
  const attack = clamp(options.attackFlash ?? 0, 0, 1);
  const step = Math.floor(options.phase * 4) % 2 ? 4 : -4;

  drawOutlinedPixelRect(ctx, -38 + step, -31, 29, 19, primary.darkest);
  drawOutlinedPixelRect(ctx, -38 - step, 12, 29, 19, primary.darkest);
  drawPixelCells(ctx, [
    { x: -13, y: -10, width: 5, height: 20, color: primary.darkest },
    { x: -8, y: -12, width: 5, height: 24, color: primary.dark },
    { x: -3, y: -10, width: 8, height: 20, color: primary.base },
    { x: 5, y: -8, width: 6, height: 16, color: secondary.dark },
    { x: -2, y: -8, width: 2, height: 16, color: primary.light },
    { x: 4, y: -5, width: 3, height: 10, color: secondary.base },
  ], { outline: PIXEL_PALETTES.ink });

  drawOutlinedPixelDisc(ctx, 35, 0, 23, 21, primary.dark);
  fillPixelRect(ctx, 33, -17, 17, 7, primary.light);
  fillPixelRect(ctx, 44, -6, 12, 12, PIXEL_PALETTES.ink);
  fillPixelRect(ctx, 48, -3, 8, 6, secondary.shine);
  for (const side of [-1, 1]) {
    drawPixelCells(ctx, [
      { x: 5, y: side * 8, width: 5, height: 4, color: primary.dark },
      { x: 8, y: side * 11, width: 7, height: 4, color: primary.base },
      { x: 14, y: side * 14, width: 5, height: 3, color: secondary.dark },
    ], { outline: PIXEL_PALETTES.ink });
    fillPixelRect(ctx, 8, side * 39 - 7, 47 + attack * 24, 14, primary.light);
    drawOutlinedPixelDisc(ctx, 58 + attack * 24, side * 39, 15, 13, secondary.base);
    fillPixelRect(ctx, 61 + attack * 24, side * 39 - 4, 12, 8, secondary.shine);
  }

  const pulse = Math.floor(options.phase * 8) % 3;
  for (const side of [-1, 1]) {
    drawPixelCells(ctx, [
      { x: -4, y: side * 12, color: primary.light },
      { x: -5, y: side * (14 + pulse), color: secondary.base },
      { x: -4, y: side * (16 + pulse), color: secondary.shine },
      { x: -3, y: side * (14 + pulse), color: secondary.base },
    ], { outline: PIXEL_PALETTES.ink });
  }
}

/** Draws the Rift Warden boss as a large top-down 16-bit sprite. */
export function drawPixelBoss(ctx: CanvasRenderingContext2D, options: PixelBossOptions) {
  const scale = options.scale ?? 1;
  const health = clamp(options.healthRatio ?? 1, 0, 1);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= options.alpha ?? 1;
  drawPixelShadow(ctx, { x: options.x, y: options.y + 32 * scale, radiusX: 62 * scale, radiusY: 23 * scale, alpha: 0.82 });
  const auraColor = options.enraged ? "#ff5a59" : "#9f62d6";
  const orbitCount = options.enraged ? 30 : 20;
  for (let index = 0; index < orbitCount; index += 1) {
    if (index % 3 === 0 && !options.enraged) continue;
    const angle = index / orbitCount * TAU + Math.floor(options.phase * 5) * (TAU / orbitCount);
    fillPixelRect(ctx, options.x + Math.cos(angle) * 74 * scale, options.y + Math.sin(angle) * 48 * scale, 5 * scale, 5 * scale, auraColor);
  }
  ctx.translate(snapPixel(options.x), snapPixel(options.y - 8));
  applyCardinalFacing(ctx, options.angle);
  ctx.scale(scale, scale);
  drawBossBody(ctx, options);
  ctx.restore();

  ctx.save();
  const barWidth = 124 * scale;
  drawOutlinedPixelRect(ctx, options.x - barWidth / 2, options.y - 84 * scale, barWidth, 10 * scale, "#251622", PIXEL_PALETTES.ink, 3 * scale);
  fillPixelRect(ctx, options.x - barWidth / 2 + 3 * scale, options.y - 81 * scale, (barWidth - 6 * scale) * health, 4 * scale, options.enraged ? "#ff4e54" : "#a95ae0", 2);
  ctx.restore();
}

export function drawPixelTile(
  ctx: CanvasRenderingContext2D,
  options: { x: number; y: number; size: number; theme: PixelArenaTheme; variant?: number; time?: number },
) {
  const palette = PIXEL_PALETTES.arenas[options.theme];
  const size = Math.max(16, snapPixel(options.size));
  const variant = options.variant ?? 0;
  fillPixelRect(ctx, options.x, options.y, size, size, palette.grout);
  fillPixelRect(ctx, options.x + 3, options.y + 3, size - 6, size - 6, variant % 3 === 0 ? palette.high : palette.low, 2);
  fillPixelRect(ctx, options.x + 6, options.y + 6, size - 12, 4, mixPixelColor(palette.high, "#ffffff", 0.08));
  fillPixelRect(ctx, options.x + size - 8, options.y + 7, 3, size - 14, mixPixelColor(palette.low, "#000000", 0.28), 1);

  if (variant % 5 === 1) {
    fillPixelRect(ctx, options.x + size * 0.48, options.y + size * 0.22, 4, size * 0.38, palette.void);
    fillPixelRect(ctx, options.x + size * 0.48, options.y + size * 0.5, size * 0.2, 4, palette.void);
  } else if (variant % 7 === 2) {
    for (let index = 0; index < 3; index += 1) fillPixelRect(ctx, options.x + 10 + index * 7, options.y + size - 12 - index * 5, 4, 4, palette.accent);
  } else if (variant % 11 === 4) {
    const blink = Math.floor((options.time ?? 0) * 3 + variant) % 3;
    fillPixelRect(ctx, options.x + size / 2 - 4, options.y + size / 2 - 4, 8, 8, blink === 0 ? palette.sparkle : palette.accent);
  }

  if (options.theme === "forge" && variant % 6 === 0) {
    fillPixelRect(ctx, options.x + 5, options.y + size - 9, size - 10, 4, palette.accent);
    fillPixelRect(ctx, options.x + 9, options.y + size - 9, 8, 4, palette.sparkle);
  } else if (options.theme === "clockwork" && variant % 8 === 0) {
    const turn = Math.floor((options.time ?? 0) * 4) % 4;
    fillPixelRect(ctx, options.x + size / 2 - 2, options.y + 10, 4, size - 20, palette.accent);
    fillPixelRect(ctx, options.x + 10 + turn * 2, options.y + size / 2 - 2, size - 20, 4, palette.accent);
  } else if (options.theme === "boss" && variant % 4 === 0) {
    fillPixelRect(ctx, options.x + 7, options.y + size / 2 - 2, size - 14, 4, palette.accent);
    fillPixelRect(ctx, options.x + size / 2 - 2, options.y + 7, 4, size - 14, palette.accent);
  }
}

/** Fills the current clip with deterministic, seamless arcade arena tiles. */
export function drawPixelArenaTiles(ctx: CanvasRenderingContext2D, options: PixelArenaTilesOptions) {
  const x = options.x ?? 0;
  const y = options.y ?? 0;
  const tileSize = Math.max(24, snapPixel(options.tileSize ?? (options.theme === "boss" ? 64 : 48)));
  const seed = options.seed ?? 73;
  const palette = PIXEL_PALETTES.arenas[options.theme];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (options.fillBackground !== false) {
    ctx.fillStyle = palette.void;
    ctx.fillRect(x, y, options.width, options.height);
  }
  const columns = Math.ceil(options.width / tileSize) + 1;
  const rows = Math.ceil(options.height / tileSize) + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const noise = seededNoise(seed + column * 19.19 + row * 41.41);
      const variant = Math.floor(noise * 24);
      drawPixelTile(ctx, {
        x: x + column * tileSize,
        y: y + row * tileSize,
        size: tileSize,
        theme: options.theme,
        variant,
        time: options.time,
      });
    }
  }
  ctx.restore();
}

/** Draws an octagonal, stepped border after the arena floor has been clipped. */
export function drawPixelArenaBorder(
  ctx: CanvasRenderingContext2D,
  options: { x: number; y: number; width: number; height: number; corner?: number; color: string; secondary?: string; thickness?: number },
) {
  const thickness = snapPixel(options.thickness ?? 8);
  const corner = snapPixel(options.corner ?? 48);
  const x = snapPixel(options.x);
  const y = snapPixel(options.y);
  const width = snapPixel(options.width);
  const height = snapPixel(options.height);
  const segments = [
    [x + corner, y, width - corner * 2, thickness],
    [x + corner, y + height - thickness, width - corner * 2, thickness],
    [x, y + corner, thickness, height - corner * 2],
    [x + width - thickness, y + corner, thickness, height - corner * 2],
  ] as const;
  ctx.save();
  for (const [sx, sy, sw, sh] of segments) fillPixelRect(ctx, sx, sy, sw, sh, options.color);
  for (let step = 0; step < corner; step += thickness) {
    fillPixelRect(ctx, x + step, y + corner - step - thickness, thickness, thickness, options.color);
    fillPixelRect(ctx, x + width - step - thickness, y + corner - step - thickness, thickness, thickness, options.color);
    fillPixelRect(ctx, x + step, y + height - corner + step, thickness, thickness, options.color);
    fillPixelRect(ctx, x + width - step - thickness, y + height - corner + step, thickness, thickness, options.color);
  }
  if (options.secondary) {
    ctx.globalAlpha = 0.72;
    for (let index = 0; index < Math.floor((width - corner * 2) / 28); index += 1) {
      if (index % 2) continue;
      fillPixelRect(ctx, x + corner + index * 28, y + thickness, 12, 4, options.secondary);
      fillPixelRect(ctx, x + corner + index * 28, y + height - thickness - 4, 12, 4, options.secondary);
    }
  }
  ctx.restore();
}

/** Squared, destructible arena cover with stepped depth and damage cracks. */
export function drawPixelCover(ctx: CanvasRenderingContext2D, options: PixelCoverOptions) {
  const health = clamp(options.healthRatio, 0, 1);
  const width = Math.max(16, snapPixel(options.width));
  const height = Math.max(16, snapPixel(options.height));
  const x = snapPixel(options.x);
  const y = snapPixel(options.y);
  const arena = PIXEL_PALETTES.arenas[options.theme ?? "rift"];
  const base = options.destructible ? mixPixelColor(arena.high, "#8b6a55", 0.28) : mixPixelColor(arena.high, PIXEL_PALETTES.metal, 0.2);
  const top = mixPixelColor(base, "#ffffff", options.destructible ? 0.14 : 0.08);
  const dark = mixPixelColor(base, PIXEL_PALETTES.ink, 0.58);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.62;
  fillPixelRect(ctx, x + 8, y + 16, width, height, "#03050a");
  ctx.globalAlpha = 1;
  fillPixelRect(ctx, x + 4, y + 8, width, height + 4, PIXEL_PALETTES.ink);
  fillPixelRect(ctx, x + 8, y + 12, width - 8, height - 4, dark);
  drawOutlinedPixelRect(ctx, x, y, width, height, base, PIXEL_PALETTES.ink, 4);
  fillPixelRect(ctx, x + 4, y + 4, width - 8, 6, top, 2);
  fillPixelRect(ctx, x + 4, y + 10, 5, height - 15, mixPixelColor(top, "#ffffff", 0.08), 1);
  fillPixelRect(ctx, x + width - 9, y + 10, 5, height - 15, dark, 1);

  const seamCount = Math.max(1, Math.floor(width / 42));
  for (let seam = 1; seam <= seamCount; seam += 1) {
    const seamX = x + seam * width / (seamCount + 1);
    fillPixelRect(ctx, seamX - 2, y + 5, 4, height - 10, mixPixelColor(base, PIXEL_PALETTES.ink, 0.28), 2);
    fillPixelRect(ctx, seamX + 2, y + 7, 2, height - 14, mixPixelColor(top, "#ffffff", 0.18), 1);
  }

  if (!options.destructible) {
    ctx.globalAlpha = 0.76;
    const runeCount = Math.max(2, Math.floor(width / 32));
    for (let rune = 0; rune < runeCount; rune += 1) {
      const runeX = x + 16 + rune * (width - 32) / Math.max(1, runeCount - 1);
      drawPixelDiamond(ctx, runeX, y + height / 2, 4, options.accent, dark, 2);
    }
  } else if (health < 0.82) {
    const crackCount = health < 0.32 ? 6 : health < 0.58 ? 4 : 2;
    const seed = options.id ?? 1;
    for (let crack = 0; crack < crackCount; crack += 1) {
      const startX = x + width * (0.2 + seededNoise(seed * 7.1 + crack) * 0.6);
      const startY = y + height * (0.2 + seededNoise(seed * 11.7 + crack) * 0.58);
      const direction = seededNoise(seed * 19.3 + crack) * TAU;
      const length = 10 + seededNoise(seed * 23.9 + crack) * Math.min(28, width * 0.24);
      const midX = startX + Math.cos(direction) * length * 0.54;
      const midY = startY + Math.sin(direction) * length * 0.54;
      const endX = midX + Math.cos(direction + (crack % 2 ? 0.65 : -0.65)) * length * 0.46;
      const endY = midY + Math.sin(direction + (crack % 2 ? 0.65 : -0.65)) * length * 0.46;
      drawPixelLine(ctx, startX, startY, midX, midY, PIXEL_PALETTES.ink, 3);
      drawPixelLine(ctx, midX, midY, endX, endY, PIXEL_PALETTES.ink, 3);
      if (health < 0.4) fillPixelRect(ctx, endX - 2, endY - 2, 5, 5, options.accent, 1);
    }
  }
  ctx.restore();
}

/** Projectile renderer shared by basics, specials and boss patterns. */
export function drawPixelProjectile(ctx: CanvasRenderingContext2D, options: PixelProjectileOptions) {
  const radius = Math.max(3, options.radius);
  const speed = Math.hypot(options.vx, options.vy);
  const directionX = speed > 0.001 ? options.vx / speed : 1;
  const directionY = speed > 0.001 ? options.vy / speed : 0;
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const bright = mixPixelColor(options.color, "#ffffff", 0.64);
  const dark = mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.62);
  const phaseStep = Math.floor((options.phase ?? 0) * 10);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= options.alpha ?? 1;

  const trail = options.trail ?? [];
  for (let index = 0; index < trail.length; index += 1) {
    const point = trail[index];
    const ratio = (index + 1) / Math.max(1, trail.length);
    ctx.globalAlpha = (options.alpha ?? 1) * ratio * 0.38;
    const trailSize = Math.max(2, snapPixel(radius * (0.28 + ratio * 0.34), 2));
    fillPixelRect(ctx, point.x - trailSize / 2, point.y - trailSize / 2, trailSize, trailSize, index % 3 === 0 ? bright : options.color, 2);
  }
  ctx.globalAlpha = options.alpha ?? 1;

  const x = snapPixel(options.x, 2);
  const y = snapPixel(options.y - 4, 2);
  if (options.kind === "arrow" || options.kind === "bone") {
    const length = radius * (options.kind === "arrow" ? 4.2 : 3.4);
    drawPixelLine(ctx, x - directionX * length, y - directionY * length, x + directionX * length, y + directionY * length, options.kind === "bone" ? PIXEL_PALETTES.bone : options.color, options.kind === "bone" ? 5 : 3);
    const tipX = x + directionX * length;
    const tipY = y + directionY * length;
    drawPixelDiamond(ctx, tipX, tipY, radius * 0.72, bright, dark, 2);
    fillPixelRect(ctx, x - directionX * length - perpendicularX * 5, y - directionY * length - perpendicularY * 5, 4, 10, dark, 2);
  } else if (options.kind === "lightning") {
    const length = radius * 3.2;
    const startX = x - directionX * length;
    const startY = y - directionY * length;
    const endX = x + directionX * length;
    const endY = y + directionY * length;
    const bend = phaseStep % 2 ? 1 : -1;
    const firstX = x - directionX * length * 0.35 + perpendicularX * radius * bend;
    const firstY = y - directionY * length * 0.35 + perpendicularY * radius * bend;
    const secondX = x + directionX * length * 0.35 - perpendicularX * radius * bend;
    const secondY = y + directionY * length * 0.35 - perpendicularY * radius * bend;
    drawPixelLine(ctx, startX, startY, firstX, firstY, options.color, 5);
    drawPixelLine(ctx, firstX, firstY, secondX, secondY, bright, 5);
    drawPixelLine(ctx, secondX, secondY, endX, endY, options.color, 5);
  } else if (options.kind === "vial") {
    drawOutlinedPixelRect(ctx, x - radius, y - radius, radius * 2, radius * 2, options.color, dark, 3);
    fillPixelRect(ctx, x - radius * 0.45, y - radius * 0.55, radius * 0.8, radius * 0.55, bright, 2);
    fillPixelRect(ctx, x - directionX * radius * 1.4 - 3, y - directionY * radius * 1.4 - 3, 7, 7, PIXEL_PALETTES.bone, 1);
  } else if (options.kind === "shell") {
    drawPixelDiamond(ctx, x, y, radius * 1.15, options.color, dark, 3);
    fillPixelRect(ctx, x - radius * 0.44, y - radius * 0.44, radius * 0.88, radius * 0.88, bright, 2);
    fillPixelRect(ctx, x - directionX * radius * 1.5 - 2, y - directionY * radius * 1.5 - 2, 5, 5, dark, 1);
  } else if (options.kind === "time") {
    drawPixelDiamond(ctx, x, y, radius, options.color, dark, 2);
    drawPixelRing(ctx, x, y, radius * 1.65, radius * 1.65, bright, 12, phaseStep * 0.16, 3, 3);
    drawPixelLine(ctx, x, y, x + directionX * radius * 0.8, y + directionY * radius * 0.8, PIXEL_PALETTES.ink, 2);
  } else if (options.kind === "shade" || options.kind === "soul") {
    drawOutlinedPixelDisc(ctx, x, y, radius * 1.2, radius, dark, PIXEL_PALETTES.ink, 2);
    drawPixelDiamond(ctx, x + directionX * radius * 0.35, y + directionY * radius * 0.35, radius * 0.55, bright, options.color, 2);
    fillPixelRect(ctx, x - directionX * radius - 2, y - directionY * radius - 2, 4, 4, options.color, 1);
  } else {
    drawPixelDiamond(ctx, x, y, radius * 1.15, options.color, dark, 2);
    drawPixelDiamond(ctx, x - directionX * radius * 0.25, y - directionY * radius * 0.25, radius * 0.5, bright, options.color, 2);
    if (options.kind === "fire") {
      const tailX = x - directionX * radius * 1.7;
      const tailY = y - directionY * radius * 1.7;
      fillPixelRect(ctx, tailX - 3, tailY - 3, 7, 7, phaseStep % 2 ? PIXEL_PALETTES.effects.fire[2] : PIXEL_PALETTES.effects.fire[3], 1);
    }
  }
  ctx.restore();
}

/** Persistent area renderer with distinct, readable 16-bit hazard patterns. */
export function drawPixelZone(ctx: CanvasRenderingContext2D, options: PixelZoneOptions) {
  const life = clamp(options.lifeRatio, 0, 1);
  const radius = Math.max(12, snapPixel(options.radius));
  const phaseStep = Math.floor(options.time * 8 + (options.id ?? 0));
  const bright = mixPixelColor(options.color, "#ffffff", 0.54);
  const dark = mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.62);
  const warningColor = options.active ? options.color : phaseStep % 2 ? PIXEL_PALETTES.bone : options.color;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= options.alpha ?? 1;
  ctx.globalAlpha *= options.active ? 0.2 : 0.11;
  drawPixelDisc(ctx, options.x, options.y, radius, radius * 0.72, dark, 8);
  ctx.globalAlpha = (options.alpha ?? 1) * (options.active ? 0.78 : 0.62);
  drawPixelRing(ctx, options.x, options.y, radius, radius * 0.72, warningColor, 44, phaseStep * 0.018, options.active ? 0 : 3, options.active ? 6 : 5);
  drawPixelRing(ctx, options.x, options.y, radius * (0.62 + life * 0.12), radius * (0.44 + life * 0.08), dark, 28, -phaseStep * 0.025, 4, 4);

  const motifCount = options.kind === "meteor" || options.kind === "boss" ? 10 : 7;
  for (let index = 0; index < motifCount; index += 1) {
    const noise = seededNoise((options.id ?? 1) * 17 + index * 9.31);
    const angle = index / motifCount * TAU + noise * 0.6;
    const distance = radius * (0.2 + noise * 0.58);
    const motifX = options.x + Math.cos(angle) * distance;
    const motifY = options.y + Math.sin(angle) * distance * 0.72;
    if (options.kind === "fire" || options.kind === "vent" || options.kind === "meteor") {
      const size = options.kind === "meteor" ? 8 : 5;
      drawPixelDiamond(ctx, motifX, motifY - (phaseStep + index) % 3 * 3, size, index % 2 ? options.color : bright, dark, 2);
      fillPixelRect(ctx, motifX - 2, motifY - size - 5, 5, 8, PIXEL_PALETTES.effects.fire[3], 1);
    } else if (options.kind === "poison") {
      drawOutlinedPixelDisc(ctx, motifX, motifY, 4 + noise * 5, 3 + noise * 4, index % 2 ? bright : options.color, dark, 2);
      if ((phaseStep + index) % 3 === 0) fillPixelRect(ctx, motifX, motifY - 9, 3, 3, bright, 1);
    } else if (options.kind === "storm") {
      const bend = index % 2 ? 7 : -7;
      drawPixelLine(ctx, motifX - 8, motifY - 5, motifX + bend, motifY, bright, 3);
      drawPixelLine(ctx, motifX + bend, motifY, motifX + 9, motifY + 6, options.color, 3);
    } else if (options.kind === "time") {
      drawPixelDiamond(ctx, motifX, motifY, 5, options.color, dark, 2);
      drawPixelLine(ctx, motifX, motifY, motifX + Math.cos(options.time + index) * 8, motifY + Math.sin(options.time + index) * 8, bright, 2);
    } else if (options.kind === "arrow-rain") {
      drawPixelLine(ctx, motifX - 5, motifY - 8, motifX + 5, motifY + 8, options.color, 3);
      drawPixelDiamond(ctx, motifX + 6, motifY + 9, 3, bright, dark, 1);
    } else if (options.kind === "rift" || options.kind === "boss") {
      drawPixelLine(ctx, motifX - 7, motifY + 5, motifX, motifY - 7, options.color, 4);
      drawPixelLine(ctx, motifX, motifY - 7, motifX + 8, motifY + 6, bright, 4);
    } else if (options.kind === "heal") {
      fillPixelRect(ctx, motifX - 2, motifY - 8, 5, 16, bright, 1);
      fillPixelRect(ctx, motifX - 8, motifY - 2, 16, 5, options.color, 1);
    }
  }

  if (options.kind === "time") {
    for (let spoke = 0; spoke < 8; spoke += 1) {
      const angle = spoke / 8 * TAU + Math.floor(options.time * 3) * TAU / 8;
      drawPixelLine(ctx, options.x + Math.cos(angle) * radius * 0.2, options.y + Math.sin(angle) * radius * 0.14, options.x + Math.cos(angle) * radius * 0.48, options.y + Math.sin(angle) * radius * 0.35, bright, 3);
    }
  } else if (options.kind === "rift" || options.kind === "boss") {
    drawPixelDiamond(ctx, options.x, options.y, Math.max(8, radius * 0.12), options.kind === "boss" ? bright : dark, options.color, 3);
  }
  ctx.restore();
}

/** Floating arcade pickup with a type-specific, language-free icon. */
export function drawPixelPickup(ctx: CanvasRenderingContext2D, options: PixelPickupOptions) {
  const color = options.color ?? (options.kind === "core" ? "#f3dc62" : options.kind === "repair" ? "#80e69a" : "#62e8f3");
  const bright = mixPixelColor(color, "#ffffff", 0.68);
  const dark = mixPixelColor(color, PIXEL_PALETTES.ink, 0.66);
  const bob = snapPixel(Math.sin(options.phase) * 5, 2);
  const pulse = Math.floor(options.phase * 6) % 3;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= options.alpha ?? 1;
  drawPixelShadow(ctx, { x: options.x, y: options.y + 13, radiusX: 22, radiusY: 8, alpha: 0.52 });
  const x = snapPixel(options.x);
  const y = snapPixel(options.y - 8 + bob);
  drawPixelRing(ctx, x, y, 24 + pulse * 2, 18 + pulse, color, 16, options.phase * 0.08, 3, 4);
  drawPixelDiamond(ctx, x, y, 15, dark, PIXEL_PALETTES.ink, 3);
  drawPixelDiamond(ctx, x, y - 1, 10, color, dark, 2);
  fillPixelRect(ctx, x - 4, y - 7, 8, 5, bright, 1);
  if (options.kind === "core") {
    drawPixelDiamond(ctx, x, y + 2, 5, bright, color, 1);
  } else if (options.kind === "repair") {
    fillPixelRect(ctx, x - 3, y - 9, 6, 18, PIXEL_PALETTES.bone, 1);
    fillPixelRect(ctx, x - 9, y - 3, 18, 6, PIXEL_PALETTES.bone, 1);
  } else {
    drawPixelLine(ctx, x - 8, y + 7, x + 1, y - 3, PIXEL_PALETTES.bone, 4);
    drawPixelLine(ctx, x + 1, y - 3, x + 8, y - 9, bright, 4);
    drawPixelDiamond(ctx, x + 8, y - 9, 3, bright, dark, 1);
  }
  ctx.restore();
}

/** Wisp and titan summons using the same depth and palette rules as champions. */
export function drawPixelSummon(ctx: CanvasRenderingContext2D, options: PixelSummonOptions) {
  const radius = Math.max(10, options.radius);
  const primary = pixelColorRamp(options.accent);
  const secondary = pixelColorRamp(options.accent2);
  const bob = snapPixel(Math.sin(options.phase * 4) * (options.kind === "titan" ? 2 : 5), 2);
  const health = clamp(options.healthRatio ?? 1, 0, 1);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= options.alpha ?? 1;
  drawPixelShadow(ctx, { x: options.x, y: options.y + radius * 0.58, radiusX: radius * 1.05, radiusY: radius * 0.38, alpha: options.kind === "titan" ? 0.72 : 0.48 });
  if (options.team) drawPixelTeamMarker(ctx, { x: options.x, y: options.y + 2, radius: radius + 8, team: options.team, phase: options.phase, alpha: 0.54 });
  ctx.translate(snapPixel(options.x), snapPixel(options.y - 5 + bob));
  applyCardinalFacing(ctx, options.angle ?? 0);

  if (options.kind === "titan") {
    const scale = radius / 34;
    ctx.scale(scale, scale);
    drawOutlinedPixelRect(ctx, -29, -25, 24, 18, primary.darkest);
    drawOutlinedPixelRect(ctx, -29, 7, 24, 18, primary.darkest);
    drawPixelCells(ctx, [
      { x: -4, y: -6, width: 7, height: 12, color: primary.dark },
      { x: 3, y: -5, width: 6, height: 10, color: primary.base },
      { x: -1, y: -4, width: 3, height: 8, color: secondary.dark },
      { x: 7, y: -3, width: 5, height: 6, color: PIXEL_PALETTES.bone },
      { x: 11, y: -2, width: 3, height: 4, color: secondary.base },
    ], { outline: PIXEL_PALETTES.ink });
    for (const side of [-1, 1]) {
      fillPixelRect(ctx, -3, side * 29 - 6, 42, 12, primary.base);
      drawPixelDiamond(ctx, 40, side * 29, 9, secondary.base, PIXEL_PALETTES.ink, 3);
    }
    fillPixelRect(ctx, 46, -7, 7, 6, PIXEL_PALETTES.ink, 1);
    fillPixelRect(ctx, 46, 2, 7, 6, PIXEL_PALETTES.ink, 1);
    fillPixelRect(ctx, 49, -5, 5, 4, secondary.shine, 1);
    fillPixelRect(ctx, 49, 3, 5, 4, secondary.shine, 1);
  } else {
    const scale = radius / 18;
    ctx.scale(scale, scale);
    const tailFrame = Math.floor(options.phase * 7) % 3;
    drawPixelCells(ctx, [
      { x: -5, y: -2, width: 3, height: 5, color: primary.darkest },
      { x: -7, y: tailFrame - 1, width: 2, height: 2, color: primary.base },
      { x: -8, y: tailFrame - 3, color: primary.light },
      { x: -1, y: -4, width: 6, height: 8, color: primary.dark },
      { x: 4, y: -3, width: 4, height: 6, color: PIXEL_PALETTES.bone },
      { x: 7, y: -2, width: 2, height: 4, color: secondary.base },
    ], { outline: PIXEL_PALETTES.ink });
    fillPixelRect(ctx, 23, -7, 4, 4, PIXEL_PALETTES.ink, 1);
    fillPixelRect(ctx, 23, 4, 4, 4, PIXEL_PALETTES.ink, 1);
    fillPixelRect(ctx, 24, -6, 3, 3, secondary.shine, 1);
    fillPixelRect(ctx, 24, 5, 3, 3, secondary.shine, 1);
    drawPixelRing(ctx, 0, 0, 23, 18, primary.light, 14, Math.floor(options.phase * 5) * 0.08, 3, 3);
  }
  ctx.restore();

  if (health < 1) {
    const barWidth = Math.max(24, radius * 2.1);
    ctx.save();
    drawOutlinedPixelRect(ctx, options.x - barWidth / 2, options.y - radius - 18, barWidth, 7, PIXEL_PALETTES.deepest, PIXEL_PALETTES.ink, 2);
    if (health > 0) fillPixelRect(ctx, options.x - barWidth / 2 + 2, options.y - radius - 16, (barWidth - 4) * health, 3, options.team ? teamColor(options.team) : options.accent, 1);
    ctx.restore();
  }
}

/** A cleaner, segmented domination circle with explicit owner and contest cues. */
export function drawPixelObjectiveZone(ctx: CanvasRenderingContext2D, options: PixelObjectiveOptions) {
  const ownerColor = options.owner === "red"
    ? PIXEL_PALETTES.teams.red
    : options.owner === "blue"
      ? PIXEL_PALETTES.teams.blue
      : PIXEL_PALETTES.arenas.clockwork.accent;
  const capture = clamp(options.captureRatio ?? 0, 0, 1);
  const segments = 40;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = options.contested ? 0.92 : 0.72;
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * TAU;
    const animatedIndex = (index + Math.floor(options.time * 6)) % segments;
    const captured = index / segments <= capture;
    const radius = options.radius + (animatedIndex % 5 === 0 ? 3 : 0);
    const color = options.contested && index % 2
      ? PIXEL_PALETTES.bone
      : captured
        ? mixPixelColor(ownerColor, "#ffffff", 0.3)
        : ownerColor;
    fillPixelRect(ctx, options.x + Math.cos(angle) * radius - 3, options.y + Math.sin(angle) * radius * 0.72 - 3, 6, 6, color, 2);
  }
  ctx.globalAlpha = 0.14 + capture * 0.1;
  for (let row = -3; row <= 3; row += 1) {
    const halfWidth = Math.floor(Math.sqrt(9 - row * row)) * options.radius / 3;
    fillPixelRect(ctx, options.x - halfWidth, options.y + row * options.radius * 0.17, halfWidth * 2, 5, ownerColor);
  }
  ctx.globalAlpha = 0.9;
  drawOutlinedPixelDisc(ctx, options.x, options.y - 3, 24, 18, PIXEL_PALETTES.deepest, ownerColor);
  fillPixelRect(ctx, options.x - 4, options.y - 14, 8, 22, ownerColor);
  fillPixelRect(ctx, options.x - 14, options.y - 4, 28, 8, ownerColor);
  fillPixelRect(ctx, options.x - 3, options.y - 11, 6, 6, PIXEL_PALETTES.bone, 2);
  ctx.restore();
}

export function drawPixelParticle(ctx: CanvasRenderingContext2D, options: PixelParticleOptions) {
  const lifeRatio = clamp(options.life / Math.max(0.001, options.maxLife), 0, 1);
  const size = Math.max(PIXEL_UNIT, snapPixel(options.size));
  const z = options.z ?? 0;
  const shape = options.shape ?? "square";
  const direction = Math.atan2(options.vy ?? 0, options.vx ?? 1);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= lifeRatio;
  ctx.translate(snapPixel(options.x), snapPixel(options.y - z * 0.5));
  if (shape === "spark") {
    applyCardinalFacing(ctx, direction);
    fillPixelRect(ctx, -size * 1.5, -size / 4, size * 3, Math.max(2, size / 2), options.color, 2);
    fillPixelRect(ctx, -size * 0.3, -size / 2, size * 0.75, size, mixPixelColor(options.color, "#ffffff", 0.65), 2);
  } else if (shape === "shard") {
    const flip = Math.floor((options.seed ?? 0) + options.life * 10) % 2 ? 1 : -1;
    drawPixelCells(ctx, [
      { x: -1, y: -2 * flip, color: mixPixelColor(options.color, "#ffffff", 0.52) },
      { x: 0, y: -1 * flip, width: 2, height: 2, color: options.color },
      { x: 1, y: 1 * flip, color: mixPixelColor(options.color, "#000000", 0.34) },
    ], { unit: Math.max(2, size / 2), outline: PIXEL_PALETTES.ink });
  } else if (shape === "smoke") {
    ctx.globalAlpha *= 0.62;
    drawPixelDisc(ctx, 0, 0, size * 1.2, size * 0.75, mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.46), Math.max(2, size / 3));
    fillPixelRect(ctx, -size * 0.5, -size * 0.35, size * 0.6, size * 0.35, mixPixelColor(options.color, "#ffffff", 0.2), 2);
  } else if (shape === "star") {
    fillPixelRect(ctx, -size * 1.5, -size / 4, size * 3, Math.max(2, size / 2), options.color, 2);
    fillPixelRect(ctx, -size / 4, -size * 1.5, Math.max(2, size / 2), size * 3, options.color, 2);
    fillPixelRect(ctx, -size / 2, -size / 2, size, size, mixPixelColor(options.color, "#ffffff", 0.72), 2);
  } else {
    drawOutlinedPixelRect(ctx, -size / 2, -size / 2, size, size, options.color, mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.7), Math.max(2, size / 4));
  }
  ctx.restore();
}

/** Layerable 16-bit ritual pattern for specials, ultimates and boss phases. */
export function drawPixelUltimateSigil(ctx: CanvasRenderingContext2D, options: PixelUltimateSigilOptions) {
  const alpha = options.alpha ?? 1;
  const secondary = options.secondary ?? mixPixelColor(options.color, "#ffffff", 0.58);
  const segmentCount = options.style === "boss" ? 48 : 32;
  const phaseStep = Math.floor(options.phase * 8);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = options.radius * (1 - ring * 0.23);
    const count = Math.max(12, segmentCount - ring * 8);
    for (let index = 0; index < count; index += 1) {
      if ((index + ring + phaseStep) % (ring + 3) === 0) continue;
      const direction = ring % 2 ? -1 : 1;
      const angle = index / count * TAU + direction * phaseStep * 0.025;
      const color = index % 5 === 0 ? secondary : options.color;
      const size = ring === 0 ? 7 : 5;
      fillPixelRect(ctx, options.x + Math.cos(angle) * radius - size / 2, options.y + Math.sin(angle) * radius * 0.72 - size / 2, size, size, color, 1);
    }
  }

  const spokeCount = options.style === "boss" ? 12 : options.style === "chronomancer" ? 8 : 6;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const angle = spoke / spokeCount * TAU + phaseStep * 0.018;
    const steps = 5;
    for (let step = 1; step <= steps; step += 1) {
      const radius = options.radius * (0.13 + step * 0.1);
      fillPixelRect(ctx, options.x + Math.cos(angle) * radius - 2, options.y + Math.sin(angle) * radius * 0.72 - 2, 5, 5, step === steps ? secondary : options.color, 1);
    }
  }

  if (options.style === "mystic") {
    for (let index = 0; index < 5; index += 1) {
      const angle = index / 5 * TAU - Math.PI / 2;
      const next = (index * 2) % 5 / 5 * TAU - Math.PI / 2;
      const steps = 8;
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        fillPixelRect(ctx, options.x + (Math.cos(angle) * (1 - t) + Math.cos(next) * t) * options.radius * 0.42, options.y + (Math.sin(angle) * (1 - t) + Math.sin(next) * t) * options.radius * 0.3, 5, 5, secondary, 1);
      }
    }
  } else if (options.style === "guardian" || options.style === "boss") {
    const size = options.radius * 0.36;
    drawOutlinedPixelRect(ctx, options.x - size / 2, options.y - size / 2, size, size, mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.5), secondary, 4);
    fillPixelRect(ctx, options.x - 4, options.y - size * 0.38, 8, size * 0.76, secondary);
    fillPixelRect(ctx, options.x - size * 0.38, options.y - 4, size * 0.76, 8, secondary);
  } else {
    drawOutlinedPixelDisc(ctx, options.x, options.y, 14, 11, mixPixelColor(options.color, PIXEL_PALETTES.ink, 0.48), secondary);
    fillPixelRect(ctx, options.x - 3, options.y - 8, 6, 16, secondary, 2);
  }
  ctx.restore();
}

/** Pixelates the entire current canvas without relying on CSS image scaling. */
export function configurePixelCanvas(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}
