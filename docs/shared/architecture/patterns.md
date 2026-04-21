# Patterns

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Patterns de design são soluções consolidadas para problemas recorrentes: vocabulário compartilhado entre engenheiros e heurísticas testadas em produção.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Caller** (quem invoca a função) | Código que chama uma função ou serviço e trata o resultado |
| **ORM** (Object-Relational Mapper, Mapeador Objeto-Relacional) | Biblioteca que mapeia objetos do código para tabelas do banco de dados |
| **OCP** (Open/Closed Principle, Princípio Aberto/Fechado) | Design aberto para extensão por novas implementações, fechado para modificação do código existente |
| **CRUD** (Create, Read, Update, Delete, Criar, Ler, Atualizar, Deletar) | Conjunto das quatro operações básicas de persistência |
| **CQS** (Command-Query Separation, Separação de Comando e Consulta) | Princípio de função: retorna valor OU produz efeito colateral, nunca os dois; ver `principles.md` |
| **CQRS** (Command Query Responsibility Segregation, Segregação de Responsabilidade de Comando e Consulta) | Padrão arquitetural: modelos de escrita e leitura completamente separados |
| **Command** (Comando) | Operação que altera estado; não retorna dado de negócio |
| **Query** (Consulta) | Operação que lê e retorna dado; não altera estado |
| **Projection** (Projeção) | Modelo de leitura desnormalizado, otimizado para consulta |
| **SDD** (Spec-Driven Development, Desenvolvimento Orientado a Especificações) | Spec define contrato de entradas, saídas e comportamentos antes de qualquer implementação |
| **LLM** (Large Language Model, Modelo de Linguagem de Grande Escala) | Modelo de IA treinado em texto que gera código, explica conceitos e auxilia no desenvolvimento |

## Result Pattern

Operações que podem falhar têm dois caminhos: sucesso e falha. A forma mais comum de tratar isso é lançar exceções, mas exceções são invisíveis na assinatura da função. Quem chama não sabe, sem ler a implementação, que a função pode falhar e em quais condições.

O Result pattern torna os dois caminhos explícitos na assinatura:

```
Result<Order>
  .Success(order)
  .Failure("SKU not found")
```

O caller (quem invoca a função) é obrigado a tratar os dois casos. Sucesso e falha são valores: ambos aparecem na assinatura e exigem tratamento explícito. Isso elimina try/catch espalhados pelo código de negócio e centraliza o tratamento de erro onde faz sentido.

**Quando usar**: operações de domínio que podem falhar por regra de negócio (validação, não encontrado, estado inválido). Exceções de infraestrutura (falha de banco, timeout de rede) seguem o caminho normal de exceções.

## Factory

Criação de objetos complexos tem lógica: validar parâmetros, aplicar defaults (valores padrão), montar dependências. Colocar essa lógica no construtor mistura responsabilidades. Espalhá-la nos callers cria duplicação.

Factory centraliza a lógica de criação em um único lugar. O caller pede um objeto sem saber como ele é montado.

```
UserFactory.create({ name, email, role })
  → valida email
  → aplica role default se ausente
  → retorna User
```

**Quando usar**: criação envolve validação, defaults ou lógica condicional que não pertence ao caller.

## Repository

O código de negócio não deveria conhecer SQL, **ORM** (Object-Relational Mapper, Mapeador Objeto-Relacional) ou detalhes de storage. Repository encapsula o acesso a dados atrás de uma interface orientada a domínio.

```
UserRepository
  .findById(id)
  .findByEmail(email)
  .save(user)
```

O código de domínio fala em `findByEmail`, não em `SELECT * FROM users WHERE email = ?`. A camada de dados pode mudar (PostgreSQL → MongoDB, Dapper → EF) sem tocar o domínio.

**Quando usar**: acesso a banco em sistemas com lógica de domínio não trivial. Em CRUDs (Create, Read, Update, Delete, Criar, Ler, Atualizar, Deletar) simples sem lógica, pode ser overhead (custo extra de implementação).

## Strategy

Comportamento que varia por contexto (calculadora de frete, formatador de relatório, provedor de pagamento) tende a virar um `if/switch` crescendo indefinidamente. Strategy resolve isso extraindo cada variação em sua própria implementação com interface comum.

```
ShippingStrategy
  ├── CorreiosStrategy.calculate(order)
  ├── FedExStrategy.calculate(order)
  └── PickupStrategy.calculate(order)
```

O caller recebe a strategy como dependência. Adicionar uma nova variação é adicionar uma nova implementação, sem tocar o código existente. Isso é o **OCP** (Open/Closed Principle, Princípio Aberto/Fechado): aberto para extensão, fechado para modificação.

**Quando usar**: comportamento que varia por tipo, contexto ou configuração e que tem chance real de crescer.

## Observer

Um evento ocorre e múltiplas partes do sistema precisam reagir. Conectar produtor e consumidores diretamente cria acoplamento: cada novo consumidor exige modificar o produtor.

Observer inverte esse acoplamento. O produtor emite um evento sem saber quem vai ouvir. Os consumidores se registram para os eventos que lhes interessam.

```
OrderPlaced (evento)
  → EmailService.sendConfirmation()
  → InventoryService.reserve()
  → AnalyticsService.track()
```

Adicionar um novo consumidor não toca o produtor. Remover um consumidor também não. O produtor e os consumidores evoluem de forma independente.

**Quando usar**: reações a eventos onde o produtor e os consumidores precisam evoluir de forma independente. Evitar quando a ordem de execução dos handlers (funções que respondem ao evento) importa, pois Observer não garante ordem.

## Builder

Objetos com muitos parâmetros opcionais criam construtores ilegíveis e chamadas confusas. Builder constrói o objeto passo a passo, nomeando cada etapa.

```
QueryBuilder
  .from("orders")
  .where("status", "pending")
  .orderBy("created_at", "desc")
  .limit(20)
  .build()
```

Cada método retorna o próprio builder, permitindo encadeamento. O `build()` no final valida e retorna o objeto montado. A intenção de cada parâmetro fica explícita pelo nome do método.

**Quando usar**: criação de objetos com muitos campos opcionais, ou quando a ordem de configuração importa e precisa ser legível.

## Decorator

Adicionar comportamento a um objeto sem alterar sua implementação. O decorator envolve o objeto original e adiciona lógica antes ou depois da chamada.

```
LoggingRepository(
  CachingRepository(
    SqlRepository()
  )
)
```

Cada camada adiciona uma responsabilidade isolada: logging, cache, retry (nova tentativa), rate limiting (limitação de taxa de requisições). A composição é feita na configuração, não espalhada pelo código. A implementação original não sabe que está sendo decorada.

**Quando usar**: comportamento transversal (logging, cache, autenticação) que precisa ser aplicado de forma composável, sem modificar a implementação base.

## CQRS: Command Query Responsibility Segregation

> Não confundir com **CQS** (Command-Query Separation), que é um princípio de _função_: a função retorna valor ou produz efeito, nunca os dois. CQRS é um padrão _arquitetural_ que separa modelos inteiros de escrita e leitura.

Em sistemas com lógica de negócio complexa, o modelo de escrita (validações, invariantes, regras de domínio) e o modelo de leitura (relatórios, dashboards, listas paginadas) divergem: o que faz sentido para persistir não é o que faz sentido para exibir.

CQRS separa os dois em modelos distintos:

```
Command (escrita)              Query (leitura)
─────────────────              ───────────────
CreateOrder                    GetOrderSummary
  → valida domínio               → lê projeção desnormalizada
  → persiste no write model      → retorna DTO otimizado para a UI
  → emite evento
```

O **write model** (modelo de escrita) aplica as regras de domínio e persiste o estado. O **read model** (modelo de leitura), chamado de **Projection** (Projeção), é uma visão desnormalizada e otimizada para consulta. Pode ser uma tabela separada, uma view materializada ou um índice de busca.

| Responsabilidade | Modelo | Objetivo |
|---|---|---|
| **Command** | Write model | Validar e persistir mudança de estado |
| **Query** | Read model (Projection) | Servir dados otimizados para leitura |

**Quando usar**: sistemas onde o modelo de leitura e o de escrita divergem de forma significativa: relatórios complexos, dashboards de alto volume, auditoria, histórico de eventos. Em CRUDs simples, CQRS é overhead sem benefício.

## AI-Driven Development (Desenvolvimento Assistido por IA)

Desenvolvimento assistido por **LLM** (Large Language Model, Modelo de Linguagem de Grande Escala) integrado ao ciclo de engenharia: geração de código, revisão, sugestão de refactoring e navegação em bases de código grandes.

O risco central não é a IA: é a ausência de revisão crítica. Código gerado sem avaliação contra a spec e os padrões do projeto cria dívida técnica opaca: funciona, mas não se encaixa no modelo de domínio, ignora convenções ou duplica lógica existente.

A prática correta:

```
Spec define o contrato → IA gera o candidato → Engenheiro revisa contra spec e padrões → Merge
```

Nesse modelo, a IA acelera a geração; o engenheiro mantém a responsabilidade pelo design e pela qualidade. A spec é o critério de avaliação, não o feeling de "parece certo".

**Quando usar**: qualquer tarefa onde o contrato já está definido. A IA produz melhor quando sabe o que deve entregar; tarefas sem spec clara geram código sem critério de aceitação.

## SDD: Spec-Driven Development (Desenvolvimento Orientado a Especificações)

A spec (especificação) define entradas, saídas e comportamentos esperados antes de qualquer linha de implementação. O código serve a spec, não o contrário.

Ciclo:

```
SPEC → PLAN → CODE → TEST → END
```

- **SPEC**: define o contrato: o quê e por quê, não o como
- **PLAN**: decompõe em tarefas ordenadas com esforço estimado
- **CODE**: implementa o plano, nada além
- **TEST**: verifica que a implementação satisfaz a spec
- **END**: fecha o ciclo com changelog, backlog sync e commit

O benefício central é custo de decisão: rever uma spec é grátis; rever código já implementado tem custo de entendimento, reescrita e reteste. Decisões de design tomadas na spec chegam ao código com clareza de intenção.

> Este guia segue SDD. O ciclo de governança em `.ai/` é uma implementação direta desse padrão.

---

## Referência rápida

| Pattern | Problema que resolve | Sinal de uso |
|---|---|---|
| **Result** | Falhas invisíveis na assinatura | Operação de domínio que pode falhar |
| **Factory** | Criação complexa espalhada nos callers | Construtor com lógica condicional |
| **Repository** | Acoplamento entre domínio e storage | `SELECT` no meio do código de negócio |
| **Strategy** | `if/switch` crescendo por tipo | Comportamento que varia por contexto |
| **Observer** | Produtor acoplado a consumidores | Reações a eventos em cascata |
| **Builder** | Construtor com muitos parâmetros opcionais | `new Obj(null, null, true, false, ...)` |
| **Decorator** | Comportamento transversal sem modificar base | Logging, cache, retry composáveis |
| **CQRS** | Write model e read model divergem | Relatórios complexos, alto volume de leitura |
| **AI-Driven** | Aceleração de geração com revisão crítica | Ciclos rápidos com spec bem definida |
| **SDD** | Spec antes de código | Decisões de design sem custo de implementação |
