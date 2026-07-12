# Tipos em VB.NET

> Escopo: **idioma VB.NET sobre .NET Framework 4.8**. Decisões de arquitetura entre tipos (quando criar contratos, quando herdar, quando compor) estão em `shared/architecture/architecture.md` e `shared/architecture/patterns.md`; este documento cobre as ferramentas do idioma.

VB.NET oferece cinco formas de declarar um tipo: **Interface**, **MustInherit Class** (a classe abstrata), **Class**, **Structure** e **Enum**. Cada uma responde a uma pergunta diferente. Escolher a errada costuma compilar, e o custo aparece depois: uma `Structure` grande copiada a cada chamada, uma `Interface` que obriga as implementações a repetir a mesma orquestração.

> [!IMPORTANT]
> Tudo aqui assume `Option Strict On` e `Option Infer On`. Sem as duas diretivas, o compilador aceita conversão implícita e late binding, e o erro de tipo só aparece quando o código roda. Veja [Variables](./variables.md#compiler-options).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Interface** (contrato sem estado) | Descreve capacidade; suporta múltipla `Implements`; sem campos nem implementação |
| **MustInherit Class** (classe abstrata) | Identidade parcial: estado e comportamento compartilhados, completados pelas filhas via `Inherits` |
| **Class** (tipo de referência) | Tipo padrão: identidade por referência, alocado no heap |
| **Structure** (tipo de valor) | Alocada em pilha, igualdade por valor; para dados pequenos e sem identidade |
| **Enum** (enumeração) | Conjunto fechado de valores nomeados; preferido a constantes mágicas |
| **NotInheritable** (selada) | Modificador que impede herança; comunica que a classe não foi pensada para ser estendida |
| **Generic** (tipo genérico) | Parâmetro de tipo (`Result(Of T)`); reaproveita o contrato sem perder verificação |
| **Option Strict On** (modo estrito de tipos) | Diretiva que proíbe conversões implícitas perigosas; obrigatório no projeto |

## Interface ou MustInherit Class

`Interface` declara uma **capacidade**: o que o tipo consegue fazer. Ela não guarda estado nem implementação, e uma classe pode implementar várias com `Implements`.

`MustInherit Class` (a classe abstrata do C#) declara uma **identidade parcial**: uma base que já traz estado e comportamento prontos, e deixa as filhas completarem o resto com `Inherits`.

A pergunta que decide é o que as implementações vão dividir entre si. Só o contrato, então `Interface`. Também o código, então `MustInherit Class`: em uma `Interface`, cada implementação teria que repetir a sequência "valida, e só então executa" por conta própria.

<details>
<summary>❌ Ruim: interface usada para compartilhar código entre implementações</summary>

```vbnet
' Interface não carrega estado nem implementação em VB.NET
' Tentar compartilhar lógica aqui força duplicação nas implementações
Public Interface IOrderProcessor
    Function Validate(order As Order) As Result
    Function ExecuteAsync(order As Order) As Task(Of Result)
End Interface

Public Class StandardOrderProcessor
    Implements IOrderProcessor

    Public Function Validate(order As Order) As Result Implements IOrderProcessor.Validate
        ' ...
    End Function

    ' cada implementação precisa repetir a orquestração Validate-then-Execute
End Class
```

</details>

<details>
<summary>✅ Bom: MustInherit Class quando há estado ou template method</summary>

```vbnet
Public MustInherit Class OrderProcessor

    Protected ReadOnly _logger As ILogger

    Protected Sub New(logger As ILogger)
        _logger = logger
    End Sub

    Public Async Function ProcessAsync(order As Order) As Task(Of Result)
        Dim validation = Validate(order)
        If Not validation.IsSuccess Then
            _logger.Warn("Order validation failed: {Reason}", validation.Error)
            Return validation
        End If

        Dim execution = Await ExecuteAsync(order)
        Return execution
    End Function

    Protected MustOverride Function Validate(order As Order) As Result
    Protected MustOverride Function ExecuteAsync(order As Order) As Task(Of Result)
End Class

Public NotInheritable Class StandardOrderProcessor
    Inherits OrderProcessor

    Public Sub New(logger As ILogger)
        MyBase.New(logger)
    End Sub

    Protected Overrides Function Validate(order As Order) As Result
        ' ...
    End Function

    Protected Overrides Function ExecuteAsync(order As Order) As Task(Of Result)
        ' ...
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: interface quando só o contrato importa</summary>

```vbnet
Public Interface IOrderRepository
    Function FindByIdAsync(id As Guid) As Task(Of Order)
    Function SaveAsync(order As Order) As Task
End Interface

Public NotInheritable Class SqlOrderRepository
    Implements IOrderRepository
    ' ...
End Class

Public NotInheritable Class InMemoryOrderRepository ' testes
    Implements IOrderRepository
    ' ...
End Class
```

</details>

## NotInheritable por padrão

`NotInheritable` (o `sealed` do C#) impede que outra classe herde desta. Deixe ele como padrão: toda classe concreta nasce `NotInheritable`, e a herança passa a ser uma decisão que alguém toma de propósito.

Uma classe aberta à herança promete que dá para estendê-la com segurança, e manter essa promessa dá trabalho. Quem herda pode sobrescrever um método que o resto da classe usava como pré-condição, e quebrar a invariante sem tocar em uma linha do código original. Como a classe filha costuma viver em outro assembly, o autor da classe base descobre isso quando o bug chega.

<details>
<summary>❌ Ruim: classe concreta sem NotInheritable, extensibilidade acidental</summary>

```vbnet
Public Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub

    Public Async Function CreateOrderAsync(request As OrderRequest) As Task(Of Result(Of Order))
        ' ...
    End Function
End Class

' em outro assembly, alguém estende sem conhecimento do autor
Public Class CustomOrderService
    Inherits OrderService
    ' override acidental quebra invariantes esperadas pelo OrderService original
End Class
```

</details>

<details>
<summary>✅ Bom: NotInheritable por padrão, extensibilidade exige decisão</summary>

```vbnet
Public NotInheritable Class OrderService

    Private ReadOnly _orderRepository As IOrderRepository

    Public Sub New(orderRepository As IOrderRepository)
        _orderRepository = orderRepository
    End Sub

    Public Async Function CreateOrderAsync(request As OrderRequest) As Task(Of Result(Of Order))
        ' ...
    End Function
End Class
```

</details>

## Structure ou Class

`Class` é **reference type** (tipo de referência): a variável guarda o endereço do objeto no **heap** (área de memória de vida longa), a passagem para um método compartilha o mesmo objeto, e duas variáveis são iguais quando apontam para ele.

`Structure` é **value type** (tipo de valor): o dado fica na própria variável, cada passagem copia ele por inteiro, e a igualdade compara campo a campo.

Use `Class` por padrão. `Structure` entra quando o tipo é pequeno, abaixo de uns 16 bytes, e o domínio trata o valor como identidade, como uma coordenada ou um valor monetário. Duas notas de dez reais são a mesma coisa, então copiar não faz diferença. Uma `Structure` grande faz diferença: um tipo com dez campos é copiado inteiro a cada parâmetro, a cada retorno e a cada atribuição.

<details>
<summary>❌ Ruim: Structure grande, cópia custosa a cada passagem</summary>

```vbnet
Public Structure Order ' 10+ campos, string longa, list
    Public ReadOnly Property Id As Guid
    Public ReadOnly Property Customer As Customer ' outro Structure pesado
    Public ReadOnly Property Items As List(Of OrderItem)
    ' ... mais 7 campos

    Public Sub New(id As Guid, customer As Customer, items As List(Of OrderItem))
        Me.Id = id
        Me.Customer = customer
        Me.Items = items
    End Sub
End Structure

' cada parâmetro, cada retorno, cada atribuição copia a struct inteira
```

</details>

<details>
<summary>✅ Bom: Structure pequena com semântica de valor</summary>

```vbnet
Public Structure Money

    Public ReadOnly Property Amount As Decimal
    Public ReadOnly Property Currency As String

    Public Sub New(amount As Decimal, currency As String)
        Me.Amount = amount
        Me.Currency = currency
    End Sub
End Structure

Public NotInheritable Class Order ' reference type, carrega identidade
    ' ...
End Class
```

</details>

## Nullable(Of T)

VB.NET sobre .NET Framework 4.8 **não suporta Nullable Reference Types** (recurso do C# 8 em diante, disponível a partir do .NET Core 3). Qualquer reference type pode ser `Nothing`, e o compilador não avisa. O tratamento da ausência fica por conta da convenção:

- Retornos que podem não encontrar valor devolvem `Nothing` e o tipo documenta isso na assinatura via comentário **XML** (eXtensible Markup Language, Linguagem de Marcação Extensível) ou nomeação explícita (`FindById` vs `GetById`).
- `Nullable(Of T)` (`T?` em C#) aplica-se apenas a value types (`Integer?`, `DateTime?`, `Guid?`).

<details>
<summary>❌ Ruim: Integer para valor opcional, sentinela mágica</summary>

```vbnet
Public Function FindDiscount(productId As String) As Integer
    Dim discount = _discounts.FindByProductId(productId)
    If discount Is Nothing Then
        Return -1 ' sentinela: caller precisa saber que -1 significa ausência
    End If

    Return discount.Percentage
End Function
```

</details>

<details>
<summary>✅ Bom: Nullable(Of Integer), ausência explícita no tipo</summary>

```vbnet
Public Function FindDiscount(productId As String) As Integer?
    Dim discount = _discounts.FindByProductId(productId)
    If discount Is Nothing Then
        Return Nothing
    End If

    Dim percentage = discount.Percentage
    Return percentage
End Function

' caller
Dim discountPercentage = FindDiscount(productId)
If discountPercentage.HasValue Then
    ApplyDiscount(discountPercentage.Value)
End If
```

</details>

Detalhes de contratos nulos em [null-safety.md](./advanced/null-safety.md).

## TypeOf ... Is e TryCast

O **pattern matching** (casamento de padrão) completo do C#, com `switch` de expressão e padrão de propriedade, **não existe em VB.NET**. O que a linguagem oferece é `TypeOf ... Is`, `TryCast`, `Select Case TypeOf` e a conversão explícita.

`TryCast` é a escolha para checar o tipo e já obter a variável convertida: ele tenta a conversão e devolve `Nothing` quando ela falha, sem lançar exceção. Usar `TypeOf ... Is` seguido de `DirectCast` faz o mesmo trabalho duas vezes, uma para perguntar o tipo e outra para converter.

<details>
<summary>❌ Ruim: DirectCast após TypeOf, dupla checagem</summary>

```vbnet
Public Function DescribePayment(payment As IPayment) As String
    If TypeOf payment Is CreditCard Then
        Dim creditCard = DirectCast(payment, CreditCard)
        Return $"Credit card ending in {creditCard.LastFour}"
    End If

    If TypeOf payment Is Pix Then
        Dim pix = DirectCast(payment, Pix)
        Return $"Pix to {pix.Key}"
    End If

    Return "Unknown payment"
End Function
```

</details>

<details>
<summary>✅ Bom: TryCast combina checagem e narrowing</summary>

```vbnet
Public Function DescribePayment(payment As IPayment) As String
    Dim creditCard = TryCast(payment, CreditCard)
    If creditCard IsNot Nothing Then
        Dim creditCardDescription = $"Credit card ending in {creditCard.LastFour}"
        Return creditCardDescription
    End If

    Dim pix = TryCast(payment, Pix)
    If pix IsNot Nothing Then
        Dim pixDescription = $"Pix to {pix.Key}"
        Return pixDescription
    End If

    Dim fallback = "Unknown payment"
    Return fallback
End Function
```

</details>

Para variantes fechadas de um domínio, a herança hierárquica substitui o pattern matching:

<details>
<summary>✅ Bom: hierarquia fechada com método polimórfico</summary>

```vbnet
Public MustInherit Class PaymentResult
    Public MustOverride Function Describe() As String
End Class

Public NotInheritable Class PaymentSuccess
    Inherits PaymentResult

    Public ReadOnly Property TransactionId As String

    Public Sub New(transactionId As String)
        Me.TransactionId = transactionId
    End Sub

    Public Overrides Function Describe() As String
        Dim description = $"Success: {TransactionId}"
        Return description
    End Function
End Class

Public NotInheritable Class PaymentFailure
    Inherits PaymentResult

    Public ReadOnly Property ErrorCode As String
    Public ReadOnly Property ErrorMessage As String

    Public Sub New(errorCode As String, errorMessage As String)
        Me.ErrorCode = errorCode
        Me.ErrorMessage = errorMessage
    End Sub

    Public Overrides Function Describe() As String
        Dim description = $"Failure {ErrorCode}: {ErrorMessage}"
        Return description
    End Function
End Class
```

</details>

## Generics com constraints

Um genérico sem **constraint** (restrição de tipo) aceita qualquer tipo, então o corpo do método não pode chamar nenhum membro do `T`. Para descobrir se o tipo tem uma propriedade `Id`, sobra recorrer a **reflection** (inspeção do tipo durante a execução), e o erro de tipo errado só aparece quando o método roda.

A constraint (`As Class`, `As Structure`, `As IEntity`, `As New`) coloca essa exigência na assinatura. Com `Of T As {Class, IEntity}`, o corpo acessa `e.Id` direto, e quem passar um tipo sem `Id` recebe erro de compilação.

<details>
<summary>❌ Ruim: genérico sem constraint, reflection para descobrir capability</summary>

```vbnet
Public Function FindById(Of T As Class)(id As Guid) As T
    ' método precisa lançar exceção se T não for uma entidade
    Dim entityType = GetType(T)
    Dim idProperty = entityType.GetProperty("Id")
    If idProperty Is Nothing Then
        Throw New InvalidOperationException($"{entityType.Name} is not an entity.")
    End If

    ' ...
End Function
```

</details>

<details>
<summary>✅ Bom: constraint declara capability, compilador valida</summary>

```vbnet
Public Interface IEntity
    ReadOnly Property Id As Guid
End Interface

Public Function FindById(Of T As {Class, IEntity})(id As Guid) As T
    Dim entity = _context.Set(Of T)().FirstOrDefault(Function(e) e.Id = id)
    Return entity
End Function
```

</details>

## Evitar `Object` como contrato

Um parâmetro `Object` aceita qualquer coisa, então o método não sabe o que recebeu e cada acesso precisa de uma conversão. O compilador não tem o que verificar, e o erro que ele acusaria vira uma `InvalidCastException` na execução, no cliente.

Declare o tipo concreto. `ProcessConfig(config As ApiConfig)` diz na assinatura quais campos existem, e a IDE completa eles enquanto você digita.

<details>
<summary>❌ Ruim: Object para conveniência, tipo real perdido</summary>

```vbnet
Public Sub ProcessConfig(config As Object)
    ' sem garantia de shape, qualquer acesso exige cast
    Dim endpoint = DirectCast(DirectCast(config, IDictionary).Item("Api"), IDictionary).Item("Endpoint")
End Sub
```

</details>

<details>
<summary>✅ Bom: tipo concreto, contrato explícito</summary>

```vbnet
Public NotInheritable Class ApiConfig

    Public ReadOnly Property Endpoint As String
    Public ReadOnly Property TimeoutSeconds As Integer

    Public Sub New(endpoint As String, timeoutSeconds As Integer)
        Me.Endpoint = endpoint
        Me.TimeoutSeconds = timeoutSeconds
    End Sub
End Class

Public Sub ProcessConfig(config As ApiConfig)
    Dim endpoint = config.Endpoint
    Dim timeout = config.TimeoutSeconds
End Sub
```

</details>
