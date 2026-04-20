# Naming

## Nomes em português

Todo código é escrito em inglês — variáveis, métodos, classes, interfaces, propriedades. Português aparece apenas em strings de usuário e comentários `// why:`.

<details>
<summary>❌ Bad — mistura de idiomas</summary>
<br>

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

<br>

<details>
<summary>✅ Good — inglês consistente</summary>
<br>

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

## PascalCase e _camelCase

Membros públicos usam PascalCase. Membros privados usam `_camelCase` com underscore. Parâmetros e variáveis locais usam `camelCase` sem underscore.

| Escopo | Convenção | Exemplo |
| --- | --- | --- |
| Público (método, propriedade, tipo) | `PascalCase` | `FindOrderAsync`, `OrderId` |
| Privado (campo) | `_camelCase` | `_repository`, `_notifier` |
| Parâmetro / local | `camelCase` | `orderId`, `cancellationToken` |
| Constante | `PascalCase` | `MaxRetries`, `DefaultTimeout` |
| Interface | `IPascalCase` | `IOrderRepository` |

<details>
<summary>❌ Bad — convenção inconsistente</summary>
<br>

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

<br>

<details>
<summary>✅ Good — escopo declarado pela convenção</summary>
<br>

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

## Sufixo Async

Todo método que retorna `Task` ou `ValueTask` termina em `Async`. O sufixo sinaliza ao chamador que a operação deve ser aguardada — sem ele, o leitor não tem como distinguir chamadas síncronas de assíncronas sem inspecionar a assinatura.

<details>
<summary>❌ Bad — sem sufixo, natureza da operação obscura</summary>
<br>

```csharp
public async Task<Order> FindOrder(Guid id, CancellationToken ct) { ... }
public async Task SaveOrder(Order order, CancellationToken ct) { ... }
public async Task<bool> ValidatePayment(PaymentRequest request) { ... }
```

</details>

<br>

<details>
<summary>✅ Good — sufixo declara a natureza assíncrona</summary>
<br>

```csharp
public async Task<Order> FindOrderAsync(Guid id, CancellationToken ct) { ... }
public async Task SaveOrderAsync(Order order, CancellationToken ct) { ... }
public async Task<bool> ValidatePaymentAsync(PaymentRequest request) { ... }
```

</details>

## Prefixo I — interfaces

Interfaces sempre começam com `I`. Implementações não carregam sufixo `Impl`, `Default` ou `Base` — o nome descreve a implementação pelo domínio ou tecnologia.

<details>
<summary>❌ Bad — distinção entre interface e classe ausente ou com sufixo ruído</summary>
<br>

```csharp
public class OrderRepository { ... }       // é interface ou classe?
public class OrderRepositoryImpl { ... }   // Impl não agrega nada
public class DefaultOrderRepository { ... } // Default não diz onde persiste
```

</details>

<br>

<details>
<summary>✅ Good — interface clara, implementação pelo domínio</summary>
<br>

```csharp
public interface IOrderRepository { ... }
public class SqlOrderRepository : IOrderRepository { ... }
public class InMemoryOrderRepository : IOrderRepository { ... }
```

</details>

## Booleans expressivos

Todo booleano carrega prefixo semântico. Nomes sem prefixo (`active`, `loading`, `valid`) são proibidos: não declaram se representam estado, capacidade ou diretiva.

| Prefixo | Significado | Exemplo |
| --- | --- | --- |
| `is` | Estado atual | `isActive`, `isValid` |
| `has` | Presença | `hasDiscount`, `hasError` |
| `can` | Capacidade dinâmica | `canDelete`, `canSubmit` |
| `should` | Diretiva comportamental | `shouldRetry`, `shouldRedirect` |

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```csharp
bool active = user.Status == "ACTIVE";
bool discount = order.Discount > 0;
bool delete = user.Role == "ADMIN";
```

</details>

<br>

<details>
<summary>✅ Good — prefixo declara a semântica</summary>
<br>

```csharp
bool isActive = user.Status == "ACTIVE";
bool hasDiscount = order.Discount > 0;
bool canDelete = user.Role == "ADMIN";
```

</details>

## Identificadores sem significado

O nome revela intenção pelo domínio. Nomes genéricos — `data`, `info`, `obj`, `item`, `result`, `temp` — são falhas de nomenclatura: forçam o leitor a rastrear o tipo para entender o contexto.

<details>
<summary>❌ Bad — nomes genéricos sem contexto de domínio</summary>
<br>

```csharp
public async Task<object> GetDataAsync(Guid id, CancellationToken ct)
{
    var result = await _repo.FindAsync(id, ct);
    var data = MapToDto(result);

    return data;
}
```

</details>

<br>

<details>
<summary>✅ Good — nomes expressivos pelo domínio</summary>
<br>

```csharp
public async Task<OrderSummary> FindOrderSummaryAsync(Guid orderId, CancellationToken ct)
{
    var order = await _repo.FindByIdAsync(orderId, ct);
    var summary = MapToSummary(order);

    return summary;
}
```

</details>

## Código como documentação

Nomes expressivos eliminam a necessidade de comentários. Um comentário que reescreve o que o código já diz é uma falha de nomenclatura, não uma contribuição de clareza. Use `// why:` apenas para restrições ocultas ou invariantes não óbvios.

<details>
<summary>❌ Bad — comentários repetem o código</summary>
<br>

```csharp
// busca o usuário pelo id
var u = await _repo.FindAsync(id, ct);

// verifica se o usuário está ativo
if (!u.Flag)

    return Result<Order>.Fail("User inactive.", "UNAUTHORIZED");
```

</details>

<br>

<details>
<summary>✅ Good — código se explica; comentário só para restrições não óbvias</summary>
<br>

```csharp
var user = await _repo.FindByIdAsync(userId, ct);

if (!user.IsActive)

    return Result<Order>.Fail("User inactive.", "UNAUTHORIZED");
```

</details>

## Ordem semântica

Nomes seguem a ordem de leitura natural: domínio primeiro, ação depois, qualificador por último. O leitor encontra o contexto antes do detalhe.

<details>
<summary>❌ Bad — qualificador antes do domínio</summary>
<br>

```csharp
public async Task<decimal> TotalCalculateOrderAsync(...) { ... }
public async Task<bool> StatusValidatePaymentAsync(...) { ... }
public async Task<User> ByIdFindUserAsync(...) { ... }
```

</details>

<br>

<details>
<summary>✅ Good — domínio primeiro, ação depois</summary>
<br>

```csharp
public async Task<decimal> CalculateOrderTotalAsync(...) { ... }
public async Task<bool> ValidatePaymentStatusAsync(...) { ... }
public async Task<User> FindUserByIdAsync(...) { ... }
```

</details>
