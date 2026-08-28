export type ChampionId =
  | "cinder"
  | "ranger"
  | "bulwark"
  | "wraith"
  | "chrono"
  | "storm"
  | "necromancer"
  | "alchemist"
  | "overlord";

export type ChampionStyle =
  | "mystic"
  | "ranger"
  | "guardian"
  | "assassin"
  | "chronomancer"
  | "monk"
  | "necromancer"
  | "alchemist"
  | "boss";

export type AttackStyle = "bolt" | "arrow" | "spread" | "melee" | "orb" | "chain" | "soul" | "vial";

export type Champion = {
  id: ChampionId;
  name: string;
  epithet: string;
  role: string;
  bio: string;
  accent: string;
  accent2: string;
  style: ChampionStyle;
  attackStyle: AttackStyle;
  hp: number;
  speed: number;
  damage: number;
  attackRate: number;
  projectileSpeed: number;
  range: number;
  idealRange: number;
  specialName: string;
  specialDescription: string;
  specialCooldown: number;
  ultimateName: string;
  ultimateDescription: string;
  traits: [string, string];
  difficulty: "Fácil" | "Médio" | "Difícil";
};

export const CHAMPIONS: Record<ChampionId, Champion> = {
  cinder: {
    id: "cinder",
    name: "Asha",
    epithet: "Coração da Forja",
    role: "Controle de terreno",
    bio: "Uma artífice do fogo estelar. Asha fecha rotas e transforma cada erro de posição em uma reação em cadeia.",
    accent: "#ff6b35",
    accent2: "#ffd36a",
    style: "mystic",
    attackStyle: "bolt",
    hp: 230,
    speed: 245,
    damage: 18,
    attackRate: 0.48,
    projectileSpeed: 610,
    range: 720,
    idealRange: 390,
    specialName: "Fenda Incandescente",
    specialDescription: "Leque de brasas que deixa uma cicatriz ardente no chão.",
    specialCooldown: 8.5,
    ultimateName: "Coroa de Meteoros",
    ultimateDescription: "Marca a rota prevista do rival e bombardeia a região em ondas.",
    traits: ["Queimadura", "Zona persistente"],
    difficulty: "Fácil",
  },
  ranger: {
    id: "ranger",
    name: "Kael",
    epithet: "Olho Celeste",
    role: "Precisão e mobilidade",
    bio: "O cartógrafo das constelações luta à distância, reposiciona-se rápido e pune trajetórias previsíveis.",
    accent: "#9ee493",
    accent2: "#f0e6a6",
    style: "ranger",
    attackStyle: "arrow",
    hp: 205,
    speed: 292,
    damage: 14,
    attackRate: 0.32,
    projectileSpeed: 830,
    range: 920,
    idealRange: 510,
    specialName: "Salto do Falcão",
    specialDescription: "Recua e chama uma sequência de flechas sobre a posição futura do alvo.",
    specialCooldown: 8,
    ultimateName: "Atlas das Estrelas",
    ultimateDescription: "Uma constelação fecha as saídas antes do disparo perfurante final.",
    traits: ["Longo alcance", "Reposicionamento"],
    difficulty: "Médio",
  },
  bulwark: {
    id: "bulwark",
    name: "Garran",
    epithet: "Bastião do Eclipse",
    role: "Tanque de avanço",
    bio: "A última muralha da antiga ordem. Garran absorve pressão e transforma defesa em impacto.",
    accent: "#d6c7a1",
    accent2: "#f1b94b",
    style: "guardian",
    attackStyle: "spread",
    hp: 330,
    speed: 218,
    damage: 13,
    attackRate: 0.64,
    projectileSpeed: 570,
    range: 470,
    idealRange: 245,
    specialName: "Égide Sísmica",
    specialDescription: "Ergue o escudo, reduz dano frontal e libera uma onda de choque.",
    specialCooldown: 10,
    ultimateName: "Marcha do Colosso",
    ultimateDescription: "Uma investida imparável que destrói coberturas e arrasta o oponente.",
    traits: ["Armadura frontal", "Rompedor"],
    difficulty: "Fácil",
  },
  wraith: {
    id: "wraith",
    name: "Nyx",
    epithet: "Lâmina do Véu",
    role: "Assassina de flanco",
    bio: "Nyx luta entre uma sombra e outra. Ela cria ângulos impossíveis e executa rivais isolados.",
    accent: "#c7a6ff",
    accent2: "#ff6db4",
    style: "assassin",
    attackStyle: "melee",
    hp: 215,
    speed: 318,
    damage: 29,
    attackRate: 0.42,
    projectileSpeed: 0,
    range: 92,
    idealRange: 115,
    specialName: "Passo Entre Sombras",
    specialDescription: "Some por um instante e reaparece no flanco do alvo com uma marca.",
    specialCooldown: 8.8,
    ultimateName: "Noite Sem Testemunhas",
    ultimateDescription: "O campo escurece e Nyx desfere quatro cortes em posições sucessivas.",
    traits: ["Furtividade", "Execução"],
    difficulty: "Difícil",
  },
  chrono: {
    id: "chrono",
    name: "Orin",
    epithet: "Arquivista do Tempo",
    role: "Manipulação temporal",
    bio: "Orin não prevê resultados: arquiva tentativas e escolhe qual delas deve continuar existindo.",
    accent: "#f6df72",
    accent2: "#66e0ff",
    style: "chronomancer",
    attackStyle: "orb",
    hp: 225,
    speed: 252,
    damage: 17,
    attackRate: 0.5,
    projectileSpeed: 660,
    range: 760,
    idealRange: 390,
    specialName: "Ponto de Retorno",
    specialDescription: "Volta ao estado de dois segundos atrás e rompe o tempo na posição deixada.",
    specialCooldown: 10.5,
    ultimateName: "Segundo Impossível",
    ultimateDescription: "Congela a leitura do rival e dispara ecos de futuros descartados.",
    traits: ["Rebobinar", "Lentidão"],
    difficulty: "Difícil",
  },
  storm: {
    id: "storm",
    name: "Zaya",
    epithet: "Pulso da Tempestade",
    role: "Mobilidade ofensiva",
    bio: "Uma monja que escuta a eletricidade sob a arena. Zaya encadeia alvos e vive em movimento.",
    accent: "#67f5eb",
    accent2: "#88a8ff",
    style: "monk",
    attackStyle: "chain",
    hp: 218,
    speed: 304,
    damage: 15,
    attackRate: 0.39,
    projectileSpeed: 735,
    range: 680,
    idealRange: 310,
    specialName: "Travessia Relâmpago",
    specialDescription: "Cruza uma linha em alta velocidade e deixa três descargas no caminho.",
    specialCooldown: 7.4,
    ultimateName: "Forma da Tormenta",
    ultimateDescription: "Vira um condutor vivo; raios saltam do seu corpo enquanto ela acelera.",
    traits: ["Dano em cadeia", "Alta mobilidade"],
    difficulty: "Médio",
  },
  necromancer: {
    id: "necromancer",
    name: "Mordran",
    epithet: "Pastor do Ossuário",
    role: "Invocador tático",
    bio: "As ruínas obedecem ao seu cajado. Mordran ocupa espaço com sentinelas e divide a atenção rival.",
    accent: "#b491e8",
    accent2: "#d9d1b8",
    style: "necromancer",
    attackStyle: "soul",
    hp: 240,
    speed: 228,
    damage: 20,
    attackRate: 0.62,
    projectileSpeed: 525,
    range: 700,
    idealRange: 430,
    specialName: "Guarda dos Sem-Nome",
    specialDescription: "Convoca duas sentinelas espectrais em posições seguras.",
    specialCooldown: 11,
    ultimateName: "Catedral de Ossos",
    ultimateDescription: "Ergue um titã que ataca e cria uma zona de domínio ao seu redor.",
    traits: ["Invocações", "Pressão indireta"],
    difficulty: "Difícil",
  },
  alchemist: {
    id: "alchemist",
    name: "Vela",
    epithet: "Química do Abismo",
    role: "Negação de área",
    bio: "Vela engarrafa matéria da Fenda. Seus compostos obrigam o rival a escolher qual perigo atravessar.",
    accent: "#9aea64",
    accent2: "#f6c453",
    style: "alchemist",
    attackStyle: "vial",
    hp: 232,
    speed: 248,
    damage: 16,
    attackRate: 0.54,
    projectileSpeed: 590,
    range: 720,
    idealRange: 370,
    specialName: "Tríade Instável",
    specialDescription: "Arremessa três compostos que ricocheteiam e deixam poças reativas.",
    specialCooldown: 9.2,
    ultimateName: "Atmosfera Hostil",
    ultimateDescription: "Cria um campo tóxico colossal e fixo, cercado por poças menores que fecham rotas.",
    traits: ["Veneno", "Ricochete"],
    difficulty: "Médio",
  },
  overlord: {
    id: "overlord",
    name: "Malakar",
    epithet: "Rei da Fenda",
    role: "Boss de três fases",
    bio: "O antigo soberano do arcade desperta no Trono Partido. Seus padrões mudam a cada fase e cobrem toda a arena.",
    accent: "#d95bff",
    accent2: "#ffcc66",
    style: "boss",
    attackStyle: "spread",
    hp: 1680,
    speed: 156,
    damage: 24,
    attackRate: 0.72,
    projectileSpeed: 610,
    range: 980,
    idealRange: 330,
    specialName: "Punho do Abismo",
    specialDescription: "Golpes telegrafados, ondas rúnicas e meteoros que fecham as rotas.",
    specialCooldown: 5.8,
    ultimateName: "Eclipse Terminal",
    ultimateDescription: "Malakar fragmenta a arena em uma tempestade de meteoros e feixes cruzados.",
    traits: ["Três fases", "Padrões de arcade"],
    difficulty: "Difícil",
  },
};

export const CHAMPION_LIST = Object.values(CHAMPIONS).filter((champion) => champion.id !== "overlord");

export type ArenaId = "rift" | "forge" | "clockwork" | "citadel";

export const ARENAS: Record<
  ArenaId,
  { name: string; subtitle: string; accent: string; description: string; event: string }
> = {
  rift: {
    name: "Coliseu da Fenda",
    subtitle: "Arena balanceada",
    accent: "#6fd8d1",
    description: "Coberturas simétricas, núcleo central e rotas laterais sobre o vazio.",
    event: "A Fenda pulsa e energiza o núcleo central.",
  },
  forge: {
    name: "Forja Solar",
    subtitle: "Terreno mutável",
    accent: "#ff8548",
    description: "Respiradouros avisam antes de incendiar corredores e destruir cobertura.",
    event: "Canais de magma despertam em ciclos previsíveis.",
  },
  clockwork: {
    name: "Relógio Celeste",
    subtitle: "Controle temporal",
    accent: "#e2c75d",
    description: "Poços alternam entre acelerar recargas e desacelerar movimento.",
    event: "O mecanismo muda de fase a cada doze segundos.",
  },
  citadel: {
    name: "Trono Partido",
    subtitle: "Arena colossal do Boss",
    accent: "#d95bff",
    description: "Uma arena colossal de 2240 × 1260, com doze estruturas rúnicas, rotas largas e espaço para a disputa entre dois caçadores e Malakar.",
    event: "O Rei da Fenda acelera seus padrões enquanto os rivais disputam a maior contribuição de dano.",
  },
};

export type MatchFormat = "solo" | "local";
export type RuleId = "duel" | "dominion" | "boss";
export type DifficultyId = "easy" | "intermediate" | "advanced" | "professional" | "demonic";

export type DifficultyDefinition = {
  name: string;
  label: string;
  reaction: number;
  thinkHz: number;
  aimError: number;
  horizon: number;
  aggression: number;
  decisionPool: number;
  evadeRisk: number;
  abilityUse: number;
  ultimateThreshold: number;
  bot: {
    hpRegen: number;
    attackCooldownScale: number;
    specialCooldownScale: number;
    ultimateGainScale: number;
    dashRechargeScale: number;
    maxDashes: number;
    movementScale: number;
    damageScale: number;
  };
  boss: {
    hpScale: number;
    patternTempo: number;
    movementPressure: number;
    attackCooldownScale: number;
    damageScale: number;
  };
};

export const DIFFICULTIES: Record<DifficultyId, DifficultyDefinition> = {
  easy: {
    name: "Fácil",
    label: "Reage devagar e deixa rotas de fuga",
    reaction: 0.38,
    thinkHz: 5,
    aimError: 0.18,
    horizon: 0.32,
    aggression: 0.34,
    decisionPool: 5,
    evadeRisk: 0.92,
    abilityUse: 0.68,
    ultimateThreshold: 0.72,
    bot: { hpRegen: 0, attackCooldownScale: 1, specialCooldownScale: 1, ultimateGainScale: 1, dashRechargeScale: 1, maxDashes: 2, movementScale: 1, damageScale: 1 },
    boss: { hpScale: 0.72, patternTempo: 1.24, movementPressure: 0.82, attackCooldownScale: 1.18, damageScale: 0.82 },
  },
  intermediate: {
    name: "Intermediário",
    label: "Fundamentos sólidos sem antecipação perfeita",
    reaction: 0.24,
    thinkHz: 8,
    aimError: 0.105,
    horizon: 0.52,
    aggression: 0.49,
    decisionPool: 3,
    evadeRisk: 0.8,
    abilityUse: 0.88,
    ultimateThreshold: 0.61,
    bot: { hpRegen: 0, attackCooldownScale: 1, specialCooldownScale: 1, ultimateGainScale: 1, dashRechargeScale: 1, maxDashes: 2, movementScale: 1, damageScale: 1 },
    boss: { hpScale: 0.88, patternTempo: 1.1, movementPressure: 0.93, attackCooldownScale: 1.08, damageScale: 0.92 },
  },
  advanced: {
    name: "Avançado",
    label: "Prevê disparos, flanqueia e administra recursos",
    reaction: 0.15,
    thinkHz: 11,
    aimError: 0.058,
    horizon: 0.74,
    aggression: 0.64,
    decisionPool: 2,
    evadeRisk: 0.68,
    abilityUse: 1,
    ultimateThreshold: 0.53,
    bot: { hpRegen: 0, attackCooldownScale: 1, specialCooldownScale: 1, ultimateGainScale: 1, dashRechargeScale: 1, maxDashes: 2, movementScale: 1, damageScale: 1 },
    boss: { hpScale: 1, patternTempo: 1, movementPressure: 1, attackCooldownScale: 1, damageScale: 1 },
  },
  professional: {
    name: "Profissional",
    label: "Intercepta, pune recargas e quase não desperdiça ações",
    reaction: 0.082,
    thinkHz: 16,
    aimError: 0.022,
    horizon: 1.02,
    aggression: 0.8,
    decisionPool: 1,
    evadeRisk: 0.54,
    abilityUse: 1.18,
    ultimateThreshold: 0.45,
    bot: { hpRegen: 0, attackCooldownScale: 1, specialCooldownScale: 1, ultimateGainScale: 1, dashRechargeScale: 1, maxDashes: 2, movementScale: 1, damageScale: 1 },
    boss: { hpScale: 1.14, patternTempo: 0.84, movementPressure: 1.12, attackCooldownScale: 0.84, damageScale: 1.12 },
  },
  demonic: {
    name: "Demoníaco",
    label: "Sem piedade: regeneração, seis dashes e recargas roubadas",
    reaction: 0.025,
    thinkHz: 24,
    aimError: 0.005,
    horizon: 1.3,
    aggression: 0.97,
    decisionPool: 1,
    evadeRisk: 0.38,
    abilityUse: 1.55,
    ultimateThreshold: 0.34,
    bot: { hpRegen: 2.2, attackCooldownScale: 0.78, specialCooldownScale: 0.58, ultimateGainScale: 1.72, dashRechargeScale: 3.4, maxDashes: 6, movementScale: 1.09, damageScale: 1.1 },
    boss: { hpScale: 1.32, patternTempo: 0.66, movementPressure: 1.24, attackCooldownScale: 0.68, damageScale: 1.25 },
  },
};

export const CONTROLS = {
  red: { up: "w", down: "s", left: "a", right: "d", attack: "f", special: "g", ultimate: "h", dash: "shift", target: "e" },
  blue: { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", attack: "j", special: "k", ultimate: "l", dash: "n", target: "i" },
} as const;
