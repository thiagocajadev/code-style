# Quick Reference

## Nomenclatura

| Escopo | Convenção | Exemplo |
| --- | --- | --- |
| Classe, record, struct | `PascalCase` | `OrderService`, `ApiError` |
| Interface | `IPascalCase` | `IOrderRepository` |
| Método público | `PascalCase` + verbo | `FindOrderAsync`, `CalculateTotal` |
| Propriedade pública | `PascalCase` | `OrderId`, `IsActive` |
| Campo privado | `_camelCase` | `_repository`, `_notifier` |
| Parâmetro / local | `camelCase` | `orderId`, `cancellationToken` |
| Constante | `PascalCase` | `MaxRetries`, `DefaultTimeout` |
| Enum membro | `PascalCase` | `OrderStatus.Approved` |
| Método async | sufixo `Async` | `SaveOrderAsync`, `FindUserAsync` |

## Verbos por intenção

| Intenção | Preferidos | Evitar |
| --- | --- | --- |
| Ler do storage | `Find`, `Get`, `Load`, `Fetch` | `Retrieve`, `Pull` |
| Persistir | `Save`, `Create`, `Insert`, `Persist` | `Put`, `Push` |
| Calcular / derivar | `Calculate`, `Compute`, `Build`, `Derive` | `Get`, `Do` |
| Transformar | `Map`, `Transform`, `Convert`, `Format` | `Process`, `Parse` |
| Validar | `Validate`, `Check`, `Verify`, `Assert` | `Handle`, `Test` |
| Enviar / notificar | `Send`, `Dispatch`, `Notify`, `Emit` | `Fire`, `Trigger` |
| Remover | `Delete`, `Remove`, `Purge`, `Clear` | `Destroy`, `Kill` |

## Taboos

**Verbos proibidos fora de event handlers:**
`Handle` (use `Process`, `Validate`, `Submit`), `Do`, `Run`, `Execute`, `Perform` sem sujeito de domínio, `Get` para cálculos (use `Calculate`, `Compute`).

**Substantivos proibidos:**
`Data`, `Info`, `Obj`, `Item`, `Thing`, `Result` como nome final — use o nome do domínio.

**Abreviações proibidas:**
`svc`, `mgr`, `ctrl`, `repo` como campo — use o nome completo (`_repository`, `_notifier`). Parâmetros: nunca `req`→`request`, `res`→`response`, `ctx`→`context`.

## Tipos e contratos

| Cenário | Tipo preferido |
| --- | --- |
| DTO de entrada (request) | `record` imutável |
| DTO de saída (response) | `record` imutável |
| Value object | `record struct` |
| Falha de negócio | `Result<T>` com `ApiError` |
| Falha inesperada | `Exception` (sobe para middleware) |
| Coleção de retorno | `IReadOnlyList<T>` |
| Coleção de entrada | `IEnumerable<T>` |
| Assíncrono com dado | `Task<T>` |
| Assíncrono sem dado | `Task` |

## Convenções rápidas

```csharp
// Record imutável
public record OrderRequest(string ProductId, int Quantity);

// Primary constructor com DI
public class OrderService(IOrderRepository repository, INotifier notifier) { }

// Result<T>
public static Result<T> Success(T value) => new(true, false, value, null);
public static Result<T> Fail(string msg, string code) => new(false, true, default, new ApiError(msg, code));

// Switch expression com pattern matching
var response = result switch
{
    { IsSuccess: true, Value: var order } => Results.Ok(order),
    { Error.Code: "NOT_FOUND" } => Results.NotFound(),
    _ => Results.Problem(),
};

// Task.WhenAll para chamadas paralelas
var userTask = _users.FindByIdAsync(userId, ct);
var ordersTask = _orders.FindRecentAsync(userId, ct);
await Task.WhenAll(userTask, ordersTask);

// Guard clause
if (request is null)
    return Result<Order>.Fail("Request is required.", "INVALID_INPUT");

// Explaining return
var summary = BuildSummary(order, totals);
return summary;
```
