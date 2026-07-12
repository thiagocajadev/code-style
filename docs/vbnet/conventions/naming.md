# Nomes em VB.NET

Nomes em VB.NET seguem as convenções da plataforma .NET: **PascalCase** para tipos, métodos, propriedades e parâmetros públicos, **camelCase** para variáveis locais. Antes da convenção visual vem a regra de conteúdo: o identificador diz qual papel a coisa cumpre no domínio. `pendingPurchase` conta o que a lista guarda; `purchaseList` só repete o tipo, que o compilador já sabe.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PascalCase** (capitalização inicial em cada palavra) | Convenção `OrderService`, `CalculateTotal`; usada para tipos, métodos e propriedades |
| **camelCase** (capitalização a partir da segunda palavra) | Convenção `orderTotal`, `customerId`; usada para parâmetros e variáveis locais |
| **interface prefix** (prefixo `I` em interfaces) | Convenção .NET: `IOrderRepository`, `ILogger`; identifica contrato visualmente |
| **Async suffix** (sufixo `Async` em métodos assíncronos) | Sinaliza retorno `Task`/`Task(Of T)`: `LoadAsync`, `SaveAsync` |
| **domain term** (termo de domínio) | Nome tirado do negócio: `pendingPurchase` diz o que a lista guarda; `purchaseList` repete o tipo |
| **Hungarian notation** (notação húngara) | Antipadrão: prefixos como `strName`, `intCount`; evitar em VB.NET moderno |
| **boolean prefix** (prefixo de booleano) | `is`, `has`, `can`, `should`: `isActive`, `hasInvoice`, `canCancel` |

<a id="portuguese-names"></a>

## Todo identificador é escrito em inglês

Variáveis, métodos, classes, interfaces e propriedades ficam em inglês. Português aparece em dois lugares: nas strings que o usuário lê e nos comentários `' why:`. Misturar os dois idiomas obriga o leitor a adivinhar em qual língua está o nome que ele procura, e o resultado costuma ser um `BuscarClienteAsync` chamando um `FindByIdAsync`.

<details>
<summary>❌ Ruim: mistura de idiomas</summary>

```vbnet
Public Class ServicoDeClientes
    Public Async Function BuscarClienteAsync(id As Guid) As Task(Of Cliente)
        Dim cliente = Await _repository.FindByIdAsync(id)
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
        Dim customer = Await _repository.FindByIdAsync(id)
        Return customer
    End Function
End Class
```

</details>

## A capitalização declara o escopo

Membros públicos usam PascalCase. Campos privados usam `_camelCase`. Parâmetros e variáveis locais usam `camelCase` sem underscore.

A convenção pesa mais em VB.NET do que em outras linguagens porque VB.NET é **case-insensitive** (não diferencia maiúscula de minúscula): para o compilador, `purchase` e `Purchase` são o mesmo identificador. Ele não vai reclamar de um campo privado escrito em PascalCase. Sobra a convenção como único sinal de escopo que o leitor tem.

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

## Método assíncrono termina em Async

Todo método que retorna `Task` ou `Task(Of T)` termina em `Async`. O sufixo avisa ao chamador que a operação precisa de `Await`. Sem ele, quem lê a chamada tem que abrir a assinatura do método para saber se aquilo é síncrono, e esquecer o `Await` em um retorno `Task` faz o código seguir adiante antes da operação terminar.

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

## Interface começa com I

Interfaces sempre começam com `I`: `IPurchaseRepository`, `ILogger`. O nome da implementação descreve a tecnologia ou o domínio dela, como `SqlPurchaseRepository` e `InMemoryPurchaseRepository`. Sufixos como `Impl`, `Default` e `Base` ocupam espaço sem informar onde a classe persiste os dados, o que é justamente a pergunta de quem lê.

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

<a id="boolean-prefixes"></a>

## Todo booleano começa com is, has, can ou should

O prefixo diz qual pergunta o booleano responde. `active` deixa a pergunta em aberto: é o estado atual do usuário, é a permissão para ativar, é a ordem para ativar depois? `isActive`, `canActivate` e `shouldActivate` são três coisas diferentes, e `active` não diz qual delas está ali.

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

## Nome genérico não informa nada

`data`, `info`, `obj`, `item`, `result` e `temp` servem para qualquer coisa, então não dizem nada sobre esta. Quem lê `Dim data = MapToDto(result)` precisa subir até a declaração de `result`, de lá até a assinatura de `_repository.FindAsync`, e só então descobre que aquilo é a compra. `Dim summary = MapToSummary(purchase)` responde a mesma pergunta na própria linha.

<details>
<summary>❌ Ruim: nomes genéricos sem contexto de domínio</summary>

```vbnet
Public Async Function GetDataAsync(id As Guid) As Task(Of Object)
    Dim result = Await _repository.FindAsync(id)
    Dim data = MapToDto(result)
    Return data
End Function
```

</details>

<details>
<summary>✅ Bom: nomes expressivos pelo domínio</summary>

```vbnet
Public Async Function FindPurchaseSummaryAsync(purchaseId As Guid) As Task(Of PurchaseSummary)
    Dim purchase = Await _repository.FindByIdAsync(purchaseId)
    Dim summary = MapToSummary(purchase)
    Return summary
End Function
```

</details>

<a id="hungarian-notation"></a>

## Notação húngara

Prefixos de tipo (`str`, `int`, `obj`, `tbl`, `btn`) eram comuns no VB clássico, onde a variável podia mudar de tipo em tempo de execução e o prefixo era o único aviso. Com `Option Strict On`, o tipo está na declaração e a IDE mostra ele ao passar o mouse. O prefixo repete o que a declaração ao lado já diz, e fica errado na primeira vez que alguém troca o tipo sem renomear a variável: `strAge As Integer` compila sem aviso.

<details>
<summary>❌ Ruim: prefixo de tipo no nome</summary>

```vbnet
Dim strName As String = customer.Name
Dim intAge As Integer = customer.Age
Dim lstPurchases As List(Of Purchase) = Await _repository.FindAllAsync()
Dim btnSubmit As Button = FindControl("btnSubmit")
```

</details>

<details>
<summary>✅ Bom: nome pelo domínio, tipo pelo compilador</summary>

```vbnet
Dim name As String = customer.Name
Dim age As Integer = customer.Age
Dim purchases = Await _repository.FindAllAsync()
Dim submitButton = TryCast(FindControl("submitButton"), Button)
```

</details>

## O nome substitui o comentário

Um comentário que repete o que a linha abaixo já diz vira mentira na primeira alteração que ninguém propagar. `' verifica se o usuário está ativo` acima de `If Not u.Flag Then` documenta um nome ruim em vez de corrigir ele: renomeie `Flag` para `IsActive` e o comentário fica sem função. Reserve `' why:` para o que o código não consegue mostrar, como uma restrição do sistema externo ou uma regra de negócio que explica um valor estranho.

<details>
<summary>❌ Ruim: comentários repetem o código</summary>

```vbnet
' busca o usuário pelo id
Dim u = Await _repository.FindAsync(id)

' verifica se o usuário está ativo
If Not u.Flag Then
    Return Nothing
End If
```

</details>

<details>
<summary>✅ Bom: código se explica; comentário só para restrições não óbvias</summary>

```vbnet
Dim user = Await _repository.FindByIdAsync(userId)

If Not user.IsActive Then
    Return Nothing
End If
```

</details>
