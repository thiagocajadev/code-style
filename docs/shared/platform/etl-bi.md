# ETL e BI

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**ETL** (Extract, Transform, Load, Extração, Transformação e Carga) e **BI** (Business Intelligence, Inteligência de Negócios) formam a camada analítica de um sistema: movem dados operacionais para um ambiente otimizado para leitura e análise. O banco transacional **OLTP** (Online Transaction Processing, Processamento de Transações Online) é projetado para escrita rápida e consistência. O banco analítico **OLAP** (Online Analytical Processing, Processamento Analítico Online) é projetado para queries agregadas em grandes volumes históricos. Rodar análises pesadas diretamente no OLTP compromete a latência do sistema operacional.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **OLTP** (Online Transaction Processing, Processamento de Transações Online) | Banco operacional: muitas escritas pequenas, schema normalizado, otimizado para consistência |
| **OLAP** (Online Analytical Processing, Processamento Analítico Online) | Banco analítico: poucas queries grandes, schema denormalizado, otimizado para leitura |
| **ETL** (Extract, Transform, Load, Extração, Transformação e Carga) | Pipeline que extrai dados da fonte, transforma e carrega no destino |
| **ELT** (Extract, Load, Transform, Extração, Carga e Transformação) | Variante moderna: carrega dados brutos no destino e transforma com SQL dentro do warehouse |
| **Data Warehouse** (armazém de dados) | Banco analítico central que consolida dados de múltiplas fontes com schema definido |
| **Data Mart** (mercado de dados) | Subconjunto do Data Warehouse focado em um domínio: financeiro, vendas, operações |
| **Data Lake** (lago de dados) | Repositório de dados brutos em formato original (JSON, CSV, Parquet), sem schema rígido |
| **Staging layer** (camada de preparação) | Área intermediária que recebe dados brutos antes da transformação |
| **Fact table** (tabela de fatos) | Tabela central do modelo dimensional: métricas numéricas e chaves estrangeiras para dimensões |
| **Dimension table** (tabela de dimensão) | Atributos descritivos que contextualizam os fatos: quem, o quê, onde, quando |
| **SCD** (Slowly Changing Dimension, Dimensão de Mudança Lenta) | Estratégia para preservar ou sobrescrever histórico quando atributos mudam ao longo do tempo |
| **CDC** (Change Data Capture, Captura de Mudanças de Dados) | Técnica que lê inserções, atualizações e exclusões diretamente do log de transações do banco |
| **Star schema** (esquema estrela) | Modelo com uma fact table central e dimensões planas; rápido para queries analíticas |
| **Snowflake schema** (esquema floco de neve) | Variante com dimensões normalizadas; menor redundância, queries com mais JOINs |
| **Grain** (granularidade) | Nível de detalhe de cada linha na fact table: uma linha por evento, por dia, por transação |
| **Watermark** (marca d'água) | Valor que registra o ponto até onde a extração chegou; base para carga incremental |

---

## OLTP vs OLAP

A separação existe porque os dois têm requisitos opostos: otimizar para escrita prejudica leitura analítica, e vice-versa.

| Característica | OLTP | OLAP |
|---|---|---|
| Objetivo | Registrar transações | Responder perguntas analíticas |
| Operações dominantes | INSERT, UPDATE, DELETE | SELECT com GROUP BY, JOIN, agregações |
| Volume por query | Poucas linhas por vez | Milhões de linhas por query |
| Schema | Normalizado (3NF): sem redundância | Denormalizado (star/snowflake): redundância intencional |
| Histórico | Estado atual; histórico em tabelas de auditoria | Histórico completo como dado primário |
| Exemplos | PostgreSQL, SQL Server, MySQL | Redshift, BigQuery, Snowflake, ClickHouse, DuckDB |

---

## Pipeline de dados

O pipeline move dados da fonte ao consumidor em camadas com responsabilidade clara.

`Fonte → Staging → Transform → Data Warehouse → Data Marts → BI`

| Camada | Responsabilidade |
|---|---|
| **Fonte** | Sistemas operacionais: banco OLTP, APIs, arquivos, filas |
| **Staging** | Cópia fiel dos dados brutos, sem transformação; permite reprocessamento sem re-extrair |
| **Transform** | Limpeza, normalização, enriquecimento e cálculo de métricas derivadas |
| **Data Warehouse** | Schema dimensional (star/snowflake) com dados históricos consolidados |
| **Data Marts** | Subconjuntos por domínio, otimizados para as queries do time de negócio |
| **BI** | Dashboards, relatórios e exploração ad-hoc; consome Data Marts ou DW diretamente |

A **Staging** layer é o ponto de recuperação do pipeline: se a transformação falhar, os dados brutos estão intactos e o pipeline reexecuta sem re-extrair da fonte.

---

## Extração

Três estratégias com trade-offs de volume, latência e complexidade.

| Estratégia | Como funciona | Quando usar |
|---|---|---|
| **Full load** (carga completa) | Extrai toda a tabela a cada execução | Tabelas pequenas ou sem coluna de controle de mudança |
| **Incremental** (incremental) | Extrai apenas registros modificados após o último watermark | Tabelas com `updated_at` ou `created_at` confiável |
| **CDC** (Change Data Capture) | Lê o log de transações do banco, captura INSERT, UPDATE e DELETE | Alta frequência de mudanças, ou quando deletes precisam ser rastreados |

### Extração incremental com watermark

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

**Limitação do incremental**: registros deletados no OLTP não aparecem na extração. CDC ou soft delete com `DeletedAt` resolvem esse ponto cego.

---

## ETL vs ELT

A diferença está em onde a transformação acontece.

| Aspecto | ETL | ELT |
|---|---|---|
| Onde transforma | Ferramenta externa (Spark, SSIS, Airflow) antes de carregar | Dentro do Data Warehouse com SQL ou dbt após carregar |
| Dados na Staging | Transformados e limpos | Brutos e fiéis à fonte |
| Quando usar | Dados sensíveis que não podem entrar brutos no DW; transformações que SQL não expressa bem | Warehouse com poder computacional suficiente; equipe com SQL forte |
| Ferramentas comuns | Apache Spark, SSIS, Talend, Airflow com Python | dbt, Dataform, SQL nativo do warehouse |

**ELT é o padrão moderno** para warehouses como BigQuery, Snowflake e Redshift: armazenamento barato, **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) nativo poderoso e transformações versionáveis com dbt. ETL continua a escolha certa quando os dados brutos não podem sair da rede interna ou quando a transformação exige lógica que SQL não expressa.

---

## Modelagem dimensional

O modelo dimensional organiza dados para responder perguntas de negócio com queries diretas. A **Fact table** armazena métricas (o que aconteceu e quanto); as **Dimension tables** armazenam contexto (quem, onde, quando).

### Grain

O **grain** define o que cada linha da fact table representa. Declarar antes de modelar:

- "Uma linha por gol marcado" (grain = evento)
- "Uma linha por partida por time" (grain = partida + time)
- "Uma linha por dia por jogador" (grain = dia + jogador)

Misturar grains na mesma fact table gera resultados incorretos em agregações.

### Star schema

Dimensões planas ao redor da fact table. Queries analíticas fazem poucos JOINs. Preferido para performance.

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

### Snowflake schema

Dimensões normalizadas: `DimTeam` referencia `DimLeague`, que referencia `DimCountry`. Reduz redundância, mas cada query adicional requer mais JOINs. Usar quando o custo de armazenamento for relevante ou quando as dimensões secundárias precisarem ser consultadas de forma independente.

---

## SCD — Slowly Changing Dimensions

Atributos de dimensão mudam ao longo do tempo. O tipo de SCD define como registrar esse histórico.

| Tipo | Estratégia | Preserva histórico | Quando usar |
|---|---|---|---|
| **Tipo 1** | Sobrescreve o valor atual | Não | Correções de erro; valor anterior não tem relevância analítica |
| **Tipo 2** | Nova linha com período de vigência | Sim (completo) | Mudanças com impacto analítico: transferência de time, promoção, mudança de preço |
| **Tipo 3** | Coluna `PreviousValue` | Parcial (um passo) | Quando só a última mudança interessa e o schema simples é prioritário |

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

Quando um jogador muda de time, o registro atual recebe `ValidUntil = hoje` e `IsCurrent = 0`. Uma nova linha é inserida com o novo time e `IsCurrent = 1`. Queries históricas filtram com `ValidFrom <= @Date AND (ValidUntil > @Date OR ValidUntil IS NULL)`.

---

## BI e Relatórios

Ferramentas de BI (Power BI, Tableau, Metabase, Looker) conectam ao Data Warehouse ou aos Data Marts e geram SQL em tempo real ou sobre dados em cache.

### Queries analíticas vs operacionais

| Característica | Query operacional (OLTP) | Query analítica (OLAP) |
|---|---|---|
| Filtro | Por ID ou chave única | Por período, categoria, grupo |
| Resultado | Registros específicos | Agregações: SUM, COUNT, AVG, percentis |
| Frequência | Alta: centenas por segundo | Baixa: dezenas por minuto |
| Latência esperada | Abaixo de 100ms | Segundos a minutos |

### Definição centralizada de métricas

Cada dashboard calcular o mesmo `SUM` de forma ligeiramente diferente gera divergência entre relatórios. A solução é definir a métrica uma vez e reusar em todos os contextos.

Ferramentas com camada semântica resolvem isso diretamente: Power BI com **measures** DAX, Looker com **LookML**, dbt com **metrics**. Sem uma dessas ferramentas, a alternativa é uma view ou tabela agregada no DW que serve de fonte única.

### Pre-agregação

Queries recorrentes sobre volumes grandes se beneficiam de pré-agregação: calcular e persistir o resultado periodicamente.

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

- [Database](./database.md) — tuning de queries, operações em lote, plano de execução
- [Integrations](./integrations.md) — fontes externas: APIs, arquivos, protocolos
- [Messaging](./messaging.md) — filas e eventos como fonte de dados para pipelines CDC
