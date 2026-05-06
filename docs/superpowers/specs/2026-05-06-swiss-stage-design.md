# Swiss Stage Design

**Data:** 2026-05-06
**Status:** Aprovado
**Escopo:** Adicionar suporte a `Swiss` como novo formato de fase de torneio, com confrontos sugeridos por record, edicao manual administrativa, visualizacao publica dedicada e geracao de playoff editavel a partir dos classificados.

---

## 1. Resumo

Hoje a BSEBET suporta `Groups`, `Single Elimination` e `Double Elimination`, com geracao automatica de partidas para GSL, Round Robin e chaves eliminatorias. Esse modelo nao cobre o fluxo de uma swiss stage, onde os confrontos das rodadas seguintes dependem do record atual dos times e podem precisar de ajuste manual para refletir o torneio real.

O objetivo deste trabalho e adicionar `Swiss` como novo `stage.type`, mantendo `matches` como fonte unica de verdade, sem forcar uma arvore fixa de progressao. A experiencia precisa permitir que o admin gere confrontos sugeridos, corrija pairings quando o torneio real divergir e publique apenas partidas confirmadas para o publico apostar.

O caso inicial alvo e um torneio com:

- 8 participantes
- swiss stage Bo3
- classificacao com 2 vitorias
- eliminacao com 2 derrotas
- maximo de 3 rodadas por time
- playoff `Single Elimination` com 4 classificados

---

## 2. Objetivos

### Objetivos principais

- Adicionar `Swiss` como novo tipo explicito de fase em `tournaments.stages`.
- Permitir geracao inicial da Rodada 1 por seeds.
- Permitir sugestao das rodadas seguintes com base no `record` atual.
- Permitir ajuste manual dos pairings sugeridos antes da publicacao.
- Exibir a swiss publicamente com buckets de `record` e partidas por rodada.
- Permitir apostas apenas em partidas swiss confirmadas e publicadas.
- Gerar um playoff editavel com seed `1x4` e `2x3` a partir da campanha final da swiss.

### Objetivos secundarios

- Reaproveitar a infraestrutura atual de `matches`, `bets`, `matchDays` e scoring.
- Preservar compatibilidade comportamental com GSL, Round Robin e brackets atuais.
- Deixar o modelo parametrizavel para thresholds futuros alem de `2W / 2L`.

### Fora de escopo

- Suportar nesta etapa swiss de 16 times ou formatos com thresholds diferentes em producao real.
- Introduzir um novo tipo de aposta especifico para swiss.
- Materializar estado da swiss em nova tabela persistida.
- Automatizar publicacao de partidas ou de playoff sem revisao do admin.
- Resolver todos os cenarios teoricos de emparelhamento competitivo avancado alem do necessario para o formato atual.

---

## 3. Abordagens Consideradas

### Opcao 1: `Swiss` como stage novo + partidas normais + estado derivado

Adicionar `Swiss` como novo `stage.type`, manter a tabela `matches` como fonte de verdade e calcular `record`, status e ranking dos times a partir dos resultados finalizados.

**Vantagens**
- Aproveita o modelo atual de partidas, apostas e scoring.
- Evita duplicacao entre estado persistido e estado derivado.
- Encaixa bem com pairings sugeridos e edicao manual.
- Menor impacto estrutural no banco.

**Desvantagens**
- Exige mais logica de dominio no backend para calcular buckets, ranking e sugestoes.

### Opcao 2: `Swiss` como stage novo + estado auxiliar persistido por time

Persistir uma estrutura auxiliar de campanha por time na swiss para guardar wins, losses, status e ordem provisoria.

**Vantagens**
- Facilita algumas consultas e algumas telas de acompanhamento.
- Pode simplificar leitura de ranking em partes da UI.

**Desvantagens**
- Introduz risco de inconsistencia com os resultados reais das partidas.
- Aumenta custo de migracao, manutencao e sincronizacao.
- Cria duas fontes de verdade para o mesmo dominio.

### Opcao 3: Swiss como pseudo-bracket pre-montado

Tentar representar a swiss como uma arvore fechada de partidas ligadas por `teamAPreviousMatchId` e `teamBPreviousMatchId`, semelhante ao que ja existe para GSL e playoffs.

**Vantagens**
- Reaproveita parcialmente a infraestrutura visual de bracket.

**Desvantagens**
- Nao representa bem a natureza flexivel da swiss.
- Conflita com a necessidade de ajuste manual frequente.
- Tende a gerar pairings artificiais e regras frageis.

### Abordagem recomendada

**Opcao 1: `Swiss` como stage novo + partidas normais + estado derivado.**

Essa abordagem respeita o formato real, mantem `matches` como fonte unica de verdade e permite pairings sugeridos com correcao manual sem a rigidez de um bracket predefinido.

---

## 4. Modelo de Dados

### 4.1 Novo tipo de fase

`Swiss` passa a ser um novo valor valido para `stage.type` em todos os pontos que hoje aceitam apenas:

- `Groups`
- `Single Elimination`
- `Double Elimination`

O schema de fases deve passar a aceitar:

- `Swiss`

### 4.2 Settings do stage Swiss

O stage `Swiss` deve aceitar, no minimo, os seguintes campos em `settings`:

- `participantsCount`
- `winsToAdvance`
- `lossesToEliminate`
- `roundsMax`
- `matchType`

Configuracao inicial do torneio alvo:

- `participantsCount: 8`
- `winsToAdvance: 2`
- `lossesToEliminate: 2`
- `roundsMax: 3`
- `matchType: "Bo3"`

### 4.3 Fonte de verdade

Nao sera criada nova tabela obrigatoria para estado da swiss.

O estado competitivo de cada time sera derivado das partidas finalizadas daquele `stageId`, calculando:

- `wins`
- `losses`
- `record` textual
- `status` (`alive`, `qualified`, `eliminated`)
- ranking final da fase

### 4.4 Partidas swiss na tabela `matches`

As partidas swiss continuam sendo registros normais em `matches`.

Campos existentes continuam suficientes para a maior parte do fluxo:

- `tournamentId`
- `stageId`
- `matchDayId`
- `name`
- `label`
- `teamAId`
- `teamBId`
- `startTime`
- `status`
- `scoreA`
- `scoreB`
- `winnerId`
- `displayOrder`
- `isBettingEnabled`

Os campos de progressao por match anterior nao sao a base da swiss. Eles continuam relevantes para playoffs tradicionais, mas na swiss o estado vem do historico de partidas concluidas, nao de uma arvore fixa.

---

## 5. Fluxo Operacional da Swiss

### 5.1 Rodada 1

A Rodada 1 da swiss deve ser gerada automaticamente com base nos seeds do torneio.

Para o caso inicial com 8 times, o sistema cria os confrontos iniciais a partir da ordem de seeding definida no torneio.

### 5.2 Rodadas seguintes

Depois de cada rodada concluida, o sistema deve recalcular o estado atual dos times e sugerir os confrontos da proxima rodada usando os buckets de `record`.

Exemplos de buckets validos ao longo da fase:

- `0-0`
- `1-0`
- `0-1`
- `1-1`
- `2-0`
- `2-1`
- `1-2`
- `0-2`

### 5.3 Regras de sugestao

Ao sugerir a proxima rodada, o sistema deve:

- parear times dentro do mesmo bucket de `record` sempre que possivel;
- ignorar times ja `qualified`;
- ignorar times ja `eliminated`;
- nao gerar nova partida para time que ja bateu threshold de avanco ou eliminacao;
- evitar revanche quando houver alternativa valida no mesmo estado competitivo.

### 5.4 Confirmacao manual

As partidas sugeridas nao devem entrar automaticamente na experiencia publica.

Fluxo esperado:

1. admin aciona a sugestao da proxima rodada;
2. sistema cria ou prepara os confrontos sugeridos em estado interno de rascunho;
3. admin revisa pairings, horarios, ordem e demais campos;
4. admin ajusta manualmente quando o torneio real divergir da sugestao;
5. apenas depois confirma e publica as partidas.

### 5.5 Restricao de nova sugestao

O sistema deve bloquear a geracao de nova rodada swiss se ja existir rodada futura ainda pendente de confirmacao ou ainda nao resolvida.

Isso evita sobreposicao de pairings e mantem o fluxo operacional previsivel.

---

## 6. Publicacao e Apostas

### 6.1 Partidas sugeridas

Partidas apenas sugeridas ficam restritas ao admin.

Requisitos:

- nao aparecer ao publico;
- nao aceitar apostas;
- permanecer em fluxo administrativo de rascunho ate confirmacao.

Na implementacao, isso pode ser representado reaproveitando o fluxo atual de `matchDay` em `draft` e `isBettingEnabled: false`, desde que a superficie publica respeite esse bloqueio.

### 6.2 Partidas confirmadas

Depois que o admin confirmar o confronto, a partida pode entrar no fluxo normal de publicacao da plataforma.

Uma partida swiss confirmada se comporta como qualquer outra partida:

- pode ser exibida na pagina do torneio;
- pode aparecer em `matchDay` aberto;
- pode receber votos normalmente;
- continua usando o mesmo scoring por partida.

### 6.3 Regra canonica de aposta

Usuarios so podem apostar em partidas reais publicadas.

Confrontos previstos, provisorios ou apenas sugeridos nao entram no produto publico.

---

## 7. Playoff apos a Swiss

### 7.1 Gatilho de geracao

Quando existirem exatamente 4 times com status `qualified`, o sistema pode sugerir a fase seguinte de `Single Elimination`.

### 7.2 Estado inicial do playoff

O playoff nao deve nascer como chave final publica. Ele deve nascer como rascunho editavel pelo admin.

O objetivo e separar duas coisas:

- os 4 classificados confirmados da swiss;
- os cruzamentos sugeridos do playoff.

### 7.3 Seed do playoff

O seeding deve usar a campanha final da swiss para definir:

- semifinal 1: seed 1 vs seed 4
- semifinal 2: seed 2 vs seed 3

No caso descrito pelo usuario, isso permite naturalmente que um time `2-0` enfrente um time `2-1`.

Para remover ambiguidade no ranking da swiss nesta primeira entrega, a ordem dos 4 classificados deve seguir:

1. melhor `record` final na swiss;
2. menor numero de derrotas;
3. seed original do torneio como desempate final.

Isso significa, na pratica:

- times `2-0` sempre ficam acima de times `2-1`;
- entre times com o mesmo `record`, vence quem tiver seed original melhor.

Nao entraremos nesta etapa em criterios adicionais como Buchholz ou desempates competitivos externos.

### 7.4 Confirmacao manual do playoff

Mesmo com seed automatizado, o admin deve poder revisar e ajustar os confrontos antes da publicacao.

---

## 8. Experiencia Publica

### 8.1 Visualizacao dedicada

A swiss deve ganhar um componente proprio na pagina publica do torneio, em vez de ser tratada como grupo tradicional ou bracket eliminatorio.

Esse componente deve exibir duas camadas principais:

- buckets de `record`;
- partidas por rodada.

### 8.2 Buckets de record

O usuario deve conseguir entender rapidamente a situacao competitiva da fase.

O painel deve destacar visualmente buckets como:

- `0-0`
- `1-0`
- `0-1`
- `1-1`
- `2-0`
- `2-1`
- `1-2`
- `0-2`

Cada time deve aparecer com status claro:

- `qualified`
- `eliminated`
- `alive`

### 8.3 Partidas por rodada

As partidas confirmadas da swiss devem ser mostradas agrupadas por rodada, preservando clareza temporal e competitiva.

### 8.4 Regras de visibilidade

- partidas sugeridas nao aparecem na pagina publica;
- buckets podem refletir o estado atual ja confirmado da fase;
- apenas confrontos confirmados entram na visao publica e na experiencia de aposta.

### 8.5 Cartoes de partida

Os cards seguem o comportamento atual de aposta por partida, com previsao de vencedor e placar de serie Bo3.

Nao ha novo tipo de card ou novo tipo de aposta nesta etapa.

---

## 9. Regras de Dominio

### 9.1 Estado derivado por time

Para cada time no `stageId` da swiss, o sistema calcula:

- numero de vitorias;
- numero de derrotas;
- `record` atual;
- status competitivo;
- elegibilidade para nova partida.

### 9.2 Status validos

- `alive`: ainda pode avancar ou ser eliminado;
- `qualified`: atingiu `winsToAdvance`;
- `eliminated`: atingiu `lossesToEliminate`.

### 9.3 Restricoes obrigatorias

- time `qualified` nao pode receber nova partida swiss;
- time `eliminated` nao pode receber nova partida swiss;
- a proxima rodada so usa times `alive`;
- playoff nao pode ser gerado antes de 4 classificados;
- playoff sugerido nao deve ser publicado automaticamente.

### 9.4 Recalculabilidade

Se o admin alterar um resultado antigo da swiss, o sistema deve recalcular buckets, status e seed do playoff antes de permitir nova publicacao ligada a essa fase.

---

## 10. Falhas e Casos Limite

### 10.1 Pairing invalido ou incompleto

Se a sugestao automatica nao conseguir formar todos os confrontos validos sem conflito relevante, o sistema nao deve inventar uma solucao silenciosa.

Comportamentos aceitos:

- bloquear a geracao e pedir ajuste manual;
- ou retornar sugestao parcial com aviso explicito no admin.

### 10.2 Revanche evitavel

Se houver alternativa valida sem revanche, a sugestao automatica deve preferi-la.

Se nao houver alternativa valida dentro das restricoes atuais, o sistema pode exigir ajuste manual em vez de assumir regra competitiva oculta.

### 10.3 Publicacao invalida

O sistema deve bloquear publicacao publica de partidas swiss quando houver qualquer uma das situacoes abaixo:

- time faltando;
- confronto duplicado na mesma rodada;
- rodada futura conflitando com rodada ainda nao resolvida;
- estado do playoff inconsistente com os classificados da swiss.

---

## 11. Arquitetura Recomendada

### 11.1 Back-end

O backend precisa introduzir funcoes de dominio focadas em swiss para:

- calcular o estado dos times por `stageId`;
- agrupar times por bucket de `record`;
- sugerir pairings da proxima rodada;
- calcular ranking final da fase;
- sugerir seed do playoff.

Essas funcoes nao devem depender da UI e devem operar sobre `matches` como fonte de verdade.

### 11.2 Admin

O admin precisa reconhecer `Swiss` em:

- criacao/edicao de fases;
- gerenciamento de partidas;
- fluxo de geracao de confrontos;
- possivel revisao de playoff sugerido.

### 11.3 Pagina publica do torneio

A pagina publica precisa distinguir `Swiss` dos formatos atuais, do mesmo modo que hoje separa grupos de playoffs.

Nao e suficiente reutilizar `GSLResultView`, `RoundRobinResultView` ou `TournamentBracket` sem adaptacao de modelo mental.

---

## 12. i18n

Toda nova string visivel ao usuario ou ao admin deve passar por `t()` e ser adicionada em portugues e ingles.

Cobertura minima esperada:

- labels do novo tipo `Swiss` no admin;
- textos de sugestao e confirmacao de rodada;
- mensagens de erro e bloqueio operacional;
- titulos e legendas da visualizacao publica da swiss;
- status e buckets de `record` quando renderizados com texto.

Nenhuma string nova deve ficar hardcoded em componentes ou server functions.

---

## 13. Testes

### 13.1 Dominio

- calculo de `wins`, `losses` e `record`;
- transicao de status para `alive`, `qualified` e `eliminated`;
- exclusao de times encerrados da rodada seguinte.

### 13.2 Sugestao de confrontos

- pareamento por bucket de `record`;
- evitacao de revanche quando houver alternativa;
- bloqueio ou aviso em cenarios sem sugestao completa valida.

### 13.3 Playoff

- geracao apenas com 4 classificados;
- seeding `1x4` e `2x3`;
- recalculo quando resultados anteriores mudarem.

### 13.4 Visibilidade e apostas

- partida sugerida nao aparece ao publico;
- partida confirmada pode aparecer;
- aposta so em partida publicada;
- regressao para formatos existentes.

---

## 14. Escopo de Implementacao Esperado

Para que a feature seja considerada pronta nesta primeira entrega, a implementacao deve cobrir:

- novo `stage.type` `Swiss` no schema, validacao e UI administrativa;
- geracao da Rodada 1 por seeds;
- sugestao de rodadas seguintes por `record`;
- ajuste manual antes da publicacao;
- visualizacao publica com buckets e partidas por rodada;
- seed de playoff `Single Elimination` a partir da campanha final;
- preservacao do fluxo de apostas apenas para partidas confirmadas.

---

## 15. Decisoes Fechadas

- `Swiss` sera um novo `stage.type`, nao uma variacao de `Groups`.
- A geracao sera inicial + ajustes manuais, nao totalmente automatica e nao totalmente manual.
- Rodadas seguintes serao sugeridas por `record`.
- O modelo ja nasce parametrizavel para thresholds futuros.
- A experiencia publica da swiss sera um painel proprio com buckets de `record`.
- Partidas sugeridas nao aparecem ao publico e nao aceitam aposta.
- O playoff nasce como rascunho editavel.
- O seed do playoff usa campanha da swiss em `1x4` e `2x3`.

---

## 16. Proximo Passo

Depois da aprovacao deste spec escrito, o proximo passo e produzir um plano de implementacao detalhado antes de tocar no codigo da feature.
