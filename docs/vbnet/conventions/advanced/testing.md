# Testing

> Escopo: VB.NET. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

Testes documentam o comportamento esperado. Um teste que falha conta uma história: quem chamou, o que recebeu, o que esperava.

Os exemplos seguem a abordagem **AAA** (Arrange Act Assert, Preparar Executar Verificar): uma convenção que divide cada teste em três fases explícitas (preparação do contexto, execução do comportamento e verificação do resultado).

O [code style](../../variables.md) se aplica dentro dos testes. O assert recebe variáveis nomeadas, sem expressões, acessos de propriedade ou literais inline.

As variáveis de assert são sempre nomeadas de forma expressiva (`actualPrice`, `expectedName`, `actualOrder` em vez de genéricos) e o `expected` é sempre declarado explicitamente. Isso mantém o padrão AAA consistente: cada fase é visível e o assert lê como uma frase.

Usa **NUnit** (framework de testes para .NET) como referência: amplamente adotado no ecossistema .NET Framework.

```vbnet
Imports NUnit.Framework
```

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange Act Assert, Preparar Executar Verificar) | Convenção que divide o teste em três fases explícitas |
| **NUnit** (framework de testes para .NET) | Framework popular em .NET Framework: `<Test>` para casos, `<TestCase>` parametrizadas |
| **mock** (dados fictícios e dublê de comportamento) | Objeto que substitui dependência real e expõe verificações de chamada (`Moq`, `NSubstitute`) |
| **stub** (substituto passivo) | Implementação fixa que devolve valor pré-definido sem verificar interação |
| **fake** (implementação simplificada) | Substituto funcional, mais leve que o real (ex: repositório em memória) |
| **fixture** (estado compartilhado de teste) | Estado preparado e reutilizado entre testes na mesma classe |
| **assert** (verificação de resultado) | Última fase do teste; recebe variáveis nomeadas, nunca expressões inline |
| **TestCase** (caso parametrizado) | Atributo que executa o mesmo teste com múltiplas combinações de entrada |

> [!NOTE]
> A ordem do assert varia por framework:
> - **NUnit**: `Assert.That(actual, Is.EqualTo(expected))` — actual primeiro
> - **MSTest**: `Assert.AreEqual(expected, actual)` — expected primeiro

## Fases misturadas: AAA

Cada teste é dividido em três fases separadas por uma linha em branco: preparação do contexto, execução do comportamento e verificação do resultado.

<details>
<summary>❌ Ruim — tudo inline, fases invisíveis</summary>

```vbnet
<Test>
Public Sub AppliesDiscount()
    Assert.That(ApplyDiscount(New Order With {.Price = 100D, .DiscountPct = 10}), Is.EqualTo(90D))
End Sub
```

</details>

<details>
<summary>✅ Bom — arrange, act e assert separados</summary>

```vbnet
<Test>
Public Sub AppliesTenPercentDiscountToOrderPrice()
    Dim order = New Order With {.Price = 100D, .DiscountPct = 10}   ' arrange

    Dim actualPrice = ApplyDiscount(order)                          ' act

    Dim expectedPrice = 90D                                         ' assert
    Assert.That(actualPrice, Is.EqualTo(expectedPrice))
End Sub
```

</details>

## Assert inline: semantic assert

`expected` e `actual` são nomeados antes da comparação. O assert lê como uma frase, não como um cálculo. A regra vale sempre: mesmo quando o valor já tem nome, declare `expected` explicitamente para manter consistência e deixar o assert sem ambiguidade.

<details>
<summary>❌ Ruim — literais inline, falha não diz o que era esperado</summary>

```vbnet
<Test>
Public Sub FormatsFullName()
    Assert.That(FormatName("John", "Doe"), Is.EqualTo("John Doe"))
End Sub

<Test>
Public Sub ReturnsActiveUsersOnly()
    Dim users = {New User("Alice", True), New User("Bob", False)}
    Assert.That(FilterActive(users), Is.EquivalentTo({New User("Alice", True)}))
End Sub
```

</details>

<details>
<summary>✅ Bom — expected e actual declarados, assert semântico</summary>

```vbnet
<Test>
Public Sub FormatsFullName()
    Dim actualName = FormatName("John", "Doe")

    Dim expectedName = "John Doe"
    Assert.That(actualName, Is.EqualTo(expectedName))
End Sub

<Test>
Public Sub ReturnsActiveUsersOnly()
    Dim users = {New User("Alice", True), New User("Bob", False)}

    Dim actualUsers = FilterActive(users)

    Dim expectedUsers = {New User("Alice", True)}
    Assert.That(actualUsers, Is.EquivalentTo(expectedUsers))
End Sub
```

</details>

## Nome genérico

O nome do teste descreve o cenário e o resultado esperado, não o nome do método nem uma afirmação vaga. Sem prefixos: `Should` não agrega informação, `GivenWhenThen` é mecânico e verboso.

<details>
<summary>❌ Ruim — prefixo vazio, nome que repete a implementação</summary>

```vbnet
<Test>
Public Sub Test1() : End Sub

<Test>
Public Sub ShouldApplyDiscount() : End Sub

<Test>
Public Sub ApplyDiscount() : End Sub
```

</details>

<details>
<summary>✅ Bom — cenário + resultado esperado no título</summary>

```vbnet
<Test>
Public Sub AppliesDiscountWhenOrderTotalExceedsMinimum() : End Sub

<Test>
Public Sub ReturnsOriginalPriceWhenNoDiscountApplies() : End Sub

<Test>
Public Sub ThrowsValidationExceptionWhenDiscountIsNegative() : End Sub
```

</details>

## Estado compartilhado

Cada teste monta seu próprio contexto. Nenhum teste depende de outro para funcionar.

<details>
<summary>❌ Ruim — campo compartilhado entre testes, ordem importa</summary>

```vbnet
<TestFixture>
Public Class OrderTests
    Private Shared _order As Order

    <Test>
    Public Sub CreatesOrder()
        _order = New Order With {.Items = {New Item(1, 50D)}}
        Assert.That(_order.Id, Is.Not.Null)
    End Sub

    <Test>
    Public Sub AppliesDiscount()
        Dim actual = ApplyDiscount(_order, 10)  ' depende do teste anterior
        Dim actualPrice = actual.Price

        Dim expectedPrice = 45D
        Assert.That(actualPrice, Is.EqualTo(expectedPrice))
    End Sub
End Class
```

</details>

<details>
<summary>✅ Bom — cada teste isolado, sem dependência de execução</summary>

```vbnet
<TestFixture>
Public Class OrderTests
    <Test>
    Public Sub CreatesOrderWithGeneratedId()
        Dim order = New Order With {.Items = {New Item(1, 50D)}}

        Dim actualId = order.Id

        Assert.That(actualId, Is.Not.Null)
    End Sub

    <Test>
    Public Sub AppliesTenPercentDiscountToOrderPrice()
        Dim order = New Order With {.Items = {New Item(1, 50D)}, .Total = 100D}

        Dim actualOrder = ApplyDiscount(order, 10)
        Dim actualPrice = actualOrder.Price

        Dim expectedPrice = 90D
        Assert.That(actualPrice, Is.EqualTo(expectedPrice))
    End Sub
End Class
```

</details>

## Exceção sem tipo

Testar que um erro foi lançado é diferente de testar _qual_ erro foi lançado. `Assert.Throws(Of T)` verifica o tipo, não apenas a presença.

<details>
<summary>❌ Ruim — try/catch manual, tipo não verificado</summary>

```vbnet
<Test>
Public Sub ThrowsOnMissingOrder()
    Try
        FindOrder(Nothing)
    Catch ex As Exception
        Assert.That(ex, Is.Not.Null)  ' qualquer exceção passa
    End Try
End Sub
```

</details>

<details>
<summary>✅ Bom — Assert.Throws(Of T) com tipo explícito</summary>

```vbnet
<Test>
Public Sub ThrowsArgumentExceptionWhenOrderIdIsNothing()
    Dim invalidId As Guid = Guid.Empty

    Assert.Throws(Of ArgumentException)(Sub() FindOrder(invalidId))
End Sub
```

</details>

## Teste assíncrono

NUnit 3 suporta testes assíncronos com `Async Function` retornando `Task`.

<details>
<summary>❌ Ruim — .Result bloqueia thread e esconde falhas async</summary>

```vbnet
<Test>
Public Sub FindsOrderAsync()
    Dim order = _repository.FindByIdAsync(KnownOrderId).Result  ' bloqueia — pode causar deadlock
    Assert.That(order, Is.Not.Null)
End Sub
```

</details>

<details>
<summary>✅ Bom — Async Function com Await, NUnit aguarda corretamente</summary>

```vbnet
<Test>
Public Async Function FindsOrderByIdWhenOrderExists() As Task
    Dim order = Await _repository.FindByIdAsync(KnownOrderId)

    Assert.That(order, Is.Not.Null)
    Assert.That(order.Id, Is.EqualTo(KnownOrderId))
End Function
```

</details>
