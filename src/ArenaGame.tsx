"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ARENAS,
  CHAMPION_LIST,
  CHAMPIONS,
  DIFFICULTIES,
  type ArenaId,
  type ChampionId,
  type DifficultyId,
  type MatchFormat,
  type RuleId,
} from "./game/data";
import { ArenaEngine, type HudSnapshot, type MatchOptions, type MatchResult } from "./game/engine";
import { buyChampion, CHAMPION_PRICES, INITIAL_WALLET, loadWallet, matchReward, saveWallet, STARTER_CHAMPION, type ArcaneWallet } from "./game/economy";
import {
  bindingFromKeyboardEvent,
  CONTROL_ACTIONS,
  CONTROL_ACTION_LABELS,
  createDefaultSettings,
  formatBindingKey,
  loadSettings,
  PLAYER_LABELS,
  rebindControl,
  resetSettings,
  saveSettings,
  setEffect,
  setVolume,
  volumeToPercent,
  type BindingLocation,
  type GameSettings,
  type PlayerId,
  type VolumeChannel,
} from "./game/settings";

type Screen = "home" | "setup" | "shop" | "game";
type ActiveSide = "red" | "blue";
type SetupStep = "format" | "mode" | "fighters";
type Career = { matches: number; wins: number; perfectDodges: number };

const INITIAL_CAREER: Career = { matches: 0, wins: 0, perfectDodges: 0 };
const SETUP_STEPS: Array<{ id: SetupStep; label: string }> = [
  { id: "format", label: "Jogadores" },
  { id: "mode", label: "Modo" },
  { id: "fighters", label: "Lutadores" },
];
const DIFFICULTY_ORDER: DifficultyId[] = ["easy", "intermediate", "advanced", "professional", "demonic"];
const BOSS_DIFFICULTY_LABELS: Record<DifficultyId, string> = {
  easy: "Menos vida, dano reduzido e padrões espaçados",
  intermediate: "Pressão moderada com janelas maiores",
  advanced: "A experiência base de Malakar",
  professional: "Mais vida, dano e padrões velozes",
  demonic: "+32% HP, +25% dano e padrões em ×0.66",
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

function ChampionMark({ id, large = false }: { id: ChampionId; large?: boolean }) {
  const champion = CHAMPIONS[id];
  return (
    <span
      className={`champion-mark champion-mark--${champion.style}${large ? " champion-mark--large" : ""}`}
      style={{ "--champion": champion.accent, "--champion-two": champion.accent2 } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="champion-mark__ring" />
      <span className="champion-mark__core">{champion.name.slice(0, 1)}</span>
      <span className="champion-mark__blade" />
    </span>
  );
}

function ChampionSelectionGrid({ selected, unlocked, onSelect }: { selected: ChampionId; unlocked: ChampionId[]; onSelect: (id: ChampionId) => void }) {
  return <div className="fighter-mini-grid">{CHAMPION_LIST.map((champion) => {
    const locked = !unlocked.includes(champion.id);
    const price = CHAMPION_PRICES[champion.id as keyof typeof CHAMPION_PRICES];
    return <button key={champion.id} type="button" disabled={locked}
      className={`fighter-mini-card ${selected === champion.id && !locked ? "is-selected" : ""}${locked ? " is-locked" : ""}`}
      style={{ "--champion": champion.accent, "--champion-two": champion.accent2 } as React.CSSProperties}
      onClick={() => onSelect(champion.id)}
      aria-label={`${champion.name}${locked ? ` bloqueado, ${price} Pedras Arcanas na loja` : " disponível"}`}
      aria-pressed={locked ? undefined : selected === champion.id}>
      <ChampionMark id={champion.id} /><span><b>{champion.name}</b><small>{locked ? `✦ ${price} NA LOJA` : champion.role}</small></span>
      {locked && <i className="fighter-mini-card__lock" aria-hidden="true">🔒</i>}
    </button>;
  })}</div>;
}

function CombatAbilityStack({ fighter, side, settings }: { fighter: HudSnapshot["red"]; side: ActiveSide; settings: GameSettings }) {
  const controls = settings.controls[side];
  const attackReady = fighter.attack <= 0.04;
  const specialReady = fighter.special <= 0.04;
  const ultimateLocked = "ultimateLocked" in fighter && fighter.ultimateLocked === true;
  const ultimateReady = !ultimateLocked && fighter.ultimate >= 99.5;
  const dashReady = fighter.dashes > 0;
  const attackProgress = fighter.attackMax > 0 ? (1 - fighter.attack / fighter.attackMax) * 100 : 100;
  const specialProgress = fighter.specialMax > 0 ? (1 - fighter.special / fighter.specialMax) * 100 : 100;
  const dashProgress = fighter.dashes >= fighter.dashCapacity || fighter.dashMax <= 0 ? 100 : (1 - fighter.dashRecharge / fighter.dashMax) * 100;

  const rows = [
    {
      id: "attack",
      label: "ATQ",
      key: controls.attack,
      value: attackReady ? "PRONTO" : `${fighter.attack.toFixed(1)}s`,
      progress: attackProgress,
      ready: attackReady,
      active: false,
    },
    {
      id: "special",
      label: "ESP",
      key: controls.special,
      value: specialReady ? "PRONTO" : `${fighter.special.toFixed(1)}s`,
      progress: specialProgress,
      ready: specialReady,
      active: false,
    },
    {
      id: "ultimate",
      label: "ULT",
      key: controls.ultimate,
      value: ultimateLocked ? "ATIVA" : ultimateReady ? "PRONTA" : `${Math.floor(fighter.ultimate)}%`,
      progress: ultimateLocked ? 100 : fighter.ultimate,
      ready: ultimateReady,
      active: ultimateLocked,
    },
    {
      id: "dash",
      label: "DASH",
      key: controls.dash,
      value: fighter.dashes >= fighter.dashCapacity ? `${fighter.dashes}/${fighter.dashCapacity}` : `${fighter.dashes}/${fighter.dashCapacity} · ${fighter.dashRecharge.toFixed(1)}s`,
      progress: dashProgress,
      ready: dashReady,
      active: false,
    },
  ];

  return (
    <div className={`combat-ability-stack combat-ability-stack--${side}`} aria-label={`Atalhos e recargas de ${fighter.name}`}>
      {rows.map((ability) => (
        <div
          className={`combat-ability-row combat-ability-row--${ability.id}${ability.active ? " is-active" : ability.ready ? " is-ready" : " is-cooling"}`}
          key={ability.id}
          style={{ "--ability-progress": `${Math.max(0, Math.min(100, ability.progress))}%` } as React.CSSProperties}
        >
          <b>{ability.label}</b>
          {fighter.isAi ? (
            <span className="combat-ability-row__key combat-ability-row__ai">
              <span className="combat-ability-row__key-fill" aria-hidden="true" />
              <span className="combat-ability-row__key-label">IA</span>
            </span>
          ) : (
            <kbd className="combat-ability-row__key">
              <span className="combat-ability-row__key-fill" aria-hidden="true" />
              <span className="combat-ability-row__key-label">{formatBindingKey(ability.key)}</span>
            </kbd>
          )}
          <small>{ability.value}</small>
        </div>
      ))}
    </div>
  );
}

function FighterPanel({ fighter, side, settings }: { fighter: HudSnapshot["red"]; side: ActiveSide; settings: GameSettings }) {
  const hp = Math.max(0, Math.min(100, fighter.hp / fighter.hpMax * 100));
  return (
    <div className={`fighter-hud-corner fighter-hud-corner--${side}`}>
      <section className={`fighter-hud fighter-hud--${side}`} style={{ "--fighter-accent": fighter.accent } as React.CSSProperties}>
        <div className="fighter-hud__identity">
          <span className="fighter-hud__side">{side === "red" ? "P1 // RUBRO" : fighter.isAi ? "IA // AZUL" : "P2 // AZUL"}</span>
          <strong>{fighter.name}</strong>
          <span>{fighter.epithet}</span>
        </div>
        <div className="fighter-hud__bars">
          <div className="resource-line resource-line--hp" role="progressbar" aria-label={`Vida de ${fighter.name}`} aria-valuemin={0} aria-valuemax={fighter.hpMax} aria-valuenow={Math.ceil(fighter.hp)}>
            <span style={{ width: `${hp}%` }} />
          </div>
          <div className="fighter-hud__numbers">
            <span>{Math.ceil(fighter.hp)} / {fighter.hpMax}</span>
            <span className={fighter.status !== "PRONTO" ? "is-active" : ""}>{fighter.status}</span>
          </div>
        </div>
      </section>
      <CombatAbilityStack fighter={fighter} side={side} settings={settings} />
    </div>
  );
}

export function ArenaGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const announcementTimer = useRef<number | null>(null);
  const orientationPause = useRef(false);
  const pausePrimaryRef = useRef<HTMLButtonElement | null>(null);
  const victoryPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const guideCloseRef = useRef<HTMLButtonElement | null>(null);
  const settingsCloseRef = useRef<HTMLButtonElement | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [shopReturn, setShopReturn] = useState<"home" | "setup">("home");
  const [setupStep, setSetupStep] = useState<SetupStep>("format");
  const [format, setFormat] = useState<MatchFormat>("solo");
  const [rule, setRule] = useState<RuleId>("duel");
  const [difficulty, setDifficulty] = useState<DifficultyId>("intermediate");
  const [arena, setArena] = useState<ArenaId>("rift");
  const [redChampion, setRedChampion] = useState<ChampionId>("cinder");
  const [blueChampion, setBlueChampion] = useState<ChampionId>("cinder");
  const [wallet, setWallet] = useState<ArcaneWallet>(INITIAL_WALLET);
  const walletRef = useRef<ArcaneWallet>(INITIAL_WALLET);
  const rewardedMatchRef = useRef<number>(-1);
  const [lastReward, setLastReward] = useState(0);
  const [shopInspect, setShopInspect] = useState<ChampionId | null>(null);
  const [shopNotice, setShopNotice] = useState("");
  const [scoreTo, setScoreTo] = useState<2 | 3>(2);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [matchId, setMatchId] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [career, setCareer] = useState<Career>(INITIAL_CAREER);
  const [portraitBattle, setPortraitBattle] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => createDefaultSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [listeningBinding, setListeningBinding] = useState<BindingLocation | null>(null);
  const [settingsNotice, setSettingsNotice] = useState("");

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      const saved = window.localStorage.getItem("riftbound-career-v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<Career>;
          setCareer({ ...INITIAL_CAREER, ...parsed });
        } catch {
          setCareer(INITIAL_CAREER);
        }
      }
      const loadedSettings = loadSettings();
      const loadedWallet = loadWallet();
      walletRef.current = loadedWallet;
      setWallet(loadedWallet);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) loadedSettings.effects.reducedMotion = true;
      setSettings(loadedSettings);
      setReducedMotion(loadedSettings.effects.reducedMotion);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const target = result
      ? victoryPrimaryRef.current
      : paused
        ? pausePrimaryRef.current
        : showSettings
          ? settingsCloseRef.current
          : showGuide
          ? guideCloseRef.current
          : null;
    if (!target) return;
    const frame = window.requestAnimationFrame(() => target.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [paused, result, showGuide, showSettings]);

  useEffect(() => {
    if (!showGuide && !showSettings) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (listeningBinding) {
          setListeningBinding(null);
          setSettingsNotice("Remapeamento cancelado.");
          return;
        }
        setShowGuide(false);
        setShowSettings(false);
        setListeningBinding(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [listeningBinding, showGuide, showSettings]);

  useEffect(() => {
    if (!listeningBinding) return;
    const captureBinding = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setListeningBinding(null);
        return;
      }
      const rebound = rebindControl(settings, listeningBinding.player, listeningBinding.action, bindingFromKeyboardEvent(event), "swap");
      if (rebound.ok) {
        setSettings(rebound.settings);
        saveSettings(rebound.settings);
        engineRef.current?.updateSettings(rebound.settings);
        setSettingsNotice(rebound.swappedWith ? "Teclas trocadas para evitar conflito." : "Controle atualizado.");
        setListeningBinding(null);
      } else setSettingsNotice(rebound.issues[0]?.message ?? "Essa tecla não pode ser usada.");
    };
    window.addEventListener("keydown", captureBinding, { capture: true });
    return () => window.removeEventListener("keydown", captureBinding, { capture: true });
  }, [listeningBinding, settings]);

  const commitSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    setReducedMotion(next.effects.reducedMotion);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  useEffect(() => () => {
    if (announcementTimer.current) window.clearTimeout(announcementTimer.current);
  }, []);

  useEffect(() => {
    if (screen !== "game") return;
    const portraitQuery = window.matchMedia("(orientation: portrait) and (max-width: 900px)");
    const syncOrientation = () => {
      const portrait = portraitQuery.matches;
      setPortraitBattle(portrait);
      if (portrait) {
        orientationPause.current = true;
        engineRef.current?.setPaused(true);
      } else if (orientationPause.current && !paused && !result) {
        orientationPause.current = false;
        engineRef.current?.setPaused(false);
      }
    };
    syncOrientation();
    portraitQuery.addEventListener("change", syncOrientation);
    const pauseOnHidden = () => {
      if (document.hidden && !result) {
        setPaused(true);
        engineRef.current?.setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", pauseOnHidden);
    window.addEventListener("blur", pauseOnHidden);
    return () => {
      portraitQuery.removeEventListener("change", syncOrientation);
      document.removeEventListener("visibilitychange", pauseOnHidden);
      window.removeEventListener("blur", pauseOnHidden);
    };
  }, [screen, paused, result]);

  const options = useMemo<MatchOptions>(() => ({
    format,
    rule,
    difficulty,
    arena,
    redChampion,
    blueChampion,
    scoreTo,
    reducedMotion: settings.effects.reducedMotion,
    audio: audioEnabled,
    settings,
  }), [format, rule, difficulty, arena, redChampion, blueChampion, scoreTo, audioEnabled, settings]);

  useEffect(() => {
    if (screen !== "game" || !canvasRef.current) return;
    const engine = new ArenaEngine(canvasRef.current, options, {
      onHud: setHud,
      onAnnouncement: (message) => {
        setAnnouncement(message);
        if (announcementTimer.current) window.clearTimeout(announcementTimer.current);
        announcementTimer.current = window.setTimeout(() => setAnnouncement(""), 1800);
      },
      onPauseRequest: () => {
        setPaused(true);
        engineRef.current?.setPaused(true);
      },
      onAudioChange: setAudioEnabled,
      onFinished: (matchResult) => {
        if (rewardedMatchRef.current === matchId) return;
        rewardedMatchRef.current = matchId;
        engineRef.current?.setPaused(true);
        setResult(matchResult);
        setPaused(false);
        const earned = matchReward(options.format, matchResult.rule, matchResult.winner);
        setLastReward(earned);
        if (earned) {
          const next = { ...walletRef.current, stones: walletRef.current.stones + earned };
          walletRef.current = next;
          saveWallet(next);
          setWallet(next);
        }
        setCareer((current) => {
          const next = {
            matches: current.matches + 1,
            wins: current.wins + (matchResult.winner === "red" ? 1 : 0),
            perfectDodges: current.perfectDodges + matchResult.redDodges,
          };
          window.localStorage.setItem("riftbound-career-v1", JSON.stringify(next));
          return next;
        });
      },
    });
    engineRef.current = engine;
    engine.start();
    if (window.matchMedia("(orientation: portrait) and (max-width: 900px)").matches) {
      orientationPause.current = true;
      engine.setPaused(true);
    }
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // A nova instância deve capturar a configuração congelada ao iniciar a partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, matchId]);

  const beginSetup = () => {
    setSetupStep("format");
    setScreen("setup");
  };

  const chooseFormat = (nextFormat: MatchFormat) => {
    setFormat(nextFormat);
    setSetupStep("mode");
  };

  const previousSetupStep = () => {
    if (setupStep === "fighters") setSetupStep("mode");
    else if (setupStep === "mode") setSetupStep("format");
    else setScreen("home");
  };

  const startMatch = () => {
    if (!walletRef.current.unlocked.includes(redChampion)) setRedChampion(STARTER_CHAMPION);
    if (format === "local" && !walletRef.current.unlocked.includes(blueChampion)) setBlueChampion(STARTER_CHAMPION);
    if (format === "solo") {
      const opponents = CHAMPION_LIST.filter((champion) => walletRef.current.unlocked.includes(champion.id) && champion.id !== redChampion);
      const pool = opponents.length ? opponents : CHAMPION_LIST.filter((champion) => champion.id !== redChampion);
      setBlueChampion(pool[Math.floor(Math.random() * pool.length)].id);
    }
    if (announcementTimer.current) window.clearTimeout(announcementTimer.current);
    setAnnouncement("");
    setHud(null);
    setResult(null);
    setLastReward(0);
    setPaused(false);
    setMatchId((id) => id + 1);
    setScreen("game");
  };

  const rematch = () => {
    if (announcementTimer.current) window.clearTimeout(announcementTimer.current);
    setAnnouncement("");
    setHud(null);
    setResult(null);
    setLastReward(0);
    setPaused(false);
    setMatchId((id) => id + 1);
  };

  const leaveMatch = () => {
    if (announcementTimer.current) window.clearTimeout(announcementTimer.current);
    setAnnouncement("");
    setResult(null);
    setPaused(false);
    setHud(null);
    setScreen("home");
  };

  const resume = () => {
    setPaused(false);
    engineRef.current?.setPaused(false);
  };

  const setVirtualKey = useCallback((key: string, active: boolean) => {
    engineRef.current?.setVirtualKey(key, active);
  }, []);

  const bindTouch = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setVirtualKey(key, true);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setVirtualKey(key, false);
    },
    onPointerCancel: () => setVirtualKey(key, false),
    onPointerLeave: () => setVirtualKey(key, false),
  });

  const selectRule = (nextRule: RuleId) => {
    setRule(nextRule);
    if (nextRule === "boss") {
      setArena("citadel");
    } else if (arena === "citadel") setArena("rift");
  };

  const setAudioChannel = (channel: VolumeChannel, percent: number) => {
    commitSettings(setVolume(settings, channel, percent / 100));
  };

  const purchase = (id: ChampionId) => {
    const next = buyChampion(walletRef.current, id);
    if (!next) return;
    walletRef.current = next;
    saveWallet(next);
    setWallet(next);
    setShopNotice(`${CHAMPIONS[id].name} desbloqueado para P1 e P2.`);
  };
  const openShop = (from: "home" | "setup") => {
    setShopReturn(from);
    setShopNotice("");
    setScreen("shop");
  };

  const red = CHAMPIONS[redChampion];
  const blue = CHAMPIONS[blueChampion];
  const setupStepIndex = SETUP_STEPS.findIndex((step) => step.id === setupStep);

  return (
    <main className={`game-shell game-shell--${screen}${reducedMotion ? " is-reduced-motion" : ""}`}>
      {screen === "home" && (
        <section className="home-screen">
          <div className="ambient-grid" aria-hidden="true" />
          <div className="rift-orbit rift-orbit--one" aria-hidden="true" />
          <div className="rift-orbit rift-orbit--two" aria-hidden="true" />
          <header className="home-nav">
            <a className="brand" href="#inicio" aria-label="Riftbound — início">
              <span className="brand__sigil"><span>R</span></span>
              <span><b>RIFTBOUND</b><small>ARENA ASCENDANT</small></span>
            </a>
            <div className="home-nav__actions">
              <span className="arcane-balance" aria-label={`${wallet.stones} Pedras Arcanas`}>✦ <b>{wallet.stones}</b><small>PEDRAS ARCANAS</small></span>
              <button className="icon-button shop-nav-button" type="button" onClick={() => openShop("home")}>LOJA</button>
              <button className="icon-button" type="button" onClick={() => setAudioEnabled((value) => !value)} aria-label={audioEnabled ? "Desativar áudio" : "Ativar áudio"}>{audioEnabled ? "ÁUDIO ON" : "ÁUDIO OFF"}</button>
              <button className="icon-button" type="button" onClick={() => setShowSettings(true)}>CONFIGURAÇÕES</button>
              <button className="icon-button" type="button" onClick={() => setShowGuide(true)}>COMO JOGAR</button>
            </div>
          </header>

          <div className="hero" id="inicio">
            <div className="hero__copy">
              <p className="eyebrow"><span /> O RITUAL DA ARENA COMEÇA AQUI</p>
              <h1>DOMINE<br /><em>A FENDA.</em></h1>
              <p className="hero__lead">Cada vitória deixa uma marca. Reúna Pedras Arcanas, desperte campeões e dispute o domínio dos três núcleos ou o trono de Malakar.</p>
              <div className="home-play-actions">
                <button className="home-play-button launch-button" type="button" onClick={beginSetup}>
                  <span>JOGAR</span><small>Escolher jogadores, modo e lutadores</small><b>→</b>
                </button>
                <button className="home-shop-link" type="button" onClick={() => openShop("home")}><span>✦ LOJA DOS CAMPEÕES</span><small>Desbloqueie lutadores com Pedras Arcanas</small><b>↗</b></button>
                <span className="home-play-actions__hint">1–2 JOGADORES // 3 MODOS // 4 ARENAS</span>
              </div>
              <div className="home-ritual-steps" aria-label="Jornada do jogador"><span><b>Ⅰ</b> ESCOLHA O RITUAL</span><span><b>Ⅱ</b> VENÇA A BATALHA</span><span><b>Ⅲ</b> DESPERTE HERÓIS</span></div>
            </div>

            <div className="hero__duel" aria-hidden="true">
              <div className="duel-platform"><span /><span /><span /></div>
              <div className="duel-model duel-model--red">
                <span className="duel-model__shadow" /><span className="duel-model__cape" /><span className="duel-model__body" /><span className="duel-model__head" /><span className="duel-model__weapon" />
              </div>
              <div className="duel-model duel-model--blue">
                <span className="duel-model__shadow" /><span className="duel-model__cape" /><span className="duel-model__body" /><span className="duel-model__head" /><span className="duel-model__weapon" />
              </div>
              <div className="duel-slash" />
              <div className="hero__stamp"><span>VISÃO AÉREA</span><b>BIRD//VIEW</b><small>MAPAS ATÉ 2240 × 1260</small></div>
            </div>
          </div>
          <footer className="home-footer"><span>✦ {career.matches} CONFRONTOS // {career.wins} VITÓRIAS P1</span><span>CONTROLES REMAPEÁVEIS</span><span>IA: FÁCIL ATÉ DEMONÍACA</span></footer>
        </section>
      )}

      {screen === "shop" && (
        <section className="shop-screen">
          <header className="setup-header"><button className="back-button" type="button" onClick={() => setScreen(shopReturn)}>← {shopReturn === "setup" ? "SELEÇÃO" : "MENU"}</button><div className="brand brand--compact"><span className="brand__sigil"><span>R</span></span><span><b>RIFTBOUND</b><small>ARQUIVO DOS CAMPEÕES</small></span></div><span className="arcane-balance">✦ <b>{wallet.stones}</b><small>PEDRAS ARCANAS</small></span></header>
          <div className="shop-content">
            <div className="shop-heading"><p className="eyebrow"><span /> O ALTAR DOS DESPERTOS</p><h2>LOJA DOS<br /><em>CAMPEÕES.</em></h2><p>Vença contra a IA, em duelo local ou na caçada ao Boss para juntar Pedras Arcanas. Cada compra desbloqueia o campeão para os dois jogadores.</p></div>
            <div className="shop-ledger"><span>✦ SALDO <b>{wallet.stones}</b></span><span>DESPERTOS <b>{wallet.unlocked.length} / {CHAMPION_LIST.length}</b></span><small>SOLO +2 · PVP LOCAL +1 · BOSS +4–5 · DERROTA SOLO +0</small></div>
            <p className="shop-notice" aria-live="polite">{shopNotice || "Asha já está disponível para começar sua jornada."}</p>
            {[10, 15, 20, 25, 30].map((price) => (
              <section className="shop-tier" key={price} aria-label={`Campeões de ${price} Pedras Arcanas`}>
                <div className="shop-tier__heading"><span>✧ {price === 10 ? "INICIANTES" : price < 25 ? "INTERMEDIÁRIOS" : "MESTRES"}</span><b>✦ {price} PEDRAS</b></div>
                <div className="shop-grid">{CHAMPION_LIST.filter((champion) => CHAMPION_PRICES[champion.id as keyof typeof CHAMPION_PRICES] === price).map((champion) => {
                  const owned = wallet.unlocked.includes(champion.id);
                  const inspected = shopInspect === champion.id;
                  return <article className={`shop-card${owned ? " is-owned" : ""}`} key={champion.id} style={{ "--champion": champion.accent, "--champion-two": champion.accent2 } as React.CSSProperties}>
                    <div className="shop-card__top"><ChampionMark id={champion.id} large /><div><small>{champion.role}</small><h3>{champion.name}</h3><span>{champion.epithet}</span></div><b className="shop-card__price">{owned ? "DESPERTO" : `✦ ${price}`}</b></div>
                    <p>{champion.bio}</p>
                    {inspected && <div className="shop-card__skills"><div><b>ESPECIAL // {champion.specialName}</b><span>{champion.specialDescription}</span></div><div><b>ULTIMATE // {champion.ultimateName}</b><span>{champion.ultimateDescription}</span></div><small>{champion.traits.join(" · ")} // {champion.difficulty}</small></div>}
                    <div className="shop-card__actions"><button type="button" className="secondary-button" aria-expanded={inspected} onClick={() => setShopInspect(inspected ? null : champion.id)}>{inspected ? "FECHAR" : "INFORMAÇÕES"}</button><button type="button" className="shop-buy" disabled={owned || wallet.stones < price} onClick={() => purchase(champion.id)}>{owned ? "ADQUIRIDO ✓" : wallet.stones < price ? "SALDO INSUFICIENTE" : "DESPERTAR →"}</button></div>
                  </article>;
                })}</div>
              </section>
            ))}
          </div>
        </section>
      )}

      {screen === "setup" && (
        <section className="setup-screen">
          <header className="setup-header">
            <button className="back-button" type="button" onClick={previousSetupStep}>← VOLTAR</button>
            <div className="brand brand--compact"><span className="brand__sigil"><span>R</span></span><span><b>RIFTBOUND</b><small>PREPARAÇÃO DO CONFRONTO</small></span></div>
            <div className="setup-header__actions">
              <span className="setup-step"><b>0{setupStepIndex + 1}</b> / 03</span>
              <button className="icon-button" type="button" onClick={() => setShowSettings(true)}>CONFIGURAÇÕES</button>
            </div>
          </header>

          <div className="setup-content">
            <ol className="setup-progress" aria-label="Etapas da preparação">
              {SETUP_STEPS.map((step, index) => (
                <li className={`${setupStep === step.id ? "is-current" : ""}${index < setupStepIndex ? " is-complete" : ""}`} key={step.id} aria-current={setupStep === step.id ? "step" : undefined}>
                  <span>{index < setupStepIndex ? "✓" : index + 1}</span><b>{step.label}</b>
                </li>
              ))}
            </ol>

            {setupStep === "format" && (
              <section className="setup-stage setup-stage--format" aria-labelledby="format-title">
                <div className="setup-stage__heading"><span>ETAPA 01</span><h2 id="format-title">QUANTOS VÃO JOGAR?</h2><p>Escolha o formato. Você poderá voltar sem perder suas seleções.</p></div>
                <div className="setup-choice-grid setup-choice-grid--format">
                  <button className="setup-choice-card setup-choice-card--solo mode-card mode-card--primary" type="button" onClick={() => chooseFormat("solo")}>
                    <span className="setup-choice-card__number">01</span><span className="setup-choice-card__icon">◆</span>
                    <span><b>1 JOGADOR</b><small>Contra IA ou Boss Raid com um rival controlado pela IA.</small></span><strong>ESCOLHER →</strong>
                  </button>
                  <button className="setup-choice-card setup-choice-card--local mode-card" type="button" onClick={() => chooseFormat("local")}>
                    <span className="setup-choice-card__number">02</span><span className="setup-choice-card__icon">◆◆</span>
                    <span><b>2 JOGADORES</b><small>Dois lutadores no mesmo teclado, inclusive no Boss Raid.</small></span><strong>ESCOLHER →</strong>
                  </button>
                </div>
              </section>
            )}

            {setupStep === "mode" && (
              <section className="setup-stage setup-stage--mode" aria-labelledby="mode-title">
                <div className="setup-stage__heading"><span>ETAPA 02 // {format === "solo" ? "1 JOGADOR" : "2 JOGADORES"}</span><h2 id="mode-title">ESCOLHA O MODO</h2><p>Defina a regra, a arena e avance para os lutadores.</p></div>
                <div className="mode-selection-grid" role="group" aria-label="Modos de jogo">
                  <button type="button" className={`mode-selection-card ${rule === "duel" ? "is-selected" : ""}`} onClick={() => selectRule("duel")} aria-pressed={rule === "duel"}><span>01</span><b>DUELO</b><small>Elimine o rival e vença a série de rounds.</small><em>{rule === "duel" ? "SELECIONADO" : "SELECIONAR"}</em></button>
                  <button type="button" className={`mode-selection-card ${rule === "dominion" ? "is-selected" : ""}`} onClick={() => selectRule("dominion")} aria-pressed={rule === "dominion"}><span>02</span><b>DOMINAÇÃO</b><small>Controle os três núcleos até atingir 100 pontos.</small><em>{rule === "dominion" ? "SELECIONADO" : "SELECIONAR"}</em></button>
                  <button type="button" className={`mode-selection-card mode-selection-card--boss ${rule === "boss" ? "is-selected" : ""}`} onClick={() => selectRule("boss")} aria-pressed={rule === "boss"}><span>03</span><b>BOSS RAID</b><small>PvPvE para P1 + IA ou 2P: ressurja, escolha o alvo e dispute dano contra Malakar.</small><em>{rule === "boss" ? "SELECIONADO" : "SELECIONAR"}</em></button>
                </div>

                <div className="mode-options-row">
                  {rule === "duel" && <div className="score-select mode-round-select"><span>VITÓRIAS NECESSÁRIAS</span><button type="button" className={scoreTo === 2 ? "is-active" : ""} onClick={() => setScoreTo(2)} aria-pressed={scoreTo === 2}>2</button><button type="button" className={scoreTo === 3 ? "is-active" : ""} onClick={() => setScoreTo(3)} aria-pressed={scoreTo === 3}>3</button></div>}
                  <div className="mode-arena-select">
                    <div className="config-title"><span>ARENA</span><b>{rule === "boss" ? "TRONO DO BOSS" : "CAMPO DE BATALHA"}</b></div>
                    <div className="arena-options">
                      {(Object.entries(ARENAS) as [ArenaId, (typeof ARENAS)[ArenaId]][]).filter(([id]) => rule === "boss" ? id === "citadel" : id !== "citadel").map(([id, data]) => (
                        <button key={id} type="button" className={arena === id ? "is-active" : ""} style={{ "--arena": data.accent } as React.CSSProperties} onClick={() => setArena(id)} aria-pressed={arena === id}>
                          <span className="arena-mini"><i /><i /><i /></span><span><b>{data.name}</b><small>{data.subtitle}</small></span>
                        </button>
                      ))}
                    </div>
                    <p className="arena-description"><b>{ARENAS[arena].event}</b> {ARENAS[arena].description}</p>
                  </div>
                </div>
                <div className="setup-stage__actions"><button className="secondary-button" type="button" onClick={previousSetupStep}>VOLTAR</button><button className="launch-button" type="button" onClick={() => setSetupStep("fighters")}><span>ESCOLHER LUTADORES</span><small>{rule === "boss" ? "Preparar invasão ao trono" : `${rule === "duel" ? "Duelo" : "Dominação"} // ${ARENAS[arena].name}`}</small><b>→</b></button></div>
              </section>
            )}

            {setupStep === "fighters" && (
              <section className="setup-stage setup-stage--fighters" aria-labelledby="fighters-title">
                <div className="setup-stage__heading"><span>ETAPA 03 // {rule === "boss" ? "BOSS RAID" : rule === "duel" ? "DUELO" : "DOMINAÇÃO"}</span><h2 id="fighters-title">ESCOLHA SEU CAMPEÃO</h2><p>{format === "solo" ? "Escolha P1. A IA receberá um lutador aleatório ao iniciar a partida; o nível é definido abaixo." : "Escolha P1 e P2. Os campeões adquiridos ficam disponíveis para os dois jogadores."}</p><button className="selection-shop-link" type="button" onClick={() => openShop("setup")}>✦ {wallet.stones} PEDRAS ARCANAS · VISITAR LOJA →</button></div>
                <div className={`fighter-select-layout fighter-select-layout--${format}${rule === "boss" ? " fighter-select-layout--boss" : ""}`}>
                  <div className="fighter-selection-table" aria-label="Tabela de seleção de lutadores">
                    <section className="fighter-selection-column fighter-selection-column--red" aria-labelledby="red-selection-title">
                      <header><span>P1 // RUBRO</span><div><ChampionMark id={redChampion} /><b id="red-selection-title">{red.name}</b><small>{red.role}</small></div></header>
                      <ChampionSelectionGrid selected={redChampion} unlocked={wallet.unlocked} onSelect={setRedChampion} />
                      <div className="fighter-selection-detail" style={{ "--champion": red.accent } as React.CSSProperties}><p>{red.bio}</p><span><small>ESP</small><b>{red.specialName}</b></span><span><small>ULT</small><b>{red.ultimateName}</b></span></div>
                    </section>

                    {format === "local" && <section className="fighter-selection-column fighter-selection-column--blue" aria-labelledby="blue-selection-title">
                      <header><span>P2 // AZUL</span><div><ChampionMark id={blueChampion} /><b id="blue-selection-title">{blue.name}</b><small>{blue.role}</small></div></header>
                      <ChampionSelectionGrid selected={blueChampion} unlocked={wallet.unlocked} onSelect={setBlueChampion} />
                      <div className="fighter-selection-detail" style={{ "--champion": blue.accent } as React.CSSProperties}><p>{blue.bio}</p><span><small>ESP</small><b>{blue.specialName}</b></span><span><small>ULT</small><b>{blue.ultimateName}</b></span></div>
                    </section>}
                  </div>

                  {(format === "solo" || rule === "boss") && (
                    <aside className="difficulty-panel" aria-labelledby="difficulty-title">
                      {rule === "boss" && <div className="boss-threat-brief"><span className="boss-selection-portrait__crown">♛</span><div><small>AMEAÇA // 3 FASES</small><b>MALAKAR</b><em>Boss + rival são alvos. P1/P2 ressurgem em 4,5s.</em></div></div>}
                      <div className="difficulty-panel__heading"><span>{rule === "boss" ? "RAID // NÍVEL" : "IA // NÍVEL"}</span><h3 id="difficulty-title">{rule === "boss" ? "PODER DO BOSS" : "DIFICULDADE"}</h3></div>
                      <div className="difficulty-ladder">
                        {DIFFICULTY_ORDER.map((id, index) => {
                          const data = DIFFICULTIES[id];
                          return <button key={id} type="button" className={`difficulty-card difficulty-card--${id} ${difficulty === id ? "is-selected" : ""}`} onClick={() => setDifficulty(id)} aria-pressed={difficulty === id}><span>{String(index + 1).padStart(2, "0")}</span><b>{data.name}</b><small>{rule === "boss" ? BOSS_DIFFICULTY_LABELS[id] : data.label}</small>{id === "demonic" && <em>{rule === "boss" ? "BOSS: +32% HP, +25% DANO, PADRÕES ×0.66" : "HANDICAP: REGEN DE HP, 6 DASHES E RECARGAS ACELERADAS"}</em>}</button>;
                        })}
                      </div>
                      <p className={`difficulty-disclosure ${difficulty === "demonic" ? "is-demonic" : ""}`}><b>{difficulty === "demonic" ? "⚠ DEMONÍACO QUEBRA A SIMETRIA" : "LEITURA TRANSPARENTE"}</b>{difficulty === "demonic" ? rule === "boss" ? ` Malakar recebe +32% de HP, +25% de dano e padrões ×0,66${format === "solo" ? "; o rival IA também usa o perfil Demoníaco." : "."}` : " A IA recebe regeneração de vida, seis cargas de dash e recargas favorecidas de especial e ultimate. É feita para ser injusta." : rule === "boss" ? ` A dificuldade regula Malakar${format === "solo" ? " e a leitura tática do rival IA" : ""}; a mira contextual continua igual para os dois jogadores.` : " Nos quatro primeiros níveis, a IA reage com limites de percepção e sem ler seus comandos."}</p>
                    </aside>
                  )}
                </div>

                <div className="match-ready-bar"><div><span>CONFRONTO PRONTO</span><b>{rule === "boss" ? `${red.name} × ${format === "solo" ? "IA ALEATÓRIA" : blue.name} × MALAKAR` : `${red.name} VS ${format === "solo" ? "IA ALEATÓRIA" : blue.name}`}</b><small>{rule === "boss" ? `${format === "solo" ? "RIVAL IA" : "2P LOCAL"} // BOSS ${DIFFICULTIES[difficulty].name}` : format === "solo" ? `${DIFFICULTIES[difficulty].name} // RIVAL IA` : "2P LOCAL"}{" // "}{ARENAS[arena].name}</small></div><button className="secondary-button" type="button" onClick={() => setShowSettings(true)}>CONFIGURAÇÕES</button><button className="launch-button" type="button" onClick={startMatch}><span>{rule === "boss" ? "INVADIR O TRONO" : "INICIAR CONFRONTO"}</span><small>{rule === "duel" ? `Primeiro a ${scoreTo} rounds` : rule === "boss" ? "Derrote Malakar e lidere a contribuição de dano" : "Primeiro a 100 de domínio"}</small><b>→</b></button></div>
              </section>
            )}
            </div>
        </section>
      )}

      {screen === "game" && (
        <section className="battle-screen">
          <div className="canvas-stage">
            <canvas ref={canvasRef} aria-label="Arena de combate em visão aérea. Use os controles exibidos no HUD para lutar." />
          </div>

          {hud && (
            <div className="battle-ui">
              <div className="top-hud">
                <FighterPanel fighter={hud.red} side="red" settings={settings} />
                <div className="match-hud">
                  <span>{hud.rule === "duel" ? `ROUND ${hud.round}` : hud.rule === "boss" ? `BOSS // FASE ${hud.bossPhase}` : "DOMÍNIO"}</span>
                  <div><b>{hud.scoreRed}{hud.rule === "boss" ? "%" : ""}</b><i>—</i><b>{hud.scoreBlue}{hud.rule === "boss" ? "%" : ""}</b></div>
                  <small>{formatTime(hud.timer)}{" // "}{hud.arenaName}</small>
                  {hud.suddenDeath && <em>RUPTURA</em>}
                </div>
                <FighterPanel fighter={hud.blue} side="blue" settings={settings} />
              </div>

              {hud.rule === "boss" && (
                <div className="boss-meter" role="progressbar" aria-label="Vida de Malakar" aria-valuemin={0} aria-valuemax={hud.bossHpMax} aria-valuenow={Math.ceil(hud.bossHp)}>
                  <div><span>MALAKAR // REI DA FENDA</span><b>FASE {hud.bossPhase}/3</b></div>
                  <i><span style={{ width: `${Math.max(0, hud.bossHp / hud.bossHpMax * 100)}%` }} /></i>
                  <small>{Math.ceil(hud.bossHp)} / {hud.bossHpMax} HP</small>
                  <p className="boss-aim-hint"><b>MIRA CONTEXTUAL</b><span>P1 {formatBindingKey(settings.controls.red.target)} troca alvo</span><span>{format === "local" ? `P2 ${formatBindingKey(settings.controls.blue.target)} troca alvo` : "P2 controlado pela IA"}</span></p>
                </div>
              )}

              {hud.rule === "dominion" && (
                <div className="dominion-console" role="group" aria-label={`Domínio: Rubro ${Math.round(hud.objectiveRed)} de 100, Azul ${Math.round(hud.objectiveBlue)} de 100`}>
                  <span className="dominion-score dominion-score--red">{Math.round(hud.objectiveRed)}<small>RUBRO</small></span>
                  <div className="dominion-node-indicators">{hud.dominionZones.map((node, index) => <i key={index} className={node.owner ? `is-${node.owner}` : ""}>{String.fromCharCode(65 + index)}</i>)}</div>
                  <b>CONTROLE DOS 3 NÚCLEOS</b>
                  <span className="dominion-score dominion-score--blue">{Math.round(hud.objectiveBlue)}<small>AZUL</small></span>
                </div>
              )}

              {format === "solo" && hud.rule !== "boss" && <div className={`ai-readout ai-readout--${difficulty}`}><span>IA // {DIFFICULTIES[difficulty].name}</span><b>{hud.aiState}</b>{difficulty === "demonic" && <small>HANDICAP DEMONÍACO ATIVO</small>}</div>}
              <button className="pause-button" type="button" onClick={() => { setPaused(true); engineRef.current?.setPaused(true); }} aria-label="Pausar partida">Ⅱ</button>
              {hud.countdown && <div className="countdown" aria-live="assertive"><span>{hud.countdown}</span></div>}
            </div>
          )}

          {announcement && !result && <div className={`battle-announcement${hud?.rule === "boss" ? " battle-announcement--boss" : ""}`} aria-live="polite">{announcement}</div>}

          {portraitBattle && !result && (
            <div className="orientation-overlay" role="alertdialog" aria-modal="true" aria-labelledby="orientation-title">
              <div className="orientation-overlay__device" aria-hidden="true"><span /></div>
              <p className="eyebrow"><span /> ARENA PAUSADA</p>
              <h2 id="orientation-title">GIRE O DISPOSITIVO</h2>
              <p>Riftbound usa o campo horizontal para manter a mesma área de combate e a leitura justa dos perigos.</p>
            </div>
          )}

          <div className="touch-controls touch-controls--left" aria-label="Movimento por toque">
            <button type="button" aria-label="Mover para cima" {...bindTouch(settings.controls.red.up)}>▲</button>
            <button type="button" aria-label="Mover para esquerda" {...bindTouch(settings.controls.red.left)}>◀</button>
            <button type="button" aria-label="Mover para baixo" {...bindTouch(settings.controls.red.down)}>▼</button>
            <button type="button" aria-label="Mover para direita" {...bindTouch(settings.controls.red.right)}>▶</button>
          </div>
          <div className={`touch-controls touch-controls--actions ${format === "local" ? "touch-controls--red-actions" : ""}${rule === "boss" ? " touch-controls--boss" : ""}`} aria-label="Ações do jogador rubro por toque">
            <button type="button" aria-label="Ataque básico" {...bindTouch(settings.controls.red.attack)}>ATQ</button>
            <button type="button" aria-label="Especial" {...bindTouch(settings.controls.red.special)}>ESP</button>
            <button type="button" aria-label="Ultimate" {...bindTouch(settings.controls.red.ultimate)}>ULT</button>
            <button type="button" aria-label="Esquiva" {...bindTouch(settings.controls.red.dash)}>ESQ</button>
            {rule === "boss" && <button type="button" aria-label="Trocar alvo inteligente" {...bindTouch(settings.controls.red.target)}>ALVO</button>}
          </div>
          {format === "local" && (
            <>
              <div className="touch-controls touch-controls--blue-move" aria-label="Movimento do jogador azul por toque">
                <button type="button" aria-label="Azul: mover para cima" {...bindTouch(settings.controls.blue.up)}>▲</button>
                <button type="button" aria-label="Azul: mover para esquerda" {...bindTouch(settings.controls.blue.left)}>◀</button>
                <button type="button" aria-label="Azul: mover para baixo" {...bindTouch(settings.controls.blue.down)}>▼</button>
                <button type="button" aria-label="Azul: mover para direita" {...bindTouch(settings.controls.blue.right)}>▶</button>
              </div>
              <div className={`touch-controls touch-controls--blue-actions${rule === "boss" ? " touch-controls--boss" : ""}`} aria-label="Ações do jogador azul por toque">
                <button type="button" aria-label="Azul: ataque básico" {...bindTouch(settings.controls.blue.attack)}>ATQ</button>
                <button type="button" aria-label="Azul: especial" {...bindTouch(settings.controls.blue.special)}>ESP</button>
                <button type="button" aria-label="Azul: ultimate" {...bindTouch(settings.controls.blue.ultimate)}>ULT</button>
                <button type="button" aria-label="Azul: esquiva" {...bindTouch(settings.controls.blue.dash)}>ESQ</button>
                {rule === "boss" && <button type="button" aria-label="Azul: trocar alvo inteligente" {...bindTouch(settings.controls.blue.target)}>ALVO</button>}
              </div>
            </>
          )}

          {paused && !result && (
            <div className="overlay-screen pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
              <div className="overlay-panel">
                <p className="eyebrow"><span /> SIMULAÇÃO SUSPENSA</p>
                <h2 id="pause-title">PAUSA</h2>
                <p>Todos os combatentes e perigos estão congelados no mesmo instante.</p>
                <div className="pause-controls">
                  <span><kbd>{formatBindingKey(settings.controls.red.up)}</kbd> mover</span><span><kbd>{formatBindingKey(settings.controls.red.attack)}</kbd> ataque</span><span><kbd>{formatBindingKey(settings.controls.red.special)}</kbd> especial</span><span><kbd>{formatBindingKey(settings.controls.red.ultimate)}</kbd> ultimate</span><span><kbd>{formatBindingKey(settings.controls.red.dash)}</kbd> esquiva</span>
                </div>
                <button ref={pausePrimaryRef} className="launch-button" type="button" onClick={resume}><span>CONTINUAR</span><small>Retomar o confronto</small><b>→</b></button>
                <button className="secondary-button" type="button" onClick={() => setShowSettings(true)}>CONFIGURAÇÕES</button>
                <button className="secondary-button" type="button" onClick={leaveMatch}>ABANDONAR PARTIDA</button>
              </div>
            </div>
          )}

          {result && (
            <div className="overlay-screen victory-overlay" role="dialog" aria-modal="true" aria-labelledby="victory-title">
              <div className={`victory-panel victory-panel--${result.winner}`}>
                <div className="victory-sigil"><ChampionMark id={result.winner === "red" ? redChampion : blueChampion} large /></div>
                <p className="eyebrow"><span /> CONFRONTO ENCERRADO</p>
                <h2 id="victory-title">{rule === "boss" ? result.winner === "red" ? "P1 DOMINOU A CAÇADA" : format === "solo" ? "A IA DOMINOU A CAÇADA" : "P2 DOMINOU A CAÇADA" : result.winner === "red" ? "RUBRO ASCENDEU" : format === "solo" ? "A IA DOMINOU" : "AZUL ASCENDEU"}</h2>
                <p>{rule === "boss" ? `${result.winner === "red" ? red.name : blue.name} liderou a contribuição quando Malakar caiu. Os dois caçadores puderam ressurgir durante toda a batalha.` : `${result.winner === "red" ? red.name : blue.name}, ${result.winner === "red" ? red.epithet : blue.epithet}, controlou o ritmo final da arena.`}</p>
                <div className="result-score"><b>{result.scoreRed}{rule === "boss" ? "%" : ""}</b><span>{rule === "boss" ? "CONTRIBUIÇÃO NO BOSS" : "PLACAR FINAL"}</span><b>{result.scoreBlue}{rule === "boss" ? "%" : ""}</b></div>
                <div className="result-stats">
                  <span><b>{rule === "boss" ? result.bossDamageRed : result.redDamage}</b><small>{rule === "boss" ? "DANO DE P1 NO BOSS" : "DANO RUBRO"}</small></span>
                  <span><b>{rule === "boss" ? result.bossDamageBlue : result.blueDamage}</b><small>{rule === "boss" ? "DANO DE P2 NO BOSS" : "DANO AZUL"}</small></span>
                  <span><b>{result.redDodges + result.blueDodges}</b><small>ESQUIVAS PERFEITAS</small></span>
                  <span><b>{formatTime(result.duration)}</b><small>TEMPO DE BATALHA</small></span>
                </div>
                <div className="victory-reward">✦ {lastReward ? `+${lastReward} PEDRAS ARCANAS · SALDO ${wallet.stones}` : "SEM PEDRAS ARCANAS NESTA PARTIDA"}</div>
                <div className="victory-actions">
                  <button ref={victoryPrimaryRef} className="launch-button" type="button" onClick={rematch}><span>REVANCHE</span><small>Mesmos campeões e regras</small><b>↻</b></button>
                  <button className="secondary-button" type="button" onClick={() => { setSetupStep("fighters"); setScreen("setup"); }}>ALTERAR CONFRONTO</button>
                  <button className="secondary-button" type="button" onClick={leaveMatch}>MENU PRINCIPAL</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {showGuide && (
        <div className="guide-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-title">
          <div className="guide-panel">
            <button ref={guideCloseRef} className="guide-close" type="button" onClick={() => setShowGuide(false)} aria-label="Fechar guia">×</button>
            <p className="eyebrow"><span /> MANUAL DO CAMPEÃO</p>
            <h2 id="guide-title">VENÇA COM LEITURA,<br />NÃO COM SORTE.</h2>
            <div className="guide-grid">
              <section><span>01</span><b>MOVIMENTO E MIRA</b><p>A mira contextual combina direção, distância, linha de visão e ameaça. No Boss Raid, use a tecla de trocar alvo para alternar manualmente entre Malakar e o rival.</p></section>
              <section><span>02</span><b>ESQUIVA PERFEITA</b><p>Escape instantes antes do impacto para ganhar 12% de ultimate e uma breve sobrecarga. Jogadores têm duas cargas; a IA Demoníaca tem seis.</p></section>
              <section><span>03</span><b>COBERTURA VIVA</b><p>Blocos dourados podem ser quebrados. Ataques pesados e a ultimate de Garran redesenham as rotas no meio do round.</p></section>
              <section><span>04</span><b>CINCO NÍVEIS DE IA</b><p>Do Fácil ao Profissional, o bot respeita limites de percepção. O Demoníaco é um desafio propositalmente injusto, com regeneração e recargas aceleradas.</p></section>
            </div>
            <div className="control-table">
              <div><b>P1 // RUBRO</b><span><kbd>{[settings.controls.red.up, settings.controls.red.left, settings.controls.red.down, settings.controls.red.right].map(formatBindingKey).join(" ")}</kbd> mover</span><span><kbd>{formatBindingKey(settings.controls.red.attack)}</kbd> ataque</span><span><kbd>{formatBindingKey(settings.controls.red.special)}</kbd> especial</span><span><kbd>{formatBindingKey(settings.controls.red.ultimate)}</kbd> ultimate</span><span><kbd>{formatBindingKey(settings.controls.red.dash)}</kbd> esquiva</span></div>
              <div><b>P2 // AZUL</b><span><kbd>{[settings.controls.blue.up, settings.controls.blue.left, settings.controls.blue.down, settings.controls.blue.right].map(formatBindingKey).join(" ")}</kbd> mover</span><span><kbd>{formatBindingKey(settings.controls.blue.attack)}</kbd> ataque</span><span><kbd>{formatBindingKey(settings.controls.blue.special)}</kbd> especial</span><span><kbd>{formatBindingKey(settings.controls.blue.ultimate)}</kbd> ultimate</span><span><kbd>{formatBindingKey(settings.controls.blue.dash)}</kbd> esquiva</span></div>
            </div>
            <p className="guide-footnote"><kbd>ESC</kbd> pausa <i /> <kbd>M</kbd> áudio <i /> <kbd>F3</kbd> diagnóstico da IA</p>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="settings-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="settings-panel">
            <button ref={settingsCloseRef} className="guide-close" type="button" onClick={() => { setShowSettings(false); setListeningBinding(null); }} aria-label="Fechar configurações">×</button>
            <p className="eyebrow"><span /> CENTRAL DO ARCADE</p>
            <h2 id="settings-title">CONFIGURAÇÕES</h2>
            <p className="settings-intro">Áudio, efeitos e todos os comandos ficam salvos neste dispositivo.</p>

            <section className="settings-audio" aria-labelledby="audio-settings-title">
              <h3 id="audio-settings-title">MIXAGEM DE ÁUDIO</h3>
              {(["master", "music", "sfx"] as VolumeChannel[]).map((channel) => (
                <label className="settings-range" key={channel}>
                  <span>{channel === "master" ? "VOLUME GERAL" : channel === "music" ? "MÚSICA 16-BIT" : "EFEITOS"}</span>
                  <input type="range" min="0" max="100" step="1" value={volumeToPercent(settings.audio[channel])} onChange={(event) => setAudioChannel(channel, Number(event.target.value))} />
                  <b>{volumeToPercent(settings.audio[channel])}%</b>
                </label>
              ))}
              <div className="settings-toggles">
                <label><input type="checkbox" checked={settings.effects.screenShake} onChange={(event) => commitSettings(setEffect(settings, "screenShake", event.target.checked))} /><span /> Tremor de tela</label>
                <label><input type="checkbox" checked={settings.effects.reducedMotion} onChange={(event) => commitSettings(setEffect(settings, "reducedMotion", event.target.checked))} /><span /> Movimento reduzido</label>
              </div>
            </section>

            <section className="settings-controls" aria-labelledby="controls-settings-title">
              <h3 id="controls-settings-title">CONTROLES DOS JOGADORES</h3>
              <p>Clique em uma tecla e pressione a nova. Se já estiver em uso, os dois comandos trocam de lugar.</p>
              <div className="control-grid">
                {(["red", "blue"] as PlayerId[]).map((player) => (
                  <div className={`control-column control-column--${player}`} key={player}>
                    <h4>{PLAYER_LABELS[player]}{" // "}{player === "red" ? "RUBRO" : "AZUL"}</h4>
                    {CONTROL_ACTIONS.map((action) => {
                      const listening = listeningBinding?.player === player && listeningBinding.action === action;
                      return (
                        <button className={`control-binding ${listening ? "listening" : ""}`} key={action} type="button" onClick={() => { setListeningBinding({ player, action, path: `controls.${player}.${action}` }); setSettingsNotice("Pressione uma tecla…"); }}>
                          <span>{CONTROL_ACTION_LABELS[action]}</span><kbd>{listening ? "…" : formatBindingKey(settings.controls[player][action])}</kbd>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="settings-notice" aria-live="polite">{settingsNotice || "ESC cancela. P, M e F1–F12 são reservadas pelo jogo ou navegador."}</p>
            </section>

            <div className="settings-actions">
              <button className="secondary-button" type="button" onClick={() => { const defaults = resetSettings(); commitSettings(defaults); setSettingsNotice("Configurações padrão restauradas."); }}>RESTAURAR PADRÃO</button>
              <button className="launch-button" type="button" onClick={() => { saveSettings(settings); setShowSettings(false); setListeningBinding(null); }}><span>SALVAR E FECHAR</span><small>Aplicar instantaneamente</small><b>→</b></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
