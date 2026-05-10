# Third Place Match Design

**Data:** 2026-05-10
**Status:** Aprovado
**Escopo:** Adicionar suporte opcional a partida de disputa de 3o lugar em estagios `Single Elimination`, com geracao automatica na criacao/regeneracao da chave e comportamento padrao de apostas.

---

## 1. Resumo

Hoje o sistema gera chaves de `Single Elimination` sem partida de 3o lugar. O produto precisa suportar torneios que tenham essa disputa sem obrigar todos os torneios a usarem o mesmo formato.

A solucao aprovada e configurar a funcionalidade por estagio eliminatorio, via `stage.settings.enableThirdPlaceMatch`, com default desligado. Quando ligado, o backend deve gerar automaticamente uma partida entre os dois perdedores das semifinais.

---

## 2. Objetivos

### Objetivos principais

- Permitir habilitar disputa de 3o lugar em qualquer estagio `Single Elimination`.
- Manter o recurso opcional por torneio/estagio (nao global).
- Gerar a partida automaticamente junto com a chave quando aplicavel.
- Tratar a partida de 3o lugar como partida normal para apostas e pontuacao.

### Fora de escopo

- Adicionar suporte equivalente para `Double Elimination` nesta entrega.
- Criar regras especiais de pontuacao para disputa de 3o lugar.
- Criar novo tipo de aposta dedicado a essa partida.

---

## 3. Abordagens Consideradas

### Opcao 1 (recomendada): Flag no `stage.settings` + geracao condicional

Adicionar `enableThirdPlaceMatch` no settings de `Single Elimination` e criar a partida de 3o lugar durante geracao/regeneracao, apenas quando houver semifinal.

**Vantagens**
- Alinha com o modelo atual de configuracao por estagio.
- Mantem compatibilidade com torneios existentes.
- Menor risco de regressao estrutural.

**Desvantagens**
- Requer ajustes em schema, geracao de chave e UI de configuracao.

### Opcao 2: Inferencia automatica sem flag

Sempre criar disputa de 3o lugar quando houver semifinal.

**Vantagens**
- Menos configuracao.

**Desvantagens**
- Viola requisito de opcionalidade.
- Remove controle do admin.

### Opcao 3: Sistema generico de partidas especiais

Criar infraestrutura para varios tipos de partidas especiais.

**Vantagens**
- Alta flexibilidade futura.

**Desvantagens**
- Complexidade desnecessaria para o objetivo atual.

### Abordagem aprovada

**Opcao 1: Flag no `stage.settings` + geracao condicional.**

---

## 4. Modelo de Dados

### 4.1 Configuracao de estagio

No schema de `stages` para `Single Elimination`, adicionar:

- `settings.enableThirdPlaceMatch?: boolean`

Comportamento default quando ausente:

- `false`

### 4.2 Partida de 3o lugar em `matches`

A partida de 3o lugar continua sendo um registro normal em `matches`, sem nova tabela.

Campos relevantes:

- `tournamentId`
- `stageId`
- `matchDayId`
- `teamAPreviousMatchId`
- `teamBPreviousMatchId`
- `teamAPreviousMatchResult = "loser"`
- `teamBPreviousMatchResult = "loser"`
- `name` / `label` (ex.: `Third Place Match`)
- `status = "scheduled"`
- `isBettingEnabled` conforme fluxo padrao de publicacao

`bracketSide` deve receber um valor semantico dedicado (ex.: `"third_place"`) para facilitar filtros, regeneracao e renderizacao.

---

## 5. Regras de Geracao

### 5.1 Quando criar

Criar partida de 3o lugar somente se:

1. o estagio for `Single Elimination`;
2. `settings.enableThirdPlaceMatch === true`;
3. existirem duas semifinais identificaveis no estagio.

Se o chaveamento tiver apenas final (ex.: 2 times), nao criar.

### 5.2 Como criar

Ao gerar chave:

- identificar os dois jogos de semifinal;
- criar a partida de 3o lugar com dependencias loser/loser das semis;
- posicionar em `displayOrder` e `startTime` de forma consistente com os demais jogos de playoff.

### 5.3 Regeneracao e idempotencia

Ao regenerar o estagio:

- remover tambem a partida de 3o lugar derivada;
- recriar conforme estado atual da flag;
- garantir que nunca existam duplicadas.

---

## 6. UI Admin

### 6.1 Configuracao

Na tela de configuracao de estagio `Single Elimination`:

- adicionar toggle `Disputa de 3o lugar`;
- default desligado;
- helper text: `Cria automaticamente partida entre os perdedores das semifinais.`

### 6.2 Mudanca apos chave gerada

Ao alterar a flag com chave ja existente, mostrar aviso curto:

- `Para aplicar na chave atual, regenere o playoff.`

Nao aplicar alteracao estrutural implicitamente sem regeneracao.

### 6.3 Exibicao

A partida de 3o lugar deve aparecer em admin e publico como qualquer partida de playoff, com label clara.

---

## 7. Apostas e Pontuacao

- A partida de 3o lugar entra no fluxo padrao de apostas.
- Sem excecoes de scoring nesta entrega.
- Sem tipo especial de aposta.

---

## 8. Tratamento de Erros

- Se `enableThirdPlaceMatch = true` mas nao houver semifinal detectavel, pular criacao com log explicito de diagnostico.
- Na regeneracao, se houver inconsistencias de dependencias, falhar com erro claro em vez de gerar estrutura parcial silenciosa.

---

## 9. Testes

Casos minimos:

1. `Single Elimination` + flag desligada: nao cria 3o lugar.
2. `Single Elimination` + flag ligada + 4+ participantes: cria exatamente 1 partida de 3o lugar.
3. Flag ligada + chave com 2 participantes: nao cria 3o lugar.
4. Regenerar com flag ligada: continua existindo exatamente 1 partida de 3o lugar (sem duplicar).
5. Regenerar apos desligar flag: partida de 3o lugar deixa de existir.
6. Fluxo de apostas: partida aparece no feed/chave e aceita palpite normalmente.

---

## 10. Impacto em Compatibilidade

- Torneios existentes sem `enableThirdPlaceMatch` continuam com comportamento atual.
- A mudanca e opt-in por estagio.
- Nenhuma migracao destrutiva de dados e necessaria.
