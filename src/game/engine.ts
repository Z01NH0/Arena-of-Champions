import {
  ARENAS,
  CHAMPIONS,
  CONTROLS,
  DIFFICULTIES,
  type ArenaId,
  type Champion,
  type ChampionId,
  type DifficultyId,
  type MatchFormat,
  type RuleId,
} from "./data";
import type { ControlBindings } from "./settings";
import { effectiveVolume, type GameSettings } from "./settings";
import {
  configurePixelCanvas,
  drawPixelArenaBorder,
  drawPixelArenaTiles,
  drawPixelBoss,
  drawPixelChampion,
  drawPixelChampionBody,
  drawPixelCover,
  drawPixelObjectiveZone,
  drawPixelParticle,
  drawPixelPickup,
  drawPixelProjectile,
  drawPixelSummon,
  drawPixelTeamMarker,
  drawPixelUltimateSigil,
  drawPixelZone,
} from "./pixel-art";

const STANDARD_WORLD_WIDTH = 1920;
const STANDARD_WORLD_HEIGHT = 1080;
const BOSS_WORLD_WIDTH = 2240;
const BOSS_WORLD_HEIGHT = 1260;
export let WORLD_WIDTH = STANDARD_WORLD_WIDTH;
export let WORLD_HEIGHT = STANDARD_WORLD_HEIGHT;
const TAU = Math.PI * 2;
const EDGE = 58;
const BOSS_PHASE_TRANSITION_PAUSE = 1.5;
const ULTIMATE_DIRECT_EFFECT_TIME: Partial<Record<ChampionId, number>> = {
  bulwark: 3,
  wraith: 2.6,
  chrono: 5.4,
  storm: 5.4,
  necromancer: 6.1,
};

type Team = "red" | "blue";
type Faction = Team | "boss";
type Vec = { x: number; y: number };
type GameState = "countdown" | "playing" | "round-over" | "finished";

export type MatchOptions = {
  format: MatchFormat;
  rule: RuleId;
  difficulty: DifficultyId;
  arena: ArenaId;
  redChampion: ChampionId;
  blueChampion: ChampionId;
  scoreTo: 2 | 3;
  reducedMotion: boolean;
  audio: boolean;
  settings: GameSettings;
};

export type FighterHud = {
  name: string;
  epithet: string;
  accent: string;
  hp: number;
  hpMax: number;
  ultimate: number;
  ultimateLocked: boolean;
  attack: number;
  attackMax: number;
  special: number;
  specialMax: number;
  dashes: number;
  dashCapacity: number;
  dashRecharge: number;
  dashMax: number;
  status: string;
  isAi: boolean;
};

export type HudSnapshot = {
  red: FighterHud;
  blue: FighterHud;
  scoreRed: number;
  scoreBlue: number;
  scoreTo: number;
  round: number;
  timer: number;
  rule: RuleId;
  arenaName: string;
  aiState: string;
  aiSkill: number;
  countdown: string;
  objectiveRed: number;
  objectiveBlue: number;
  suddenDeath: boolean;
  bossHp: number;
  bossHpMax: number;
  bossPhase: number;
  dominionZones: Array<{ owner: Team | null; progress: number }>;
};

export type MatchResult = {
  winner: Team;
  scoreRed: number;
  scoreBlue: number;
  redDamage: number;
  blueDamage: number;
  redDodges: number;
  blueDodges: number;
  duration: number;
  rule: RuleId;
  arena: ArenaId;
  rounds: number;
  aiState: string;
  bossDamageRed: number;
  bossDamageBlue: number;
};

export type EngineCallbacks = {
  onHud: (snapshot: HudSnapshot) => void;
  onAnnouncement: (message: string) => void;
  onPauseRequest: () => void;
  onFinished: (result: MatchResult) => void;
  onAudioChange: (enabled: boolean) => void;
};

type Intent = {
  moveX: number;
  moveY: number;
  aimAngle: number;
  attack: boolean;
  special: boolean;
  ultimate: boolean;
  dash: boolean;
};

type HistoryPoint = { x: number; y: number; hp: number; at: number };
type Dot = {
  type: "burn" | "poison" | "bleed";
  time: number;
  tick: number;
  damage: number;
  owner: Fighter;
  ultimateCastId?: number;
  ultimateTime?: number;
};

type Fighter = {
  id: number;
  team: Team;
  faction: Faction;
  champion: Champion;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  hp: number;
  hpMax: number;
  attackCd: number;
  specialCd: number;
  ultimate: number;
  ultimateCastId: number | null;
  ultimateDirectTime: number;
  dashCharges: number;
  dashRecharge: number;
  dashTime: number;
  dashVx: number;
  dashVy: number;
  dashRewarded: boolean;
  invulnerable: number;
  spawnGrace: number;
  shield: number;
  haste: number;
  slow: number;
  stealth: number;
  stormAura: number;
  colossus: number;
  marked: number;
  stun: number;
  hitFlash: number;
  attackFlash: number;
  meleeWindow: number;
  history: HistoryPoint[];
  dots: Dot[];
  dead: boolean;
  respawn: number;
  animation: number;
  controlTime: number;
  aimTargetId: number | null;
  manualTargetTime: number;
  lastAttackerId: number | null;
  threatTime: number;
  stats: { damage: number; dodges: number; kills: number; cores: number };
};

type ProjectileKind = "fire" | "arrow" | "shell" | "time" | "lightning" | "soul" | "vial" | "shade" | "bone";
type Projectile = {
  id: number;
  owner: Fighter;
  team: Faction;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  maxLife: number;
  color: string;
  kind: ProjectileKind;
  pierce: number;
  slow: number;
  burn: number;
  poison: number;
  wallDamage: number;
  dead: boolean;
  trail: Vec[];
  hitIds: Set<number>;
  ultimateCastId?: number;
};

type ZoneKind = "fire" | "poison" | "storm" | "time" | "meteor" | "arrow-rain" | "vent" | "rift" | "heal";
type Zone = {
  id: number;
  kind: ZoneKind;
  owner: Fighter | null;
  team: Faction | null;
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  damage: number;
  tickRate: number;
  tick: number;
  activeAfter: number;
  color: string;
  slow: number;
  warningDamage?: number;
  followId?: number;
  ultimateCastId?: number;
  onExpire?: () => void;
  dead: boolean;
};

type Cover = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  hpMax: number;
  destructible: boolean;
  dead: boolean;
};

type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "circle" | "spark" | "shard";
};

type FloatText = { x: number; y: number; text: string; color: string; life: number; maxLife: number; size: number };
type Pickup = { id: number; x: number; y: number; type: "core" | "repair" | "overdrive"; life: number; pulse: number };
type Summon = {
  id: number;
  owner: Fighter;
  team: Faction;
  kind: "wisp" | "titan";
  x: number;
  y: number;
  r: number;
  hp: number;
  hpMax: number;
  life: number;
  attackCd: number;
  dead: boolean;
  ultimateCastId?: number;
};
type Scheduled = { at: number; action: () => void; owner: Fighter | null; ultimateCastId?: number };
type Cinematic = {
  owner: Fighter;
  kind: "special" | "ultimate";
  title: string;
  subtitle: string;
  time: number;
  duration: number;
  executeAt: number;
  executed: boolean;
  execute: () => void;
};

type Perception = {
  at: number;
  rule: RuleId;
  self: { x: number; y: number; vx: number; vy: number; hp: number; hpMax: number; specialCd: number; ultimate: number; ultimateLocked: boolean; dashes: number };
  enemy: { x: number; y: number; vx: number; vy: number; hp: number; hpMax: number; stealth: boolean };
  projectiles: Array<{ x: number; y: number; vx: number; vy: number; r: number; damage: number }>;
  zones: Array<{ x: number; y: number; r: number; damage: number; active: boolean; activatesIn: number }>;
  pickups: Array<{ x: number; y: number; type: Pickup["type"] }>;
  covers: Array<{ x: number; y: number; w: number; h: number }>;
  objective: { x: number; y: number; red: number; blue: number };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);
const normalize = (x: number, y: number): Vec => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const seededNoise = (value: number) => {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const teamColor = (team: Team) => (team === "red" ? "#ff5d63" : "#5aa7ff");
const rectContainsCircle = (x: number, y: number, r: number, cover: Cover) => {
  const px = clamp(x, cover.x, cover.x + cover.w);
  const py = clamp(y, cover.y, cover.y + cover.h);
  return Math.hypot(x - px, y - py) < r;
};
const lineHitsRect = (a: Vec, b: Vec, cover: { x: number; y: number; w: number; h: number }) => {
  const steps = Math.max(3, Math.ceil(distance(a, b) / 28));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = lerp(a.x, b.x, t);
    const y = lerp(a.y, b.y, t);
    if (x >= cover.x && x <= cover.x + cover.w && y >= cover.y && y <= cover.y + cover.h) return true;
  }
  return false;
};
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

class InputState {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private enabled = true;
  private onPause: () => void;
  private onMute: () => void;
  private onDebug: () => void;
  private onInteract: () => void;

  constructor(onPause: () => void, onMute: () => void, onDebug: () => void, onInteract: () => void) {
    this.onPause = onPause;
    this.onMute = onMute;
    this.onDebug = onDebug;
    this.onInteract = onInteract;
    window.addEventListener("keydown", this.handleDown, { passive: false });
    window.addEventListener("keyup", this.handleUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private normalize(key: string) {
    return key.toLowerCase();
  }

  private handleDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    this.onInteract();
    const key = this.normalize(event.key);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (key === "escape" || key === "p") {
      if (!event.repeat) this.onPause();
      return;
    }
    if (key === "m") {
      if (!event.repeat) this.onMute();
      return;
    }
    if (key === "f3") {
      event.preventDefault();
      if (!event.repeat) this.onDebug();
      return;
    }
    if (!this.down.has(key)) this.pressed.add(key);
    this.down.add(key);
  };

  private handleUp = (event: KeyboardEvent) => {
    this.down.delete(this.normalize(event.key));
  };

  private handleBlur = () => {
    this.down.clear();
    this.pressed.clear();
  };

  isDown(key: string) {
    return this.down.has(key);
  }

  wasPressed(key: string) {
    return this.pressed.has(key);
  }

  setVirtual(key: string, active: boolean) {
    const normalized = this.normalize(key);
    if (active) {
      this.onInteract();
      if (!this.down.has(normalized)) this.pressed.add(normalized);
      this.down.add(normalized);
    } else {
      this.down.delete(normalized);
    }
  }

  endFrame() {
    this.pressed.clear();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.handleBlur();
  }

  destroy() {
    window.removeEventListener("keydown", this.handleDown);
    window.removeEventListener("keyup", this.handleUp);
    window.removeEventListener("blur", this.handleBlur);
  }
}

class AudioDirector {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private musicVolume: number;
  private sfxVolume: number;
  private beat = 0;
  private beatTimer = 0;

  constructor(enabled: boolean, settings: GameSettings) {
    this.enabled = enabled;
    this.musicVolume = effectiveVolume(settings, "music");
    this.sfxVolume = effectiveVolume(settings, "sfx");
    if (typeof window !== "undefined") {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) this.context = new AudioCtor();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) void this.context?.resume();
  }

  setMix(settings: GameSettings) {
    this.musicVolume = effectiveVolume(settings, "music");
    this.sfxVolume = effectiveVolume(settings, "sfx");
  }

  resume() {
    if (this.enabled) void this.context?.resume();
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, slide = 0, channel: "music" | "sfx" = "sfx") {
    if (!this.enabled || !this.context) return;
    const start = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency + slide), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    const channelVolume = channel === "music" ? this.musicVolume : this.sfxVolume;
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * channelVolume), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(kind: "attack" | "hit" | "dash" | "special" | "ultimate" | "core" | "victory" | "clash") {
    if (kind === "attack") this.tone(260, 0.045, "triangle", 0.025, 110);
    if (kind === "hit") this.tone(105, 0.065, "square", 0.035, -45);
    if (kind === "dash") this.tone(380, 0.08, "sawtooth", 0.018, 520);
    if (kind === "special") {
      this.tone(220, 0.16, "triangle", 0.035, 410);
      this.tone(440, 0.11, "sine", 0.02, 240);
    }
    if (kind === "ultimate") {
      this.tone(68, 0.5, "sawtooth", 0.06, 160);
      this.tone(370, 0.42, "triangle", 0.035, 620);
    }
    if (kind === "core") this.tone(720, 0.18, "sine", 0.03, 480);
    if (kind === "victory") [0, 1, 2].forEach((step) => window.setTimeout(() => this.tone([392, 523, 659][step], 0.24, "triangle", 0.04, 90), step * 130));
    if (kind === "clash") {
      this.tone(92, 0.14, "square", 0.05, -35);
      this.tone(680, 0.08, "triangle", 0.025, -260);
    }
  }

  update(dt: number, intensity: number) {
    if (!this.enabled || !this.context) return;
    this.beatTimer -= dt;
    if (this.beatTimer > 0) return;
    this.beatTimer = intensity > 0.7 ? 0.22 : 0.29;
    const scale = [110, 130.81, 146.83, 164.81, 196];
    const note = scale[this.beat % scale.length];
    if (this.beat % 2 === 0) this.tone(note, 0.08, "square", 0.013 + intensity * 0.006, 20, "music");
    if (this.beat % 4 === 0) this.tone(55, 0.12, "square", 0.014, -12, "music");
    this.beat += 1;
  }

  destroy() {
    void this.context?.close();
    this.context = null;
  }
}

type AiParams = {
  reaction: number;
  thinkHz: number;
  aimError: number;
  horizon: number;
  aggression: number;
  decisionPool: number;
  evadeRisk: number;
  abilityUse: number;
  ultimateThreshold: number;
};

class TacticalAI {
  private fighter: Fighter;
  private difficulty: DifficultyId;
  private buffer: Perception[] = [];
  private thinkTimer = 0;
  private currentIntent: Intent;
  private params: AiParams;
  private oneShot = { special: false, ultimate: false, dash: false };
  private aimBias = 0;
  private aimBiasTimer = 0;
  private lastSeen = { x: WORLD_WIDTH * 0.3, y: WORLD_HEIGHT * 0.5 };
  private stuckTimer = 0;
  private lastPosition: Vec;
  state = "OBSERVAR";
  skillRating = 0.56;
  debugDirections: Array<{ x: number; y: number; score: number }> = [];
  debugTarget: Vec | null = null;

  constructor(fighter: Fighter, difficulty: DifficultyId) {
    this.fighter = fighter;
    this.difficulty = difficulty;
    this.params = this.resolveParams();
    this.skillRating = ({ easy: 0.24, intermediate: 0.43, advanced: 0.62, professional: 0.82, demonic: 1 } as const)[difficulty];
    this.currentIntent = { moveX: 0, moveY: 0, aimAngle: Math.PI, attack: false, special: false, ultimate: false, dash: false };
    this.lastPosition = { x: fighter.x, y: fighter.y };
  }

  private resolveParams(): AiParams {
    const profile = DIFFICULTIES[this.difficulty];
    return {
      reaction: profile.reaction,
      thinkHz: profile.thinkHz,
      aimError: profile.aimError,
      horizon: profile.horizon,
      aggression: profile.aggression,
      decisionPool: profile.decisionPool,
      evadeRisk: profile.evadeRisk,
      abilityUse: profile.abilityUse,
      ultimateThreshold: profile.ultimateThreshold,
    };
  }

  private solveIntercept(snapshot: Perception) {
    const speed = Math.max(420, this.fighter.champion.projectileSpeed || 700);
    const rx = snapshot.enemy.x - snapshot.self.x;
    const ry = snapshot.enemy.y - snapshot.self.y;
    const vx = snapshot.enemy.vx;
    const vy = snapshot.enemy.vy;
    const a = vx * vx + vy * vy - speed * speed;
    const b = 2 * (rx * vx + ry * vy);
    const c = rx * rx + ry * ry;
    let t = 0;
    if (Math.abs(a) < 0.0001) {
      if (Math.abs(b) > 0.0001) t = -c / b;
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const root = Math.sqrt(discriminant);
        const t1 = (-b - root) / (2 * a);
        const t2 = (-b + root) / (2 * a);
        t = [t1, t2].filter((value) => value > 0).sort((left, right) => left - right)[0] || 0;
      }
    }
    t = clamp(t, 0, this.params.horizon + 0.45);
    return { x: snapshot.enemy.x + snapshot.enemy.vx * t, y: snapshot.enemy.y + snapshot.enemy.vy * t };
  }

  private pointRisk(snapshot: Perception, point: Vec) {
    let risk = 0;
    const horizon = this.params.horizon;
    for (const projectile of snapshot.projectiles) {
      const rel = { x: projectile.x - point.x, y: projectile.y - point.y };
      const velocity = { x: projectile.vx, y: projectile.vy };
      const velocitySq = dot(velocity, velocity) || 1;
      const time = clamp(-dot(rel, velocity) / velocitySq, 0, horizon);
      const closestX = rel.x + velocity.x * time;
      const closestY = rel.y + velocity.y * time;
      const miss = Math.hypot(closestX, closestY);
      const dangerRadius = projectile.r + this.fighter.r + 18;
      if (miss < dangerRadius * 2.4) risk += (1 - clamp(miss / (dangerRadius * 2.4), 0, 1)) * (projectile.damage / 18 + 0.35);
    }
    for (const zone of snapshot.zones) {
      const d = Math.hypot(point.x - zone.x, point.y - zone.y);
      if (d < zone.r + this.fighter.r + 12) {
        if (zone.active) risk += 1.5 + zone.damage / 10;
        else {
          const urgency = clamp(1 - zone.activatesIn / Math.max(0.1, horizon + 0.25), 0, 1);
          risk += 0.35 + urgency * (0.9 + zone.damage / 12);
        }
      }
    }
    const edge = Math.min(point.x - EDGE, WORLD_WIDTH - EDGE - point.x, point.y - EDGE, WORLD_HEIGHT - EDGE - point.y);
    if (edge < 70) risk += (70 - edge) / 55;
    return risk;
  }

  private hasLine(snapshot: Perception, from: Vec, to: Vec) {
    return !snapshot.covers.some((cover) => lineHitsRect(from, to, cover));
  }

  private chooseState(snapshot: Perception, risk: number, enemyDistance: number) {
    const health = snapshot.self.hp / snapshot.self.hpMax;
    const enemyHealth = snapshot.enemy.hp / snapshot.enemy.hpMax;
    if (risk > this.params.evadeRisk) return "EVADIR";
    if (health < 0.28 && enemyHealth > health + 0.12) return "RECUAR";
    if (snapshot.pickups.some((pickup) => Math.hypot(pickup.x - snapshot.self.x, pickup.y - snapshot.self.y) < 330) && health < 0.72) return "BUSCAR NÚCLEO";
    if (snapshot.rule === "dominion" && enemyDistance > 140) return "CONTROLAR";
    if (enemyHealth < 0.25 && health > 0.38) return "FINALIZAR";
    if (enemyDistance < this.fighter.champion.idealRange * 0.55) return "MANTER DISTÂNCIA";
    if (enemyDistance > this.fighter.champion.idealRange * 1.35) return "PRESSIONAR";
    if (Math.random() < 0.14 + this.params.aggression * 0.09) return "FLANQUEAR";
    return "CONTROLAR";
  }

  private think(snapshot: Perception, canStand: (x: number, y: number, r: number) => boolean) {
    if (!snapshot.enemy.stealth) this.lastSeen = { x: snapshot.enemy.x, y: snapshot.enemy.y };
    else {
      const uncertainty = clamp((snapshot.at - this.buffer[0]?.at || 0) * 22, 15, 95);
      snapshot.enemy.x = this.lastSeen.x + Math.sin(snapshot.at * 2.1) * uncertainty;
      snapshot.enemy.y = this.lastSeen.y + Math.cos(snapshot.at * 1.7) * uncertainty;
    }

    const current = { x: snapshot.self.x, y: snapshot.self.y };
    const enemy = { x: snapshot.enemy.x, y: snapshot.enemy.y };
    const enemyDistance = distance(current, enemy);
    const currentRisk = this.pointRisk(snapshot, current);
    this.state = this.chooseState(snapshot, currentRisk, enemyDistance);

    const candidateCount = Math.round(clamp(12 + this.params.thinkHz * 0.82, 14, 32));
    const candidates: Array<{ x: number; y: number; score: number; dirX: number; dirY: number }> = [];
    const step = this.fighter.champion.speed * this.params.horizon * 0.74;
    const ideal = this.fighter.champion.idealRange;
    for (let index = 0; index <= candidateCount; index += 1) {
      const angle = index === candidateCount ? 0 : (index / candidateCount) * TAU;
      const magnitude = index === candidateCount ? 0 : 1;
      const dirX = Math.cos(angle) * magnitude;
      const dirY = Math.sin(angle) * magnitude;
      const point = { x: current.x + dirX * step, y: current.y + dirY * step };
      if (!canStand(point.x, point.y, this.fighter.r + 4)) {
        candidates.push({ ...point, dirX, dirY, score: -999 });
        continue;
      }
      const risk = this.pointRisk(snapshot, point);
      const d = distance(point, enemy);
      let score = -risk * (this.state === "EVADIR" ? 4.4 : 2.75);
      score += 1.8 - Math.abs(d - ideal) / Math.max(ideal, 1) * 1.65;
      if (this.hasLine(snapshot, point, enemy)) score += this.state === "FLANQUEAR" ? 1.5 : 0.72;
      else score += this.state === "RECUAR" ? 0.35 : -0.45;
      if (this.state === "PRESSIONAR" || this.state === "FINALIZAR") score += (enemyDistance - d) / Math.max(ideal, 1) * 1.25;
      if (this.state === "RECUAR" || this.state === "MANTER DISTÂNCIA") score += (d - enemyDistance) / Math.max(ideal, 1) * 1.5;
      if (this.state === "FLANQUEAR") {
        const toEnemy = normalize(enemy.x - current.x, enemy.y - current.y);
        score += Math.abs(dirX * -toEnemy.y + dirY * toEnemy.x) * 0.95;
      }
      if (this.state === "BUSCAR NÚCLEO") {
        const pickup = [...snapshot.pickups].sort((a, b) => distance(point, a) - distance(point, b))[0];
        if (pickup) score += (distance(current, pickup) - distance(point, pickup)) / 100;
      }
      if (this.state === "CONTROLAR") {
        const objectiveDistance = Math.hypot(point.x - snapshot.objective.x, point.y - snapshot.objective.y);
        score += snapshot.rule === "dominion"
          ? (Math.hypot(current.x - snapshot.objective.x, current.y - snapshot.objective.y) - objectiveDistance) / 120 * 2.6
            + (objectiveDistance < 72 ? 2.2 : 0)
          : clamp(1 - objectiveDistance / 520, 0, 1) * 0.7;
      }
      const directionChange = Math.hypot(dirX - this.currentIntent.moveX, dirY - this.currentIntent.moveY);
      score -= directionChange * 0.13;
      candidates.push({ ...point, dirX, dirY, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    const choicePool = candidates.slice(0, this.params.decisionPool);
    const chosen = choicePool[Math.floor(Math.random() * choicePool.length)] || candidates[0];
    this.debugDirections = candidates.slice(0, 12).map((candidate) => ({ x: candidate.x, y: candidate.y, score: candidate.score }));

    const moved = Math.hypot(this.fighter.x - this.lastPosition.x, this.fighter.y - this.lastPosition.y);
    if (moved < 8 && Math.hypot(chosen.dirX, chosen.dirY) > 0.2) this.stuckTimer += 1 / this.params.thinkHz;
    else this.stuckTimer = 0;
    this.lastPosition = { x: this.fighter.x, y: this.fighter.y };
    if (this.stuckTimer > 1.15) {
      const escape = normalize(-(enemy.y - current.y), enemy.x - current.x);
      chosen.dirX = escape.x;
      chosen.dirY = escape.y;
      this.stuckTimer = 0;
      this.state = "DESBLOQUEAR ROTA";
    }

    this.aimBiasTimer -= 1 / this.params.thinkHz;
    if (this.aimBiasTimer <= 0) {
      this.aimBiasTimer = 0.55 + Math.random() * 0.55;
      this.aimBias = (Math.random() * 2 - 1) * this.params.aimError;
    }
    const target = this.solveIntercept(snapshot);
    this.debugTarget = target;
    const aimAngle = Math.atan2(target.y - current.y, target.x - current.x) + this.aimBias;
    const hasShot = this.hasLine(snapshot, current, target);
    const attackRange = this.fighter.champion.attackStyle === "melee" ? 118 : this.fighter.champion.range;
    const attack = hasShot && enemyDistance < attackRange && this.state !== "EVADIR";

    const specialReady = snapshot.self.specialCd <= 0.04;
    let useSpecial = false;
    if (specialReady && this.state !== "EVADIR") {
      const commitsAbility = (baseChance: number) => Math.random() < clamp(baseChance * this.params.abilityUse, 0.12, 0.96);
      if (this.fighter.champion.id === "chrono") useSpecial = snapshot.self.hp < snapshot.self.hpMax * 0.58 && commitsAbility(0.34);
      else if (this.fighter.champion.id === "wraith") useSpecial = enemyDistance > 120 && enemyDistance < 470 && commitsAbility(0.32);
      else if (this.fighter.champion.id === "bulwark") useSpecial = (currentRisk > 0.36 || enemyDistance < 270) && commitsAbility(0.38);
      else useSpecial = enemyDistance < Math.max(330, ideal * 1.25) && Math.random() < (0.2 + this.params.aggression * 0.24) * this.params.abilityUse;
    }
    const ultimateReady = snapshot.self.ultimate >= 99.5 && !snapshot.self.ultimateLocked;
    const ultValue = (1 - snapshot.enemy.hp / snapshot.enemy.hpMax) * 0.45 + (this.state === "FINALIZAR" ? 0.4 : 0) + (hasShot ? 0.18 : 0) + this.params.aggression * 0.18;
    const useUltimate = ultimateReady && this.state !== "EVADIR" && (ultValue > this.params.ultimateThreshold || Math.random() < 0.018 * this.params.abilityUse);
    const aggressiveDash = (this.state === "PRESSIONAR" || this.state === "FINALIZAR")
      && enemyDistance > ideal * 0.85
      && Math.random() < 0.025 * this.params.abilityUse;
    const useDash = snapshot.self.dashes > 0 && (
      currentRisk > Math.max(0.24, this.params.evadeRisk - 0.08)
      || aggressiveDash
      || (this.fighter.champion.id === "wraith" && enemyDistance > 250 && enemyDistance < 470 && Math.random() < 0.16 * this.params.abilityUse)
    );

    this.currentIntent = {
      moveX: chosen.dirX,
      moveY: chosen.dirY,
      aimAngle,
      attack,
      special: useSpecial,
      ultimate: useUltimate,
      dash: useDash,
    };
    this.oneShot = { special: useSpecial, ultimate: useUltimate, dash: useDash };
  }

  sample(dt: number, perception: Perception, canStand: (x: number, y: number, r: number) => boolean): Intent {
    this.buffer.push(perception);
    while (this.buffer.length > 90 || (this.buffer.length && perception.at - this.buffer[0].at > 1.2)) this.buffer.shift();
    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      const targetTime = perception.at - this.params.reaction;
      const delayed = [...this.buffer].reverse().find((entry) => entry.at <= targetTime) || this.buffer[0] || perception;
      this.think({
        ...delayed,
        self: { ...delayed.self },
        enemy: { ...delayed.enemy },
        projectiles: delayed.projectiles.map((projectile) => ({ ...projectile })),
        zones: delayed.zones.map((zone) => ({ ...zone })),
      }, canStand);
      this.thinkTimer = 1 / this.params.thinkHz;
    }
    const output = {
      ...this.currentIntent,
      special: this.oneShot.special,
      ultimate: this.oneShot.ultimate,
      dash: this.oneShot.dash,
    };
    this.oneShot = { special: false, ultimate: false, dash: false };
    return output;
  }
}

export class ArenaEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: MatchOptions;
  private callbacks: EngineCallbacks;
  private input: InputState;
  private audio: AudioDirector;
  private animationFrame = 0;
  private lastFrame = 0;
  private resizeObserver: ResizeObserver;
  private viewport = { width: 1, height: 1, dpr: 1, scale: 1, offsetX: 0, offsetY: 0 };
  private state: GameState = "countdown";
  private paused = false;
  private debug = false;
  private elapsed = 0;
  private roundElapsed = 0;
  private round = 1;
  private score = { red: 0, blue: 0 };
  private objective = { red: 0, blue: 0, x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, r: 106 };
  private dominionNodes: Array<{ x: number; y: number; r: number; owner: Team | null; capture: number; locked: number }> = [];
  private bossPhase = 1;
  private bossPatternTimer = 3.4;
  private bossTargetTimer = 0;
  private bossDamage = { red: 0, blue: 0 };
  private suddenDeath = false;
  private stormRadius = 900;
  private countdown = 3.35;
  private roundOverTimer = 0;
  private roundWinner: Team | null = null;
  private fighterUpdateTick = 0;
  private fighters: Fighter[] = [];
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private covers: Cover[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private pickups: Pickup[] = [];
  private summons: Summon[] = [];
  private scheduled: Scheduled[] = [];
  private cinematic: Cinematic | null = null;
  private ai: TacticalAI | null = null;
  private nextId = 1;
  private pickupTimer = 6.5;
  private arenaEventTimer = 7.5;
  private clockworkHaste = false;
  private hudTimer = 0;
  private shake = 0;
  private hitStop = 0;
  private announcement = "";
  private announcementTime = 0;
  private muted = false;
  private activeUltimateCastId: number | null = null;

  constructor(canvas: HTMLCanvasElement, options: MatchOptions, callbacks: EngineCallbacks) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D indisponível");
    this.canvas = canvas;
    this.ctx = context;
    this.options = options;
    this.callbacks = callbacks;
    WORLD_WIDTH = options.rule === "boss" ? BOSS_WORLD_WIDTH : STANDARD_WORLD_WIDTH;
    WORLD_HEIGHT = options.rule === "boss" ? BOSS_WORLD_HEIGHT : STANDARD_WORLD_HEIGHT;
    this.objective = { red: 0, blue: 0, x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, r: 106 };
    this.stormRadius = Math.hypot(WORLD_WIDTH / 2, WORLD_HEIGHT / 2) - EDGE;
    this.muted = !options.audio;
    this.audio = new AudioDirector(options.audio && options.settings.audio.master > 0, options.settings);
    this.input = new InputState(
      () => this.callbacks.onPauseRequest(),
      () => this.toggleAudio(),
      () => {
        this.debug = !this.debug;
        this.announce(this.debug ? "DIAGNÓSTICO TÁTICO ATIVO" : "DIAGNÓSTICO TÁTICO OCULTO");
      },
      () => this.audio.resume(),
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    this.resize();
    this.setupArena();
    this.createFighters(0, 0);
    this.audio.resume();
  }

  start() {
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.input.destroy();
    this.audio.destroy();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.input.setEnabled(!paused);
    if (!paused) {
      this.lastFrame = performance.now();
      this.audio.resume();
    }
  }

  setVirtualKey(key: string, active: boolean) {
    this.input.setVirtual(key, active);
  }

  updateSettings(settings: GameSettings) {
    this.options.settings = settings;
    this.options.reducedMotion = settings.effects.reducedMotion;
    this.audio.setMix(settings);
    this.audio.setEnabled(!this.muted && settings.audio.master > 0);
  }

  toggleAudio(force?: boolean) {
    this.muted = typeof force === "boolean" ? !force : !this.muted;
    this.audio.setEnabled(!this.muted && this.options.settings.audio.master > 0);
    this.callbacks.onAudioChange(!this.muted);
    this.announce(this.muted ? "ÁUDIO DESATIVADO" : "ÁUDIO ATIVADO");
    return !this.muted;
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const rect = (parent || this.canvas).getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.viewport = {
      width,
      height,
      dpr,
      scale,
      offsetX: (width - WORLD_WIDTH * scale) / 2,
      offsetY: (height - WORLD_HEIGHT * scale) / 2,
    };
  }

  private createFighter(team: Team, championId: ChampionId, ultimate: number, faction: Faction = team): Fighter {
    const champion = CHAMPIONS[championId];
    return {
      id: this.nextId++,
      team,
      faction,
      champion,
      x: team === "red" ? 210 : WORLD_WIDTH - 210,
      y: WORLD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      r: champion.style === "guardian" ? 22 : 19,
      angle: team === "red" ? 0 : Math.PI,
      hp: champion.hp,
      hpMax: champion.hp,
      attackCd: 0,
      specialCd: 0,
      ultimate,
      ultimateCastId: null,
      ultimateDirectTime: 0,
      dashCharges: 2,
      dashRecharge: 0,
      dashTime: 0,
      dashVx: 0,
      dashVy: 0,
      dashRewarded: false,
      invulnerable: 0,
      spawnGrace: 0,
      shield: 0,
      haste: 0,
      slow: 0,
      stealth: 0,
      stormAura: 0,
      colossus: 0,
      marked: 0,
      stun: 0,
      hitFlash: 0,
      attackFlash: 0,
      meleeWindow: 0,
      history: [],
      dots: [],
      dead: false,
      respawn: 0,
      animation: Math.random() * TAU,
      controlTime: 0,
      aimTargetId: null,
      manualTargetTime: 0,
      lastAttackerId: null,
      threatTime: 0,
      stats: { damage: 0, dodges: 0, kills: 0, cores: 0 },
    };
  }

  private createFighters(redUltimate: number, blueUltimate: number) {
    const oldRedStats = this.fighters.find((fighter) => fighter.team === "red" && fighter.faction !== "boss")?.stats;
    const oldBlueStats = this.fighters.find((fighter) => fighter.team === "blue" && fighter.faction !== "boss")?.stats;
    const red = this.createFighter("red", this.options.redChampion, redUltimate);
    const blue = this.createFighter("blue", this.options.blueChampion, blueUltimate);
    const roster = [red, blue];
    if (this.options.rule === "boss") {
      const boss = this.createFighter("blue", "overlord", 0, "boss");
      const bossTuning = DIFFICULTIES[this.options.difficulty].boss;
      const raidScale = this.options.format === "local" ? 1.22 : 1.12;
      boss.hpMax = Math.round(2200 * bossTuning.hpScale * raidScale);
      boss.hp = boss.hpMax;
      boss.r = 45;
      boss.x = WORLD_WIDTH - 310;
      boss.y = WORLD_HEIGHT / 2;
      red.x = 250;
      red.y = WORLD_HEIGHT * 0.66;
      blue.x = 250;
      blue.y = WORLD_HEIGHT * 0.34;
      blue.angle = 0;
      roster.push(boss);
      this.bossDamage = { red: 0, blue: 0 };
    }
    blue.dashCharges = this.maxDashCharges(blue);
    if (oldRedStats) red.stats = oldRedStats;
    if (oldBlueStats) blue.stats = oldBlueStats;
    this.fighters = roster;
    if (this.options.format === "solo") this.ai = new TacticalAI(blue, this.options.difficulty);
    else this.ai = null;
  }

  private isSoloBot(fighter: Fighter) {
    return this.options.format === "solo" && fighter.team === "blue" && fighter.faction !== "boss";
  }

  private botTuning(fighter: Fighter) {
    return this.isSoloBot(fighter) ? DIFFICULTIES[this.options.difficulty].bot : null;
  }

  private maxDashCharges(fighter: Fighter) {
    return this.botTuning(fighter)?.maxDashes ?? 2;
  }

  private dashRechargeDuration(fighter: Fighter) {
    return 4.8 / (this.botTuning(fighter)?.dashRechargeScale ?? 1);
  }

  private attackCooldownDuration(fighter: Fighter) {
    if (fighter.champion.id === "overlord") {
      return fighter.champion.attackRate * DIFFICULTIES[this.options.difficulty].boss.attackCooldownScale;
    }
    return fighter.champion.attackRate * (this.botTuning(fighter)?.attackCooldownScale ?? 1);
  }

  private specialCooldownDuration(fighter: Fighter) {
    return fighter.champion.specialCooldown * (this.botTuning(fighter)?.specialCooldownScale ?? 1);
  }

  private ultimateGainScale(fighter: Fighter) {
    return this.botTuning(fighter)?.ultimateGainScale ?? 1;
  }

  private outgoingDamageScale(fighter: Fighter) {
    if (fighter.champion.id === "overlord") return DIFFICULTIES[this.options.difficulty].boss.damageScale;
    return this.botTuning(fighter)?.damageScale ?? 1;
  }

  private setupArena() {
    this.covers = [];
    const add = (x: number, y: number, w: number, h: number, destructible = true) => {
      this.covers.push({ id: this.nextId++, x, y, w, h, hp: destructible ? 110 : 9999, hpMax: destructible ? 110 : 9999, destructible, dead: false });
    };
    if (this.options.rule === "boss") {
      add(360, 162, 78, 78, false);
      add(360, WORLD_HEIGHT - 240, 78, 78, false);
      add(WORLD_WIDTH - 438, 162, 78, 78, false);
      add(WORLD_WIDTH - 438, WORLD_HEIGHT - 240, 78, 78, false);
      add(680, 225, 104, 58);
      add(WORLD_WIDTH - 784, 225, 104, 58);
      add(680, WORLD_HEIGHT - 283, 104, 58);
      add(WORLD_WIDTH - 784, WORLD_HEIGHT - 283, 104, 58);
      add(980, 145, 92, 70, false);
      add(WORLD_WIDTH - 1072, 145, 92, 70, false);
      add(980, WORLD_HEIGHT - 215, 92, 70, false);
      add(WORLD_WIDTH - 1072, WORLD_HEIGHT - 215, 92, 70, false);
      this.dominionNodes = [];
      return;
    }
    const addQuartet = (x: number, y: number, w: number, h: number, destructible = true) => {
      add(x, y, w, h, destructible);
      add(WORLD_WIDTH - x - w, y, w, h, destructible);
      add(x, WORLD_HEIGHT - y - h, w, h, destructible);
      add(WORLD_WIDTH - x - w, WORLD_HEIGHT - y - h, w, h, destructible);
    };
    addQuartet(322, 178, 94, 104);
    add(WORLD_WIDTH / 2 - 42, 96, 84, 122, false);
    add(WORLD_WIDTH / 2 - 42, WORLD_HEIGHT - 218, 84, 122, false);
    addQuartet(550, 238, 76, 68);
    addQuartet(790, 360, 70, 64);
    if (this.options.arena === "forge") {
      add(610, WORLD_HEIGHT / 2 - 90, 65, 180);
      add(WORLD_WIDTH - 675, WORLD_HEIGHT / 2 - 90, 65, 180);
      add(WORLD_WIDTH / 2 - 60, 210, 120, 48);
      add(WORLD_WIDTH / 2 - 60, WORLD_HEIGHT - 258, 120, 48);
    } else if (this.options.arena === "clockwork") {
      addQuartet(655, 270, 88, 64);
    } else if (this.options.arena === "citadel") {
      addQuartet(630, 252, 86, 72, false);
    } else {
      add(WORLD_WIDTH / 2 - 104, 278, 208, 48);
      add(WORLD_WIDTH / 2 - 104, WORLD_HEIGHT - 326, 208, 48);
    }
    this.dominionNodes = this.options.rule === "dominion"
      ? [
          { x: WORLD_WIDTH / 2 - 380, y: WORLD_HEIGHT / 2, r: 90, owner: null, capture: 0, locked: 0 },
          { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, r: 100, owner: null, capture: 0, locked: 0 },
          { x: WORLD_WIDTH / 2 + 380, y: WORLD_HEIGHT / 2, r: 90, owner: null, capture: 0, locked: 0 },
        ]
      : [];
  }

  private resetArenaForRound() {
    this.projectiles = [];
    this.zones = [];
    this.particles = [];
    this.texts = [];
    this.pickups = [];
    this.summons = [];
    this.scheduled = [];
    this.cinematic = null;
    this.pickupTimer = 5.5;
    this.arenaEventTimer = 6.5;
    this.roundElapsed = 0;
    this.suddenDeath = false;
    this.stormRadius = Math.hypot(WORLD_WIDTH / 2, WORLD_HEIGHT / 2) - EDGE;
    this.bossPhase = 1;
    this.bossPatternTimer = 3.4;
    this.bossTargetTimer = 0;
    this.setupArena();
  }

  private loop = (now: number) => {
    const dt = Math.min(0.033, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.input.endFrame();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private announce(message: string, seconds = 1.35) {
    this.announcement = message;
    this.announcementTime = seconds;
    this.callbacks.onAnnouncement(message);
  }

  private schedule(delay: number, action: () => void, owner: Fighter | null = null) {
    this.scheduled.push({
      at: this.elapsed + delay,
      action,
      owner,
      ultimateCastId: this.activeUltimateCastId ?? undefined,
    });
  }

  private withUltimateContext<T>(castId: number | null | undefined, action: () => T): T {
    const previousCastId = this.activeUltimateCastId;
    this.activeUltimateCastId = castId ?? null;
    try {
      return action();
    } finally {
      this.activeUltimateCastId = previousCastId;
    }
  }

  private isUltimateActive(fighter: Fighter) {
    const castId = fighter.ultimateCastId;
    if (castId === null) return false;
    const active = fighter.ultimateDirectTime > 0
      || (this.cinematic?.kind === "ultimate" && this.cinematic.owner === fighter)
      || this.scheduled.some((task) => task.ultimateCastId === castId)
      || this.projectiles.some((projectile) => !projectile.dead && projectile.ultimateCastId === castId)
      || this.zones.some((zone) => !zone.dead && zone.ultimateCastId === castId)
      || this.summons.some((summon) => !summon.dead && summon.ultimateCastId === castId)
      || this.fighters.some((target) => !target.dead && target.dots.some((dotEffect) => dotEffect.ultimateCastId === castId && (dotEffect.ultimateTime ?? 0) > 0));
    if (!active) fighter.ultimateCastId = null;
    return active;
  }

  private player(team: Team) {
    return this.fighters.find((fighter) => fighter.team === team && fighter.faction !== "boss")!;
  }

  private boss() {
    return this.fighters.find((fighter) => fighter.faction === "boss") ?? null;
  }

  private bossContributionPercent(team: Team) {
    const total = this.bossDamage.red + this.bossDamage.blue;
    if (total <= 0) return 0;
    const redShare = Math.round(this.bossDamage.red / total * 100);
    return team === "red" ? redShare : 100 - redShare;
  }

  private hostileFighters(fighter: Fighter) {
    return this.fighters.filter((candidate) => candidate !== fighter && !candidate.dead && candidate.spawnGrace <= 0 && candidate.faction !== fighter.faction);
  }

  private targetScore(fighter: Fighter, candidate: Fighter, moveX: number, moveY: number) {
    const d = distance(fighter, candidate);
    const moving = Math.hypot(moveX, moveY) > 0.15;
    const reference = moving ? Math.atan2(moveY, moveX) : fighter.angle;
    const targetAngle = angleTo(fighter, candidate);
    const alignment = (Math.cos(targetAngle - reference) + 1) * 0.5;
    const line = this.hasLine(fighter, candidate) ? 1 : 0;
    const isMelee = fighter.champion.attackStyle === "melee";
    const rangeBase = Math.max(220, isMelee ? 190 : fighter.champion.idealRange);
    const proximity = clamp(1 - Math.abs(d - rangeBase) / Math.max(rangeBase, 720), 0, 1);
    const immediateThreat = candidate.faction !== "boss" && d < 250 ? 1 - d / 250 : 0;
    const recentThreat = fighter.lastAttackerId === candidate.id && fighter.threatTime > 0 ? 1 : 0;
    const continuity = fighter.aimTargetId === candidate.id ? 1 : 0;
    const bossPriority = candidate.faction === "boss" ? 1 : 0;
    const weakened = 1 - candidate.hp / candidate.hpMax;

    if (isMelee) {
      return alignment * 0.3
        + clamp(1 - d / 330, 0, 1) * 0.38
        + Math.max(immediateThreat, recentThreat) * 0.18
        + continuity * 0.1
        + bossPriority * 0.04
        + line * 0.08
        + weakened * 0.04;
    }

    return alignment * 0.5
      + proximity * 0.14
      + Math.max(immediateThreat, recentThreat) * 0.1
      + continuity * 0.12
      + bossPriority * 0.08
      + line * 0.1
      + weakened * 0.04;
  }

  private selectSmartTarget(fighter: Fighter, moveX = 0, moveY = 0) {
    const hostiles = this.hostileFighters(fighter);
    if (!hostiles.length) {
      fighter.aimTargetId = null;
      return null;
    }
    const manualTarget = hostiles.find((candidate) => candidate.id === fighter.aimTargetId) ?? null;
    if (manualTarget && fighter.manualTargetTime > 0) return manualTarget;
    const visible = hostiles.filter((candidate) => this.hasLine(fighter, candidate));
    const candidates = fighter.champion.attackStyle === "melee" || !visible.length ? hostiles : visible;
    const current = candidates.find((candidate) => candidate.id === fighter.aimTargetId) ?? null;

    const ranked = candidates
      .map((candidate) => ({ candidate, score: this.targetScore(fighter, candidate, moveX, moveY) }))
      .sort((left, right) => right.score - left.score);
    let selected = ranked[0].candidate;
    if (current && selected !== current) {
      const currentScore = ranked.find((entry) => entry.candidate === current)?.score ?? -Infinity;
      if (ranked[0].score < currentScore + 0.16) selected = current;
    }
    fighter.aimTargetId = selected.id;
    return selected;
  }

  private cycleSmartTarget(fighter: Fighter) {
    const candidates = this.hostileFighters(fighter).sort((left, right) => {
      if (left.faction === "boss") return 1;
      if (right.faction === "boss") return -1;
      return left.id - right.id;
    });
    if (!candidates.length) return null;
    const currentIndex = candidates.findIndex((candidate) => candidate.id === fighter.aimTargetId);
    const selected = candidates[(currentIndex + 1 + candidates.length) % candidates.length];
    fighter.aimTargetId = selected.id;
    fighter.manualTargetTime = 1.25;
    this.text(selected.x, selected.y - selected.r - 30, `ALVO ${fighter.team === "red" ? "P1" : "P2"}`, teamColor(fighter.team), 14);
    return selected;
  }

  private predictiveAimAngle(fighter: Fighter, target: Fighter) {
    if (fighter.champion.attackStyle === "melee") return angleTo(fighter, target);
    const direct = angleTo(fighter, target);
    const speed = Math.max(1, fighter.champion.projectileSpeed);
    const travelTime = clamp(distance(fighter, target) / speed, 0, 0.45);
    const leadFactor = fighter.champion.attackStyle === "vial" ? 0.35 : fighter.champion.attackStyle === "arrow" ? 0.55 : 0.45;
    const predicted = { x: target.x + target.vx * travelTime * leadFactor, y: target.y + target.vy * travelTime * leadFactor };
    const predictedAngle = angleTo(fighter, predicted);
    const correction = Math.atan2(Math.sin(predictedAngle - direct), Math.cos(predictedAngle - direct));
    return direct + clamp(correction, -0.21, 0.21);
  }

  private opponent(fighter: Fighter) {
    return this.selectSmartTarget(fighter, fighter.vx, fighter.vy)
      ?? this.fighters.find((candidate) => candidate !== fighter && candidate.faction !== fighter.faction)
      ?? fighter;
  }

  private canStand(x: number, y: number, r: number) {
    if (x - r < EDGE || x + r > WORLD_WIDTH - EDGE || y - r < EDGE || y + r > WORLD_HEIGHT - EDGE) return false;
    return !this.covers.some((cover) => !cover.dead && rectContainsCircle(x, y, r, cover));
  }

  private hasLine(from: Vec, to: Vec) {
    return !this.covers.some((cover) => !cover.dead && lineHitsRect(from, to, cover));
  }

  private humanIntent(fighter: Fighter, team: Team): Intent {
    const controls: ControlBindings[Team] = this.options.settings.controls[team] ?? CONTROLS[team];
    let moveX = (this.input.isDown(controls.right) ? 1 : 0) - (this.input.isDown(controls.left) ? 1 : 0);
    let moveY = (this.input.isDown(controls.down) ? 1 : 0) - (this.input.isDown(controls.up) ? 1 : 0);
    if (moveX || moveY) {
      const direction = normalize(moveX, moveY);
      moveX = direction.x;
      moveY = direction.y;
    }
    const opponent = this.input.wasPressed(controls.target)
      ? this.cycleSmartTarget(fighter)
      : this.selectSmartTarget(fighter, moveX, moveY);
    const aimAngle = opponent ? this.predictiveAimAngle(fighter, opponent) : fighter.angle;
    return {
      moveX,
      moveY,
      aimAngle,
      attack: this.input.isDown(controls.attack),
      special: this.input.wasPressed(controls.special),
      ultimate: this.input.wasPressed(controls.ultimate),
      dash: this.input.wasPressed(controls.dash),
    };
  }

  private perceptionFor(fighter: Fighter): Perception {
    const enemy = this.selectSmartTarget(fighter, fighter.vx, fighter.vy) ?? fighter;
    if (enemy !== fighter) fighter.aimTargetId = enemy.id;
    const objectiveTarget = this.options.rule === "dominion" && this.dominionNodes.length
      ? [...this.dominionNodes].sort((left, right) => {
          const priority = (node: (typeof this.dominionNodes)[number]) => {
            const threatened = enemy !== fighter && !enemy.dead && distance(enemy, node) < node.r + 30;
            return distance(fighter, node) + (node.owner === fighter.team ? threatened ? -350 : 620 : node.owner ? -120 : 0);
          };
          return priority(left) - priority(right);
        })[0]
      : this.objective;
    return {
      at: this.elapsed,
      rule: this.options.rule,
      self: {
        x: fighter.x,
        y: fighter.y,
        vx: fighter.vx,
        vy: fighter.vy,
        hp: fighter.hp,
        hpMax: fighter.hpMax,
        specialCd: fighter.specialCd,
        ultimate: fighter.ultimate,
        ultimateLocked: this.isUltimateActive(fighter),
        dashes: fighter.dashCharges,
      },
      enemy: {
        x: enemy.x,
        y: enemy.y,
        vx: enemy.vx,
        vy: enemy.vy,
        hp: enemy.hp,
        hpMax: enemy.hpMax,
        stealth: enemy.stealth > 0,
      },
      projectiles: this.projectiles
        .filter((projectile) => !projectile.dead && projectile.team !== fighter.faction)
        .map((projectile) => ({ x: projectile.x, y: projectile.y, vx: projectile.vx, vy: projectile.vy, r: projectile.r, damage: projectile.damage })),
      zones: this.zones
        .filter((zone) => !zone.dead && zone.team !== fighter.faction && (zone.damage > 0 || (zone.warningDamage ?? 0) > 0))
        .map((zone) => {
          const age = zone.maxLife - zone.life;
          return {
            x: zone.x,
            y: zone.y,
            r: zone.r,
            damage: Math.max(zone.damage, zone.warningDamage ?? 0),
            active: age >= zone.activeAfter,
            activatesIn: Math.max(0, zone.activeAfter - age),
          };
        }),
      pickups: this.pickups.map((pickup) => ({ x: pickup.x, y: pickup.y, type: pickup.type })),
      covers: this.covers.filter((cover) => !cover.dead).map((cover) => ({ x: cover.x, y: cover.y, w: cover.w, h: cover.h })),
      objective: { x: objectiveTarget.x, y: objectiveTarget.y, red: this.objective.red, blue: this.objective.blue },
    };
  }

  private bossIntent(boss: Fighter, dt: number): Intent {
    const heroes = this.hostileFighters(boss);
    const current = heroes.find((fighter) => fighter.id === boss.aimTargetId);
    this.bossTargetTimer = Math.max(0, this.bossTargetTimer - dt);
    const hero = current && this.bossTargetTimer > 0 ? current : [...heroes].sort((left, right) => {
      const threatLeft = this.bossDamage[left.team] * 0.35 - distance(boss, left) + (current && left !== current ? 140 : 0);
      const threatRight = this.bossDamage[right.team] * 0.35 - distance(boss, right) + (current && right !== current ? 140 : 0);
      return threatRight - threatLeft;
    })[0] ?? boss;
    if (hero !== boss && hero !== current) {
      boss.aimTargetId = hero.id;
      this.bossTargetTimer = 2.2 + Math.random() * 1.2;
    }
    const bossTuning = DIFFICULTIES[this.options.difficulty].boss;
    const neutralIntent = (): Intent => ({
      moveX: 0,
      moveY: 0,
      aimAngle: hero === boss ? boss.angle : angleTo(boss, hero),
      attack: false,
      special: false,
      ultimate: false,
      dash: false,
    });
    const hpRatio = boss.hp / boss.hpMax;
    const nextPhase = hpRatio <= 0.34 ? 3 : hpRatio <= 0.68 ? 2 : 1;
    if (nextPhase !== this.bossPhase) {
      this.bossPhase = nextPhase;
      const transitionPause = BOSS_PHASE_TRANSITION_PAUSE + dt;
      boss.invulnerable = Math.max(boss.invulnerable, transitionPause);
      boss.stun = Math.max(boss.stun, transitionPause);
      boss.vx = 0;
      boss.vy = 0;
      this.scheduled = this.scheduled.filter((task) => task.owner !== boss);
      this.projectiles = this.projectiles.filter((projectile) => projectile.owner !== boss);
      this.zones = this.zones.filter((zone) => zone.owner !== boss);
      this.bossPatternTimer = Math.max(this.bossPatternTimer, 0.45);
      this.announce(`MALAKAR // FASE ${nextPhase}`, 1.8);
      this.burst(boss.x, boss.y, nextPhase === 3 ? "#ff5b52" : "#d95bff", 70, 470, "shard");
      this.shake = Math.max(this.shake, this.options.settings.effects.screenShake && !this.options.reducedMotion ? 14 : 0);
      return neutralIntent();
    }
    if (boss.stun > 0) return neutralIntent();
    this.bossPatternTimer -= dt;
    if (this.bossPatternTimer <= 0 && hero !== boss && !hero.dead) {
      this.bossPatternTimer = Math.max(0.9, (3.35 - this.bossPhase * 0.43) * bossTuning.patternTempo);
      this.executeBossPattern(boss, hero);
    }
    const dist = hero === boss ? 0 : distance(boss, hero);
    const direction = hero === boss ? { x: 0, y: 0 } : normalize(hero.x - boss.x, hero.y - boss.y);
    const strafe = Math.sin(this.elapsed * (0.65 + this.bossPhase * 0.12));
    const pressure = dist > 320 ? 0.68 : dist < 210 ? -0.42 : 0.08;
    return {
      moveX: (direction.x * pressure - direction.y * strafe * 0.42) * bossTuning.movementPressure,
      moveY: (direction.y * pressure + direction.x * strafe * 0.42) * bossTuning.movementPressure,
      aimAngle: hero === boss ? boss.angle : angleTo(boss, hero),
      attack: boss.attackCd <= 0,
      special: false,
      ultimate: false,
      dash: false,
    };
  }

  private executeBossPattern(boss: Fighter, hero: Fighter) {
    const raidTargets = this.hostileFighters(boss);
    const pattern = (Math.floor(this.elapsed * 0.7) + this.bossPhase) % (this.bossPhase + 2);
    boss.attackFlash = 1;
    if (pattern === 0) {
      for (let lane = -2; lane <= 2; lane += 1) {
        this.schedule(Math.abs(lane) * 0.08, () => {
          const target = hero.dead ? this.hostileFighters(boss)[0] : hero;
          if (!target) return;
          const angle = angleTo(boss, target) + lane * 0.24;
          for (let shot = -1; shot <= 1; shot += 1) this.spawnProjectile(boss, angle + shot * 0.055, { damage: 18 + this.bossPhase * 3, speed: 520 + this.bossPhase * 85, life: 2.1, r: 10, kind: "shade", color: "#d95bff", wallDamage: 20 });
        }, boss);
      }
      this.announce("MALAKAR: LEQUE DO ABISMO", 0.8);
    } else if (pattern === 1) {
      const count = 5 + this.bossPhase * 2;
      for (let index = 0; index < count; index += 1) {
        const target = raidTargets[index % Math.max(1, raidTargets.length)] ?? hero;
        const lead = { x: target.x + target.vx * 0.32, y: target.y + target.vy * 0.32 };
        this.schedule(index * 0.13, () => {
          const angle = index * 2.31;
          const radius = 42 + (index % 4) * 58;
          this.warningStrike("meteor", boss, lead.x + Math.cos(angle) * radius, lead.y + Math.sin(angle) * radius * 0.7, 54, Math.max(0.56, 0.88 - this.bossPhase * 0.08), 25 + this.bossPhase * 5, "#ff7659");
        }, boss);
      }
      this.announce("MALAKAR: CHUVA TERMINAL", 0.8);
    } else if (pattern === 2) {
      for (let ring = 0; ring < 3; ring += 1) {
        this.schedule(ring * 0.36, () => {
          for (let index = 0; index < 18; index += 1) this.spawnProjectile(boss, (index / 18) * TAU + ring * 0.1, { damage: 14 + this.bossPhase * 2, speed: 360 + ring * 95, life: 2.7, r: 8, kind: "shade", color: ring % 2 ? "#ffcc66" : "#d95bff", wallDamage: 4 });
        }, boss);
      }
      this.announce("MALAKAR: ÓRBITA PARTIDA", 0.8);
    } else {
      const base = angleTo(boss, hero);
      for (let beam = -1; beam <= 1; beam += 1) {
        const angle = base + beam * Math.PI / 3;
        for (let step = 1; step <= 7; step += 1) this.warningStrike("arrow-rain", boss, boss.x + Math.cos(angle) * step * 92, boss.y + Math.sin(angle) * step * 92, 44, 0.68, 30, "#ffcc66");
      }
      this.announce("MALAKAR: TRIDENTE RÚNICO", 0.8);
    }
  }

  private update(dt: number) {
    this.announcementTime = Math.max(0, this.announcementTime - dt);
    this.hudTimer -= dt;

    if (this.cinematic) {
      this.updateCinematic(dt);
      this.updateParticles(dt * 0.35);
      if (this.hudTimer <= 0) this.pushHud();
      return;
    }

    if (this.state === "countdown") {
      this.countdown -= dt;
      this.updateParticles(dt);
      if (this.countdown <= 0) {
        this.state = "playing";
        this.announce(this.round === 1 ? "A FENDA ESTÁ ABERTA" : `ROUND ${this.round}`);
      }
      if (this.hudTimer <= 0) this.pushHud();
      return;
    }

    if (this.state === "round-over") {
      this.roundOverTimer -= dt;
      this.updateParticles(dt * 0.55);
      this.updateTexts(dt * 0.55);
      if (this.roundOverTimer <= 0) {
        if (this.score.red >= this.options.scoreTo || this.score.blue >= this.options.scoreTo) {
          this.finishMatch(this.score.red > this.score.blue ? "red" : "blue");
        } else {
          this.beginNextRound();
        }
      }
      if (this.hudTimer <= 0) this.pushHud();
      return;
    }

    if (this.state === "finished") {
      this.updateParticles(dt * 0.35);
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.updateParticles(dt * 0.12);
      if (this.hudTimer <= 0) this.pushHud();
      return;
    }

    this.elapsed += dt;
    this.roundElapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 24);

    for (let index = this.scheduled.length - 1; index >= 0; index -= 1) {
      if (this.scheduled[index].at <= this.elapsed) {
        const task = this.scheduled.splice(index, 1)[0];
        this.withUltimateContext(task.ultimateCastId, task.action);
      }
    }

    for (const fighter of this.fighters) fighter.ultimateDirectTime = Math.max(0, fighter.ultimateDirectTime - dt);

    this.updateArena(dt);
    const fighterUpdateOrder = this.fighterUpdateTick % 2 === 0 ? this.fighters : [...this.fighters].reverse();
    this.fighterUpdateTick += 1;
    for (const fighter of fighterUpdateOrder) {
      if (fighter.dead) {
        this.updateDeadFighter(fighter, dt);
        continue;
      }
      const intent = fighter.faction === "boss"
        ? this.bossIntent(fighter, dt)
        : fighter.team === "blue" && this.ai
          ? this.ai.sample(dt, this.perceptionFor(fighter), (x, y, r) => this.canStand(x, y, r))
          : this.humanIntent(fighter, fighter.team);
      this.updateFighter(fighter, intent, dt);
    }

    this.resolveFighterCollision();
    this.resolveMeleeClash();
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateSummons(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateObjective(dt);

    const redRatio = this.player("red").hp / this.player("red").hpMax;
    const blueRatio = this.player("blue").hp / this.player("blue").hpMax;
    const boss = this.boss();
    const bossPressure = boss ? 1 - boss.hp / boss.hpMax : 0;
    const intensity = clamp((1 - Math.min(redRatio, blueRatio)) * 0.55 + bossPressure * 0.25 + (this.suddenDeath || boss ? 0.3 : 0.1), 0, 1);
    this.audio.update(dt, intensity);
    if (this.hudTimer <= 0) this.pushHud();
  }

  private beginNextRound() {
    const red = this.player("red");
    const blue = this.player("blue");
    const redUltimate = Math.min(red.ultimate, 40);
    const blueUltimate = Math.min(blue.ultimate, 40);
    this.resetArenaForRound();
    this.resetFighter(red, redUltimate);
    this.resetFighter(blue, blueUltimate);
    this.round += 1;
    this.countdown = 2.75;
    this.state = "countdown";
    this.roundWinner = null;
  }

  private resetFighter(fighter: Fighter, ultimate: number) {
    fighter.x = fighter.team === "red" ? 210 : WORLD_WIDTH - 210;
    fighter.y = WORLD_HEIGHT / 2;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.hp = fighter.hpMax;
    fighter.attackCd = 0;
    fighter.specialCd = 0;
    fighter.ultimate = clamp(ultimate, 0, 100);
    fighter.ultimateCastId = null;
    fighter.ultimateDirectTime = 0;
    fighter.dashCharges = this.maxDashCharges(fighter);
    fighter.dashRecharge = 0;
    fighter.dashTime = 0;
    fighter.invulnerable = 0;
    fighter.spawnGrace = 0;
    fighter.shield = 0;
    fighter.haste = 0;
    fighter.slow = 0;
    fighter.stealth = 0;
    fighter.stormAura = 0;
    fighter.colossus = 0;
    fighter.marked = 0;
    fighter.stun = 0;
    fighter.dead = false;
    fighter.respawn = 0;
    fighter.history = [];
    fighter.dots = [];
    fighter.aimTargetId = null;
    fighter.manualTargetTime = 0;
    fighter.lastAttackerId = null;
    fighter.threatTime = 0;
  }

  private finishMatch(winner: Team) {
    if (this.state === "finished") return;
    this.state = "finished";
    this.audio.play("victory");
    const red = this.player("red");
    const blue = this.player("blue");
    this.callbacks.onFinished({
      winner,
      scoreRed: this.options.rule === "dominion" ? Math.round(this.objective.red) : this.options.rule === "boss" ? this.bossContributionPercent("red") : this.score.red,
      scoreBlue: this.options.rule === "dominion" ? Math.round(this.objective.blue) : this.options.rule === "boss" ? this.bossContributionPercent("blue") : this.score.blue,
      redDamage: Math.round(red.stats.damage),
      blueDamage: Math.round(blue.stats.damage),
      redDodges: red.stats.dodges,
      blueDodges: blue.stats.dodges,
      duration: Math.round(this.elapsed),
      rule: this.options.rule,
      arena: this.options.arena,
      rounds: this.round,
      aiState: this.ai?.state || "2P LOCAL",
      bossDamageRed: Math.round(this.bossDamage.red),
      bossDamageBlue: Math.round(this.bossDamage.blue),
    });
  }

  private endRound(winner: Team) {
    if (this.state !== "playing") return;
    this.score[winner] += 1;
    this.roundWinner = winner;
    this.state = "round-over";
    this.roundOverTimer = 2.25;
    this.announce(`${winner === "red" ? "RUBRO" : "AZUL"} DOMINOU O ROUND`, 1.8);
    this.burst(this.player(winner).x, this.player(winner).y, teamColor(winner), 34, 310, "shard");
  }

  private updateDeadFighter(fighter: Fighter, dt: number) {
    const raidRespawn = this.options.rule === "boss" && fighter.faction !== "boss";
    if (!raidRespawn && this.options.rule !== "dominion") return;
    fighter.attackCd = Math.max(0, fighter.attackCd - dt);
    fighter.specialCd = Math.max(0, fighter.specialCd - dt);
    fighter.respawn -= dt;
    if (fighter.respawn <= 0) {
      fighter.dead = false;
      fighter.hp = fighter.hpMax;
      const preferred = raidRespawn
        ? { x: 245, y: WORLD_HEIGHT * (fighter.team === "red" ? 0.68 : 0.32) }
        : { x: fighter.team === "red" ? 190 : WORLD_WIDTH - 190, y: WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 170 };
      const spawn = this.findSafePoint(preferred.x, preferred.y, fighter.r);
      fighter.x = spawn.x;
      fighter.y = spawn.y;
      if (raidRespawn) fighter.angle = 0;
      fighter.invulnerable = raidRespawn ? 1.6 : 1.25;
      fighter.spawnGrace = raidRespawn ? 1.6 : 0;
      fighter.dashCharges = this.maxDashCharges(fighter);
      fighter.dashRecharge = 0;
      fighter.dashTime = 0;
      fighter.specialCd = Math.max(fighter.specialCd, 1);
      fighter.dots = [];
      fighter.stun = 0;
      fighter.slow = 0;
      fighter.stealth = 0;
      fighter.marked = 0;
      fighter.shield = 0;
      fighter.haste = 0;
      fighter.stormAura = 0;
      fighter.colossus = 0;
      fighter.aimTargetId = null;
      fighter.manualTargetTime = 0;
      fighter.lastAttackerId = null;
      fighter.threatTime = 0;
      this.burst(fighter.x, fighter.y, teamColor(fighter.team), 26, 240, "spark");
      this.announce(`${raidRespawn ? fighter.team === "red" ? "P1" : "P2" : fighter.team === "red" ? "RUBRO" : "AZUL"} RETORNOU`, 0.9);
    }
  }

  private updateFighter(fighter: Fighter, intent: Intent, dt: number) {
    const botTuning = this.botTuning(fighter);
    fighter.spawnGrace = Math.max(0, fighter.spawnGrace - dt);
    if (fighter.spawnGrace > 0 && (intent.attack || intent.special || intent.ultimate)) {
      fighter.spawnGrace = 0;
      fighter.invulnerable = Math.min(fighter.invulnerable, 0.08);
    }
    fighter.manualTargetTime = Math.max(0, fighter.manualTargetTime - dt);
    fighter.threatTime = Math.max(0, fighter.threatTime - dt);
    if (fighter.threatTime <= 0) fighter.lastAttackerId = null;
    fighter.attackCd = Math.max(0, fighter.attackCd - dt * (fighter.haste > 0 ? 1.38 : 1));
    fighter.specialCd = Math.max(0, fighter.specialCd - dt * (fighter.haste > 0 ? 1.26 : 1));
    fighter.invulnerable = Math.max(0, fighter.invulnerable - dt);
    fighter.shield = Math.max(0, fighter.shield - dt);
    fighter.haste = Math.max(0, fighter.haste - dt);
    fighter.slow = Math.max(0, fighter.slow - dt);
    fighter.stealth = Math.max(0, fighter.stealth - dt);
    fighter.stormAura = Math.max(0, fighter.stormAura - dt);
    fighter.colossus = Math.max(0, fighter.colossus - dt);
    fighter.marked = Math.max(0, fighter.marked - dt);
    fighter.stun = Math.max(0, fighter.stun - dt);
    fighter.hitFlash = Math.max(0, fighter.hitFlash - dt * 7);
    fighter.attackFlash = Math.max(0, fighter.attackFlash - dt * 8);
    fighter.meleeWindow = Math.max(0, fighter.meleeWindow - dt);
    fighter.ultimate = clamp(fighter.ultimate + dt * 1.1 * this.ultimateGainScale(fighter), 0, 100);
    if (botTuning?.hpRegen) fighter.hp = clamp(fighter.hp + botTuning.hpRegen * dt, 0, fighter.hpMax);
    fighter.animation += dt * (2.2 + Math.hypot(fighter.vx, fighter.vy) / 85);

    const maxDashes = this.maxDashCharges(fighter);
    const dashRechargeDuration = this.dashRechargeDuration(fighter);
    if (fighter.dashCharges < maxDashes) {
      fighter.dashRecharge += dt * (fighter.haste > 0 ? 1.3 : 1);
      if (fighter.dashRecharge >= dashRechargeDuration) {
        fighter.dashRecharge -= dashRechargeDuration;
        fighter.dashCharges += 1;
      }
    } else fighter.dashRecharge = 0;

    const latestHistory = fighter.history[fighter.history.length - 1];
    if (!latestHistory || this.elapsed - latestHistory.at >= 1 / 30) {
      fighter.history.push({ x: fighter.x, y: fighter.y, hp: fighter.hp, at: this.elapsed });
    }
    while (fighter.history.length && this.elapsed - fighter.history[0].at > 2.25) fighter.history.shift();
    for (let index = fighter.dots.length - 1; index >= 0; index -= 1) {
      const effect = fighter.dots[index];
      effect.time -= dt;
      if (effect.ultimateTime !== undefined) {
        effect.ultimateTime = Math.max(0, effect.ultimateTime - dt);
        if (effect.ultimateTime <= 0) effect.ultimateCastId = undefined;
      }
      effect.tick -= dt;
      if (effect.tick <= 0) {
        effect.tick = 0.5;
        this.damageFighter(fighter, effect.damage, effect.owner, { color: effect.type === "poison" ? "#9aea64" : effect.type === "bleed" ? "#ff5d63" : "#ff7847", bypassInvulnerability: true, quiet: true });
      }
      if (effect.time <= 0) fighter.dots.splice(index, 1);
    }

    if (fighter.stun > 0) return;
    fighter.angle = intent.aimAngle;

    if (intent.dash && fighter.dashCharges > 0 && fighter.dashTime <= 0) this.startDash(fighter, intent);
    if (fighter.dashTime > 0) {
      fighter.dashTime -= dt;
      fighter.invulnerable = Math.max(fighter.invulnerable, 0.06);
      this.moveFighter(fighter, fighter.dashVx * dt, fighter.dashVy * dt, true);
      if (Math.random() < 0.8) this.particle(fighter.x, fighter.y, teamColor(fighter.team), 8, "spark", -20, 20);
    } else {
      const speedMultiplier = (fighter.slow > 0 ? 0.62 : 1)
        * (fighter.haste > 0 ? 1.16 : 1)
        * (fighter.stealth > 0 ? 1.08 : 1)
        * (botTuning?.movementScale ?? 1);
      const oldX = fighter.x;
      const oldY = fighter.y;
      this.moveFighter(fighter, intent.moveX * fighter.champion.speed * speedMultiplier * dt, intent.moveY * fighter.champion.speed * speedMultiplier * dt);
      fighter.vx = (fighter.x - oldX) / dt;
      fighter.vy = (fighter.y - oldY) / dt;
    }

    if (intent.attack) this.performBasic(fighter);
    if (intent.special) this.performSpecial(fighter);
    if (intent.ultimate) this.performUltimate(fighter);

    if (fighter.stormAura > 0) {
      const enemy = this.opponent(fighter);
      if (!enemy.dead && distance(fighter, enemy) < 185 && Math.floor(fighter.stormAura * 4) !== Math.floor((fighter.stormAura + dt) * 4)) {
        this.damageFighter(enemy, 4, fighter, { color: "#67f5eb", quiet: true });
        this.lightning(fighter, enemy, "#67f5eb");
      }
    }
  }

  private startDash(fighter: Fighter, intent: Intent) {
    const direction = Math.hypot(intent.moveX, intent.moveY) > 0.1
      ? normalize(intent.moveX, intent.moveY)
      : { x: Math.cos(fighter.angle), y: Math.sin(fighter.angle) };
    fighter.dashCharges -= 1;
    fighter.dashTime = 0.17;
    fighter.dashVx = direction.x * 880;
    fighter.dashVy = direction.y * 880;
    fighter.vx = fighter.dashVx;
    fighter.vy = fighter.dashVy;
    fighter.invulnerable = 0.22;
    fighter.dashRewarded = false;
    this.audio.play("dash");
    this.burst(fighter.x, fighter.y, fighter.champion.accent, 12, 160, "spark");
    for (const projectile of this.projectiles) {
      if (projectile.team === fighter.faction || projectile.dead) continue;
      const d = distance(fighter, projectile);
      const towards = dot(normalize(fighter.x - projectile.x, fighter.y - projectile.y), normalize(projectile.vx, projectile.vy));
      if (d < 112 && towards > 0.45) {
        this.perfectDodge(fighter);
        break;
      }
    }
  }

  private perfectDodge(fighter: Fighter) {
    if (fighter.dashRewarded) return;
    fighter.dashRewarded = true;
    fighter.stats.dodges += 1;
    fighter.ultimate = clamp(fighter.ultimate + 12 * this.ultimateGainScale(fighter), 0, 100);
    fighter.haste = Math.max(fighter.haste, 0.75);
    this.text(fighter.x, fighter.y - 40, "ESQUIVA PERFEITA +12", "#f6df72", 18);
    this.burst(fighter.x, fighter.y, "#f6df72", 18, 230, "spark");
    this.hitStop = Math.max(this.hitStop, this.options.reducedMotion ? 0 : 0.045);
    this.audio.play("core");
  }

  private moveFighter(fighter: Fighter, dx: number, dy: number, breakCover = false) {
    const radius = fighter.r + (fighter.colossus > 0 ? 5 : 0);
    const oldX = fighter.x;
    const oldY = fighter.y;
    fighter.x = clamp(fighter.x + dx, EDGE + radius, WORLD_WIDTH - EDGE - radius);
    for (const cover of this.covers) {
      if (cover.dead || !rectContainsCircle(fighter.x, fighter.y, radius, cover)) continue;
      if (breakCover && fighter.colossus > 0 && cover.destructible) {
        this.damageCover(cover, 60, fighter);
      } else fighter.x = oldX;
    }
    fighter.y = clamp(fighter.y + dy, EDGE + radius, WORLD_HEIGHT - EDGE - radius);
    for (const cover of this.covers) {
      if (cover.dead || !rectContainsCircle(fighter.x, fighter.y, radius, cover)) continue;
      if (breakCover && fighter.colossus > 0 && cover.destructible) {
        this.damageCover(cover, 60, fighter);
      } else fighter.y = oldY;
    }
  }

  private resolveFighterCollision() {
    for (let leftIndex = 0; leftIndex < this.fighters.length; leftIndex += 1) {
      const left = this.fighters[leftIndex];
      if (left.dead) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < this.fighters.length; rightIndex += 1) {
        const right = this.fighters[rightIndex];
        if (right.dead) continue;
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const d = Math.hypot(dx, dy) || 1;
        const minimum = left.r + right.r + 4;
        if (d >= minimum) continue;
        const overlap = (minimum - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        this.moveFighter(left, -nx * overlap, -ny * overlap);
        this.moveFighter(right, nx * overlap, ny * overlap);
      }
    }
  }

  private resolveMeleeClash() {
    for (let leftIndex = 0; leftIndex < this.fighters.length; leftIndex += 1) {
      const left = this.fighters[leftIndex];
      if (left.dead || left.meleeWindow <= 0) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < this.fighters.length; rightIndex += 1) {
        const right = this.fighters[rightIndex];
        if (right.dead || right.meleeWindow <= 0 || left.faction === right.faction || distance(left, right) > 122) continue;
        left.meleeWindow = 0;
        right.meleeWindow = 0;
        left.stun = 0.32;
        right.stun = 0.32;
        const direction = normalize(right.x - left.x, right.y - left.y);
        this.moveFighter(left, -direction.x * 54, -direction.y * 54);
        this.moveFighter(right, direction.x * 54, direction.y * 54);
        this.burst((left.x + right.x) / 2, (left.y + right.y) / 2, "#f6df72", 30, 330, "shard");
        this.text((left.x + right.x) / 2, (left.y + right.y) / 2 - 50, "CLASH", "#f6df72", 24);
        this.audio.play("clash");
        this.hitStop = this.options.reducedMotion ? 0 : 0.075;
        this.shake = Math.max(this.shake, this.options.reducedMotion ? 0 : 8);
      }
    }
  }

  private performBasic(fighter: Fighter) {
    if (fighter.attackCd > 0 || fighter.dead) return;
    const champion = fighter.champion;
    fighter.attackCd = this.attackCooldownDuration(fighter);
    fighter.attackFlash = 1;
    fighter.stealth = 0;
    this.audio.play("attack");

    if (champion.attackStyle === "melee") {
      fighter.meleeWindow = 0.13;
      const enemy = this.opponent(fighter);
      this.slash(fighter.x, fighter.y, fighter.angle, champion.accent, 92);
      if (!enemy.dead && distance(fighter, enemy) < 108) {
        const difference = Math.abs(Math.atan2(Math.sin(angleTo(fighter, enemy) - fighter.angle), Math.cos(angleTo(fighter, enemy) - fighter.angle)));
        if (difference < 0.92) {
          const multiplier = enemy.marked > 0 ? 1.4 : 1;
          this.damageFighter(enemy, champion.damage * multiplier, fighter, { color: champion.accent, critical: enemy.marked > 0 });
          if (enemy.marked > 0) enemy.marked = 0;
          const push = normalize(enemy.x - fighter.x, enemy.y - fighter.y);
          this.moveFighter(enemy, push.x * 18, push.y * 18);
        }
      }
      return;
    }

    if (champion.attackStyle === "spread") {
      [-0.16, 0, 0.16].forEach((offset) => this.spawnProjectile(fighter, fighter.angle + offset, {
        damage: champion.damage,
        speed: champion.projectileSpeed,
        life: champion.range / champion.projectileSpeed,
        r: 7,
        kind: "shell",
        color: champion.accent,
        wallDamage: 10,
      }));
      return;
    }

    const kind: ProjectileKind = champion.attackStyle === "bolt"
      ? "fire"
      : champion.attackStyle === "arrow"
        ? "arrow"
        : champion.attackStyle === "orb"
          ? "time"
          : champion.attackStyle === "chain"
            ? "lightning"
            : champion.attackStyle === "soul"
              ? "soul"
              : "vial";
    this.spawnProjectile(fighter, fighter.angle, {
      damage: champion.damage,
      speed: champion.projectileSpeed,
      life: champion.range / champion.projectileSpeed,
      r: kind === "soul" ? 11 : kind === "vial" ? 9 : kind === "arrow" ? 5 : 8,
      kind,
      color: champion.accent,
      pierce: kind === "soul" ? 1 : 0,
      slow: kind === "time" ? 0.3 : 0,
      burn: kind === "fire" ? 1.5 : 0,
      poison: kind === "vial" ? 1.4 : 0,
      wallDamage: kind === "arrow" ? 5 : 8,
    });
  }

  private spawnProjectile(
    owner: Fighter,
    angle: number,
    options: {
      damage: number;
      speed: number;
      life: number;
      r: number;
      kind: ProjectileKind;
      color: string;
      pierce?: number;
      slow?: number;
      burn?: number;
      poison?: number;
      wallDamage?: number;
      x?: number;
      y?: number;
      ultimateCastId?: number;
    },
  ) {
    const startX = options.x ?? owner.x + Math.cos(angle) * (owner.r + 12);
    const startY = options.y ?? owner.y + Math.sin(angle) * (owner.r + 12);
    this.projectiles.push({
      id: this.nextId++,
      owner,
      team: owner.faction,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * options.speed,
      vy: Math.sin(angle) * options.speed,
      r: options.r,
      damage: options.damage,
      life: options.life,
      maxLife: options.life,
      color: options.color,
      kind: options.kind,
      pierce: options.pierce || 0,
      slow: options.slow || 0,
      burn: options.burn || 0,
      poison: options.poison || 0,
      wallDamage: options.wallDamage || 8,
      dead: false,
      trail: [],
      hitIds: new Set<number>(),
      ultimateCastId: options.ultimateCastId ?? this.activeUltimateCastId ?? undefined,
    });
  }

  private updateProjectiles(dt: number) {
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      projectile.life -= dt;
      projectile.trail.push({ x: projectile.x, y: projectile.y });
      if (projectile.trail.length > 7) projectile.trail.shift();
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.life <= 0 || projectile.x < EDGE - 20 || projectile.x > WORLD_WIDTH - EDGE + 20 || projectile.y < EDGE - 20 || projectile.y > WORLD_HEIGHT - EDGE + 20) {
        this.expireProjectile(projectile);
        continue;
      }

      const cover = this.covers.find((item) => !item.dead && rectContainsCircle(projectile.x, projectile.y, projectile.r, item));
      if (cover) {
        this.damageCover(cover, projectile.wallDamage, projectile.owner);
        this.expireProjectile(projectile);
        continue;
      }

      const target = this.fighters.find((fighter) => !fighter.dead && fighter.spawnGrace <= 0 && fighter.faction !== projectile.team && !projectile.hitIds.has(fighter.id) && distance(fighter, projectile) < fighter.r + projectile.r);
      if (target) {
        const hit = this.damageFighter(target, projectile.damage, projectile.owner, { color: projectile.color });
        if (hit) {
          projectile.hitIds.add(target.id);
          if (projectile.slow) target.slow = Math.max(target.slow, projectile.slow);
          if (projectile.burn) this.addDot(target, "burn", projectile.burn, 3.2, projectile.owner, projectile.ultimateCastId);
          if (projectile.poison) this.addDot(target, "poison", projectile.poison, 2.8, projectile.owner, projectile.ultimateCastId);
          if (projectile.kind === "lightning") this.lightning(projectile.owner, target, projectile.color);
          if (projectile.pierce > 0) projectile.pierce -= 1;
          else this.expireProjectile(projectile);
        } else {
          if (target.dashTime > 0) this.perfectDodge(target);
          projectile.dead = true;
        }
        continue;
      }

      const summon = this.summons.find((unit) => !unit.dead && unit.team !== projectile.team && !projectile.hitIds.has(unit.id) && distance(unit, projectile) < unit.r + projectile.r);
      if (summon) {
        projectile.hitIds.add(summon.id);
        this.damageSummon(summon, projectile.damage, projectile.owner);
        if (projectile.pierce > 0) projectile.pierce -= 1;
        else this.expireProjectile(projectile);
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
  }

  private expireProjectile(projectile: Projectile) {
    if (projectile.dead) return;
    projectile.dead = true;
    if (projectile.kind === "vial") {
      this.withUltimateContext(projectile.ultimateCastId, () => {
        this.addZone({
          kind: "poison",
          owner: projectile.owner,
          team: projectile.team,
          x: projectile.x,
          y: projectile.y,
          r: 50,
          life: 2,
          damage: 3,
          tickRate: 0.65,
          activeAfter: 0,
          color: "#9aea64",
          slow: 0.28,
        });
      });
    }
    this.burst(projectile.x, projectile.y, projectile.color, projectile.kind === "arrow" ? 4 : 7, 95, projectile.kind === "arrow" ? "shard" : "circle");
  }

  private addDot(target: Fighter, type: Dot["type"], damage: number, time: number, owner: Fighter, ultimateCastId?: number) {
    const current = target.dots.find((dotEffect) => dotEffect.type === type && dotEffect.owner === owner);
    if (current) {
      current.time = Math.max(current.time, time);
      current.damage = Math.max(current.damage, damage);
      if (ultimateCastId !== undefined) {
        current.ultimateCastId = ultimateCastId;
        current.ultimateTime = Math.max(current.ultimateTime ?? 0, time);
      }
    } else {
      target.dots.push({
        type,
        damage,
        time,
        tick: 0.5,
        owner,
        ultimateCastId,
        ultimateTime: ultimateCastId === undefined ? undefined : time,
      });
    }
  }

  private damageFighter(
    target: Fighter,
    amount: number,
    source: Fighter,
    options: { color?: string; critical?: boolean; bypassInvulnerability?: boolean; quiet?: boolean; neutral?: boolean } = {},
  ) {
    const bossPhaseProtected = target.champion.id === "overlord" && target.invulnerable > 0 && target.stun > 0;
    if (target.dead || target.spawnGrace > 0 || bossPhaseProtected || (target.invulnerable > 0 && !options.bypassInvulnerability)) return false;
    const creditedSource = !options.neutral;
    let finalDamage = amount * (creditedSource ? this.outgoingDamageScale(source) : 1);
    if (target.shield > 0) finalDamage *= 0.64;
    if (creditedSource && target.champion.id === "bulwark" && target.shield > 0) {
      const incoming = angleTo(target, source);
      const difference = Math.abs(Math.atan2(Math.sin(incoming - target.angle), Math.cos(incoming - target.angle)));
      if (difference < 1.15) finalDamage *= 0.7;
    }
    finalDamage = Math.max(0.5, finalDamage);
    const appliedDamage = Math.min(target.hp, finalDamage);
    target.hp = Math.max(0, target.hp - appliedDamage);
    target.hitFlash = 1;
    if (creditedSource) {
      source.stats.damage += appliedDamage;
      source.ultimate = clamp(source.ultimate + appliedDamage * 0.17 * this.ultimateGainScale(source), 0, 100);
      target.lastAttackerId = source.id;
      target.threatTime = 1.4;
      if (target.faction === "boss" && source.faction !== "boss") this.bossDamage[source.team] += appliedDamage;
    }
    target.ultimate = clamp(target.ultimate + appliedDamage * 0.09 * (creditedSource ? this.ultimateGainScale(target) : 1), 0, 100);
    this.text(target.x + (Math.random() - 0.5) * 18, target.y - target.r - 14, `${Math.round(appliedDamage)}`, options.critical ? "#f6df72" : "#f2eee3", options.critical ? 21 : 16);
    this.burst(target.x, target.y, options.color || source.champion.accent, options.critical ? 18 : 8, options.critical ? 260 : 145, options.critical ? "shard" : "spark");
    this.audio.play("hit");
    if (!options.quiet) {
      this.shake = Math.max(this.shake, this.options.reducedMotion ? 0 : clamp(appliedDamage / 5, 1.5, 7));
      if (options.critical) this.hitStop = Math.max(this.hitStop, this.options.reducedMotion ? 0 : 0.055);
    }
    if (target.hp <= 0) {
      target.dead = true;
      target.respawn = this.options.rule === "boss" && target.faction !== "boss" ? 4.5 : 2.7;
      target.aimTargetId = null;
      target.manualTargetTime = 0;
      if (creditedSource) source.stats.kills += 1;
      this.burst(target.x, target.y, target.champion.accent, 44, 360, "shard");
      if (this.options.rule === "duel") this.endRound(source.team);
      else if (this.options.rule === "dominion" && creditedSource) {
        this.objective[source.team] = clamp(this.objective[source.team] + 4, 0, 100);
        this.announce(`${source.team === "red" ? "RUBRO" : "AZUL"} +4 DOMÍNIO`, 0.9);
        if (this.objective[source.team] >= 100) this.finishMatch(source.team);
      } else if (this.options.rule === "boss") {
        if (target.faction === "boss") {
          const winner = this.bossDamage.red === this.bossDamage.blue
            ? source.team
            : this.bossDamage.red > this.bossDamage.blue ? "red" : "blue";
          this.announce(`MALAKAR CAIU // ${winner === "red" ? "P1" : "P2"} LIDERA`, 1.5);
          this.finishMatch(winner);
        } else {
          this.announce(`${target.team === "red" ? "P1" : "P2"} CAIU // RETORNO EM 4.5s`, 1.1);
        }
      }
    }
    return true;
  }

  private damageCover(cover: Cover, amount: number, source: Fighter) {
    if (!cover.destructible || cover.dead) return;
    cover.hp -= amount;
    this.burst(clamp(source.x, cover.x, cover.x + cover.w), clamp(source.y, cover.y, cover.y + cover.h), "#c9b88b", 5, 110, "shard");
    if (cover.hp <= 0) {
      cover.dead = true;
      this.burst(cover.x + cover.w / 2, cover.y + cover.h / 2, "#c9b88b", 30, 280, "shard");
      this.shake = Math.max(this.shake, this.options.reducedMotion ? 0 : 5);
      this.text(cover.x + cover.w / 2, cover.y - 18, "COBERTURA ROMPIDA", "#e2c75d", 15);
    }
  }

  private damageSummon(summon: Summon, amount: number, source: Fighter) {
    summon.hp -= amount;
    source.stats.damage += amount * 0.35;
    this.burst(summon.x, summon.y, summon.owner.champion.accent, 6, 120, "shard");
    if (summon.hp <= 0) summon.dead = true;
  }

  private performSpecial(fighter: Fighter) {
    if (fighter.specialCd > 0 || fighter.dead || this.cinematic) return;
    fighter.specialCd = this.specialCooldownDuration(fighter);
    fighter.stealth = 0;
    this.startCinematic(fighter, "special", fighter.champion.specialName, fighter.champion.role, () => this.executeSpecial(fighter));
  }

  private performUltimate(fighter: Fighter) {
    if (fighter.ultimate < 99.5 || fighter.dead || this.cinematic || this.isUltimateActive(fighter)) return;
    const castId = this.nextId++;
    fighter.ultimateCastId = castId;
    fighter.ultimate = 0;
    fighter.stealth = 0;
    this.startCinematic(
      fighter,
      "ultimate",
      fighter.champion.ultimateName,
      fighter.champion.epithet,
      () => this.withUltimateContext(castId, () => this.executeUltimate(fighter)),
    );
  }

  private startCinematic(fighter: Fighter, kind: Cinematic["kind"], title: string, subtitle: string, execute: () => void) {
    const reduced = this.options.reducedMotion;
    const duration = reduced ? (kind === "ultimate" ? 0.34 : 0.18) : kind === "ultimate" ? 0.98 : 0.34;
    const executeAt = reduced ? duration * 0.55 : kind === "ultimate" ? 0.68 : 0.15;
    this.cinematic = { owner: fighter, kind, title, subtitle, time: 0, duration, executeAt, executed: false, execute };
    this.audio.play(kind);
    this.shake = Math.max(this.shake, kind === "ultimate" && !reduced ? 5 : 0);
    this.callbacks.onAnnouncement(`${kind === "ultimate" ? "ULTIMATE" : "ESPECIAL"}: ${title}`);
  }

  private updateCinematic(dt: number) {
    if (!this.cinematic) return;
    this.cinematic.time += dt;
    if (!this.cinematic.executed && this.cinematic.time >= this.cinematic.executeAt) {
      this.cinematic.executed = true;
      this.cinematic.execute();
    }
    if (this.cinematic.time >= this.cinematic.duration) this.cinematic = null;
  }

  private executeSpecial(fighter: Fighter) {
    if (fighter.dead) return;
    const enemy = this.opponent(fighter);
    const id = fighter.champion.id;
    if (id === "cinder") {
      for (let index = -3; index <= 3; index += 1) {
        this.spawnProjectile(fighter, fighter.angle + index * 0.105, {
          damage: 12,
          speed: 590,
          life: 0.72,
          r: 9,
          kind: "fire",
          color: fighter.champion.accent,
          burn: 2.1,
          wallDamage: 11,
        });
      }
      for (let step = 1; step <= 3; step += 1) {
        this.addZone({
          kind: "fire",
          owner: fighter,
          team: fighter.faction,
          x: fighter.x + Math.cos(fighter.angle) * step * 82,
          y: fighter.y + Math.sin(fighter.angle) * step * 82,
          r: 45,
          life: 3.2,
          damage: 5,
          tickRate: 0.5,
          activeAfter: 0,
          color: "#ff6b35",
          slow: 0,
        });
      }
    } else if (id === "ranger") {
      this.moveFighter(fighter, -Math.cos(fighter.angle) * 95, -Math.sin(fighter.angle) * 95);
      fighter.invulnerable = 0.18;
      const lead = { x: enemy.x + enemy.vx * 0.3, y: enemy.y + enemy.vy * 0.3 };
      for (let index = 0; index < 6; index += 1) {
        this.schedule(index * 0.11, () => {
          if (enemy.dead) return;
          const angle = index * 2.4;
          const x = clamp(lead.x + Math.cos(angle) * (35 + index * 10), EDGE + 30, WORLD_WIDTH - EDGE - 30);
          const y = clamp(lead.y + Math.sin(angle) * (28 + index * 8), EDGE + 30, WORLD_HEIGHT - EDGE - 30);
          this.warningStrike("arrow-rain", fighter, x, y, 33, 0.38, 15, "#9ee493");
        });
      }
    } else if (id === "bulwark") {
      fighter.shield = 3;
      fighter.invulnerable = 0.2;
      this.hitCircle(fighter, fighter.x, fighter.y, 112, 22, { color: "#f1b94b", knockback: 68, stun: 0.28 });
      this.addZone({ kind: "rift", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 118, life: 0.45, damage: 0, tickRate: 1, activeAfter: 0, color: "#f1b94b", slow: 0 });
      this.burst(fighter.x, fighter.y, "#f1b94b", 28, 260, "shard");
    } else if (id === "wraith") {
      const behind = {
        x: enemy.x - Math.cos(enemy.angle) * 86,
        y: enemy.y - Math.sin(enemy.angle) * 86,
      };
      const point = this.findSafePoint(behind.x, behind.y, fighter.r);
      const old = { x: fighter.x, y: fighter.y };
      fighter.x = point.x;
      fighter.y = point.y;
      fighter.angle = angleTo(fighter, enemy);
      fighter.stealth = 2.2;
      fighter.invulnerable = 0.18;
      enemy.marked = 4.2;
      this.lightning(old, fighter, "#c7a6ff");
      this.slash(fighter.x, fighter.y, fighter.angle, "#ff6db4", 120);
      if (distance(fighter, enemy) < 130) this.damageFighter(enemy, 24, fighter, { color: "#ff6db4", critical: true });
    } else if (id === "chrono") {
      const snapshot = [...fighter.history].reverse().find((entry) => entry.at <= this.elapsed - 1.9) || fighter.history[0];
      const old = { x: fighter.x, y: fighter.y };
      if (snapshot) {
        fighter.x = snapshot.x;
        fighter.y = snapshot.y;
        fighter.hp = Math.max(fighter.hp, Math.min(fighter.hpMax, snapshot.hp));
      }
      this.lightning(old, fighter, "#f6df72");
      this.explosion(old.x, old.y, 105, 23, fighter, "#66e0ff", 0.9);
      fighter.haste = 1.5;
    } else if (id === "storm") {
      const direction = { x: Math.cos(fighter.angle), y: Math.sin(fighter.angle) };
      fighter.dashTime = 0.32;
      fighter.dashVx = direction.x * 1040;
      fighter.dashVy = direction.y * 1040;
      fighter.invulnerable = 0.35;
      for (let index = 1; index <= 4; index += 1) {
        this.schedule(index * 0.06, () => {
          this.addZone({ kind: "storm", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 48, life: 1.25, damage: 6, tickRate: 0.28, activeAfter: 0, color: "#67f5eb", slow: 0.25 });
        });
      }
    } else if (id === "necromancer") {
      [-1, 1].forEach((side) => this.spawnSummon(fighter, "wisp", fighter.x - Math.sin(fighter.angle) * side * 58, fighter.y + Math.cos(fighter.angle) * side * 58));
      this.addZone({ kind: "rift", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 92, life: 0.7, damage: 0, tickRate: 1, activeAfter: 0, color: "#b491e8", slow: 0 });
    } else if (id === "alchemist") {
      [-0.22, 0, 0.22].forEach((offset, index) => this.spawnProjectile(fighter, fighter.angle + offset, {
        damage: index === 1 ? 20 : 14,
        speed: 680,
        life: 1.02,
        r: index === 1 ? 11 : 9,
        kind: "vial",
        color: index === 1 ? "#f6c453" : "#9aea64",
        poison: 2.2,
        wallDamage: 8,
      }));
    }
    this.burst(fighter.x, fighter.y, fighter.champion.accent, 18, 210, "spark");
  }

  private executeUltimate(fighter: Fighter) {
    if (fighter.dead) return;
    const enemy = this.opponent(fighter);
    const id = fighter.champion.id;
    fighter.ultimateDirectTime = Math.max(fighter.ultimateDirectTime, ULTIMATE_DIRECT_EFFECT_TIME[id] ?? 0);
    this.shake = Math.max(this.shake, this.options.reducedMotion ? 0 : 11);
    this.burst(fighter.x, fighter.y, fighter.champion.accent, 42, 380, "shard");
    if (id === "cinder") {
      const center = { x: enemy.x + enemy.vx * 0.45, y: enemy.y + enemy.vy * 0.45 };
      for (let index = 0; index < 13; index += 1) {
        this.schedule(index * 0.12, () => {
          const spiral = index * 2.23;
          const radius = 35 + (index % 6) * 32;
          const x = clamp(center.x + Math.cos(spiral) * radius, EDGE + 45, WORLD_WIDTH - EDGE - 45);
          const y = clamp(center.y + Math.sin(spiral) * radius * 0.72, EDGE + 45, WORLD_HEIGHT - EDGE - 45);
          this.warningStrike("meteor", fighter, x, y, 58, 0.52, 27, "#ff6b35");
        });
      }
    } else if (id === "ranger") {
      const center = { x: enemy.x, y: enemy.y };
      for (let index = 0; index < 16; index += 1) {
        this.schedule(index * 0.075, () => {
          const angle = index * 2.4;
          const radius = 50 + (index % 5) * 42;
          this.warningStrike("arrow-rain", fighter, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius * 0.68, 30, 0.3, 14, "#9ee493");
        });
      }
      this.schedule(1.05, () => {
        this.spawnProjectile(fighter, angleTo(fighter, enemy), { damage: 52, speed: 1240, life: 1.35, r: 12, kind: "arrow", color: "#f0e6a6", pierce: 4, wallDamage: 90 });
        this.slash(fighter.x, fighter.y, angleTo(fighter, enemy), "#f0e6a6", 240);
      });
    } else if (id === "bulwark") {
      fighter.colossus = 1.2;
      fighter.shield = 3;
      fighter.invulnerable = 0.4;
      fighter.dashTime = 1.08;
      fighter.dashVx = Math.cos(fighter.angle) * 920;
      fighter.dashVy = Math.sin(fighter.angle) * 920;
      this.addZone({ kind: "rift", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 145, life: 1.2, damage: 16, tickRate: 0.24, activeAfter: 0, color: "#f1b94b", slow: 0.38, followId: fighter.id });
    } else if (id === "wraith") {
      fighter.stealth = 2.6;
      for (let index = 0; index < 4; index += 1) {
        this.schedule(index * 0.24, () => {
          if (fighter.dead || enemy.dead) return;
          const angle = index * Math.PI * 0.72 + enemy.angle;
          const point = this.findSafePoint(enemy.x + Math.cos(angle) * 82, enemy.y + Math.sin(angle) * 82, fighter.r);
          const old = { x: fighter.x, y: fighter.y };
          fighter.x = point.x;
          fighter.y = point.y;
          fighter.angle = angleTo(fighter, enemy);
          fighter.invulnerable = 0.18;
          this.lightning(old, fighter, index % 2 ? "#ff6db4" : "#c7a6ff");
          this.slash(fighter.x, fighter.y, fighter.angle, "#f2eee3", 150);
          if (distance(fighter, enemy) < 145) this.damageFighter(enemy, index === 3 ? 35 : 22, fighter, { color: "#ff6db4", critical: index === 3 });
        });
      }
    } else if (id === "chrono") {
      const snapshot = fighter.history[0];
      if (snapshot) {
        fighter.x = snapshot.x;
        fighter.y = snapshot.y;
        fighter.hp = Math.max(fighter.hp, snapshot.hp);
      }
      enemy.slow = Math.max(enemy.slow, 3.6);
      fighter.haste = 4;
      this.addZone({ kind: "time", owner: fighter, team: fighter.faction, x: enemy.x, y: enemy.y, r: 210, life: 4.2, damage: 5, tickRate: 0.45, activeAfter: 0, color: "#f6df72", slow: 1.2 });
      for (let index = 0; index < 20; index += 1) {
        const angle = (index / 20) * TAU;
        this.spawnProjectile(fighter, angle, { damage: 11, speed: 520, life: 1.3, r: 7, kind: "time", color: index % 2 ? "#f6df72" : "#66e0ff", pierce: 1, slow: 0.65, wallDamage: 4 });
      }
    } else if (id === "storm") {
      fighter.stormAura = 5.2;
      fighter.haste = 5.2;
      this.addZone({ kind: "storm", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 148, life: 5.2, damage: 4, tickRate: 0.5, activeAfter: 0, color: "#67f5eb", slow: 0.2, followId: fighter.id });
      for (let index = 0; index < 10; index += 1) this.schedule(index * 0.12, () => this.lightning(fighter, { x: fighter.x + (Math.random() - 0.5) * 300, y: fighter.y + (Math.random() - 0.5) * 300 }, "#67f5eb"));
    } else if (id === "necromancer") {
      this.spawnSummon(fighter, "titan", fighter.x + Math.cos(fighter.angle) * 105, fighter.y + Math.sin(fighter.angle) * 105);
      for (let index = 0; index < 3; index += 1) this.schedule(index * 0.35, () => this.spawnSummon(fighter, "wisp", fighter.x + (Math.random() - 0.5) * 120, fighter.y + (Math.random() - 0.5) * 120));
      this.addZone({ kind: "rift", owner: fighter, team: fighter.faction, x: fighter.x, y: fighter.y, r: 185, life: 5.8, damage: 4, tickRate: 0.55, activeAfter: 0, color: "#b491e8", slow: 0.3 });
    } else if (id === "alchemist") {
      const center = {
        x: clamp(enemy.x, EDGE + 210, WORLD_WIDTH - EDGE - 210),
        y: clamp(enemy.y, EDGE + 210, WORLD_HEIGHT - EDGE - 210),
      };
      const rotation = angleTo(fighter, enemy) + Math.PI / 4;
      const miniPositions = Array.from({ length: 4 }, (_, index) => {
        const angle = rotation + index * TAU / 4;
        return {
          x: clamp(center.x + Math.cos(angle) * 185, EDGE + 58, WORLD_WIDTH - EDGE - 58),
          y: clamp(center.y + Math.sin(angle) * 185, EDGE + 58, WORLD_HEIGHT - EDGE - 58),
        };
      });
      this.addZone({ kind: "poison", owner: fighter, team: fighter.faction, x: center.x, y: center.y, r: 210, life: 5.4, damage: 5, tickRate: 0.55, activeAfter: 0.35, color: "#9aea64", slow: 0.3 });
      for (let index = 0; index < miniPositions.length; index += 1) {
        const point = miniPositions[index];
        this.schedule(index * 0.25, () => {
          this.addZone({ kind: "poison", owner: fighter, team: fighter.faction, x: point.x, y: point.y, r: 58, life: 2.35, damage: 2.4, tickRate: 0.65, activeAfter: 0, color: "#9aea64", slow: 0.18 });
        });
      }
    }
  }

  private warningStrike(kind: "meteor" | "arrow-rain", owner: Fighter, x: number, y: number, radius: number, warning: number, damage: number, color: string) {
    const safeX = clamp(x, EDGE + radius, WORLD_WIDTH - EDGE - radius);
    const safeY = clamp(y, EDGE + radius, WORLD_HEIGHT - EDGE - radius);
    this.addZone({
      kind,
      owner,
      team: owner.faction,
      x: safeX,
      y: safeY,
      r: radius,
      life: warning,
      damage: 0,
      warningDamage: damage,
      tickRate: 1,
      activeAfter: warning,
      color,
      slow: 0,
      onExpire: () => this.explosion(safeX, safeY, radius, damage, owner, color, 0.25),
    });
  }

  private findSafePoint(x: number, y: number, radius: number) {
    const start = { x: clamp(x, EDGE + radius, WORLD_WIDTH - EDGE - radius), y: clamp(y, EDGE + radius, WORLD_HEIGHT - EDGE - radius) };
    if (this.canStand(start.x, start.y, radius)) return start;
    for (let ring = 1; ring <= 5; ring += 1) {
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * TAU;
        const point = { x: start.x + Math.cos(angle) * ring * 32, y: start.y + Math.sin(angle) * ring * 32 };
        if (this.canStand(point.x, point.y, radius)) return point;
      }
    }
    return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
  }

  private addZone(zone: Omit<Zone, "id" | "maxLife" | "tick" | "dead">) {
    this.zones.push({
      ...zone,
      id: this.nextId++,
      maxLife: zone.life,
      tick: 0,
      ultimateCastId: zone.ultimateCastId ?? this.activeUltimateCastId ?? undefined,
      dead: false,
    });
  }

  private updateZones(dt: number) {
    for (const zone of this.zones) {
      if (zone.dead) continue;
      const followed = zone.followId ? [...this.fighters, ...this.summons].find((entity) => entity.id === zone.followId) : null;
      if (followed && !followed.dead) {
        zone.x = followed.x;
        zone.y = followed.y;
      }
      zone.life -= dt;
      const age = zone.maxLife - zone.life;
      zone.tick -= dt;
      if (age >= zone.activeAfter && zone.tick <= 0) {
        zone.tick = zone.tickRate;
        for (const fighter of this.fighters) {
          if (fighter.dead || fighter.spawnGrace > 0 || distance(fighter, zone) > fighter.r + zone.r) continue;
          if (zone.kind === "time" && zone.owner === null) {
            if (this.clockworkHaste) fighter.haste = Math.max(fighter.haste, 0.45);
            else fighter.slow = Math.max(fighter.slow, 0.38);
            continue;
          }
          if (zone.kind === "heal") {
            fighter.hp = clamp(fighter.hp + 8, 0, fighter.hpMax);
            continue;
          }
          if (zone.team !== null && zone.team === fighter.faction) continue;
          if (zone.damage > 0 && zone.owner) {
            const hit = this.damageFighter(fighter, zone.damage, zone.owner, { color: zone.color, bypassInvulnerability: true, quiet: true });
            if (hit && zone.kind === "fire") this.addDot(fighter, "burn", 2.2, 1.4, zone.owner, zone.ultimateCastId);
            if (hit && zone.kind === "poison") this.addDot(fighter, "poison", 2.4, 1.6, zone.owner, zone.ultimateCastId);
          } else if (zone.damage > 0) {
            const surrogate = this.opponent(fighter);
            this.damageFighter(fighter, zone.damage, surrogate, { color: zone.color, bypassInvulnerability: true, quiet: true, neutral: true });
          }
          if (zone.slow > 0) fighter.slow = Math.max(fighter.slow, zone.slow);
        }
      }
      if (zone.life <= 0) {
        zone.dead = true;
        const expire = zone.onExpire;
        zone.onExpire = undefined;
        if (expire) this.withUltimateContext(zone.ultimateCastId, expire);
      }
    }
    this.zones = this.zones.filter((zone) => !zone.dead);
  }

  private updateArena(dt: number) {
    if (this.options.rule === "boss") return;
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = 8.5 + Math.random() * 3;
      this.spawnPickup();
    }
    this.arenaEventTimer -= dt;
    if (this.arenaEventTimer <= 0) {
      if (this.options.arena === "forge") {
        this.arenaEventTimer = 9.5;
        const horizontal = Math.random() > 0.5;
        const tracks = [-1, 0, 1];
        for (const track of tracks) {
          const x = horizontal ? WORLD_WIDTH / 2 + track * 310 : WORLD_WIDTH / 2;
          const y = horizontal ? WORLD_HEIGHT / 2 : WORLD_HEIGHT / 2 + track * 190;
          this.addZone({ kind: "vent", owner: null, team: null, x, y, r: track === 0 ? 74 : 58, life: 4.2, damage: 13, tickRate: 0.48, activeAfter: 1.05, color: "#ff7445", slow: 0.25 });
        }
        this.announce("FORJA: RESPIRADOUROS ARMADOS", 1.1);
      } else if (this.options.arena === "clockwork") {
        this.arenaEventTimer = 11.5;
        this.clockworkHaste = !this.clockworkHaste;
        const points = [
          { x: WORLD_WIDTH / 2 - 270, y: WORLD_HEIGHT / 2 },
          { x: WORLD_WIDTH / 2 + 270, y: WORLD_HEIGHT / 2 },
        ];
        points.forEach((point) => this.addZone({ kind: "time", owner: null, team: null, x: point.x, y: point.y, r: 102, life: 10.8, damage: 0, tickRate: 0.12, activeAfter: 0.6, color: this.clockworkHaste ? "#f6df72" : "#a28cff", slow: this.clockworkHaste ? 0 : 0.35 }));
        this.announce(this.clockworkHaste ? "RELÓGIO: FASE DE ACELERAÇÃO" : "RELÓGIO: FASE DE DILATAÇÃO", 1.1);
      } else {
        this.arenaEventTimer = 10.5;
        this.addZone({ kind: "rift", owner: null, team: null, x: this.objective.x, y: this.objective.y, r: 118, life: 1.2, damage: 0, tickRate: 1, activeAfter: 0, color: "#6fd8d1", slow: 0 });
        if (this.pickups.length < 2) this.spawnPickup("core", this.objective.x, this.objective.y);
        this.announce("PULSO DA FENDA: NÚCLEO MATERIALIZADO", 1.1);
      }
    }
  }

  private updateObjective(dt: number) {
    if (this.options.rule === "dominion") {
      for (const node of this.dominionNodes) {
        node.locked = Math.max(0, node.locked - dt);
        const occupants = this.fighters.filter((fighter) => !fighter.dead && distance(fighter, node) < node.r - 3);
        const redInside = occupants.some((fighter) => fighter.team === "red");
        const blueInside = occupants.some((fighter) => fighter.team === "blue");
        if (redInside && !blueInside) {
          node.capture = clamp(node.capture + dt * (node.owner === "blue" ? 28 : 34), -100, 100);
          this.player("red").controlTime += dt;
        } else if (blueInside && !redInside) {
          node.capture = clamp(node.capture - dt * (node.owner === "red" ? 28 : 34), -100, 100);
          this.player("blue").controlTime += dt;
        }
        if (node.capture >= 99) node.owner = "red";
        else if (node.capture <= -99) node.owner = "blue";
        else if ((node.owner === "red" && node.capture <= 0) || (node.owner === "blue" && node.capture >= 0)) node.owner = null;
        const safeControl = node.owner === "red" ? !blueInside : node.owner === "blue" ? !redInside : false;
        if (node.owner && safeControl) this.objective[node.owner] = clamp(this.objective[node.owner] + dt * 0.9, 0, 100);
      }
      if (this.objective.red >= 100 || this.objective.blue >= 100) {
        this.finishMatch(this.objective.red >= this.objective.blue ? "red" : "blue");
      }
      return;
    }
    if (this.options.rule === "boss") return;
    if (this.roundElapsed > 68 && !this.suddenDeath) {
      this.suddenDeath = true;
      this.announce("RUPTURA: A ARENA ESTÁ COLAPSANDO", 1.8);
    }
    if (this.suddenDeath) {
      this.stormRadius = Math.max(235, this.stormRadius - dt * 21);
      const tick = Math.floor(this.roundElapsed * 5) !== Math.floor((this.roundElapsed - dt) * 5);
      if (tick) {
        for (const fighter of this.fighters) {
          if (!fighter.dead && Math.hypot(fighter.x - WORLD_WIDTH / 2, fighter.y - WORLD_HEIGHT / 2) > this.stormRadius) {
            this.damageFighter(fighter, 3.2, this.opponent(fighter), { color: "#b86cff", bypassInvulnerability: true, quiet: true, neutral: true });
          }
        }
      }
    }
  }

  private spawnPickup(forcedType?: Pickup["type"], forcedX?: number, forcedY?: number) {
    const types: Pickup["type"][] = ["core", "repair", "overdrive"];
    const type = forcedType || types[Math.floor(Math.random() * types.length)];
    let x = forcedX ?? WORLD_WIDTH / 2 + (Math.random() - 0.5) * WORLD_WIDTH * 0.62;
    let y = forcedY ?? WORLD_HEIGHT / 2 + (Math.random() - 0.5) * WORLD_HEIGHT * 0.64;
    const safe = this.findSafePoint(x, y, 24);
    x = safe.x;
    y = safe.y;
    this.pickups.push({ id: this.nextId++, x, y, type, life: 13, pulse: Math.random() * TAU });
  }

  private updatePickups(dt: number) {
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      pickup.pulse += dt * 3.2;
      for (const fighter of this.fighters) {
        if (fighter.dead || pickup.life <= 0 || distance(fighter, pickup) > fighter.r + 25) continue;
        pickup.life = 0;
        fighter.stats.cores += 1;
        if (pickup.type === "core") fighter.ultimate = clamp(fighter.ultimate + 28 * this.ultimateGainScale(fighter), 0, 100);
        if (pickup.type === "repair") {
          const restored = Math.min(54, fighter.hpMax - fighter.hp);
          fighter.hp += restored;
          this.text(fighter.x, fighter.y - 42, `+${Math.round(restored)} VIDA`, "#8ee3a2", 17);
        }
        if (pickup.type === "overdrive") {
          fighter.haste = Math.max(fighter.haste, 4.2);
          fighter.specialCd = Math.max(0, fighter.specialCd - 3.2);
        }
        this.burst(pickup.x, pickup.y, pickup.type === "repair" ? "#8ee3a2" : pickup.type === "overdrive" ? "#67f5eb" : "#f6df72", 28, 280, "spark");
        this.audio.play("core");
      }
    }
    this.pickups = this.pickups.filter((pickup) => pickup.life > 0);
  }

  private spawnSummon(owner: Fighter, kind: Summon["kind"], x: number, y: number) {
    const radius = kind === "titan" ? 35 : 17;
    const point = this.findSafePoint(x, y, radius);
    this.summons.push({
      id: this.nextId++,
      owner,
      team: owner.faction,
      kind,
      x: point.x,
      y: point.y,
      r: radius,
      hp: kind === "titan" ? 190 : 48,
      hpMax: kind === "titan" ? 190 : 48,
      life: kind === "titan" ? 11 : 7.5,
      attackCd: 0.45 + Math.random() * 0.4,
      dead: false,
      ultimateCastId: this.activeUltimateCastId ?? undefined,
    });
    this.burst(point.x, point.y, owner.champion.accent, kind === "titan" ? 28 : 14, 210, "shard");
  }

  private updateSummons(dt: number) {
    for (const summon of this.summons) {
      if (summon.dead) continue;
      summon.life -= dt;
      summon.attackCd -= dt;
      if (summon.life <= 0) {
        summon.dead = true;
        continue;
      }
      const target = this.opponent(summon.owner);
      if (target.dead) continue;
      const d = distance(summon, target);
      if (summon.kind === "wisp" && d > 245) {
        const direction = normalize(target.x - summon.x, target.y - summon.y);
        const nx = summon.x + direction.x * 126 * dt;
        const ny = summon.y + direction.y * 126 * dt;
        if (this.canStand(nx, summon.y, summon.r)) summon.x = nx;
        if (this.canStand(summon.x, ny, summon.r)) summon.y = ny;
      }
      const range = summon.kind === "titan" ? 660 : 430;
      if (summon.attackCd <= 0 && d < range && this.hasLine(summon, target)) {
        summon.attackCd = summon.kind === "titan" ? 0.72 : 1.15;
        const angle = angleTo(summon, target);
        this.spawnProjectile(summon.owner, angle, {
          x: summon.x,
          y: summon.y,
          damage: summon.kind === "titan" ? 18 : 8,
          speed: summon.kind === "titan" ? 560 : 470,
          life: range / (summon.kind === "titan" ? 560 : 470),
          r: summon.kind === "titan" ? 10 : 6,
          kind: "bone",
          color: summon.owner.champion.accent,
          pierce: summon.kind === "titan" ? 1 : 0,
          wallDamage: summon.kind === "titan" ? 20 : 5,
          ultimateCastId: summon.ultimateCastId,
        });
      }
    }
    this.summons = this.summons.filter((summon) => !summon.dead);
  }

  private hitCircle(owner: Fighter, x: number, y: number, radius: number, damage: number, options: { color: string; knockback?: number; stun?: number }) {
    for (const target of this.hostileFighters(owner)) {
      if (distance(target, { x, y }) >= radius + target.r) continue;
      this.damageFighter(target, damage, owner, { color: options.color });
      const direction = normalize(target.x - x, target.y - y);
      if (options.knockback) this.moveFighter(target, direction.x * options.knockback, direction.y * options.knockback);
      if (options.stun) target.stun = Math.max(target.stun, options.stun);
    }
    for (const summon of this.summons) {
      if (!summon.dead && summon.team !== owner.faction && distance(summon, { x, y }) < radius + summon.r) this.damageSummon(summon, damage, owner);
    }
  }

  private explosion(x: number, y: number, radius: number, damage: number, owner: Fighter, color: string, slow = 0) {
    this.hitCircle(owner, x, y, radius, damage, { color, knockback: radius * 0.18 });
    if (slow) {
      for (const target of this.hostileFighters(owner)) {
        if (distance(target, { x, y }) < radius + target.r) target.slow = Math.max(target.slow, slow);
      }
    }
    this.burst(x, y, color, Math.round(radius / 2), Math.min(390, radius * 4), "shard");
    this.addZone({ kind: "rift", owner, team: owner.faction, x, y, r: radius, life: 0.35, damage: 0, tickRate: 1, activeAfter: 0, color, slow: 0 });
    this.shake = Math.max(this.shake, this.options.reducedMotion ? 0 : clamp(radius / 12, 3, 10));
  }

  private updateParticles(dt: number) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z = Math.max(0, particle.z + particle.vz * dt);
      particle.vz -= 180 * dt;
      particle.vx *= Math.pow(0.08, dt);
      particle.vy *= Math.pow(0.08, dt);
    }
    if (this.particles.length > 850) this.particles.splice(0, this.particles.length - 850);
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private particle(x: number, y: number, color: string, size: number, shape: Particle["shape"], minSpeed: number, maxSpeed: number) {
    const angle = Math.random() * TAU;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const life = 0.28 + Math.random() * 0.38;
    this.particles.push({ x, y, z: Math.random() * 12, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, vz: 40 + Math.random() * 130, life, maxLife: life, size: size * (0.55 + Math.random() * 0.75), color, shape });
  }

  private burst(x: number, y: number, color: string, count: number, speed: number, shape: Particle["shape"]) {
    for (let index = 0; index < count; index += 1) this.particle(x, y, color, 2 + Math.random() * 4, shape, speed * 0.25, speed);
  }

  private text(x: number, y: number, text: string, color: string, size: number) {
    this.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9, size });
  }

  private updateTexts(dt: number) {
    for (const text of this.texts) {
      text.life -= dt;
      text.y -= dt * 38;
    }
    this.texts = this.texts.filter((text) => text.life > 0);
  }

  private lightning(from: Vec, to: Vec, color: string) {
    const segments = 11;
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const x = lerp(from.x, to.x, t) + (index === 0 || index === segments ? 0 : (Math.random() - 0.5) * 22);
      const y = lerp(from.y, to.y, t) + (index === 0 || index === segments ? 0 : (Math.random() - 0.5) * 22);
      this.particles.push({ x, y, z: 8, vx: 0, vy: 0, vz: 0, life: 0.16, maxLife: 0.16, size: 3.5, color, shape: "spark" });
    }
  }

  private slash(x: number, y: number, angle: number, color: string, length: number) {
    const count = 14;
    for (let index = 0; index < count; index += 1) {
      const t = index / (count - 1);
      const curve = (t - 0.5) * 0.7;
      const a = angle + curve;
      const px = x + Math.cos(a) * length * (0.25 + t * 0.75);
      const py = y + Math.sin(a) * length * (0.25 + t * 0.75);
      this.particles.push({ x: px, y: py, z: 8, vx: 0, vy: 0, vz: 0, life: 0.21, maxLife: 0.21, size: 5 - t * 2, color, shape: "spark" });
    }
  }

  private pushHud() {
    this.hudTimer = 0.08;
    const red = this.player("red");
    const blue = this.player("blue");
    const raidBoss = this.boss();
    const fighterHud = (fighter: Fighter): FighterHud => ({
      name: fighter.champion.name,
      epithet: fighter.champion.epithet,
      accent: fighter.champion.accent,
      hp: fighter.hp,
      hpMax: fighter.hpMax,
      ultimate: fighter.ultimate,
      ultimateLocked: this.isUltimateActive(fighter),
      attack: fighter.attackCd,
      attackMax: this.attackCooldownDuration(fighter),
      special: fighter.specialCd,
      specialMax: this.specialCooldownDuration(fighter),
      dashes: fighter.dashCharges,
      dashCapacity: this.maxDashCharges(fighter),
      dashRecharge: fighter.dashCharges < this.maxDashCharges(fighter)
        ? Math.max(0, this.dashRechargeDuration(fighter) - fighter.dashRecharge)
        : 0,
      dashMax: this.dashRechargeDuration(fighter),
      status: fighter.dead
        ? this.options.rule === "dominion" || (this.options.rule === "boss" && fighter.faction !== "boss")
          ? `RETORNO ${Math.max(0, fighter.respawn).toFixed(1)}s`
          : "DERROTADO"
        : fighter.stun > 0
          ? "ATORDOADO"
          : fighter.shield > 0
            ? "ÉGIDE"
            : fighter.stealth > 0
              ? "OCULTO"
              : fighter.haste > 0
                ? "SOBRECARGA"
                : "PRONTO",
      isAi: this.isSoloBot(fighter),
    });
    const countdown = this.state === "countdown"
      ? this.countdown > 0.75
        ? `${Math.max(1, Math.ceil(this.countdown - 0.45))}`
        : "LUTE"
      : this.state === "round-over"
        ? this.roundWinner === "red" ? "RUBRO VENCEU" : "AZUL VENCEU"
        : "";
    this.callbacks.onHud({
      red: fighterHud(red),
      blue: fighterHud(blue),
      scoreRed: this.options.rule === "dominion" ? Math.round(this.objective.red) : this.options.rule === "boss" ? this.bossContributionPercent("red") : this.score.red,
      scoreBlue: this.options.rule === "dominion" ? Math.round(this.objective.blue) : this.options.rule === "boss" ? this.bossContributionPercent("blue") : this.score.blue,
      scoreTo: this.options.rule === "dominion" || this.options.rule === "boss" ? 100 : this.options.scoreTo,
      round: this.round,
      timer: this.roundElapsed,
      rule: this.options.rule,
      arenaName: ARENAS[this.options.arena].name,
      aiState: this.ai?.state || "HUMANO",
      aiSkill: this.ai?.skillRating || 0,
      countdown,
      objectiveRed: this.objective.red,
      objectiveBlue: this.objective.blue,
      suddenDeath: this.suddenDeath,
      bossHp: raidBoss?.hp ?? 0,
      bossHpMax: raidBoss?.hpMax ?? 1,
      bossPhase: this.options.rule === "boss" ? this.bossPhase : 0,
      dominionZones: this.dominionNodes.map((node) => ({ owner: node.owner, progress: node.capture })),
    });
  }

  private draw() {
    const ctx = this.ctx;
    const { dpr, scale, offsetX, offsetY } = this.viewport;
    configurePixelCanvas(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#030509";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const allowShake = this.options.settings.effects.screenShake && !this.options.reducedMotion;
    const shakeX = this.shake && allowShake ? Math.round((Math.random() - 0.5) * this.shake / 4) * 4 : 0;
    const shakeY = this.shake && allowShake ? Math.round((Math.random() - 0.5) * this.shake / 4) * 4 : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offsetX + shakeX), dpr * (offsetY + shakeY));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.clip();

    this.drawArenaFloor();
    this.drawObjective();
    for (const zone of this.zones) this.drawZone(zone);
    for (const pickup of this.pickups) this.drawPickup(pickup);

    const renderables: Array<{ y: number; draw: () => void }> = [];
    for (const cover of this.covers) if (!cover.dead) renderables.push({ y: cover.y + cover.h, draw: () => this.drawCover(cover) });
    for (const summon of this.summons) if (!summon.dead) renderables.push({ y: summon.y, draw: () => this.drawSummon(summon) });
    for (const fighter of this.fighters) if (!fighter.dead) renderables.push({ y: fighter.y, draw: () => this.drawFighter(fighter) });
    renderables.sort((a, b) => a.y - b.y).forEach((renderable) => renderable.draw());
    if (this.options.rule === "boss") this.drawSmartAimTargets();

    for (const projectile of this.projectiles) this.drawProjectile(projectile);
    for (const particle of this.particles) this.drawParticle(particle);
    for (const text of this.texts) this.drawText(text);
    if (this.suddenDeath) this.drawCollapse();
    if (this.debug) this.drawDebug();
    if (this.cinematic) this.drawCinematic(this.cinematic);
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const shadeStep = Math.max(8, Math.round(14 * dpr));
    for (let layer = 0; layer < 5; layer += 1) {
      ctx.fillStyle = `rgba(0,0,0,${0.06 + layer * 0.025})`;
      const inset = layer * shadeStep;
      ctx.fillRect(inset, inset, this.canvas.width - inset * 2, shadeStep);
      ctx.fillRect(inset, this.canvas.height - inset - shadeStep, this.canvas.width - inset * 2, shadeStep);
      ctx.fillRect(inset, inset + shadeStep, shadeStep, this.canvas.height - (inset + shadeStep) * 2);
      ctx.fillRect(this.canvas.width - inset - shadeStep, inset + shadeStep, shadeStep, this.canvas.height - (inset + shadeStep) * 2);
    }
  }

  private arenaPath(offsetY = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(92, 55 + offsetY);
    ctx.lineTo(WORLD_WIDTH - 92, 55 + offsetY);
    ctx.lineTo(WORLD_WIDTH - 42, 112 + offsetY);
    ctx.lineTo(WORLD_WIDTH - 42, WORLD_HEIGHT - 112 + offsetY);
    ctx.lineTo(WORLD_WIDTH - 92, WORLD_HEIGHT - 55 + offsetY);
    ctx.lineTo(92, WORLD_HEIGHT - 55 + offsetY);
    ctx.lineTo(42, WORLD_HEIGHT - 112 + offsetY);
    ctx.lineTo(42, 112 + offsetY);
    ctx.closePath();
  }

  private drawArenaFloor() {
    const ctx = this.ctx;
    const arena = this.options.arena;
    const pixelTheme = this.options.rule === "boss" ? "boss" : arena === "citadel" ? "boss" : arena;
    drawPixelArenaTiles(ctx, { width: WORLD_WIDTH, height: WORLD_HEIGHT, theme: pixelTheme, time: this.elapsed, tileSize: this.options.rule === "boss" ? 64 : 48 });
    drawPixelArenaBorder(ctx, { x: 42, y: 54, width: WORLD_WIDTH - 84, height: WORLD_HEIGHT - 108, corner: 54, color: ARENAS[arena].accent, secondary: "#fff0a8", thickness: 8 });
    if (this.options.rule === "boss") {
      for (const [x, y] of [[360, 162], [360, WORLD_HEIGHT - 240], [WORLD_WIDTH - 438, 162], [WORLD_WIDTH - 438, WORLD_HEIGHT - 240]]) {
        drawPixelUltimateSigil(ctx, { x: x + 39, y: y + 39, radius: 42, color: "#d95bff", secondary: "#ffcc66", phase: this.elapsed, style: "boss", alpha: 0.55 });
      }
      drawPixelTeamMarker(ctx, { x: 180, y: WORLD_HEIGHT * 0.68, radius: 58, team: "red", phase: this.elapsed, alpha: 0.46 });
      drawPixelTeamMarker(ctx, { x: 180, y: WORLD_HEIGHT * 0.32, radius: 58, team: "blue", phase: this.elapsed, alpha: 0.46 });
      return;
    }
    for (const team of ["red", "blue"] as Team[]) {
      const x = team === "red" ? 150 : WORLD_WIDTH - 150;
      drawPixelTeamMarker(ctx, { x, y: WORLD_HEIGHT / 2, radius: 72, team, phase: this.elapsed, alpha: 0.5 });
    }
  }

  private drawObjective() {
    const ctx = this.ctx;
    if (this.options.rule === "boss") return;
    if (this.options.rule === "dominion") {
      for (const node of this.dominionNodes) {
        drawPixelObjectiveZone(ctx, {
          x: node.x,
          y: node.y,
          radius: node.r,
          time: this.elapsed,
          owner: node.owner ?? "neutral",
          contested: this.fighters.filter((fighter) => !fighter.dead && distance(fighter, node) < node.r).length > 1,
          captureRatio: Math.abs(node.capture) / 100,
        });
      }
      return;
    }
    drawPixelObjectiveZone(ctx, {
      x: this.objective.x,
      y: this.objective.y,
      radius: this.objective.r,
      time: this.elapsed,
      owner: "neutral",
      contested: false,
      captureRatio: 0,
    });
    return;
    /* Legacy smooth duel marker kept unreachable as a compatibility fallback. */
    const x = this.objective.x;
    const y = this.objective.y;
    const pulse = 1 + Math.sin(this.elapsed * 2.2) * 0.035;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse * 0.72);
    ctx.fillStyle = "rgba(111,216,209,.035)";
    ctx.beginPath();
    ctx.arc(0, 0, this.objective.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(111,216,209,.24)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 14]);
    ctx.lineDashOffset = -this.elapsed * 24;
    ctx.beginPath();
    ctx.arc(0, 0, this.objective.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

  }

  private drawCover(cover: Cover) {
    const ctx = this.ctx;
    const health = cover.hp / cover.hpMax;
    const arenaAccent = ARENAS[this.options.arena].accent;
    drawPixelCover(ctx, {
      x: cover.x,
      y: cover.y,
      width: cover.w,
      height: cover.h,
      healthRatio: health,
      destructible: cover.destructible,
      accent: arenaAccent,
      id: cover.id,
      theme: this.options.rule === "boss" || this.options.arena === "citadel" ? "boss" : this.options.arena,
    });
    return;
    /* Legacy smooth cover kept unreachable as a compatibility fallback. */
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.42)";
    roundRect(ctx, cover.x + 7, cover.y + 17, cover.w, cover.h, 10);
    ctx.fill();
    ctx.fillStyle = cover.destructible ? "#151923" : "#10131b";
    roundRect(ctx, cover.x, cover.y + 12, cover.w, cover.h, 9);
    ctx.fill();
    const top = ctx.createLinearGradient(cover.x, cover.y, cover.x + cover.w, cover.y + cover.h);
    top.addColorStop(0, cover.destructible ? "#4a4d58" : "#343945");
    top.addColorStop(1, cover.destructible ? "#292d38" : "#1e222c");
    ctx.fillStyle = top;
    roundRect(ctx, cover.x, cover.y, cover.w, cover.h, 9);
    ctx.fill();
    ctx.strokeStyle = cover.destructible ? `rgba(215,168,74,${0.28 + health * 0.25})` : arenaAccent;
    ctx.globalAlpha = cover.destructible ? 1 : 0.42;
    ctx.lineWidth = 2.5;
    roundRect(ctx, cover.x, cover.y, cover.w, cover.h, 9);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(233,228,214,${0.08 + (1 - health) * 0.35})`;
    ctx.lineWidth = 2;
    if (cover.destructible && health < 0.75) {
      const cx = cover.x + cover.w * 0.55;
      const cy = cover.y + cover.h * 0.42;
      for (let branch = 0; branch < (health < 0.35 ? 6 : 3); branch += 1) {
        const angle = branch * 2.1 + cover.id;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * cover.w * 0.38, cy + Math.sin(angle) * cover.h * 0.36);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawZone(zone: Zone) {
    const ctx = this.ctx;
    const age = zone.maxLife - zone.life;
    const active = age >= zone.activeAfter;
    const ratio = clamp(zone.life / zone.maxLife, 0, 1);
    drawPixelZone(ctx, {
      x: zone.x,
      y: zone.y,
      radius: zone.r,
      color: zone.color,
      kind: zone.kind,
      lifeRatio: ratio,
      active,
      time: this.elapsed,
      id: zone.id,
    });
    return;
    /* Legacy smooth zone kept unreachable as a compatibility fallback. */
    ctx.save();
    ctx.translate(zone.x, zone.y);
    ctx.scale(1, 0.72);
    ctx.globalAlpha = active ? 0.19 + Math.sin(this.elapsed * 8 + zone.id) * 0.04 : 0.13 + Math.sin(this.elapsed * 12) * 0.05;
    ctx.fillStyle = zone.color;
    ctx.beginPath();
    ctx.arc(0, 0, zone.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = active ? 0.78 : 0.68;
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = active ? 3.5 : 2.5;
    if (!active || zone.kind === "meteor" || zone.kind === "arrow-rain" || zone.kind === "vent") {
      ctx.setLineDash(zone.kind === "vent" ? [22, 8] : [10, 8]);
      ctx.lineDashOffset = -this.elapsed * 36;
    }
    ctx.beginPath();
    ctx.arc(0, 0, zone.r * (active ? 1 : 0.82 + Math.sin(this.elapsed * 9) * 0.08), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    if (zone.kind === "fire" || zone.kind === "vent") {
      ctx.globalAlpha = 0.38;
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * TAU + zone.id;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * zone.r * 0.35, Math.sin(angle) * zone.r * 0.35);
        ctx.lineTo(Math.cos(angle + 0.18) * zone.r * 0.82, Math.sin(angle + 0.18) * zone.r * 0.82);
        ctx.stroke();
      }
    } else if (zone.kind === "poison") {
      ctx.globalAlpha = 0.4;
      for (let index = 0; index < 9; index += 1) {
        const angle = index * 2.4 + zone.id;
        const radius = zone.r * (0.2 + seededNoise(zone.id + index) * 0.65);
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4 + seededNoise(index + zone.id) * 7, 0, TAU);
        ctx.stroke();
      }
    } else if (zone.kind === "time") {
      ctx.globalAlpha = 0.52;
      ctx.rotate(this.elapsed * (this.clockworkHaste ? 0.7 : -0.35));
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, zone.r * 0.66, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (zone.kind === "rift") {
      ctx.globalAlpha = ratio * 0.65;
      ctx.rotate(this.elapsed * 0.4);
      for (let side = 0; side < 6; side += 1) {
        ctx.rotate(TAU / 6);
        ctx.beginPath();
        ctx.moveTo(zone.r * 0.32, 0);
        ctx.lineTo(zone.r * 0.82, 0);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawPickup(pickup: Pickup) {
    const ctx = this.ctx;
    const color = pickup.type === "core" ? "#f6df72" : pickup.type === "repair" ? "#8ee3a2" : "#67f5eb";
    drawPixelPickup(ctx, { x: pickup.x, y: pickup.y, kind: pickup.type, phase: pickup.pulse, color });
    return;
    /* Legacy smooth pickup kept unreachable as a compatibility fallback. */
    const bob = Math.sin(pickup.pulse) * 5;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 23, 10, 0, 0, TAU);
    ctx.fill();
    ctx.translate(0, bob - 7);
    ctx.rotate(pickup.pulse * 0.22);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#11141d";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index / 6) * TAU;
      const radius = index % 2 ? 17 : 22;
      if (index === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "800 15px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pickup.type === "core" ? "◆" : pickup.type === "repair" ? "+" : "↯", 0, 1);
    ctx.restore();
  }

  private drawFighter(fighter: Fighter) {
    const ctx = this.ctx;
    if (fighter.champion.style === "boss") {
      drawPixelBoss(ctx, {
        x: fighter.x,
        y: fighter.y,
        angle: fighter.angle,
        phase: this.elapsed * (0.8 + this.bossPhase * 0.1),
        healthRatio: fighter.hp / fighter.hpMax,
        attackFlash: fighter.attackFlash,
        enraged: this.bossPhase === 3,
        scale: 1.02,
        primary: fighter.champion.accent,
        secondary: fighter.champion.accent2,
      });
      return;
    }
    drawPixelChampion(ctx, {
      x: fighter.x,
      y: fighter.y,
      angle: fighter.angle,
      style: fighter.champion.style,
      accent: fighter.champion.accent,
      accent2: fighter.champion.accent2,
      team: fighter.team,
      phase: fighter.animation,
      attackFlash: fighter.attackFlash,
      hitFlash: fighter.hitFlash,
      shield: fighter.shield,
      stealth: fighter.stealth,
      radius: fighter.r,
    });
    return;
    /* Legacy vector model kept unreachable as a compact compatibility fallback. */
    const moving = Math.hypot(fighter.vx, fighter.vy) > 18;
    const bob = moving ? Math.sin(fighter.animation * 2) * 2.4 : Math.sin(fighter.animation) * 1.1;
    const alpha = fighter.stealth > 0 ? 0.34 + Math.sin(this.elapsed * 18) * 0.08 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,.46)";
    ctx.beginPath();
    ctx.ellipse(fighter.x, fighter.y + 17, fighter.r * 1.18, fighter.r * 0.54, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = teamColor(fighter.team);
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 0.78;
    if (fighter.team === "blue") {
      for (let segment = 0; segment < 8; segment += 1) {
        ctx.beginPath();
        ctx.arc(fighter.x, fighter.y + 4, fighter.r + 11, segment * TAU / 8 + 0.08, (segment + 0.58) * TAU / 8);
        ctx.stroke();
      }
    } else {
      ctx.setLineDash([9, 6]);
      ctx.lineDashOffset = -this.elapsed * 14;
      ctx.beginPath();
      ctx.ellipse(fighter.x, fighter.y + 4, fighter.r + 12, (fighter.r + 12) * 0.68, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = alpha;

    if (fighter.shield > 0) {
      ctx.strokeStyle = "#f1b94b";
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha * (0.55 + Math.sin(this.elapsed * 8) * 0.12);
      ctx.beginPath();
      ctx.ellipse(fighter.x, fighter.y - 1, fighter.r + 16, fighter.r + 10, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

    ctx.translate(fighter.x, fighter.y - 5 + bob);
    ctx.rotate(fighter.angle);
    if (fighter.hitFlash > 0) {
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = fighter.champion.accent;
      ctx.shadowBlur = fighter.attackFlash > 0 ? 18 : 8;
    }
    this.drawChampionBody(fighter.champion, fighter.team, fighter.animation, fighter.attackFlash);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    const barWidth = 60;
    const y = fighter.y - fighter.r - 31;
    ctx.fillStyle = "rgba(3,5,9,.78)";
    roundRect(ctx, fighter.x - barWidth / 2, y, barWidth, 7, 3.5);
    ctx.fill();
    const hpRatio = clamp(fighter.hp / fighter.hpMax, 0, 1);
    ctx.fillStyle = hpRatio < 0.3 ? "#ff5d63" : teamColor(fighter.team);
    roundRect(ctx, fighter.x - barWidth / 2 + 1, y + 1, (barWidth - 2) * hpRatio, 5, 2.5);
    ctx.fill();
    if (fighter.marked > 0) {
      ctx.fillStyle = "#ff6db4";
      ctx.font = "900 15px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("◇", fighter.x, y - 7);
    }
    ctx.restore();
  }

  private drawSmartAimTargets() {
    const ctx = this.ctx;
    for (const hunter of this.fighters) {
      if (hunter.dead || hunter.faction === "boss" || hunter.aimTargetId === null) continue;
      const target = this.fighters.find((candidate) => candidate.id === hunter.aimTargetId && !candidate.dead && candidate.spawnGrace <= 0);
      if (!target) continue;
      const radius = target.r + (hunter.team === "red" ? 15 : 21);
      const corner = 11;
      ctx.save();
      ctx.strokeStyle = teamColor(hunter.team);
      ctx.fillStyle = teamColor(hunter.team);
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(target.x - radius, target.y - radius + corner);
      ctx.lineTo(target.x - radius, target.y - radius);
      ctx.lineTo(target.x - radius + corner, target.y - radius);
      ctx.moveTo(target.x + radius - corner, target.y - radius);
      ctx.lineTo(target.x + radius, target.y - radius);
      ctx.lineTo(target.x + radius, target.y - radius + corner);
      ctx.moveTo(target.x - radius, target.y + radius - corner);
      ctx.lineTo(target.x - radius, target.y + radius);
      ctx.lineTo(target.x - radius + corner, target.y + radius);
      ctx.moveTo(target.x + radius - corner, target.y + radius);
      ctx.lineTo(target.x + radius, target.y + radius);
      ctx.lineTo(target.x + radius, target.y + radius - corner);
      ctx.stroke();
      ctx.fillRect(Math.round(target.x) - 3, Math.round(target.y - radius) - 7, 6, 6);
      ctx.font = "900 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(hunter.team === "red" ? "P1" : "P2", target.x, target.y - radius - 10);
      ctx.restore();
    }
  }

  private drawChampionBody(champion: Champion, team: Team, phase: number, attackFlash: number) {
    const ctx = this.ctx;
    if (champion.style !== "boss") {
      drawPixelChampionBody(ctx, {
        style: champion.style,
        accent: champion.accent,
        accent2: champion.accent2,
        team,
        phase,
        attackFlash,
        scale: 0.82,
      });
    }
    return;
    /* Legacy smooth cutscene body kept unreachable as a compatibility fallback. */
    const step = Math.sin(phase * 2.1) * 4;
    const teamAccent = teamColor(team);
    const dark = "#11141d";
    const cloth = "#292d38";

    ctx.fillStyle = "#0b0d13";
    roundRect(ctx, -12 - step, 9, 18, 10, 5);
    ctx.fill();
    roundRect(ctx, -12 + step, -19, 18, 10, 5);
    ctx.fill();

    if (["mystic", "assassin", "chronomancer", "necromancer"].includes(champion.style)) {
      ctx.fillStyle = champion.style === "assassin" ? "#20172d" : cloth;
      ctx.beginPath();
      ctx.moveTo(-19, -18);
      ctx.lineTo(-35, -27);
      ctx.lineTo(-31, 0);
      ctx.lineTo(-36, 27);
      ctx.lineTo(-11, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = champion.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(-1, 0, champion.style === "guardian" ? 27 : 22, champion.style === "guardian" ? 24 : 20, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = champion.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    const torso = ctx.createLinearGradient(-15, -18, 16, 18);
    torso.addColorStop(0, champion.accent);
    torso.addColorStop(0.42, champion.accent2);
    torso.addColorStop(0.44, cloth);
    torso.addColorStop(1, dark);
    ctx.fillStyle = torso;
    ctx.beginPath();
    ctx.ellipse(2, 0, champion.style === "guardian" ? 21 : 17, champion.style === "guardian" ? 20 : 16, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#c8b69c";
    ctx.beginPath();
    ctx.arc(7, 0, champion.style === "guardian" ? 11 : 9.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = teamAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(7, 0, champion.style === "guardian" ? 12 : 10.5, -1.25, 1.25);
    ctx.stroke();

    if (champion.style === "mystic") {
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(2, -18);
      ctx.lineTo(29 + attackFlash * 7, -24);
      ctx.stroke();
      ctx.fillStyle = champion.accent;
      ctx.beginPath();
      ctx.moveTo(31, -24);
      ctx.lineTo(22, -30);
      ctx.lineTo(24, -18);
      ctx.closePath();
      ctx.fill();
      for (let flame = 0; flame < 3; flame += 1) {
        ctx.fillStyle = flame % 2 ? champion.accent2 : champion.accent;
        ctx.beginPath();
        ctx.arc(3 + flame * 5, -13 + flame * 5, 3 + attackFlash * 2, 0, TAU);
        ctx.fill();
      }
    } else if (champion.style === "ranger") {
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(25, 0, 20, -1.12, 1.12);
      ctx.stroke();
      ctx.strokeStyle = "#e9e4d6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(34, -18);
      ctx.lineTo(34, 18);
      ctx.stroke();
      ctx.strokeStyle = champion.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(41 + attackFlash * 8, 0);
      ctx.stroke();
    } else if (champion.style === "guardian") {
      ctx.fillStyle = "#303641";
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(19, -18, 17, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = champion.accent2;
      ctx.fillRect(13, -20, 13, 4);
      ctx.strokeStyle = champion.accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(8, 13);
      ctx.lineTo(43 + attackFlash * 5, 19);
      ctx.stroke();
    } else if (champion.style === "assassin") {
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(6, side * 11);
        ctx.lineTo(46 + attackFlash * 12, side * 21);
        ctx.stroke();
        ctx.fillStyle = "#f2eee3";
        ctx.beginPath();
        ctx.moveTo(46 + attackFlash * 12, side * 21);
        ctx.lineTo(36, side * 25);
        ctx.lineTo(38, side * 16);
        ctx.closePath();
        ctx.fill();
      }
    } else if (champion.style === "chronomancer") {
      ctx.save();
      ctx.rotate(phase * 0.18);
      ctx.strokeStyle = champion.accent;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 6]);
      ctx.beginPath();
      ctx.ellipse(2, 0, 31, 24, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(42 + attackFlash * 6, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(43 + attackFlash * 6, 0, 7, 0, TAU);
      ctx.stroke();
    } else if (champion.style === "monk") {
      ctx.strokeStyle = champion.accent;
      ctx.lineWidth = 7;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(5, side * 9);
        ctx.lineTo(31 + attackFlash * 10, side * 15);
        ctx.stroke();
        ctx.fillStyle = champion.accent2;
        ctx.beginPath();
        ctx.arc(34 + attackFlash * 10, side * 16, 7, 0, TAU);
        ctx.fill();
      }
    } else if (champion.style === "necromancer") {
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(42 + attackFlash * 5, 21);
      ctx.stroke();
      ctx.fillStyle = champion.accent;
      ctx.beginPath();
      ctx.arc(44 + attackFlash * 5, 22, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#11141d";
      ctx.beginPath();
      ctx.arc(46, 21, 4, 0, TAU);
      ctx.fill();
    } else if (champion.style === "alchemist") {
      ctx.fillStyle = "#454a34";
      roundRect(ctx, -24, -17, 16, 34, 6);
      ctx.fill();
      ctx.strokeStyle = champion.accent2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = champion.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(5, 8);
      ctx.lineTo(35 + attackFlash * 7, 14);
      ctx.stroke();
      ctx.fillStyle = champion.accent;
      ctx.beginPath();
      ctx.arc(38 + attackFlash * 7, 15, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.beginPath();
      ctx.arc(36, 12, 2, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawSummon(summon: Summon) {
    const ctx = this.ctx;
    drawPixelSummon(ctx, {
      x: summon.x,
      y: summon.y,
      radius: summon.r,
      kind: summon.kind,
      accent: summon.owner.champion.accent,
      accent2: summon.owner.champion.accent2,
      phase: this.elapsed + summon.id,
      team: summon.owner.team,
      angle: summon.owner.angle,
      healthRatio: summon.hp / summon.hpMax,
    });
    return;
    /* Legacy smooth summon kept unreachable as a compatibility fallback. */
    const bob = Math.sin(this.elapsed * 4 + summon.id) * 4;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath();
    ctx.ellipse(summon.x, summon.y + 13, summon.r * 1.1, summon.r * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.translate(summon.x, summon.y - 5 + bob);
    ctx.shadowColor = summon.owner.champion.accent;
    ctx.shadowBlur = 14;
    ctx.fillStyle = summon.kind === "titan" ? "#262331" : "#16151f";
    ctx.strokeStyle = summon.owner.champion.accent;
    ctx.lineWidth = summon.kind === "titan" ? 4 : 2;
    ctx.beginPath();
    if (summon.kind === "titan") {
      ctx.moveTo(-28, 24);
      ctx.lineTo(-31, -19);
      ctx.lineTo(-12, -33);
      ctx.lineTo(18, -29);
      ctx.lineTo(32, -4);
      ctx.lineTo(25, 28);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, summon.r, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = summon.owner.champion.accent2;
    ctx.beginPath();
    ctx.arc(summon.kind === "titan" ? 12 : 4, -4, summon.kind === "titan" ? 7 : 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawProjectile(projectile: Projectile) {
    const ctx = this.ctx;
    drawPixelProjectile(ctx, {
      x: projectile.x,
      y: projectile.y,
      vx: projectile.vx,
      vy: projectile.vy,
      radius: projectile.r,
      color: projectile.color,
      kind: projectile.kind,
      trail: projectile.trail,
      phase: this.elapsed,
    });
    return;
    /* Legacy smooth projectile kept unreachable as a compatibility fallback. */
    ctx.save();
    for (let index = 0; index < projectile.trail.length; index += 1) {
      const point = projectile.trail[index];
      ctx.globalAlpha = (index / projectile.trail.length) * 0.3;
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, projectile.r * (0.25 + index / projectile.trail.length * 0.4), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(projectile.x, projectile.y - 4);
    ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 14;
    if (projectile.kind === "arrow" || projectile.kind === "bone") {
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = projectile.kind === "arrow" ? 3 : 5;
      ctx.beginPath();
      ctx.moveTo(-projectile.r * 2.5, 0);
      ctx.lineTo(projectile.r * 2.5, 0);
      ctx.stroke();
      ctx.fillStyle = "#f2eee3";
      ctx.beginPath();
      ctx.moveTo(projectile.r * 3, 0);
      ctx.lineTo(projectile.r * 1.4, -projectile.r * 0.75);
      ctx.lineTo(projectile.r * 1.4, projectile.r * 0.75);
      ctx.closePath();
      ctx.fill();
    } else if (projectile.kind === "lightning") {
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-projectile.r * 2, 4);
      ctx.lineTo(-projectile.r * 0.3, -5);
      ctx.lineTo(projectile.r * 0.4, 5);
      ctx.lineTo(projectile.r * 2, -3);
      ctx.stroke();
    } else if (projectile.kind === "vial") {
      ctx.fillStyle = projectile.color;
      roundRect(ctx, -projectile.r, -projectile.r * 0.65, projectile.r * 2, projectile.r * 1.3, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.65)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#d9d1b8";
      ctx.fillRect(projectile.r * 0.65, -3, 7, 6);
    } else {
      const gradient = ctx.createRadialGradient(-projectile.r * 0.3, -projectile.r * 0.3, 1, 0, 0, projectile.r * 1.35);
      gradient.addColorStop(0, "#fff7df");
      gradient.addColorStop(0.38, projectile.color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.r * 1.35, 0, TAU);
      ctx.fill();
      if (projectile.kind === "time") {
        ctx.strokeStyle = projectile.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.r * 1.55, 0.4, TAU - 0.7);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawParticle(particle: Particle) {
    const ctx = this.ctx;
    drawPixelParticle(ctx, {
      x: particle.x,
      y: particle.y,
      z: particle.z,
      vx: particle.vx,
      vy: particle.vy,
      life: particle.life,
      maxLife: particle.maxLife,
      size: particle.size,
      color: particle.color,
      shape: particle.shape === "circle" ? "square" : particle.shape,
      seed: particle.x + particle.y,
    });
    return;
    /* Legacy smooth particle kept unreachable as a compatibility fallback. */
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(particle.x, particle.y - particle.z * 0.48);
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    if (particle.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, TAU);
      ctx.fill();
    } else if (particle.shape === "spark") {
      const angle = Math.atan2(particle.vy, particle.vx);
      ctx.rotate(angle);
      ctx.lineWidth = Math.max(1, particle.size * 0.45);
      ctx.beginPath();
      ctx.moveTo(-particle.size * 1.8, 0);
      ctx.lineTo(particle.size * 1.8, 0);
      ctx.stroke();
    } else {
      ctx.rotate(Math.atan2(particle.vy, particle.vx) + particle.life * 6);
      ctx.beginPath();
      ctx.moveTo(particle.size * 1.5, 0);
      ctx.lineTo(-particle.size, particle.size * 0.7);
      ctx.lineTo(-particle.size * 0.55, -particle.size * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawText(text: FloatText) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.fillStyle = "#080713";
    ctx.font = `900 ${Math.round(text.size)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.text, Math.round(text.x) + 2, Math.round(text.y) + 2);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, Math.round(text.x), Math.round(text.y));
    ctx.restore();
  }

  private drawCollapse() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(86,24,125,.24)";
    const cell = 28;
    for (let y = 0; y < WORLD_HEIGHT; y += cell) {
      for (let x = 0; x < WORLD_WIDTH; x += cell) {
        if (Math.hypot(x + cell / 2 - WORLD_WIDTH / 2, y + cell / 2 - WORLD_HEIGHT / 2) > this.stormRadius) ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.fillStyle = "#b86cff";
    ctx.globalAlpha = 0.68 + (Math.floor(this.elapsed * 8) % 2) * 0.18;
    for (let segment = 0; segment < 64; segment += 1) {
      if (segment % 3 === 0) continue;
      const angle = segment / 64 * TAU;
      ctx.fillRect(Math.round(WORLD_WIDTH / 2 + Math.cos(angle) * this.stormRadius) - 4, Math.round(WORLD_HEIGHT / 2 + Math.sin(angle) * this.stormRadius) - 4, 8, 8);
    }
    ctx.restore();
  }

  private drawCinematic(cinematic: Cinematic) {
    const ctx = this.ctx;
    const progress = clamp(cinematic.time / cinematic.duration, 0, 1);
    const enter = clamp(progress / 0.22, 0, 1);
    const exit = clamp((1 - progress) / 0.18, 0, 1);
    const visibility = Math.min(enter, exit);
    const accent = cinematic.owner.champion.accent;
    const right = cinematic.owner.team === "blue";
    ctx.save();
    ctx.fillStyle = `rgba(2,3,7,${cinematic.kind === "ultimate" ? 0.78 * visibility : 0.42 * visibility})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawPixelUltimateSigil(ctx, {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      radius: cinematic.kind === "ultimate" ? 250 + Math.sin(this.elapsed * 10) * 20 : 150,
      color: accent,
      secondary: cinematic.owner.champion.accent2,
      phase: this.elapsed * (cinematic.kind === "ultimate" ? 1.8 : 1),
      alpha: 0.42 * visibility,
      style: cinematic.owner.champion.style,
    });

    if (cinematic.kind === "ultimate") {
      const barHeight = 88 * visibility;
      ctx.fillStyle = "#030408";
      ctx.fillRect(0, 0, WORLD_WIDTH, barHeight);
      ctx.fillRect(0, WORLD_HEIGHT - barHeight, WORLD_WIDTH, barHeight);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.62 * visibility;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, barHeight);
      ctx.lineTo(WORLD_WIDTH, barHeight);
      ctx.moveTo(0, WORLD_HEIGHT - barHeight);
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT - barHeight);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const portraitX = right ? WORLD_WIDTH - 315 : 315;
      const slide = (1 - enter) * (right ? 180 : -180);
      ctx.save();
      ctx.translate(portraitX + slide, WORLD_HEIGHT / 2 + 26);
      ctx.scale(right ? -4.8 : 4.8, 4.8);
      ctx.globalAlpha = visibility;
      this.drawChampionBody(cinematic.owner.champion, cinematic.owner.team, this.elapsed * 1.7, 0.8);
      ctx.restore();

      ctx.save();
      const textX = right ? 92 : WORLD_WIDTH - 92;
      ctx.textAlign = right ? "left" : "right";
      ctx.globalAlpha = visibility;
      ctx.fillStyle = teamColor(cinematic.owner.team);
      ctx.font = "800 15px system-ui";
      ctx.letterSpacing = "0.18em";
      ctx.fillText(cinematic.owner.team === "blue" && this.options.format === "solo" ? "IA TÁTICA // ULTIMATE" : `${cinematic.owner.team === "red" ? "RUBRO" : "AZUL"} // ULTIMATE`, textX, 310);
      ctx.fillStyle = "#f2eee3";
      ctx.font = "900 46px system-ui";
      ctx.fillText(cinematic.title.toUpperCase(), textX, 367);
      ctx.fillStyle = accent;
      ctx.font = "700 19px system-ui";
      ctx.fillText(cinematic.subtitle.toUpperCase(), textX, 403);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(right ? textX : textX - 380, 430);
      ctx.lineTo(right ? textX + 380 : textX, 430);
      ctx.stroke();
      ctx.restore();
    } else {
      const bandY = right ? 505 : 215;
      ctx.save();
      ctx.translate((right ? 1 : -1) * (1 - enter) * 320, 0);
      ctx.fillStyle = `rgba(10,12,18,${0.92 * visibility})`;
      ctx.beginPath();
      ctx.moveTo(0, bandY - 55);
      ctx.lineTo(WORLD_WIDTH, bandY - 95);
      ctx.lineTo(WORLD_WIDTH, bandY + 36);
      ctx.lineTo(0, bandY + 76);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, bandY - 55);
      ctx.lineTo(WORLD_WIDTH, bandY - 95);
      ctx.stroke();
      ctx.globalAlpha = visibility;
      ctx.textAlign = "center";
      ctx.fillStyle = accent;
      ctx.font = "800 14px system-ui";
      ctx.fillText(`${cinematic.owner.champion.name.toUpperCase()} // ESPECIAL`, WORLD_WIDTH / 2, bandY - 38);
      ctx.fillStyle = "#f2eee3";
      ctx.font = "900 34px system-ui";
      ctx.fillText(cinematic.title.toUpperCase(), WORLD_WIDTH / 2, bandY + 4);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawDebug() {
    if (!this.ai) return;
    const ctx = this.ctx;
    const fighter = this.player("blue");
    ctx.save();
    for (const candidate of this.ai.debugDirections) {
      const normalizedScore = clamp((candidate.score + 2) / 5, 0, 1);
      ctx.fillStyle = normalizedScore > 0.58 ? `rgba(106,255,178,${0.2 + normalizedScore * 0.55})` : `rgba(255,93,99,${0.2 + (1 - normalizedScore) * 0.45})`;
      ctx.beginPath();
      ctx.arc(candidate.x, candidate.y, 7 + normalizedScore * 5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.2)";
      ctx.beginPath();
      ctx.moveTo(fighter.x, fighter.y);
      ctx.lineTo(candidate.x, candidate.y);
      ctx.stroke();
    }
    if (this.ai.debugTarget) {
      const target = this.ai.debugTarget;
      ctx.strokeStyle = "#f6df72";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 18, 0, TAU);
      ctx.moveTo(target.x - 25, target.y);
      ctx.lineTo(target.x + 25, target.y);
      ctx.moveTo(target.x, target.y - 25);
      ctx.lineTo(target.x, target.y + 25);
      ctx.stroke();
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(fighter.x, fighter.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "rgba(3,5,9,.82)";
    roundRect(ctx, WORLD_WIDTH - 355, 98, 285, 76, 10);
    ctx.fill();
    ctx.strokeStyle = "#67f5eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#67f5eb";
    ctx.font = "800 13px ui-monospace, monospace";
    ctx.fillText("IA // ESTADO", WORLD_WIDTH - 335, 122);
    ctx.fillStyle = "#f2eee3";
    ctx.font = "900 20px ui-monospace, monospace";
    ctx.fillText(this.ai.state, WORLD_WIDTH - 335, 148);
    ctx.fillStyle = "#88909f";
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.fillText("F3 fecha • pontos = opções avaliadas", WORLD_WIDTH - 335, 164);
    ctx.restore();
  }
}
