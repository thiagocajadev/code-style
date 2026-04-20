# Patterns

Patterns de design são soluções consolidadas para problemas recorrentes: vocabulário compartilhado entre engenheiros e heurísticas testadas em produção.

## Result Pattern

Operações que podem falhar têm dois caminhos: sucesso e falha. A forma mais comum de tratar isso é lançar exceções, mas exceções são invisíveis na assinatura da função. Quem chama não sabe, sem ler a implementação, que a função pode falhar e em quais condições.

O Result pattern torna os dois caminhos explícitos na assinatura:

```
Result<Order>
  .Success(order)
  .Failure("SKU not found")
```

O caller é obrigado a tratar os dois casos. Sucesso e falha são valores: ambos aparecem na assinatura e exigem tratamento explícito. Isso elimina try/catch espalhados pelo código de negócio e centraliza o tratamento de erro onde faz sentido.

**Quando usar**: operações de domínio que podem falhar por regra de negócio (validação, não encontrado, estado inválido). Exceções de infraestrutura (falha de banco, timeout de rede) seguem o caminho normal de exceções.

## Factory

Criação de objetos complexos tem lógica: validar parâmetros, aplicar defaults, montar dependências. Colocar essa lógica no construtor mistura responsabilidades. Espalhá-la nos callers cria duplicação.

Factory centraliza a lógica de criação em um único lugar. O caller pede um objeto sem saber como ele é montado.

```
UserFactory.create({ name, email, role })
  → valida email
  → aplica role default se ausente
  → retorna User
```

**Quando usar**: criação envolve validação, defaults ou lógica condicional que não pertence ao caller.

## Repository

O código de negócio não deveria conhecer SQL, ORM (Object-Relational Mapper, Mapeador Objeto-Relacional) ou detalhes de storage. Repository encapsula o acesso a dados atrás de uma interface orientada a domínio.

```
UserRepository
  .findById(id)
  .findByEmail(email)
  .save(user)
```

O código de domínio fala em `findByEmail`, não em `SELECT * FROM users WHERE email = ?`. A camada de dados pode mudar (PostgreSQL → MongoDB, Dapper → EF) sem tocar o domínio.

**Quando usar**: acesso a banco em sistemas com lógica de domínio não trivial. Em CRUDs (Create, Read, Update, Delete — Criar, Ler, Atualizar, Deletar) simples sem lógica, pode ser overhead.

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

**Quando usar**: reações a eventos onde o produtor e os consumidores precisam evoluir de forma independente. Evitar quando a ordem de execução dos handlers importa, pois Observer não garante ordem.

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

Cada camada adiciona uma responsabilidade isolada: logging, cache, retry, rate limiting. A composição é feita na configuração, não espalhada pelo código. A implementação original não sabe que está sendo decorada.

**Quando usar**: comportamento transversal (logging, cache, autenticação) que precisa ser aplicado de forma composável, sem modificar a implementação base.

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
