# Null Safety

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

> "I call it my billion-dollar mistake." Tony Hoare, inventor do null, 2009

Null tem um espaço definido: as fronteiras do sistema. O sintoma mais comum de uso incorreto é `?.`
espalhado em todo o código como defesa preventiva. Isso é sinal de que os **contratos de entrada não estão fechados**.

A pergunta certa é _"esse null deveria chegar até aqui?"_

## A regra: checa na fronteira, confia no interior

O sistema tem dois territórios com regras diferentes:

| Território | O que é | Regra |
| --- | --- | --- |
| **Fronteira** | Onde dados de fora entram: request HTTP, resposta de API, leitura de banco, config | Checar. Normalizar. Rejeitar o inválido. |
| **Interior** | Domínio, serviços, funções de negócio | Confiar no contrato. Sem checagem defensiva. |

```
[Request / API externa / Banco]
         ↓
    [ FRONTEIRA ]  ← único lugar que lida com null
         ↓
   null eliminado
         ↓
  [ DOMÍNIO ]  ← opera com valores garantidos, sem ?.
```

Null que chega no interior é um **bug de fronteira** que deve ser corrigido na entrada.

## O que é fronteira

| Fronteira | Exemplos |
| --- | --- |
| Entrada de request | Body, query params, path params de uma requisição HTTP |
| Resposta de API externa | JSON de terceiros, webhooks |
| Retorno de banco de dados | `findById` que pode retornar null quando não encontra |
| Variáveis de ambiente / config | `process.env`, `appsettings.json` |

## O que não é fronteira

Funções internas, serviços de domínio, cálculos: tudo que recebe dados **que já passaram pela
fronteira**. Essas funções confiam que quem chamou já garantiu o contrato.

<details>
<summary>❌ Bad: interior checando null que não deveria existir</summary>
<br>

```ts
function calculateTotal(order?: Order | null): number {
  if (!order) return 0;
  if (!order.items) return 0;
  return order.items.reduce((sum, item) => sum + item.price, 0);
}
```

</details>

<br>

<details>
<summary>✅ Good: interior opera com contrato garantido</summary>
<br>

```ts
function calculateTotal(order: Order): number {
  const total = order.items.reduce((sum, item) => sum + item.price, 0);

  return total;
}
```

</details>

A diferença é **responsabilidade bem definida**. Quem chama `calculateTotal` é
responsável por passar um `Order` válido. Se não passar, é um bug de quem chamou.

## Como fechar a fronteira

Três padrões resolvem a maioria dos casos:

**1. Validação de schema na entrada**

```ts
// TypeScript — Zod na rota
const body = CreateOrderSchema.parse(request.body); // lança se inválido
await createOrder(body); // domínio recebe dados garantidos
```

```csharp
// C# — FluentValidation ou Data Annotations no controller
public async Task<IResult> CreateOrder([FromBody] CreateOrderRequest request)
{
    // request já validado pelo middleware, domínio recebe dados garantidos
    var order = await _service.CreateOrderAsync(request);
    var orderLocation = $"/orders/{order.Id}";
    return TypedResults.Created(orderLocation, order);
}
```

**2. Guard clause logo após I/O**

```ts
// TypeScript — logo após o await
const order = await findOrderById(id);
if (!order) throw new NotFoundError({ message: `Order ${id} not found.` });

// a partir daqui, order é garantido. sem ?. no restante da função
const total = calculateTotal(order);
```

```csharp
// C# — logo após o await
var order = await _repo.FindByIdAsync(orderId, ct);
if (order is null)
    return Result<Order>.Fail("Order not found.", "NOT_FOUND");

// a partir daqui, order é garantido
var total = CalculateTotal(order);
```

**3. Contratos não-nulos na construção**

```ts
// TypeScript — interface sem null, lista inicializada
interface Order {
  id: string;
  items: LineItem[]; // nunca null, sempre [] quando vazio
}
```

```csharp
// C# — required + init + coleção inicializada
public class Order
{
    public required string Id { get; init; }
    public List<LineItem> Items { get; init; } = [];
}
```

## Coleções: nunca null, sempre vazia

Listas têm um estado neutro natural: `[]`. Retornar null para "sem resultados" força defesa em
cascata em cada caller, sem benefício nenhum.

| Função | Retorno correto | Por quê |
| --- | --- | --- |
| `findOrdersByUser(userId)` | `Order[]`: `[]` se não há pedidos | Ausência e vazio são equivalentes para quem itera |
| `findUserById(id)` | `User \| null`: `null` se não existe | Ausência de entidade é informação relevante |
| Propriedade de lista em classe | inicializada como `[]` | Nunca precisa de `?.` para iterar |

## Onde usar `?.` e `??`

Esses operadores têm lugar nos campos **opcionais por design no domínio**, sem servir como defesa
contra contratos mal fechados.

<details>
<summary>❌ Bad: ?. como defesa contra contrato que deveria ser fechado</summary>
<br>

```ts
const total = order?.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
// order.items nunca deveria ser null: contrato fraco exposto com `?.`
```

</details>

<br>

<details>
<summary>✅ Good: ?. e ?? para campos opcionais por design</summary>
<br>

```ts
const display = user.nickname ?? user.name;     // nickname é opcional no modelo
const city = user.address?.city ?? "N/A";       // endereço pode não existir
```

</details>

Se você precisa de `?.` para acessar um campo que "sempre deveria existir", o problema está no
contrato.

## Schema evolution: campo novo em tabela existente

Quando uma regra de negócio muda e um campo novo entra no banco, os registros antigos ficam com
null por compatibilidade. Esse null não deve vazar para o domínio: o repositório é a fronteira
que absorve esse caso.

Três abordagens em ordem de preferência:

**1. Migration com DEFAULT: null nunca existe no banco**

A mais limpa. A migration preenche os registros antigos e garante valor para os novos. O domínio
nunca vê null.

```sql
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
-- registros existentes recebem 'normal' automaticamente
```

**2. Normalização no repositório: null morre na fronteira**

Quando não é possível alterar o banco (legado, multi-tenant, sem controle da migration).

```ts
// TypeScript — mapeamento no repositório
async function findOrderById(id: string): Promise<Order | null> {
  const row = await database.queryOne("SELECT * FROM orders WHERE id = $1", [id]);
  if (!row) return null;

  const order = {
    ...row,
    priority: row.priority ?? "normal", // null histórico vira default aqui
  };
  return order;
}
```

```csharp
// C# — EF: default no mapeamento da entidade
modelBuilder.Entity<Order>()
    .Property(o => o.Priority)
    .HasDefaultValue("normal");
```

**3. Campo opcional com semântica explícita: quando a ausência tem significado**

Às vezes null *quer dizer algo*: "esse pedido foi criado antes dessa feature existir". Nesse caso,
o campo é opcional por design, e o domínio tem uma função central que resolve a ausência.

```ts
interface Order {
  priority?: "low" | "normal" | "high"; // ausência = "anterior à feature"
}

// uma função resolve, sem espalhar ?. pelo domínio
function getEffectivePriority(order: Order): string {
  const priority = order.priority ?? "normal";
  return priority;
}
```

| Situação | Abordagem |
| --- | --- |
| Campo sem significado em registros antigos | Migration com `DEFAULT` |
| Banco legado, sem controle da migration | Normaliza no repositório |
| Ausência tem significado de negócio | Campo opcional, função de resolução centralizada |
| `?.` espalhado "porque pode ser null" | Problema de fronteira: fechar em um dos casos acima |

## Implementação por linguagem

- [TypeScript](../typescript/conventions/advanced/null-safety.md): `strictNullChecks`, `noUncheckedIndexedAccess`, `??`, `?.`
- [C#](../csharp/conventions/advanced/null-safety.md): nullable reference types, `required`, `??=`, `Array.Empty<T>()`
