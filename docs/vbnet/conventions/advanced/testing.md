# Testes em VB.NET

> Escopo: VB.NET. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

O teste registra o comportamento esperado do código. Quando ele falha, a mensagem precisa contar a história inteira: o que foi chamado, o que voltou e o que se esperava no lugar. É por isso que o valor esperado ganha um nome antes da comparação.

Os exemplos seguem o **AAA** (Arrange Act Assert · Preparar Executar Verificar), convenção que separa o teste em três fases: preparar o cenário, executar o comportamento e verificar o resultado. O [code style](../variables.md) vale dentro do teste como vale em qualquer outro código. O `Assert` recebe variáveis com nome (`actualPrice`, `expectedName`), sem cálculo, acesso a propriedade ou literal escrito na chamada.

O framework de referência é o **NUnit**, o mais usado no .NET Framework.

```vbnet
Imports NUnit.Framework
```

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange Act Assert · Preparar Executar Verificar) | Convenção que separa o teste em três fases visíveis |
| **NUnit** (framework de testes do .NET) | Framework mais usado no .NET Framework: `<Test>` marca o caso, `<TestCase>` passa entradas |
| **mock** (dados fictícios) | Objeto que entra no lugar da dependência real e ainda permite verificar as chamadas recebidas (`Moq`, `NSubstitute`) |
| **stub** (substituto passivo) | Implementação que devolve sempre o mesmo valor, sem verificar como foi chamada |
| **fake** (implementação simplificada) | Substituto que funciona de verdade, porém mais leve, como um repositório em memória |
| **fixture** (cenário de teste) | Estado preparado para os testes de uma mesma classe |
| **assert** (verificação) | Fase final do teste; recebe variáveis com nome |
| **TestCase** (caso com entradas) | Atributo que roda o mesmo teste várias vezes, com combinações diferentes de entrada |

> [!NOTE]
> A ordem do assert varia por framework:
> - **NUnit**: `Assert.That(actual, Is.EqualTo(expected))`: actual primeiro
> - **MSTest**: `Assert.AreEqual(expected, actual)`: expected primeiro

<a id="aaa-phases"></a>

## As três fases do teste ficam visíveis

O teste escrito em uma linha só passa ou falha sem explicar nada: a mensagem de erro mostra dois números e nenhum contexto. Agrupe as declarações do cenário, da execução e do valor esperado em um bloco, e deixe uma linha em branco antes do `Assert`. A verificação é a fase que responde pelo teste, e ela merece a própria linha.

<details>
<summary>❌ Ruim: tudo inline, fases invisíveis</summary>

```vbnet
<Test>
Public Sub AppliesDiscount()
    Assert.That(ApplyDiscount(New Order With {.Price = 100D, .DiscountPct = 10}), Is.EqualTo(90D))
End Sub
```

</details>

<details>
<summary>✅ Bom: declarações agrupadas, asserção isolada por linha em branco</summary>

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

<a id="semantic-assert"></a>

## O valor esperado tem nome antes da comparação

`expected` e `actual` são declarados antes do `Assert`, sempre, mesmo quando o valor parece óbvio na linha. Assim a comparação lê como uma frase (`actualName` é igual a `expectedName`), e a falha aponta os dois nomes. Com o cálculo escrito dentro da chamada, a mensagem de erro mostra apenas o resultado, e quem lê precisa executar o teste de novo para descobrir o que se esperava.

<details>
<summary>❌ Ruim: literais inline, falha não diz o que era esperado</summary>

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
<summary>✅ Bom: expected e actual declarados, assert semântico</summary>

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

<a id="test-naming"></a>

## O nome do teste diz o cenário e o resultado

O nome do teste é a primeira coisa que aparece quando a suíte quebra no pipeline, então ele precisa dizer o que deixou de funcionar sem que ninguém abra o arquivo. `AppliesDiscountWhenOrderTotalExceedsMinimum` entrega cenário e resultado. `Test1` e `ShouldApplyDiscount` não entregam nem um nem outro. O prefixo `Should` ocupa espaço sem acrescentar informação, e o padrão `GivenWhenThen` alonga o nome com palavras que a estrutura do teste já mostra.

<details>
<summary>❌ Ruim: prefixo vazio, nome que repete a implementação</summary>

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
<summary>✅ Bom: cenário + resultado esperado no título</summary>

```vbnet
<Test>
Public Sub AppliesDiscountWhenOrderTotalExceedsMinimum() : End Sub

<Test>
Public Sub ReturnsOriginalPriceWhenNoDiscountApplies() : End Sub

<Test>
Public Sub ThrowsValidationExceptionWhenDiscountIsNegative() : End Sub
```

</details>

<a id="shared-state"></a>

## Cada teste monta o próprio cenário

Um campo `Shared` preenchido por um teste e lido por outro amarra os dois à ordem de execução. O NUnit não garante essa ordem, e rodar um teste sozinho pela IDE já o encontra com o campo vazio. A falha aparece no segundo teste, embora a causa esteja no primeiro. Cada teste declara o que precisa dentro do próprio corpo.

<details>
<summary>❌ Ruim: campo compartilhado entre testes, ordem importa</summary>

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
<summary>✅ Bom: cada teste isolado, sem dependência de execução</summary>

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

<a id="exception-type"></a>

## O teste de exceção verifica o tipo

Um `Try/Catch` que aceita qualquer `Exception` também passa quando o código lança `NullReferenceException` por um bug, em vez do `ArgumentException` que a regra pedia. O teste fica verde enquanto o comportamento está errado. `Assert.Throws(Of ArgumentException)` exige o tipo certo e falha quando vier outro.

<details>
<summary>❌ Ruim: try/catch manual, tipo não verificado</summary>

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
<summary>✅ Bom: Assert.Throws(Of T) com tipo explícito</summary>

```vbnet
<Test>
Public Sub ThrowsArgumentExceptionWhenOrderIdIsNothing()
    Dim invalidId As Guid = Guid.Empty
    Assert.Throws(Of ArgumentException)(Sub() FindOrder(invalidId))
End Sub
```

</details>

<a id="async-test"></a>

## O teste assíncrono é uma Async Function

O NUnit 3 aguarda o teste declarado como `Async Function` que devolve `Task`. Chamar `.Result` dentro de um `Sub` bloqueia a thread e traz de volta o impasse descrito em [código assíncrono](async.md#no-blocking-await), agora dentro da suíte de testes.

<details>
<summary>❌ Ruim: .Result bloqueia thread e esconde falhas async</summary>

```vbnet
<Test>
Public Sub FindsOrderAsync()
    Dim order = _repository.FindByIdAsync(KnownOrderId).Result  ' bloqueia: pode causar deadlock
    Assert.That(order, Is.Not.Null)
End Sub
```

</details>

<details>
<summary>✅ Bom: Async Function com Await, NUnit aguarda corretamente</summary>

```vbnet
<Test>
Public Async Function FindsOrderByIdWhenOrderExists() As Task
    Dim order = Await _repository.FindByIdAsync(KnownOrderId)

    Assert.That(order, Is.Not.Null)
    Assert.That(order.Id, Is.EqualTo(KnownOrderId))
End Function
```

</details>
