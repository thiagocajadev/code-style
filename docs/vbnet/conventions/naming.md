# Naming

Nomes em VB.NET seguem as convenções da plataforma .NET: **PascalCase** para tipos, métodos, propriedades e parâmetros públicos; **camelCase** para locais privadas. A regra sobre propósito do domínio vem antes da convenção visual: o identificador nomeia o papel, não o tipo técnico.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PascalCase** (capitalização inicial em cada palavra) | Convenção `OrderService`, `CalculateTotal`; usada para tipos, métodos e propriedades |
| **camelCase** (capitalização a partir da segunda palavra) | Convenção `orderTotal`, `customerId`; usada para parâmetros e variáveis locais |
| **interface prefix** (prefixo `I` em interfaces) | Convenção .NET: `IOrderRepository`, `ILogger`; identifica contrato visualmente |
| **Async suffix** (sufixo `Async` em métodos assíncronos) | Sinaliza retorno `Task`/`Task(Of T)`: `LoadAsync`, `SaveAsync` |
| **domain term** (termo de domínio) | Nome reflete propósito de negócio (`pendingPurchase`), não tipo técnico (`purchaseList`) |
| **Hungarian notation** (notação húngara) | Antipadrão: prefixos como `strName`, `intCount`; evitar em VB.NET moderno |
| **boolean prefix** (prefixo de booleano) | `is`, `has`, `can`, `should`: `isActive`, `hasInvoice`, `canCancel` |

## Nomes em português

Todo código é escrito em inglês: variáveis, métodos, classes, interfaces, propriedades. Português aparece apenas em strings de usuário e comentários `' why:`.

<details>
<summary>❌ Ruim: mistura de idiomas</summary>

```vbnet
Public Class ServicoDeClientes
    Public Async Function BuscarClienteAsync(id As Guid) As Task(Of Cliente)
        Dim cliente = Await _repo.FindByIdAsync(id)
        Return cliente
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: inglês consistente</summary>

```vbnet
Public Class CustomerService
    Public Async Function FindCustomerAsync(id As Guid) As Task(Of Customer)
        Dim customer = Await _repo.FindByIdAsync(id)
        Return customer
    End Function
End Class
```

</details>

## PascalCase e _camelCase

VB.NET é case-insensitive, mas convenção importa: membros públicos usam PascalCase. Campos privados usam `_camelCase`. Parâmetros e variáveis locais usam `camelCase` sem underscore.

A linguagem não diferencia `purchase` de `Purchase`. A convenção é o único sinal de escopo disponível para o leitor.

| Escopo | Convenção | Exemplo |
| --- | --- | --- |
| Público (método, propriedade, tipo) | `PascalCase` | `FindPurchaseAsync`, `PurchaseId` |
| Privado (campo) | `_camelCase` | `_repository`, `_notifier` |
| Parâmetro / local | `camelCase` | `purchaseId`, `cancellationToken` |
| Constante | `PascalCase` | `MaxRetries`, `DefaultTimeout` |
| Interface | `IPascalCase` | `IPurchaseRepository` |
| `Module` | `PascalCase` | `DateHelpers`, `StringExtensions` |

<details>
<summary>❌ Ruim: convenção inconsistente</summary>

```vbnet
Public Class purchaseService
    Private purchaseRepository As IPurchaseRepository

    Public Async Function getPurchase(PurchaseId As Guid) As Task(Of Purchase)
        Dim Purchase = Await purchaseRepository.FindByIdAsync(PurchaseId)
        Return Purchase
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: escopo declarado pela convenção</summary>

```vbnet
Public Class PurchaseService
    Private ReadOnly _repository As IPurchaseRepository

    Public Sub New(repository As IPurchaseRepository)
        _repository = repository
    End Sub

    Public Async Function FindPurchaseAsync(purchaseId As Guid) As Task(Of Purchase)
        Dim purchase = Await _repository.FindByIdAsync(purchaseId)
        Return purchase
    End Function
End Class
```

</details>

## Sufixo Async

Todo método que retorna `Task` ou `Task(Of T)` termina em `Async`. O sufixo sinaliza ao chamador que a operação deve ser aguardada. Sem ele, o leitor não tem como distinguir chamadas síncronas de assíncronas sem inspecionar a assinatura.

<details>
<summary>❌ Ruim: sem sufixo, natureza da operação obscura</summary>

```vbnet
Public Async Function FindPurchase(id As Guid) As Task(Of Purchase)
Public Async Function SavePurchase(purchase As Purchase) As Task
Public Async Function ValidatePayment(request As PaymentRequest) As Task(Of Boolean)
```

</details>

<details>
<summary>✅ Bom: sufixo declara a natureza assíncrona</summary>

```vbnet
Public Async Function FindPurchaseAsync(id As Guid) As Task(Of Purchase)
Public Async Function SavePurchaseAsync(purchase As Purchase) As Task
Public Async Function ValidatePaymentAsync(request As PaymentRequest) As Task(Of Boolean)
```

</details>

## Prefixo I: interfaces

Interfaces sempre começam com `I`. Implementações não carregam sufixo `Impl`, `Default` ou `Base`: o nome descreve a implementação pelo domínio ou tecnologia.

<details>
<summary>❌ Ruim: distinção entre interface e classe ausente ou com sufixo ruído</summary>

```vbnet
Public Class PurchaseRepository         ' é interface ou classe?
End Class

Public Class PurchaseRepositoryImpl     ' Impl não agrega nada
End Class

Public Class DefaultPurchaseRepository  ' Default não diz onde persiste
End Class
```

</details>

<details>
<summary>✅ Bom: interface clara, implementação pelo domínio</summary>

```vbnet
Public Interface IPurchaseRepository
End Interface

Public Class SqlPurchaseRepository
    Implements IPurchaseRepository
End Class

Public Class InMemoryPurchaseRepository
    Implements IPurchaseRepository
End Class
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
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

```vbnet
Dim active = user.Status = "ACTIVE"
Dim discount = purchase.Discount > 0
Dim delete = user.Role = "ADMIN"
```

</details>

<details>
<summary>✅ Bom: prefixo declara a semântica</summary>

```vbnet
Dim isActive = user.Status = "ACTIVE"
Dim hasDiscount = purchase.Discount > 0
Dim canDelete = user.Role = "ADMIN"
```

</details>

## Identificadores sem significado

O nome revela intenção pelo domínio. Nomes genéricos (`data`, `info`, `obj`, `item`, `result`, `temp`) são falhas de nomenclatura: forçam o leitor a rastrear o tipo para entender o contexto.

<details>
<summary>❌ Ruim: nomes genéricos sem contexto de domínio</summary>

```vbnet
Public Async Function GetDataAsync(id As Guid) As Task(Of Object)
    Dim result = Await _repo.FindAsync(id)
    Dim data = MapToDto(result)
    Return data
End Function
```

</details>

<details>
<summary>✅ Bom: nomes expressivos pelo domínio</summary>

```vbnet
Public Async Function FindPurchaseSummaryAsync(purchaseId As Guid) As Task(Of PurchaseSummary)
    Dim purchase = Await _repo.FindByIdAsync(purchaseId)
    Dim summary = MapToSummary(purchase)
    Return summary
End Function
```

</details>

## Notação húngara

Prefixos de tipo (`str`, `int`, `obj`, `tbl`, `btn`) eram comuns em VB clássico. Em VB.NET com `Option Strict On`, o compilador conhece o tipo; o prefixo é redundância que polui o nome.

<details>
<summary>❌ Ruim: prefixo de tipo no nome</summary>

```vbnet
Dim strName As String = customer.Name
Dim intAge As Integer = customer.Age
Dim lstPurchases As List(Of Purchase) = Await _repo.FindAllAsync()
Dim btnSubmit As Button = FindControl("btnSubmit")
```

</details>

<details>
<summary>✅ Bom: nome pelo domínio, tipo pelo compilador</summary>

```vbnet
Dim name As String = customer.Name
Dim age As Integer = customer.Age
Dim purchases = Await _repo.FindAllAsync()
Dim submitButton = TryCast(FindControl("submitButton"), Button)
```

</details>

## Código como documentação

Nomes expressivos eliminam a necessidade de comentários. Um comentário que reescreve o que o código já diz é uma falha de nomenclatura. Use `' why:` apenas para restrições ocultas ou invariantes não óbvios.

<details>
<summary>❌ Ruim: comentários repetem o código</summary>

```vbnet
' busca o usuário pelo id
Dim u = Await _repo.FindAsync(id)

' verifica se o usuário está ativo
If Not u.Flag Then
    Return Nothing
End If
```

</details>

<details>
<summary>✅ Bom: código se explica; comentário só para restrições não óbvias</summary>

```vbnet
Dim user = Await _repo.FindByIdAsync(userId)

If Not user.IsActive Then
    Return Nothing
End If
```

</details>
