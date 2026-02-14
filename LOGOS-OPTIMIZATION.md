# Otimização de Logos Base64

## O Problema

As logos dos times em **Base64** estavam consumindo muito egress:

- Base64 aumenta o tamanho em ~33%
- Se uma logo tem 50KB, em Base64 vira ~67KB
- Carregadas em TODAS as queries de matches (mesmo quando não visíveis)
- Não são cacheáveis pelo CDN

## A Solução

### 1. Remover logos das queries principais

**Antes:**
```typescript
const teams = await db.query.teams.findMany({
  columns: {
    id: true,
    name: true,
    logoUrl: true, // ❌ Base64 pesado em toda query!
  }
});
```

**Depois:**
```typescript
const teams = await db.query.teams.findMany({
  columns: {
    id: true,
    name: true,
    // logoUrl REMOVIDO - carregado separadamente
  }
});
```

### 2. Endpoint separado para logos

Arquivo: `apps/web/src/server/logos.ts`

- Busca logos sob demanda
- Cache de 1 hora (logos raramente mudam)
- Busca apenas as necessárias

### 3. Componente otimizado

Arquivo: `apps/web/src/components/TeamLogo.tsx`

```tsx
<TeamLogo teamId={1} teamName="Team Name" size="md" />
```

Carrega a logo apenas quando o componente é renderizado.

## Uso

### Buscar uma logo:
```typescript
import { getTeamLogo } from "../server/logos";

const { logoUrl } = await getTeamLogo({ data: { teamId: 1 } });
```

### Buscar múltiplas logos:
```typescript
import { getTeamLogos } from "../server/logos";

const logos = await getTeamLogos({ data: { teamIds: [1, 2, 3] } });
// Resultado: { 1: "data:image/png;base64,...", 2: null, 3: "..." }
```

### Componente React:
```tsx
import { TeamLogo } from "../components/TeamLogo";

<TeamLogo teamId={1} teamName="Team Name" size="lg" />
```

## Impacto no Egress

| Cenário | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Query de 20 matches | ~2MB (com logos Base64) | ~50KB (sem logos) | **97%** |
| Carregamento inicial | Todas logos | Apenas visíveis | **~90%** |
| Cache | Nenhum | 1 hora | **Máximo** |

## Próximos Passos (Recomendado)

Migrar logos para **Cloudflare R2** ou **S3**:

1. Upload das logos para bucket
2. Salvar URL pública no banco (ex: `https://r2.bsebet.com/logos/team-1.png`)
3. Logos ficam cacheáveis pelo CDN global
4. Custo quase zero ($0.015/GB)

Isso eliminaria completamente o problema de egress das logos.
