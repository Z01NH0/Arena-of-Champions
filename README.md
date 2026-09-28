# Riftbound — Arena Ascendant

Jogo local de arena em React, TypeScript e Canvas. Há duelo, Dominação de três núcleos e Boss Raid contra Malakar, com um jogador contra IA ou dois jogadores no mesmo dispositivo.

## Executar

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Para gerar arquivos estáticos de produção, execute `npm run build` e publique o conteúdo de `dist/`.

## Progressão

- Asha está liberada inicialmente. As demais personagens custam de 10 a 30 Pedras Arcanas na Loja.
- Vitória solo contra IA rende 2 pedras; vitória local com dois jogadores rende 1; vitória contra o Boss rende 5 no solo e 4 no modo local. Derrota solo não rende pedras.
- A carteira e os desbloqueios são compartilhados por P1 e P2 e guardados no armazenamento local deste navegador (`riftbound-arcane-stones-v1`). Limpar os dados do site apaga essa progressão. Não há conta ou sincronização entre dispositivos.
- No modo solo, apenas P1 é selecionado. A IA recebe um campeão aleatório quando a partida começa; os desbloqueados entram primeiro no sorteio, e, se só Asha estiver disponível, outro campeão é sorteado para evitar espelho obrigatório.
- Informações das habilidades ficam na Loja. Campeões bloqueados aparecem em cinza com cadeado na seleção.

## Estrutura

- `src/ArenaGame.tsx`: fluxo de menus, seleção, Loja, HUD e resultado.
- `src/game/data.ts`: campeões, arenas, dificuldades e regras.
- `src/game/economy.ts`: preços, persistência, compra e recompensas.
- `src/game/engine.ts`: simulação, IA, mapas, objetivos e resultados.
- `src/game/pixel-art.ts`: desenho da arena e dos combatentes.
- `src/game/settings.ts`: controles e opções persistentes.
- `src/styles.css`: interface e adaptações de tela.

Na Dominação, a posse do núcleo é perdida quando a captura volta a zero; a IA procura pontos livres ou inimigos e defende pontos ameaçados. As arenas Coliseu, Forja e Relógio usam coberturas simétricas com eventos próprios. O Trono Partido é exclusivo do Boss Raid.
