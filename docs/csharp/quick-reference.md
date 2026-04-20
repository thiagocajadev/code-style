# Quick Reference

> Escopo: C#. Cheat-sheet das convenções; detalhes em `conventions/`.

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

| Categoria | Evitar | Usar |
| --- | --- | --- |
| Verbos vagos | `Handle`, `Do`, `Run`, `Execute`, `Perform` sem sujeito | verbo do domínio: `Process`, `Validate`, `Submit` |
| `Get` para cálculo | `GetTotal` de cálculo | `Calculate`, `Compute` |
| Substantivos vazios | `Data`, `Info`, `Obj`, `Item`, `Thing`, `Result` | nome do domínio |
| Abreviações em campo | `_svc`, `_mgr`, `_ctrl`, `_repo` | `_service`, `_repository` |
| Abreviações em param | `req`, `res`, `ctx` | `request`, `response`, `context` |

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

## Snippets essenciais

```csharp
// Record imutável
public record OrderRequest(string ProductId, int Quantity);

// Primary constructor com DI
public class OrderService(IOrderRepository repository, INotifier notifier) { }

// Switch expression com pattern matching
var response = result switch
{
    { IsSuccess: true, Value: var order } => Results.Ok(order),
    { Error.Code: "NOT_FOUND" } => Results.NotFound(),
    _ => Results.Problem(),
};
```
