# BSEBET i18n — Sistema de Internacionalizacao

**Data:** 2026-05-01
**Status:** Aprovado
**Escopo:** Traducao completa do site BSEBET para ingles (com portugues mantido como idioma padrao/fallback).

---

## 1. Resumo

Implementar um sistema de internacionalizacao completo usando **react-i18next** com prefixo de idioma na URL (`/pt/`, `/en/`). Todas as ~40 fontes de strings hardcoded atualmente misturadas entre portugues e ingles serao extraidas para arquivos JSON organizados por namespace.

O sistema suporta:
- Portugues (default/fallback) e Ingles
- URL path prefix para SEO e compartilhamento
- Traducao de todas as telas (publicas, admin, mensagens de servidor)
- Pluralizacao, interpolacao e formatacao de data/numero por locale

---

## 2. Abordagem: Big Bang

Migracao unica: infraestrutura + todos os arquivos traduzidos + substituicao de strings em um esforco coordenado.

**Justificativa:** Evita o estado hibrido onde algumas strings usam `t()` e outras continuam hardcoded. Com ~40 arquivos, e um volume gerenciavel para um unico ciclo de implementacao.

---

## 3. Stack e Dependencias

| Componente | Tecnologia |
|---|---|
| Core i18n | `i18next` + `react-i18next` |
| Deteccao de idioma | URL path prefix (`$lang` no TanStack Router) |
| SSR | Integracao nativa via `useTranslation()` no primeiro render |
| Formatacao de data/numero | `Intl.DateTimeFormat` / `Intl.NumberFormat` via locale |
| Lazy loading de namespaces | Nao necessario (URL prefix = idioma conhecido antes do render) |

---

## 4. Arquitetura de Rotas

### Antes
```
routes/
├── __root.tsx
├── index.tsx
├── dashboard.tsx
├── ...
```

### Depois
```
routes/
├── __root.tsx                        ← wrapper com I18nProvider (sem $lang)
├── $.tsx                             ← catch-all: redireciona / para /pt/
├── $lang/                            ← segmento de idioma ("pt" | "en")
│   ├── __layout.tsx                  ← inicia i18next com lang dos params
│   ├── index.tsx                     ← /:lang/
│   ├── dashboard.tsx                 ← /:lang/dashboard
│   ├── landing.tsx                   ← /:lang/landing
│   ├── leaderboard.tsx               ← /:lang/leaderboard
│   ├── login.tsx                     ← /:lang/login
│   ├── my-bets.tsx                   ← /:lang/my-bets
│   ├── profile.tsx                   ← /:lang/profile
│   ├── tournaments/
│   │   ├── index.tsx                 ← /:lang/tournaments
│   │   └── $slug.tsx                 ← /:lang/tournaments/:slug
│   ├── teams/
│   │   └── $teamId.tsx               ← /:lang/teams/:teamId
│   ├── users/
│   │   └── $userId.tsx               ← /:lang/users/:userId
│   └── admin/
│       ├── tournaments/
│       │   ├── index.tsx             ← /:lang/admin/tournaments
│       │   └── $tournamentId/matches.tsx
│       ├── teams.tsx                 ← /:lang/admin/teams
│       ├── users.tsx                 ← /:lang/admin/users
│       ├── compensations.tsx         ← /:lang/admin/compensations
│       ├── live/$matchId.tsx         ← /:lang/admin/live/:matchId
│       └── migrate-logos.tsx         ← /:lang/admin/migrate-logos
├── api/                              ← inalterado (nao precisa de i18n)
│   ├── trpc/$.ts
│   └── auth/$.ts
```

**Validacao de `$lang`:** Apenas `"pt"` e `"en"` aceitos. Qualquer outro valor redireciona para `/pt/`.

**Redirecionamento da raiz:** `/` → `/pt/` (portugues como idioma padrao).

**`$lang/__layout.tsx`:** Responsavel por:
- Extrair `lang` de `useParams()`
- Sincronizar `i18next.changeLanguage(lang)`
- Prover contexto i18next para todos os filhos

---

## 5. Estrutura de Arquivos de Traducao

### Localizacao fisica
```
apps/web/public/locales/
├── pt/
│   ├── common.json
│   ├── betting.json
│   ├── dashboard.json
│   ├── my-bets.json
│   ├── leaderboard.json
│   ├── profile.json
│   ├── tournament.json
│   ├── team.json
│   ├── user.json
│   ├── landing.json
│   ├── admin.json
│   ├── admin-matches.json
│   ├── errors.json
│   └── validation.json
├── en/
│   ├── common.json
│   ├── betting.json
│   ├── ... (mesmo conjunto)
```

### Infra config
```
apps/web/src/i18n/
├── index.ts           ← init i18next, exporta instancia
├── config.ts          ← config padrao (fallbackLng, interpolation, etc.)
└── namespaces.ts      ← enum/union type dos namespaces para type-safety
```

### Mapeamento de Namespaces

| Namespace | Conteudo | Rotas/Arquivos |
|---|---|---|
| `common` | Header, navegacao, botoes genericos, status labels (scheduled/live/finished) | `__layout.tsx`, `GlobalHeader.tsx`, `user-menu.tsx`, `MatchDaySelector.tsx` |
| `betting` | Home, betting carousel, match cards, recovery | `$lang/index.tsx`, `BettingCarousel.tsx`, `MatchCard.tsx`, `bracket/MatchCard.tsx`, `TournamentBracket.tsx` |
| `dashboard` | Dashboard do usuario | `$lang/dashboard.tsx` |
| `my-bets` | Historico de apostas | `$lang/my-bets.tsx` |
| `leaderboard` | Rankings e criterios | `$lang/leaderboard.tsx` |
| `profile` | Perfil e user-menu | `$lang/profile.tsx`, `user-menu.tsx` |
| `tournament` | Lista de torneios, detalhe, bracket, podium, standings | `$lang/tournaments/*`, `TournamentPodium.tsx`, `TournamentSelector.tsx`, `bracket/StandingsTable.tsx`, `GSLResultView.tsx` |
| `team` | Perfil de time | `$lang/teams/$teamId.tsx` |
| `user` | Perfil publico de usuario | `$lang/users/$userId.tsx`, `MedalSummary.tsx` |
| `landing` | Landing page + login | `$lang/landing.tsx`, `$lang/login.tsx`, `LandingPage.tsx` |
| `admin` | Admin geral (usuarios, times, compensacoes, migracao) | `$lang/admin/*` (exceto matches) |
| `admin-matches` | Gerenciamento de partidas + live scoring | `$lang/admin/tournaments/$tournamentId/matches.tsx`, `$lang/admin/live/$matchId.tsx` |
| `errors` | Mensagens de erro do servidor | Todos os arquivos em `server/*.ts` |
| `validation` | Mensagens de validacao Zod | `server/*.ts`, `utils/validators.ts` |

---

## 6. Integracao com Componentes React

### Padrao basico
```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("betting");
  return <h1>{t("hero.title")}</h1>;
}
```

### Status labels (ENUMs do DB)
```json
// common.json
{
  "matchStatus.scheduled": "Agendado",
  "matchStatus.live": "Ao Vivo",
  "matchStatus.finished": "Finalizado",
  "matchStatus.locked": "Trancado",
  "matchStatus.draft": "Rascunho",
  "matchStatus.open": "Aberto"
}
```
Uso: `t(`common:matchStatus.${match.status}`)`

### Plurais
```json
// betting.json
{
  "betCount_one": "{{count}} palpite",
  "betCount_other": "{{count}} palpites"
}
```
Uso: `t("betting:betCount", { count })`

Nota: `react-i18next` usa sufixo `_one`/`_other` para pt, `_one`/`_other` para en.

### Interpolacao
```json
// betting.json
{
  "underdogBonus": "Bonus azarao (+{{percent}}%)"
}
```
Uso: `t("betting:underdogBonus", { percent: 25 })`

---

## 7. Integracao com Server Functions

### Modificacao de assinatura
Server functions que retornam mensagens de erro precisam receber `lang`:

```ts
// Antes
export const placeBet = createServerFn({ method: "POST" })
  .input(z.object({ matchId: z.string(), winnerId: z.string() }))
  .handler(async ({ input, context }) => {
    if (!context.user) throw new Error("Usuario nao autenticado");
  });

// Depois
export const placeBet = createServerFn({ method: "POST" })
  .input(z.object({
    matchId: z.string(),
    winnerId: z.string(),
    lang: z.enum(["pt", "en"]).default("pt"),
  }))
  .handler(async ({ input, context }) => {
    const t = getServerT(input.lang);
    if (!context.user) throw new Error(t("errors:unauthenticated"));
  });
```

### Helper `getServerT`
```ts
// src/i18n/index.ts
import { createInstance } from "i18next";

let serverInstance: i18n | null = null;

export async function getServerT(lang: "pt" | "en") {
  if (!serverInstance) {
    serverInstance = createInstance();
    await serverInstance.init({
      lng: lang,
      fallbackLng: "pt",
      resources: { pt: {}, en: {} }, // carregado via fs ou import
    });
  }
  return serverInstance.getFixedT(lang);
}
```

Opcional: pre-carregar os JSONs no bundle via import estatico para evitar fs no runtime.

---

## 8. Fallback Chain e Edge Cases

### Ordem de resolucao de chave
1. Procura no namespace especifico do idioma atual (ex: `en/betting.json`)
2. Procura em `en/common.json`
3. Fallback para `pt/betting.json` (fallbackLng)
4. Se nao encontrar, retorna a propria chave como texto (`"betting.hero.title"`)

### Deteccao de chaves ausentes
- **Dev:** `saveMissing: true` — loga no console + pode salvar em arquivo
- **Producao:** `returnNull: false` — exibe a chave como fallback (nunca mostra espaco em branco)

### Dados que NAO devem ser traduzidos
- Nomes de times (ex: "FUT Esports", "SKCalalas") — dados do banco
- Nomes de torneios (ex: "Brawl Stars Championship 2026") — dados do banco
- Nomes de usuario / display names — dados do perfil
- Siglas de regioes (ex: "EMEA", "NA", "SA") — nomes proprios no contexto de esports
- Enums/status internos (ex: `"scheduled"`, `"live"`, `"finished"`) — continuam em ingles no codigo, traduzidos apenas na UI

### Formatacao de data
```ts
const locale = lang === "pt" ? "pt-BR" : "en-US";
new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
```

### Formatacao de numero
```ts
new Intl.NumberFormat(locale).format(points);
```

### `<html lang>` dinamico
```tsx
// __root.tsx
<html lang={lang}>  // "pt" ou "en" vindo da URL
```

---

## 9. Fluxo de Implementacao (Big Bang)

### Fase 1 — Infraestrutura
1. Instalar `i18next` + `react-i18next`
2. Criar `src/i18n/config.ts`, `src/i18n/namespaces.ts`, `src/i18n/index.ts`
3. Criar a estrutura de diretorios `public/locales/pt/` e `public/locales/en/`
4. Reestruturar a arvore de rotas (mover tudo para `$lang/`)
5. Criar `$lang/__layout.tsx` com `I18nextProvider` + `changeLanguage()`
6. Criar `$.tsx` (catch-all redirecionando `/` para `/pt/`)
7. Atualizar `__root.tsx` com `<html lang={lang}>` dinamico

### Fase 2 — Extracao e Traducao
8. Preencher todos os `pt/*.json` extraindo strings dos ~40 arquivos existentes
9. Traduzir `pt/*.json` → `en/*.json` (manualmente ou com auxilio de IA, revisando contexto)
10. Refatorar todos os componentes: substituir strings hardcoded por `t()` calls
11. Refatorar server functions: adicionar `lang` ao input, usar `getServerT(lang)`
12. Atualizar `src/utils/recovery*.test.ts`: traduzir descricoes de teste tambem

### Fase 3 — Validacao
13. Rodar `bun run check-types`
14. Rodar `bun run check` (Biome lint + format)
15. Rodar `bun test` (testes de recovery)
16. Rodar `bun run build`
17. Teste manual: navegar entre `/pt/` e `/en/`, verificar todas as telas

---

## 10. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| **Regressao visual:** texto em ingles ~30% mais longo que portugues, componentes podem quebrar layout | Revisar cada tela apos traducao; usar `truncate` / `break-words` onde necessario; testar em resolucoes mobile |
| **Chaves esquecidas:** strings hardcoded que escapam da migracao | Usar grep por padroes de texto em portugues apos a migracao para encontrar remanescentes |
| **Route tree generation:** `routeTree.gen.ts` precisa ser regenerado apos reestruturacao | Rodar o comando de geracao do TanStack Router apos mover rotas |
| **Server functions quebrando:** adicionar `lang` ao input pode quebrar callers existentes | Definir `lang` com `.default("pt")` para manter retrocompatibilidade nos clientes que nao passam o campo |
| **Traducao incorreta de contexto:** strings identicas em portugues podem ter traducao diferente em ingles dependendo do contexto | Nomes de chave devem ser semanticos e especificos para evitar ambiguidade; revisao manual das traducoes |

---

## 11. Criterios de Sucesso

- [ ] Todas as rotas funcionam com prefixo `/pt/` e `/en/`
- [ ] `/` redireciona para `/pt/`
- [ ] Nenhuma string hardcoded em portugues permanece nos componentes
- [ ] Server functions retornam erros no idioma correto
- [ ] Pluralizacao funciona (ex: "1 palpite" vs "2 palpites" vs "1 bet" vs "2 bets")
- [ ] Formatacao de data segue o locale correto (ex: "1 de maio de 2026" vs "May 1, 2026")
- [ ] `<html lang>` reflete o idioma ativo
- [ ] `bun run check-types` passa
- [ ] `bun run check` passa
- [ ] `bun run build` passa
- [ ] `bun test` passa
- [ ] Layout nao quebra com textos em ingles
