# Nomes em C#

Um nome bem escolhido dispensa o comentário que explicaria o mesmo. Em C#, duas formas de capitalização dividem o trabalho: **PascalCase** em tipos, métodos e propriedades, e **camelCase** em parâmetros e variáveis locais. A capitalização mostra em que escopo o identificador vive. O texto do nome mostra o que ele significa, e para isso ele usa a palavra que o time já usa para falar do negócio.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PascalCase** (capitalização inicial em cada palavra) | Convenção `OrderService`, `CalculateTotal`; usada para tipos, métodos e propriedades |
| **camelCase** (capitalização a partir da segunda palavra) | Convenção `orderTotal`, `customerId`; usada para parâmetros e variáveis locais |
| **interface prefix** (prefixo `I` em interfaces) | Convenção .NET: `IOrderRepository`, `ILogger`; identifica contrato visualmente |
| **Async suffix** (sufixo `Async` em métodos assíncronos) | Sinaliza retorno `Task`/`Task<T>`: `LoadAsync`, `SaveAsync` |
| **domain term** (termo de domínio) | Palavra tirada do vocabulário do negócio: `pendingInvoice` conta o que o valor é; `invoiceList` só repete a estrutura de dados |
| **abbreviation** (abreviação) | Evite contrações ambíguas (`mgr`, `svc`); siglas conhecidas mantêm forma do .NET (`Id`, `Url`) |
| **boolean prefix** (prefixo de booleano) | `is`, `has`, `can`, `should`: `isActive`, `hasInvoice`, `canCancel` |

<a id="portuguese-names"></a>

## Todo identificador é escrito em inglês

Variáveis, métodos, classes, interfaces e propriedades ficam em inglês. Português entra só em duas situações: no texto que o usuário lê na tela e no comentário `// why:`. Misturar os dois idiomas no mesmo arquivo obriga o leitor a trocar de vocabulário no meio da linha, e o código passa a ter dois nomes para a mesma coisa (`Pedido` e `Order`).

<details>
<summary>❌ Ruim: mistura de idiomas</summary>

```csharp
public class PedidoService
{
    public async Task<Pedido> BuscarPedidoAsync(Guid id, CancellationToken ct)
    {
        var pedido = await _repo.FindByIdAsync(id, ct);
        return pedido;
    }
}
```

</details>

<details>
<summary>✅ Bom: inglês consistente</summary>

```csharp
public class OrderService
{
    public async Task<Order> FindOrderAsync(Guid id, CancellationToken ct)
    {
        var order = await _repo.FindByIdAsync(id, ct);
        return order;
    }
}
```

</details>

<a id="capitalization-by-scope"></a>

## A capitalização revela o escopo

Olhando só a primeira letra, o leitor sabe se está diante de um membro público, de um campo privado ou de uma variável local. Membro público usa PascalCase. Campo privado usa `_camelCase`, com underscore na frente. Parâmetro e variável local usam `camelCase`, sem underscore.

| Escopo | Convenção | Exemplo |
| --- | --- | --- |
| Público (método, propriedade, tipo) | `PascalCase` | `FindOrderAsync`, `OrderId` |
| Privado (campo) | `_camelCase` | `_repository`, `_notifier` |
| Parâmetro / local | `camelCase` | `orderId`, `cancellationToken` |
| Constante | `PascalCase` | `MaxRetries`, `DefaultTimeout` |
| Interface | `IPascalCase` | `IOrderRepository` |

<details>
<summary>❌ Ruim: convenção inconsistente</summary>

```csharp
public class orderService
{
    private IOrderRepository orderRepository;

    public async Task<Order> getOrder(Guid OrderId, CancellationToken CT)
    {
        var Order = await orderRepository.FindByIdAsync(OrderId, CT);
        return Order;
    }
}
```

</details>

<details>
<summary>✅ Bom: escopo declarado pela convenção</summary>

```csharp
public class OrderService(IOrderRepository repository)
{
    private readonly IOrderRepository _repository = repository;

    public async Task<Order> FindOrderAsync(Guid orderId, CancellationToken ct)
    {
        var order = await _repository.FindByIdAsync(orderId, ct);
        return order;
    }
}
```

</details>

<a id="async-suffix"></a>

## O sufixo Async avisa que a chamada precisa de await

Todo método que devolve `Task` ou `ValueTask` termina em `Async`. O sufixo existe para quem chama: ele vê `SaveOrderAsync(...)` na lista de sugestões do editor e já sabe que precisa de `await`. Sem o sufixo, descobrir se a chamada é assíncrona exige abrir a assinatura do método, e é assim que uma `Task` acaba esquecida sem `await`.

<details>
<summary>❌ Ruim: sem sufixo, natureza da operação obscura</summary>

```csharp
public async Task<Order> FindOrder(Guid id, CancellationToken ct) { ... }
public async Task SaveOrder(Order order, CancellationToken ct) { ... }
public async Task<bool> ValidatePayment(PaymentRequest request) { ... }
```

</details>

<details>
<summary>✅ Bom: sufixo declara a natureza assíncrona</summary>

```csharp
public async Task<Order> FindOrderAsync(Guid id, CancellationToken ct) { ... }
public async Task SaveOrderAsync(Order order, CancellationToken ct) { ... }
public async Task<bool> ValidatePaymentAsync(PaymentRequest request) { ... }
```

</details>

<a id="interface-prefix"></a>

## Interfaces começam com I

O `I` na frente do nome (`IOrderRepository`) é a convenção do .NET para separar contrato de implementação. A implementação recebe um nome que conta alguma coisa sobre ela: onde os dados moram, qual tecnologia usa. Sufixos como `Impl`, `Default` e `Base` ocupam espaço sem responder nenhuma dessas perguntas.

<details>
<summary>❌ Ruim: distinção entre interface e classe ausente ou com sufixo ruído</summary>

```csharp
public class OrderRepository { ... }       // é interface ou classe?
public class OrderRepositoryImpl { ... }   // Impl não agrega nada
public class DefaultOrderRepository { ... } // Default não diz onde persiste
```

</details>

<details>
<summary>✅ Bom: interface clara, implementação pelo domínio</summary>

```csharp
public interface IOrderRepository { ... }
public class SqlOrderRepository : IOrderRepository { ... }
public class InMemoryOrderRepository : IOrderRepository { ... }
```

</details>

<a id="boolean-prefix"></a>

## Todo booleano começa com is, has, can ou should

O prefixo diz que tipo de pergunta o booleano responde. `active` sozinho deixa a dúvida no ar: é o estado atual do usuário, é a permissão de ativar, é uma ordem para ativar? `isActive` responde na primeira leitura. Por isso booleano sem prefixo (`active`, `loading`, `valid`) fica de fora.

| Prefixo | Significado | Exemplo |
| --- | --- | --- |
| `is` | Estado atual | `isActive`, `isValid` |
| `has` | Presença | `hasDiscount`, `hasError` |
| `can` | Capacidade dinâmica | `canDelete`, `canSubmit` |
| `should` | Diretiva comportamental | `shouldRetry`, `shouldRedirect` |

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```csharp
bool active = user.Status == "ACTIVE";
bool discount = order.Discount > 0;
bool delete = user.Role == "ADMIN";
```

</details>

<details>
<summary>✅ Bom: prefixo declara a semântica</summary>

```csharp
bool isActive = user.Status == "ACTIVE";
bool hasDiscount = order.Discount > 0;
bool canDelete = user.Role == "ADMIN";
```

</details>

<a id="meaningless-identifiers"></a>

## Identificadores sem significado

`data`, `info`, `obj`, `item`, `result` e `temp` cabem em qualquer lugar, e é esse o problema: eles descrevem a caixa, e o leitor queria saber o conteúdo. Quem lê `var result = await _repo.FindAsync(id, ct)` precisa subir até a assinatura do repositório para descobrir o que veio. Trocar por `order` resolve a dúvida na própria linha.

<details>
<summary>❌ Ruim: nomes genéricos sem contexto de domínio</summary>

```csharp
public async Task<object> GetDataAsync(Guid id, CancellationToken ct)
{
    var result = await _repo.FindAsync(id, ct);
    var data = MapToDto(result);

    return data;
}
```

</details>

<details>
<summary>✅ Bom: nomes expressivos pelo domínio</summary>

```csharp
public async Task<OrderSummary> FindOrderSummaryAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    var summary = MapToSummary(order);
    return summary;
}
```

</details>

<a id="code-as-documentation"></a>

## Código como documentação

Um comentário que repete o que a linha abaixo já diz envelhece sozinho: o código muda, o comentário fica. Quando o nome é expressivo, o comentário some por falta de assunto. Guarde `// why:` para o que o código não consegue mostrar, como uma restrição do fornecedor ou uma regra que parece errada e não é.

<details>
<summary>❌ Ruim: comentários repetem o código</summary>

```csharp
// busca o usuário pelo id
var u = await _repo.FindAsync(id, ct);

// verifica se o usuário está ativo
if (!u.Flag)

    return Result<Order>.Fail("User inactive.", "UNAUTHORIZED");
```

</details>

<details>
<summary>✅ Bom: código se explica; comentário só para restrições não óbvias</summary>

```csharp
var user = await _repo.FindByIdAsync(userId, ct);
if (!user.IsActive) return Result<Order>.Fail("User inactive.", "UNAUTHORIZED");
```

</details>

<a id="semantic-order"></a>

## Domínio primeiro, ação depois, qualificador por último

`CalculateOrderTotalAsync` se lê na ordem em que a frase acontece em português: calcula o total do pedido. `TotalCalculateOrderAsync` embaralha as mesmas palavras e obriga o leitor a remontar a frase. A ordem também ajuda o editor: métodos do mesmo domínio ficam agrupados na lista de sugestões quando começam pelo mesmo verbo e pelo mesmo substantivo.

<details>
<summary>❌ Ruim: qualificador antes do domínio</summary>

```csharp
public async Task<decimal> TotalCalculateOrderAsync(...) { ... }
public async Task<bool> StatusValidatePaymentAsync(...) { ... }
public async Task<User> ByIdFindUserAsync(...) { ... }
```

</details>

<details>
<summary>✅ Bom: domínio primeiro, ação depois</summary>

```csharp
public async Task<decimal> CalculateOrderTotalAsync(...) { ... }
public async Task<bool> ValidatePaymentStatusAsync(...) { ... }
public async Task<User> FindUserByIdAsync(...) { ... }
```

</details>
