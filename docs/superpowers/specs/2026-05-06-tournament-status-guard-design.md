# Tournament Status Guard Design

**Data:** 2026-05-06
**Status:** Aprovado
**Escopo:** Bloquear inconsistencias entre `tournaments.status` e o estado real das partidas sem remover o controle manual do admin sobre a ativacao do torneio.

---

## 1. Resumo

Hoje o sistema permite que um torneio permaneca com status `upcoming` mesmo quando alguma partida ja foi tecnicamente iniciada ou finalizada. Isso pode acontecer quando o admin esquece de mudar o status do torneio, mas segue operando partidas pelo editor, pelo live admin ou por outros fluxos administrativos.

Essa situacao cria inconsistencias de negocio porque varias superficies do produto tratam `active` e `upcoming` de forma diferente, enquanto o estado real das partidas ja indica que o torneio comecou.

O objetivo deste trabalho e impedir essa inconsistencia de forma **bloqueante**, mantendo a ativacao do torneio como uma acao **manual do admin**.

---

## 2. Objetivos

### Objetivos principais

- Impedir que um torneio `upcoming` tenha partidas tecnicamente iniciadas.
- Garantir que o admin precise ativar manualmente o torneio antes de iniciar partidas ou registrar resultados.
- Aplicar a regra em todos os caminhos administrativos que alteram partidas.

### Objetivos secundarios

- Padronizar o erro de negocio para que todas as telas admin respondam de forma consistente.
- Melhorar a UX administrativa com guardrails preventivos, sem depender deles para integridade.
- Reduzir risco de inconsistencias em home, dashboard, leaderboard e fluxos de apostas.

### Fora de escopo

- Promover automaticamente o torneio de `upcoming` para `active`.
- Redesenhar a arquitetura de torneios, match days ou apostas.
- Reinterpretar regras de negocio existentes para torneios `active` ou `finished`.
- Introduzir regra de banco de dados obrigatoria nesta etapa.

---

## 3. Abordagens Consideradas

### Opcao 1: Enforcement so no backend

Centralizar a validacao nos Server Functions que alteram partidas e falhar sempre que a mutacao implicar "torneio comecado" enquanto o torneio estiver `upcoming`.

**Vantagens**
- Fonte unica de verdade.
- Cobre qualquer caminho administrativo que passe pelo backend.
- Menor risco de inconsistencias silenciosas.

**Desvantagens**
- UX pior se usada sozinha, porque o admin descobre a regra apenas ao falhar.

### Opcao 2: Enforcement no backend + guardrails fortes de UI

Manter o backend como hard-stop, mas adicionar bloqueios preventivos nas telas administrativas para desabilitar acoes que iniciam partidas ou registram resultados quando o torneio estiver `upcoming`.

**Vantagens**
- Preserva integridade real no backend.
- Melhora clareza para o admin antes do erro acontecer.
- Mantem cobertura mesmo se algum caminho de UI esquecer a validacao preventiva.

**Desvantagens**
- Exige ajustes em mais de uma superficie administrativa.

### Opcao 3: Restricao no banco

Empurrar a regra para PostgreSQL com trigger ou constraint especializada.

**Vantagens**
- Integridade maxima na camada mais baixa.

**Desvantagens**
- Mais dificil de evoluir e explicar.
- Regra de negocio fica menos visivel no codigo da aplicacao.
- Aumenta custo de manutencao com migrations e Drizzle.

### Abordagem recomendada

**Opcao 2: enforcement no backend + guardrails fortes de UI.**

Ela entrega a governanca que o produto precisa sem abrir mao da experiencia do admin. O backend continua sendo a fonte da verdade, enquanto a interface reduz erro operacional e deixa explicito que o torneio precisa ser ativado antes do inicio real das partidas.

---

## 4. Regra Canonica de Negocio

Enquanto `tournament.status === "upcoming"`, nenhuma partida daquele torneio pode apresentar sinal de inicio real.

### Sinais de inicio real

Uma mutacao deve ser considerada tentativa de inicio real quando fizer qualquer um dos itens abaixo:

- mudar `match.status` para `live`;
- mudar `match.status` para `finished`;
- definir `winnerId`;
- definir `scoreA > 0`;
- definir `scoreB > 0`;
- usar algum atalho de fluxo admin/live que leve a um dos estados acima, mesmo sem enviar payload completo explicitamente.

### Estado permitido em torneio upcoming

Para torneios `upcoming`, as partidas so podem existir em estado neutro:

- `status = scheduled`;
- `winnerId = null`;
- `scoreA` e `scoreB` sem placar efetivo registrado;
- edicoes estruturais permitidas desde que nao indiquem inicio real da partida.

### Consequencia

Se uma mutacao indicar inicio real e o torneio ainda estiver `upcoming`, a operacao deve falhar antes de persistir qualquer alteracao.

---

## 5. Escopo de Enforcement

Essa regra deve valer para **todos os caminhos administrativos** que alteram partidas, nao apenas para a tela principal de gerenciamento.

### Cobertura minima inicial

- `apps/web/src/server/matches.ts`
  - `updateMatch`
  - `incrementScore`
  - `finalizeMatch`
  - quaisquer outros atalhos locais que alterem status, vencedor ou placar
- fluxos administrativos conectados ao live admin
- fluxos de bulk edit/import/scheduler que escrevam em `matches`

### Regra de evolucao futura

Qualquer novo endpoint ou server function que altere estado competitivo de `matches` deve reutilizar a mesma validacao central.

---

## 6. Arquitetura Recomendada

### 6.1 Ponto central de validacao

Criar uma funcao utilitaria de dominio no servidor, com responsabilidade unica: validar a coerencia entre `tournament.status` e a mutacao proposta para a partida.

Exemplo conceitual:

- entrada: estado atual do torneio, estado atual da partida e mutacao proposta
- saida: sucesso silencioso ou erro bloqueante de regra de negocio

Essa funcao nao precisa conhecer detalhes de UI. Ela so decide se a mutacao e permitida.

### 6.2 Deteccao da proxima situacao da partida

A validacao deve trabalhar com o **estado resultante** da mutacao, nao apenas com os campos enviados no payload. Isso evita buracos onde uma rota altera apenas parte dos dados, mas o estado final continua representando partida iniciada.

Exemplos:

- se o payload so trouxer `winnerId`, isso ja e suficiente para bloquear em torneio `upcoming`;
- se o fluxo live incrementar placar e implicitamente colocar a partida em `live`, isso tambem deve ser bloqueado;
- se a partida ja estava inconsistente e o admin tentar aprofundar a inconsistencia, a operacao segue bloqueada.

### 6.3 Fonte da verdade

O backend e a fonte de verdade. Mesmo com bloqueios preventivos no frontend, a protecao real acontece no servidor.

---

## 7. UX Administrativa

### 7.1 Comportamento de erro

Quando a regra for violada, o backend deve retornar um erro semantico padrao, por exemplo:

- codigo: `TOURNAMENT_UPCOMING_CANNOT_START_MATCH`
- mensagem orientada a acao: "Defina o torneio como ativo antes de iniciar partidas ou registrar resultados."

O nome exato do codigo pode ser ajustado na implementacao, mas precisa ser unico e consistente entre os fluxos.

### 7.2 Guardrails preventivos no frontend

Nas telas administrativas que exibem ou controlam partidas:

- desabilitar acoes que colocam partida em `live` ou `finished`;
- desabilitar acoes que gravam vencedor ou placar efetivo;
- mostrar tooltip, helper text ou toast explicando o motivo do bloqueio;
- nunca confiar apenas no frontend para garantir integridade.

### 7.3 Politica de status

Nao deve existir auto-correcao de torneio para `active`. O admin continua responsavel por fazer essa mudanca manualmente.

Isso preserva o controle operacional desejado e evita automacoes silenciosas que escondam erro de governanca.

---

## 8. i18n

Todas as mensagens visiveis para o admin devem passar por `t()`.

### Necessidades minimas

- chave de erro principal em `apps/web/src/locales/pt/admin.json`;
- chave equivalente em `apps/web/src/locales/en/admin.json`;
- chaves auxiliares para tooltip, disabled state ou hint contextual, se a UI preventiva for implementada em mais de uma tela.

Nao deve haver string hardcoded em componentes ou server functions que reflita esse novo bloqueio.

---

## 9. Casos Permitidos e Bloqueados

### Permitidos em torneio upcoming

- criar partida nova com `status = scheduled` e sem resultado;
- editar horario, labels, times, ordenacao e outros campos estruturais;
- manter placar neutro sem iniciar a partida.

### Bloqueados em torneio upcoming

- iniciar partida;
- finalizar partida;
- registrar vencedor;
- registrar placar efetivo;
- usar live admin para avancar estado competitivo.

### Permitidos em torneio active

- iniciar/finalizar partidas normalmente;
- registrar placares e vencedores;
- seguir fluxo atual de live admin e demais operacoes administrativas.

---

## 10. Testes e Verificacao

### Regressao minima esperada

- `upcoming` + tentar `status = live` -> falha;
- `upcoming` + tentar `status = finished` -> falha;
- `upcoming` + tentar definir `winnerId` -> falha;
- `upcoming` + tentar definir `scoreA > 0` ou `scoreB > 0` -> falha;
- `upcoming` + criacao/edicao neutra -> sucesso;
- `active` + mesmas operacoes competitivas -> sucesso.

### Verificacao de UX

- confirmar que as telas administrativas mostram mensagem clara e traduzida;
- confirmar que botoes/acoes sensiveis refletem o bloqueio quando o torneio estiver `upcoming`;
- confirmar que o erro do backend continua protegendo o sistema mesmo se a UI for contornada.

### Verificacao de produto

- confirmar que o torneio continua exigindo ativacao manual;
- confirmar que o bloqueio reduz o risco de inconsistencias em superficies que filtram por `tournaments.status`.

---

## 11. Riscos e Decisoes

### Decisoes tomadas

- O comportamento sera bloqueante, nao autocorretivo.
- A regra vale para todos os caminhos administrativos.
- Placar ou vencedor definidos antes da ativacao manual contam como sinal de inicio real.

### Risco aceito

Podem existir dados historicos ja inconsistentes no banco. Esta spec foca em impedir novas inconsistencias. Eventual saneamento de dados antigos pode ser tratado separadamente, se necessario.

---

## 12. Implementacao Esperada

O trabalho de implementacao deve seguir estas prioridades:

1. centralizar a validacao no backend;
2. aplicar a validacao em todos os fluxos administrativos relevantes;
3. expor erro semantico consistente;
4. adicionar guardrails preventivos na UI admin;
5. cobrir a regra com verificacao de regressao.

Essa ordem garante integridade primeiro e refinamento de experiencia logo depois.
