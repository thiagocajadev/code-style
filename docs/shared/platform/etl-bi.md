# ETL e BI: levar o dado operacional para a análise

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Rodar um relatório pesado no banco que atende os usuários deixa o sistema lento para todo mundo. A camada analítica existe para evitar isso: ela copia os dados operacionais para um ambiente montado para leitura, e a análise passa a rodar longe do caminho crítico.

**ETL** (Extract, Transform, Load · Extração, Transformação e Carga) é o processo que move esses dados. **BI** (Business Intelligence · Inteligência de Negócios) é o que o time de negócio faz com eles depois: dashboards, relatórios e perguntas soltas. O banco transacional **OLTP** (Online Transaction Processing · Processamento de Transações Online) é montado para escrever rápido e manter a consistência. O banco analítico **OLAP** (Online Analytical Processing · Processamento Analítico Online) é montado para varrer milhões de linhas e devolver um total.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **OLTP** (Online Transaction Processing · Processamento de Transações Online) | Banco operacional: muitas escritas pequenas, schema normalizado, otimizado para consistência |
| **OLAP** (Online Analytical Processing · Processamento Analítico Online) | Banco analítico: poucas queries grandes, schema denormalizado, otimizado para leitura |
| **ETL** (Extract, Transform, Load · Extração, Transformação e Carga) | Pipeline que extrai dados da fonte, transforma e carrega no destino |
| **ELT** (Extract, Load, Transform · Extração, Carga e Transformação) | Variante moderna: carrega dados brutos no destino e transforma com SQL dentro do warehouse |
| **Data Warehouse** (armazém de dados) | Banco analítico central que consolida dados de múltiplas fontes com schema definido |
| **Data Mart** (recorte do warehouse por domínio) | Subconjunto do Data Warehouse focado em um domínio: financeiro, vendas, operações |
| **Data Lake** (lago de dados) | Repositório de dados brutos em formato original (JSON, CSV, Parquet), sem schema rígido |
| **Staging layer** (camada de preparação) | Área intermediária que recebe dados brutos antes da transformação |
| **Fact table** (tabela de fatos) | Tabela central do modelo dimensional: métricas numéricas e chaves estrangeiras para dimensões |
| **Dimension table** (tabela de dimensão) | Atributos descritivos que contextualizam os fatos: quem, o quê, onde, quando |
| **SCD** (Slowly Changing Dimension · Dimensão de Mudança Lenta) | Estratégia para preservar ou sobrescrever histórico quando atributos mudam ao longo do tempo |
| **CDC** (Change Data Capture · Captura de Mudanças de Dados) | Técnica que lê inserções, atualizações e exclusões diretamente do log de transações do banco |
| **Star schema** (esquema estrela) | Modelo com uma fact table central e dimensões planas; rápido para queries analíticas |
| **Snowflake schema** (esquema floco de neve) | Variante com dimensões normalizadas; menor redundância, queries com mais JOINs |
| **Grain** (granularidade) | Nível de detalhe de cada linha na fact table: uma linha por evento, por dia, por transação |
| **Watermark** (marcador de progresso da extração) | Valor que registra o ponto até onde a extração chegou; base para carga incremental |

---

## O banco que registra e o banco que responde perguntas

Os dois bancos existem separados porque as otimizações se anulam. O schema normalizado que evita redundância na escrita obriga a query analítica a montar dezenas de JOINs. A redundância que deixa a leitura rápida encarece cada escrita. Cada lado escolhe um extremo.

| Característica | OLTP | OLAP |
|---|---|---|
| Objetivo | Registrar transações | Responder perguntas analíticas |
| Operações dominantes | INSERT, UPDATE, DELETE | SELECT com GROUP BY, JOIN, agregações |
| Volume por query | Poucas linhas por vez | Milhões de linhas por query |
| Schema | Normalizado (3NF): sem redundância | Denormalizado (star/snowflake): redundância intencional |
| Histórico | Estado atual; histórico em tabelas de auditoria | Histórico completo como dado primário |
| Exemplos | PostgreSQL, SQL Server, MySQL | Redshift, BigQuery, Snowflake, ClickHouse, DuckDB |

---

## As camadas do pipeline

O pipeline leva o dado da fonte até o dashboard passando por camadas, e cada uma tem uma responsabilidade só.

`Fonte → Staging → Transform → Data Warehouse → Data Marts → BI`

| Camada | Responsabilidade |
|---|---|
| **Fonte** | Sistemas operacionais: banco OLTP, APIs, arquivos, filas |
| **Staging** | Cópia fiel dos dados brutos, sem transformação; permite reprocessamento sem re-extrair |
| **Transform** | Limpeza, normalização, enriquecimento e cálculo de métricas derivadas |
| **Data Warehouse** | Schema dimensional (star/snowflake) com dados históricos consolidados |
| **Data Marts** | Subconjuntos por domínio, otimizados para as queries do time de negócio |
| **BI** | Dashboards, relatórios e exploração ad-hoc; consome Data Marts ou DW diretamente |

A camada de **Staging** é o ponto de recuperação do pipeline. Quando a transformação quebra, os dados brutos continuam lá, e a reexecução parte deles sem precisar bater na fonte de novo. Isso importa quando a fonte é uma API com teto de chamadas, ou um banco de produção que já está no limite.

---

## Extrair da fonte

Três estratégias, com custos diferentes de volume, atraso e complexidade.

| Estratégia | Como funciona | Quando usar |
|---|---|---|
| **Full load** (carga completa) | Extrai toda a tabela a cada execução | Tabelas pequenas ou sem coluna de controle de mudança |
| **Incremental** (incremental) | Extrai apenas registros modificados após o último watermark | Tabelas com `updated_at` ou `created_at` confiável |
| **CDC** (Change Data Capture) | Lê o log de transações do banco, captura INSERT, UPDATE e DELETE | Alta frequência de mudanças, ou quando deletes precisam ser rastreados |

### Extração incremental com watermark

O **watermark** é o carimbo do ponto até onde a última execução chegou. A próxima execução pede só o que mudou depois dele, e o volume extraído deixa de crescer junto com a tabela.

```sql
-- extrair registros modificados após o último watermark
SELECT
  Players.Id,
  Players.Name,
  Players.Position,
  Players.TeamId,
  Players.UpdatedAt
FROM
  Players
WHERE
  Players.UpdatedAt > @LastWatermark
ORDER BY
  Players.UpdatedAt;

-- ao final do job: persistir o maior UpdatedAt processado como novo watermark
```

O incremental tem um ponto cego: a linha apagada no OLTP some da tabela e nunca aparece na extração, então ela continua viva no warehouse para sempre. Duas saídas resolvem. O **CDC** lê o log de transações e enxerga o DELETE. O soft delete marca a linha com `DeletedAt` em vez de removê-la, e aí o `UpdatedAt` muda e a extração incremental a captura.

---

## Onde a transformação acontece

A diferença entre **ETL** e **ELT** está no momento em que o dado é transformado. No ETL, uma ferramenta externa limpa e calcula antes de gravar no warehouse. No ELT, o dado bruto entra primeiro, e a transformação roda dentro do próprio warehouse com SQL.

| Aspecto | ETL | ELT |
|---|---|---|
| Onde transforma | Ferramenta externa (Spark, SSIS, Airflow) antes de carregar | Dentro do Data Warehouse com SQL ou dbt após carregar |
| Dados na Staging | Transformados e limpos | Brutos e fiéis à fonte |
| Quando usar | Dados sensíveis que não podem entrar brutos no DW; transformações que SQL não expressa bem | Warehouse com poder computacional suficiente; equipe com SQL forte |
| Ferramentas comuns | Apache Spark, SSIS, Talend, Airflow com Python | dbt, Dataform, SQL nativo do warehouse |

O ELT virou o padrão nos warehouses modernos como BigQuery, Snowflake e Redshift, por três motivos: o armazenamento ficou barato, o **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) desses bancos dá conta da transformação, e a lógica escrita em SQL entra no controle de versão com dbt. O ETL segue sendo a escolha certa em dois casos: quando o dado bruto não pode sair da rede interna, e quando a transformação exige uma lógica que SQL expressa mal.

---

## Modelagem dimensional

O modelo dimensional organiza as tabelas para que uma pergunta de negócio vire uma query curta. A **Fact table** guarda o que aconteceu e quanto (o gol, o valor da venda). As **Dimension tables** guardam o contexto ao redor: quem, onde e quando.

### Grain: o que cada linha da fact table representa

Declare o **grain** antes de criar a tabela, em uma frase:

- "Uma linha por gol marcado" (grain = evento)
- "Uma linha por partida por time" (grain = partida + time)
- "Uma linha por dia por jogador" (grain = dia + jogador)

Misturar dois grains na mesma fact table corrompe as agregações. Se metade das linhas é um gol e a outra metade é um resumo diário, o `SUM` conta os mesmos gols duas vezes, e ninguém percebe olhando o número.

### Star schema: dimensões planas ao redor do fato

As dimensões ficam ao lado da fact table, cada uma a um JOIN de distância. A query analítica toca poucas tabelas, o que a deixa rápida. É o formato preferido.

`DimDate + DimPlayer + DimTeam + DimStadium → FactGoal`

```sql
-- fact table: uma linha por gol marcado
CREATE TABLE FactGoal
(
  GoalKey    INT      NOT NULL IDENTITY(1, 1),
  DateKey    INT      NOT NULL,
  PlayerKey  INT      NOT NULL,
  TeamKey    INT      NOT NULL,
  StadiumKey INT      NOT NULL,
  Minute     SMALLINT NOT NULL,
  IsOwnGoal  BIT      NOT NULL DEFAULT 0,
  IsPenalty  BIT      NOT NULL DEFAULT 0,

  CONSTRAINT PK_FactGoal        PRIMARY KEY (GoalKey),
  CONSTRAINT FK_FactGoal_Date   FOREIGN KEY (DateKey)    REFERENCES DimDate (DateKey),
  CONSTRAINT FK_FactGoal_Player FOREIGN KEY (PlayerKey)  REFERENCES DimPlayer (PlayerKey),
  CONSTRAINT FK_FactGoal_Team   FOREIGN KEY (TeamKey)    REFERENCES DimTeam (TeamKey)
);

-- dimension table: uma linha por jogador (ou por versão com SCD Tipo 2)
CREATE TABLE DimPlayer
(
  PlayerKey   INT              NOT NULL IDENTITY(1, 1), -- surrogate key
  PlayerId    UNIQUEIDENTIFIER NOT NULL,               -- natural key do OLTP
  Name        NVARCHAR(200)    NOT NULL,
  Position    NVARCHAR(50)     NOT NULL,
  Nationality NVARCHAR(100)    NOT NULL,

  CONSTRAINT PK_DimPlayer PRIMARY KEY (PlayerKey)
);
```

A **surrogate key** (`PlayerKey`) é um número sequencial que só existe no warehouse. A **natural key** (`PlayerId`) é o identificador que veio do OLTP. As duas convivem porque o mesmo jogador pode ter várias linhas no warehouse, uma por versão histórica, e cada versão precisa de uma chave própria.

### Snowflake schema: dimensões normalizadas

As dimensões se dividem em outras dimensões: `DimTeam` aponta para `DimLeague`, que aponta para `DimCountry`. A redundância cai, e cada query passa a precisar de mais JOINs. Vale a pena quando o armazenamento pesa no custo, ou quando as dimensões secundárias são consultadas por conta própria.

---

## Quando o atributo da dimensão muda com o tempo

O jogador troca de time, o produto muda de preço, o cliente muda de cidade. O tipo de **SCD** define o que acontece com o histórico nesse momento.

| Tipo | Estratégia | Preserva histórico | Quando usar |
|---|---|---|---|
| **Tipo 1** | Sobrescreve o valor atual | Não | Correções de erro; valor anterior não tem relevância analítica |
| **Tipo 2** | Nova linha com período de vigência | Sim (completo) | Mudanças com impacto analítico: transferência de time, promoção, mudança de preço |
| **Tipo 3** | Coluna `PreviousValue` | Parcial (um passo) | Quando só a última mudança interessa e o schema simples é prioritário |

A escolha errada apaga informação que ninguém consegue recuperar depois. Se o time do jogador é Tipo 1, a transferência sobrescreve o passado, e os gols que ele fez pelo clube anterior passam a aparecer no clube novo.

### SCD Tipo 2

```sql
CREATE TABLE DimPlayer
(
  PlayerKey  INT              NOT NULL IDENTITY(1, 1), -- surrogate key
  PlayerId   UNIQUEIDENTIFIER NOT NULL,               -- natural key do OLTP
  Name       NVARCHAR(200)    NOT NULL,
  Position   NVARCHAR(50)     NOT NULL,
  TeamName   NVARCHAR(200)    NOT NULL,               -- denormalizado: evita JOIN em queries históricas
  ValidFrom  DATE             NOT NULL,
  ValidUntil DATE             NULL,                   -- NULL = registro atual
  IsCurrent  BIT              NOT NULL DEFAULT 1,

  CONSTRAINT PK_DimPlayer PRIMARY KEY (PlayerKey)
);
```

Na transferência, a linha vigente recebe `ValidUntil = hoje` e `IsCurrent = 0`, e uma linha nova entra com o time novo e `IsCurrent = 1`. A query histórica escolhe a versão certa filtrando por `ValidFrom <= @Date AND (ValidUntil > @Date OR ValidUntil IS NULL)`.

---

## BI e relatórios

As ferramentas de BI (Power BI, Tableau, Metabase, Looker) se conectam ao Data Warehouse ou aos Data Marts. Elas geram SQL na hora em que o usuário clica, ou leem de um cache que já foi preenchido antes.

### A query analítica pergunta outra coisa

| Característica | Query operacional (OLTP) | Query analítica (OLAP) |
|---|---|---|
| Filtro | Por ID ou chave única | Por período, categoria, grupo |
| Resultado | Registros específicos | Agregações: SUM, COUNT, AVG, percentis |
| Frequência | Alta: centenas por segundo | Baixa: dezenas por minuto |
| Latência esperada | Abaixo de 100ms | Segundos a minutos |

### Definição centralizada de métricas

Quando cada dashboard calcula o mesmo `SUM` com um filtro ligeiramente diferente, os relatórios chegam a números diferentes, e a reunião vira uma discussão sobre qual planilha está certa. Defina a métrica em um lugar só e faça todos os dashboards lerem dali.

As ferramentas com camada semântica já oferecem esse lugar: **measures** em DAX no Power BI, **LookML** no Looker, **metrics** no dbt. Sem nenhuma delas, uma view ou uma tabela agregada no warehouse cumpre o papel de fonte única.

### Calcular o agregado antes da pergunta

Uma query recorrente sobre volume grande não precisa varrer tudo de novo a cada abertura do dashboard. Um job noturno calcula o total do dia e grava numa tabela pequena, e o dashboard passa a ler dessa tabela.

```sql
-- tabela de agregado diário: populada uma vez por dia via job agendado
CREATE TABLE AggGoalsByPlayerByDay
(
  DateKey        INT NOT NULL,
  PlayerKey      INT NOT NULL,
  TotalGoals     INT NOT NULL DEFAULT 0,
  TotalPenalties INT NOT NULL DEFAULT 0,

  CONSTRAINT PK_AggGoals PRIMARY KEY (DateKey, PlayerKey)
);
```

O custo é a atualidade: o número reflete o último processamento, e não o instante da consulta. Combine com a frequência que o negócio aceita.

---

## Referência rápida

| Problema | Sinal | Ação |
|---|---|---|
| Query analítica lenta no OLTP | CPU alta, latência de escrita aumentando | Mover para banco OLAP separado |
| Números divergentes entre dashboards | Cada relatório calcula a métrica de forma diferente | Centralizar no DW ou em camada semântica |
| Pipeline falhou no meio da transformação | Dados inconsistentes no DW | Staging intacta: reprocessar sem re-extrair |
| DELETE no OLTP não rastreado no DW | Registros deletados permanecem no warehouse | Implementar CDC ou soft delete com `DeletedAt` |
| Full load lento em tabela grande | Tempo de extração domina o pipeline | Adicionar coluna `updated_at` e migrar para incremental |
| Análise histórica incorreta após mudança de atributo | Dimensão Tipo 1 sobrescreveu histórico | Migrar para SCD Tipo 2 a partir de agora |

---

## Referências relacionadas

- [Banco de dados](./database.md): tuning de queries, operações em lote, plano de execução
- [Formatos e integrações](./integrations.md): fontes externas (APIs, arquivos, protocolos)
- [Mensageria](./messaging.md): filas e eventos como fonte de dados para pipelines CDC
