import { CONTROLS } from "./data";

export const SETTINGS_VERSION = 1 as const;
export const SETTINGS_STORAGE_KEY = "riftbound:settings:v1";
export const SETTINGS_CHANGED_EVENT = "riftbound:settings-changed";

export const PLAYER_IDS = ["red", "blue"] as const;
export type PlayerId = (typeof PLAYER_IDS)[number];

export const CONTROL_ACTIONS = [
  "up",
  "down",
  "left",
  "right",
  "attack",
  "special",
  "ultimate",
  "dash",
  "target",
] as const;
export type ControlAction = (typeof CONTROL_ACTIONS)[number];

export type VolumeChannel = "master" | "music" | "sfx";
export type PlayerBindings = Record<ControlAction, string>;
export type ControlBindings = Record<PlayerId, PlayerBindings>;

export type GameSettings = {
  version: typeof SETTINGS_VERSION;
  audio: Record<VolumeChannel, number>;
  effects: {
    screenShake: boolean;
    reducedMotion: boolean;
  };
  controls: ControlBindings;
};

export type BindingLocation = {
  player: PlayerId;
  action: ControlAction;
  path: `controls.${PlayerId}.${ControlAction}`;
};

export type SettingsValidationIssue = {
  code: "invalid_binding" | "reserved_binding" | "duplicate_binding" | "invalid_volume";
  path: string;
  message: string;
  key?: string;
  conflictWith?: BindingLocation;
};

export type SettingsValidationResult = {
  valid: boolean;
  issues: SettingsValidationIssue[];
};

export type RebindResult =
  | {
      ok: true;
      settings: GameSettings;
      swappedWith?: BindingLocation;
    }
  | {
      ok: false;
      settings: GameSettings;
      issues: SettingsValidationIssue[];
    };

export type SettingsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SaveSettingsResult =
  | { ok: true; settings: GameSettings }
  | {
      ok: false;
      settings: GameSettings;
      reason: "invalid" | "unavailable" | "storage-error";
      issues: SettingsValidationIssue[];
    };

export const CONTROL_ACTION_LABELS: Record<ControlAction, string> = {
  up: "Mover para cima",
  down: "Mover para baixo",
  left: "Mover para a esquerda",
  right: "Mover para a direita",
  attack: "Ataque básico",
  special: "Especial",
  ultimate: "Ultimate",
  dash: "Esquiva",
  target: "Trocar alvo",
};

export const PLAYER_LABELS: Record<PlayerId, string> = {
  red: "Jogador 1",
  blue: "Jogador 2",
};

/**
 * Keys owned by global game/browser shortcuts. Keeping them unavailable avoids
 * a remapped action also pausing, muting, debugging or navigating away.
 */
export const RESERVED_BINDINGS: ReadonlySet<string> = new Set([
  "escape",
  "tab",
  "meta",
  "p",
  "m",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
]);

const NAMED_BINDINGS: ReadonlySet<string> = new Set([
  " ",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "shift",
  "control",
  "alt",
  "enter",
  "backspace",
  "delete",
  "insert",
  "home",
  "end",
  "pageup",
  "pagedown",
]);

const KEY_LABELS: Record<string, string> = {
  " ": "ESPAÇO",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  shift: "SHIFT",
  control: "CTRL",
  alt: "ALT",
  enter: "ENTER",
  backspace: "BACKSPACE",
  delete: "DEL",
  insert: "INS",
  home: "HOME",
  end: "END",
  pageup: "PAGE UP",
  pagedown: "PAGE DOWN",
};

const DEFAULT_CONTROLS: ControlBindings = {
  red: { ...CONTROLS.red } as PlayerBindings,
  blue: { ...CONTROLS.blue } as PlayerBindings,
};

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  version: SETTINGS_VERSION,
  audio: {
    master: 0.82,
    music: 0.68,
    sfx: 0.9,
  },
  effects: {
    screenShake: true,
    reducedMotion: false,
  },
  controls: DEFAULT_CONTROLS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneBindings(bindings: ControlBindings): ControlBindings {
  return {
    red: { ...bindings.red },
    blue: { ...bindings.blue },
  };
}

function bindingLocation(player: PlayerId, action: ControlAction): BindingLocation {
  return {
    player,
    action,
    path: `controls.${player}.${action}`,
  };
}

function finiteVolume(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function booleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function defaultStorage(): SettingsStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function announceSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GameSettings>(SETTINGS_CHANGED_EVENT, { detail: settings }));
}

export function createDefaultSettings(): GameSettings {
  return {
    version: SETTINGS_VERSION,
    audio: { ...DEFAULT_SETTINGS.audio },
    effects: { ...DEFAULT_SETTINGS.effects },
    controls: cloneBindings(DEFAULT_CONTROLS),
  };
}

/** Normalize KeyboardEvent.key values to the format consumed by InputState. */
export function normalizeBindingKey(rawKey: string): string {
  if (rawKey === " " || rawKey.toLowerCase() === "spacebar" || rawKey.toLowerCase() === "space") {
    return " ";
  }

  const normalized = rawKey.trim().toLowerCase();
  const aliases: Record<string, string> = {
    esc: "escape",
    ctrl: "control",
    del: "delete",
    left: "arrowleft",
    right: "arrowright",
    up: "arrowup",
    down: "arrowdown",
  };
  return aliases[normalized] ?? normalized;
}

export function isBindableKey(rawKey: string): boolean {
  const key = normalizeBindingKey(rawKey);
  if (!key || key.length > 24) return false;
  if (key.length === 1 || NAMED_BINDINGS.has(key)) return true;
  return /^f(?:[1-9]|1[0-2])$/.test(key);
}

export function formatBindingKey(rawKey: string): string {
  const key = normalizeBindingKey(rawKey);
  return KEY_LABELS[key] ?? key.toLocaleUpperCase("pt-BR");
}

export function bindingFromKeyboardEvent(event: Pick<KeyboardEvent, "key">): string {
  return normalizeBindingKey(event.key);
}

export function findBindingLocation(
  controls: ControlBindings,
  rawKey: string,
  except?: Pick<BindingLocation, "player" | "action">,
): BindingLocation | undefined {
  const key = normalizeBindingKey(rawKey);
  for (const player of PLAYER_IDS) {
    for (const action of CONTROL_ACTIONS) {
      if (except?.player === player && except.action === action) continue;
      if (normalizeBindingKey(controls[player][action]) === key) {
        return bindingLocation(player, action);
      }
    }
  }
  return undefined;
}

export function validateBindings(
  controls: ControlBindings,
  options: { crossPlayer?: boolean; allowReserved?: boolean } = {},
): SettingsValidationResult {
  const issues: SettingsValidationIssue[] = [];
  const seen = new Map<string, BindingLocation>();
  const crossPlayer = options.crossPlayer ?? true;

  for (const player of PLAYER_IDS) {
    if (!crossPlayer) seen.clear();
    for (const action of CONTROL_ACTIONS) {
      const location = bindingLocation(player, action);
      const rawKey = controls[player][action];
      const key = normalizeBindingKey(rawKey);

      if (!isBindableKey(key)) {
        issues.push({
          code: "invalid_binding",
          path: location.path,
          key,
          message: `${PLAYER_LABELS[player]}: escolha uma tecla válida para ${CONTROL_ACTION_LABELS[action]}.`,
        });
        continue;
      }

      if (!options.allowReserved && RESERVED_BINDINGS.has(key)) {
        issues.push({
          code: "reserved_binding",
          path: location.path,
          key,
          message: `${formatBindingKey(key)} é reservada pelo jogo ou pelo navegador.`,
        });
      }

      const firstUse = seen.get(key);
      if (firstUse) {
        issues.push({
          code: "duplicate_binding",
          path: location.path,
          key,
          conflictWith: firstUse,
          message: `${formatBindingKey(key)} já controla ${CONTROL_ACTION_LABELS[firstUse.action]} do ${PLAYER_LABELS[firstUse.player]}.`,
        });
      } else {
        seen.set(key, location);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateSettings(settings: GameSettings): SettingsValidationResult {
  const issues = [...validateBindings(settings.controls).issues];
  for (const channel of ["master", "music", "sfx"] as const) {
    const value = settings.audio[channel];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      issues.push({
        code: "invalid_volume",
        path: `audio.${channel}`,
        message: `O volume ${channel} deve ficar entre 0 e 1.`,
      });
    }
  }
  return { valid: issues.length === 0, issues };
}

/**
 * Rebind one action. By default conflicts are rejected. With `swap`, the key
 * previously assigned elsewhere trades places with the target action.
 */
export function rebindControl(
  current: GameSettings,
  player: PlayerId,
  action: ControlAction,
  rawKey: string,
  strategy: "reject" | "swap" = "reject",
): RebindResult {
  const key = normalizeBindingKey(rawKey);
  const target = bindingLocation(player, action);

  if (!isBindableKey(key)) {
    return {
      ok: false,
      settings: current,
      issues: [{
        code: "invalid_binding",
        path: target.path,
        key,
        message: "Essa tecla não pode ser usada como controle.",
      }],
    };
  }

  if (RESERVED_BINDINGS.has(key)) {
    return {
      ok: false,
      settings: current,
      issues: [{
        code: "reserved_binding",
        path: target.path,
        key,
        message: `${formatBindingKey(key)} é reservada pelo jogo ou pelo navegador.`,
      }],
    };
  }

  const conflict = findBindingLocation(current.controls, key, target);
  if (conflict && strategy === "reject") {
    return {
      ok: false,
      settings: current,
      issues: [{
        code: "duplicate_binding",
        path: target.path,
        key,
        conflictWith: conflict,
        message: `${formatBindingKey(key)} já controla ${CONTROL_ACTION_LABELS[conflict.action]} do ${PLAYER_LABELS[conflict.player]}.`,
      }],
    };
  }

  const controls = cloneBindings(current.controls);
  const previousKey = controls[player][action];
  controls[player][action] = key;
  if (conflict) controls[conflict.player][conflict.action] = previousKey;

  const settings: GameSettings = { ...current, controls };
  return conflict
    ? { ok: true, settings, swappedWith: conflict }
    : { ok: true, settings };
}

export function setVolume(current: GameSettings, channel: VolumeChannel, value: number): GameSettings {
  return {
    ...current,
    audio: {
      ...current.audio,
      [channel]: finiteVolume(value, current.audio[channel]),
    },
  };
}

export function volumeFromPercent(percent: number): number {
  return finiteVolume(percent / 100, 0);
}

export function volumeToPercent(volume: number): number {
  return Math.round(finiteVolume(volume, 0) * 100);
}

export function effectiveVolume(settings: GameSettings, channel: Exclude<VolumeChannel, "master">): number {
  return settings.audio.master * settings.audio[channel];
}

export function setEffect(
  current: GameSettings,
  effect: keyof GameSettings["effects"],
  enabled: boolean,
): GameSettings {
  return {
    ...current,
    effects: { ...current.effects, [effect]: enabled },
  };
}

/** Coerce persisted or partially migrated data into a complete safe value. */
export function sanitizeSettings(value: unknown): GameSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(value)) return defaults;

  const audio = isRecord(value.audio) ? value.audio : {};
  const effects = isRecord(value.effects) ? value.effects : {};
  const controlsSource = isRecord(value.controls) ? value.controls : {};
  const controls = cloneBindings(defaults.controls);

  for (const player of PLAYER_IDS) {
    const playerSource = isRecord(controlsSource[player]) ? controlsSource[player] : {};
    for (const action of CONTROL_ACTIONS) {
      const candidate = playerSource[action];
      if (typeof candidate === "string" && isBindableKey(candidate)) {
        controls[player][action] = normalizeBindingKey(candidate);
      }
    }
  }

  // Never boot the game with ambiguous or globally reserved persisted keys.
  const safeControls = validateBindings(controls).valid ? controls : defaults.controls;

  return {
    version: SETTINGS_VERSION,
    audio: {
      master: finiteVolume(audio.master, defaults.audio.master),
      music: finiteVolume(audio.music, defaults.audio.music),
      sfx: finiteVolume(audio.sfx, defaults.audio.sfx),
    },
    effects: {
      screenShake: booleanSetting(effects.screenShake, defaults.effects.screenShake),
      reducedMotion: booleanSetting(effects.reducedMotion, defaults.effects.reducedMotion),
    },
    controls: safeControls,
  };
}

export function loadSettings(storage: SettingsStorage | undefined = defaultStorage()): GameSettings {
  if (!storage) return createDefaultSettings();
  try {
    const stored = storage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? sanitizeSettings(JSON.parse(stored) as unknown) : createDefaultSettings();
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(
  value: GameSettings,
  storage: SettingsStorage | undefined = defaultStorage(),
): SaveSettingsResult {
  const settings = sanitizeSettings(value);
  const validation = validateSettings(value);
  if (!validation.valid) {
    return { ok: false, settings, reason: "invalid", issues: validation.issues };
  }
  if (!storage) {
    return { ok: false, settings, reason: "unavailable", issues: [] };
  }

  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    announceSettings(settings);
    return { ok: true, settings };
  } catch {
    return { ok: false, settings, reason: "storage-error", issues: [] };
  }
}

export function resetSettings(storage: SettingsStorage | undefined = defaultStorage()): GameSettings {
  const settings = createDefaultSettings();
  try {
    storage?.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private browsing; defaults still apply now.
  }
  announceSettings(settings);
  return settings;
}

/** Listen for settings saved in this tab or in another tab. */
export function subscribeToSettings(listener: (settings: GameSettings) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (event: Event) => {
    const settings = (event as CustomEvent<GameSettings>).detail;
    listener(sanitizeSettings(settings));
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SETTINGS_STORAGE_KEY) return;
    try {
      listener(event.newValue ? sanitizeSettings(JSON.parse(event.newValue) as unknown) : createDefaultSettings());
    } catch {
      listener(createDefaultSettings());
    }
  };

  window.addEventListener(SETTINGS_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
