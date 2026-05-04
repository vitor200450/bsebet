# BSEBET Betting Flow Redesign

**Data:** 2026-05-02
**Status:** Aprovado
**Escopo:** Evolucao segura do fluxo de aposta nas etapas de selecao de torneio, selecao de match day e revisao de apostas.

---

## 1. Resumo

Redesenhar tres pontos centrais da jornada de aposta para que parecam partes do mesmo fluxo:
- `TournamentSelector`
- `MatchDaySelector`
- `ReviewScreen` em `apps/web/src/routes/$lang/index.tsx`

O objetivo nao e mudar regras de negocio, navegacao base ou logica de apostas. O objetivo e melhorar duas percepcoes do usuario:
- maior consistencia visual com as outras telas do produto
- maior sensacao de progressao entre as etapas `torneio -> match day -> revisao`

Trata-se de uma **evolucao segura**: a estrutura principal do fluxo e preservada, enquanto hierarquia visual, contexto persistente, estados e a leitura da jornada sao refinados.

---

## 2. Objetivos

### Objetivos principais

- Fazer as tres etapas parecerem uma unica jornada de produto, nao telas isoladas.
- Alinhar a experiencia com a linguagem visual broadcast ja estabelecida no restante do app.
- Tornar mais claro onde o usuario esta, o que ja escolheu e qual e a proxima acao.

### Objetivos secundarios

- Reduzir a sensacao atual de reinicio de contexto entre as etapas.
- Deixar CTAs, botoes de voltar e estados especiais mais previsiveis.
- Melhorar o peso visual do `MatchDaySelector`, hoje mais generico que as outras areas.

### Fora de escopo

- Alterar logica de recovery bets.
- Alterar regras de `read-only`, `locked`, `finished` e `open`.
- Mudar fluxo de dados, queries, persistencia local ou server functions.
- Fazer redesign ousado de composicao ou trocar o paradigma de navegacao.

---

## 3. Abordagem Recomendada

### Opcao escolhida

**Fluxo em camadas com cabecalho de progresso fixo.**

As tres etapas passam a compartilhar um mesmo frame visual de jornada, com:
- kicker pequeno em caixa alta
- titulo forte e consistente
- trilha de progresso em 3 passos
- contexto persistente da selecao atual
- CTA primario visualmente previsivel

### Justificativa

Essa abordagem entrega o que o produto precisa sem aumento relevante de risco. Ela melhora a leitura da jornada e a coerencia com o restante da interface sem pedir reestruturacao da logica ou reescrita dos componentes principais.

---

## 4. Direcao de UX

O fluxo deve ser percebido como uma sequencia unica com tres passos:

1. Escolher o torneio
2. Escolher o match day
3. Revisar e fechar as apostas

Cada etapa deve responder claramente tres perguntas:
- Onde estou?
- O que ja foi escolhido?
- O que faco agora?

### Principios de UX

- **Contexto persistente:** ao avancar, a selecao anterior continua visivel no topo.
- **Progressao explicita:** a etapa atual precisa ficar destacada na trilha de progresso.
- **Acoes previsiveis:** CTA principal e acao de voltar devem ser faceis de achar e repetir a mesma linguagem entre telas.
- **Clareza sob pressao:** status como aberto, bloqueado, finalizado e recuperacao devem ser lidos de forma imediata.

---

## 5. Direcao Visual

### Registro

Este trabalho pertence ao registro **product**: o design serve a tarefa principal de apostar com rapidez e confianca.

### Cena fisica

Um fa de esports no celular, pouco antes das partidas, alternando entre torneio, rodada e conferencia final das picks, em um contexto de uso rapido, competitivo e repetido.

Essa cena reforca a escolha por **light mode**, alto contraste, sinais fortes de estado e estrutura de leitura rapida.

### Estrategia de cor

**Restrained com acento operacional forte.**

- `paper` e `tape` seguem como base da superficie.
- `ink` e preto continuam estruturando bordas, molduras e labels.
- `neon green` vira o principal marcador de etapa ativa, selecao ativa e CTA principal.
- `brawl blue`, `brawl red` e `brawl yellow` aparecem como apoio contextual, sem competir o tempo todo pelo foco.

### Direcao de composicao

- Menos cara de poster isolado, mais cara de HUD de transmissao.
- Menos blocos visuais desconectados entre si.
- Mais faixas, labels, cabecalhos e paineis consistentes entre as tres etapas.
- Menos diferenca estilistica entre seletor de torneios, seletor de match day e tela de revisao.

### Resultado desejado

- `TournamentSelector` deixa de parecer uma galeria promocional e passa a parecer entrada do fluxo.
- `MatchDaySelector` sobe de nivel e entra na mesma familia visual do resto.
- `ReviewScreen` ganha autoridade visual de etapa final e fechamento.

---

## 6. Estrutura Compartilhada da Jornada

Criar um padrao visual comum para as tres etapas. Isso pode ser um wrapper compartilhado ou um conjunto de blocos reaproveitaveis dentro da rota e dos componentes atuais.

### Estrutura proposta

#### 6.1 Cabecalho da jornada

Bloco fixo no topo visual da etapa com:
- kicker pequeno em uppercase
- titulo principal da etapa
- subtitulo curto orientado a acao
- trilha de progresso com 3 passos

Exemplo conceitual de etapas:
- `1. Torneio`
- `2. Match Day`
- `3. Revisao`

#### 6.2 Linha de contexto persistente

Faixa ou grupo de pills com o contexto atual:
- torneio selecionado
- match day selecionado, quando existir
- estado do fluxo, como aberto, bloqueado, recuperacao ou revisao

Essa linha nao precisa existir com o mesmo peso em todas as etapas, mas a linguagem deve ser a mesma.

#### 6.3 Navegacao de retorno

Padronizar os botoes de voltar:
- voltar para torneios
- voltar para match days
- voltar para apostas

Eles devem deixar de parecer utilitarios soltos e passar a fazer parte da jornada.

---

## 7. Redesign por Superficie

### 7.1 TournamentSelector

**Arquivo principal:** `apps/web/src/components/TournamentSelector.tsx`

#### Problemas atuais

- Visual forte, mas mais proximo de poster ou showcase do que de etapa funcional.
- Muito peso no hero do card e menos foco na decisao rapida.
- Badges de recovery e de apostas do usuario parecem anexos separados da estrutura principal.

#### Direcao

- Adicionar o topo comum da jornada com passo 1 destacado.
- Manter cards expressivos, mas reduzir a sensacao de peca promocional.
- Priorizar o bloco informativo de decisao antes da decoracao.

#### Hierarquia interna do card

1. Nome do torneio
2. Status
3. Fase atual
4. Quantidade de partidas disponiveis ou indicacao de apostas existentes
5. CTA claro

#### Ajustes especificos

- Integrar `hasRecoveryBets` e `hasUserBets` no cabecalho do card, em vez de badges que parecem colados depois.
- Manter logo ou identidade do torneio, mas com area visual menos dominante.
- Deixar o CTA com semantica consistente com as outras etapas.
- Preservar estados desabilitados, mas com leitura mais clara do motivo.

#### Efeito esperado

O usuario percebe que esta escolhendo o ponto de entrada da jornada, nao apenas navegando por cards bonitos.

### 7.2 MatchDaySelector

**Arquivo principal:** `apps/web/src/components/MatchDaySelector.tsx`

#### Problemas atuais

- Visual menos caracteristico que o restante do fluxo.
- Contexto do torneio aparece, mas ainda nao ancora a sensacao de continuidade.
- Estrutura funcional, mas sem o mesmo nivel de identidade das outras areas.

#### Direcao

- Herdar o mesmo topo visual com passo 2 destacado.
- Mostrar o torneio escolhido como contexto persistente no header.
- Fazer cada match day parecer uma rodada de transmissao dentro da jornada.

#### Hierarquia de cada item

1. Label do match day
2. Data
3. Status
4. Quantidade de partidas
5. Indicacao de disponibilidade

#### Ajustes especificos

- Reforcar visualmente o estado ativo e o estado selecionavel.
- Manter `draft`, `open`, `locked` e `finished`, mas com comunicacao mais consistente com o resto do fluxo.
- Ajustar badges, fundos e labels para parecerem parte da mesma familia do seletor de torneios e da revisao.

#### Efeito esperado

O usuario sente que avancou para o recorte correto do torneio, nao que caiu em outra tela com outro estilo.

### 7.3 ReviewScreen

**Arquivo principal:** `apps/web/src/routes/$lang/index.tsx`

#### Problemas atuais

- O header atual comunica revisao, mas ainda parece uma secao separada da jornada anterior.
- O resumo de pontos e acertos tem boa energia, mas aparenta widgets independentes.
- A lista de partidas pesa mais como scroll tecnico do que como etapa final de fechamento.

#### Direcao

- Herdar o topo comum com passo 3 destacado.
- Fazer o cabecalho da revisao comunicar fechamento e confirmacao.
- Tornar o resumo e os estados especiais parte de um painel unico de conferencia.

#### Informacoes obrigatorias no topo

- torneio
- match day
- estado da revisao, como aberta, bloqueada, finalizada ou em recuperacao

#### Ajustes especificos

- Organizar melhor a relacao entre titulo, resumo e acoes.
- Fazer a CTA principal de confirmar ou atualizar apostas parecer o clmax do fluxo.
- Padronizar os botoes de retorno com a mesma linguagem das etapas anteriores.
- Melhorar a sensacao de grade de conferencia final, sem trocar a logica central da lista.

#### Efeito esperado

O usuario sente que chegou a uma etapa final natural da jornada, com contexto, seguranca e clareza para fechar as picks.

---

## 8. Estados e Comunicacao

Os estados de negocio nao mudam. O trabalho e de comunicacao visual e hierarquia.

### Estados que precisam manter leitura forte

- torneio com apostas ja feitas
- torneio com recovery bets
- match day `open`
- match day `locked`
- match day `finished`
- revisao em modo normal
- revisao em `read-only`
- revisao com recovery disponivel

### Regras de comunicacao

- Estados importantes devem aparecer perto do topo da etapa, nao apenas dentro do conteudo.
- O usuario nao deve depender de um unico badge pequeno para entender se ainda pode agir.
- Banners de `locked`, `finished` e `recovery` devem seguir a mesma gramatica visual do resto do fluxo.

---

## 9. Implementacao Tecnica

### Arquivos-alvo primarios

- `apps/web/src/components/TournamentSelector.tsx`
- `apps/web/src/components/MatchDaySelector.tsx`
- `apps/web/src/routes/$lang/index.tsx`

### Possiveis extracoes pequenas

Permitidas apenas se realmente reduzirem repeticao e ajudarem a manter consistencia:
- componente pequeno de progresso da jornada
- componente pequeno de pills de contexto
- componente pequeno de header compartilhado para etapas do fluxo

Nao introduzir uma nova mini-design-system paralela. O ideal e fazer extracoes minimas, com poucos nomes novos.

### Restricoes

- Nao mudar regras existentes de selecao e navegacao.
- Nao reescrever a logica de dados do `index.tsx`.
- Nao alterar comportamento de recovery alem da apresentacao.
- Nao adicionar estados de compatibilidade desnecessarios.

---

## 10. Conteudo e i18n

Todo texto novo deve usar `t()` e ser adicionado em ambos os idiomas.

### Requisitos de copy

- Linguagem curta, direta e energica.
- Tom de transmissao competitiva, sem exagerar no hype.
- Titulos e labels devem ajudar o usuario a agir rapido.

### Implicacoes praticas

- Se novos labels de progresso forem criados, devem entrar no namespace correto.
- Se novos textos de status ou botoes surgirem, devem reutilizar `common` quando fizer sentido.
- Revisar strings hardcoded existentes nas superficies tocadas, principalmente botoes de voltar e resumos da revisao.

---

## 11. Responsividade

O fluxo e prioritariamente mobile, entao o cabecalho de progresso nao pode roubar area util demais.

### Regras

- No mobile, a trilha de progresso deve continuar legivel sem empurrar demais o conteudo principal.
- O contexto persistente pode quebrar em duas linhas, desde que mantenha hierarquia.
- CTAs principais e botoes de retorno precisam continuar acessiveis sem sobrepor areas criticas.
- No desktop, o topo pode respirar mais e distribuir contexto com mais horizontalidade.

---

## 12. Criticos de Qualidade Visual

- Contraste explicito em todos os badges, pills, banners e botoes.
- `neon green` como marcador operacional principal, nao como tinta jogada por toda parte.
- Sem side-stripe borders decorativos.
- Sem voltar para uma estetica generica de cards identicos.
- Sem gradientes decorativos em texto.
- Sem modais novos para resolver navegacao simples.

---

## 13. Validacao

### Fluxos a validar

1. `torneio -> match day -> apostas -> revisao`
2. torneio sem partidas disponiveis
3. match day `open`
4. match day `locked`
5. match day `finished`
6. revisao em modo normal
7. revisao em `read-only`
8. revisao com recovery disponivel

### Verificacoes de interface

- O usuario entende a etapa atual sem precisar ler demais.
- O contexto da selecao anterior continua visivel ao avancar.
- A CTA principal fica clara em cada etapa.
- Os botoes de retorno parecem parte do fluxo.
- A experiencia continua coesa entre mobile e desktop.

### Verificacoes tecnicas

- `bun run check-types`
- `bun run check`
- `bun run build` se a mudanca tocar organizacao de componentes ou empacotamento visual de forma relevante

---

## 14. Resultado Esperado

Ao final, o fluxo de aposta deve parecer uma jornada unica e coesa:
- o torneio apresenta a arena certa
- o match day define o recorte da rodada
- a revisao fecha a decisao com confianca

Sem trocar a logica central do produto, o usuario deve sentir mais continuidade, mais contexto e mais seguranca para concluir a aposta.
