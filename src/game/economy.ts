import { CHAMPION_LIST, type ChampionId, type MatchFormat, type RuleId } from "./data";

const STORAGE_KEY = "riftbound-arcane-stones-v1";
const PLAYABLE = new Set<ChampionId>(CHAMPION_LIST.map((champion) => champion.id));
export const STARTER_CHAMPION: ChampionId = "cinder";

export const CHAMPION_PRICES: Record<Exclude<ChampionId, "overlord">, number> = {
  cinder: 10,
  bulwark: 10,
  alchemist: 15,
  ranger: 15,
  storm: 20,
  wraith: 25,
  chrono: 30,
  necromancer: 30,
};

export type ArcaneWallet = { stones: number; unlocked: ChampionId[] };
export const INITIAL_WALLET: ArcaneWallet = { stones: 0, unlocked: [STARTER_CHAMPION] };

export function loadWallet(): ArcaneWallet {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_WALLET, unlocked: [...INITIAL_WALLET.unlocked] };
    const saved = JSON.parse(raw) as Partial<ArcaneWallet>;
    const stones = Number.isSafeInteger(saved.stones) && saved.stones! >= 0 ? saved.stones! : 0;
    const unlocked = Array.isArray(saved.unlocked) ? saved.unlocked.filter((id): id is ChampionId => PLAYABLE.has(id)) : [];
    return { stones, unlocked: [...new Set<ChampionId>([STARTER_CHAMPION, ...unlocked])] };
  } catch {
    return { ...INITIAL_WALLET, unlocked: [...INITIAL_WALLET.unlocked] };
  }
}

export function saveWallet(wallet: ArcaneWallet) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet)); } catch { /* Storage may be unavailable. */ }
}

export function buyChampion(wallet: ArcaneWallet, id: ChampionId): ArcaneWallet | null {
  if (!PLAYABLE.has(id) || wallet.unlocked.includes(id)) return null;
  const price = CHAMPION_PRICES[id as keyof typeof CHAMPION_PRICES];
  if (wallet.stones < price) return null;
  return { stones: wallet.stones - price, unlocked: [...wallet.unlocked, id] };
}

export function matchReward(format: MatchFormat, rule: RuleId, winner: "red" | "blue") {
  if (format === "solo" && winner !== "red") return 0;
  if (rule === "boss") return format === "solo" ? 5 : 4;
  return format === "solo" ? 2 : 1;
}
