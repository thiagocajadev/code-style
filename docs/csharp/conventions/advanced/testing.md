# Testing

> Escopo: C#. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

Testes documentam o comportamento esperado. Um teste que falha conta uma história: quem chamou, o
que recebeu, o que esperava.

Os exemplos seguem a abordagem **AAA** (Arrange Act Assert, Preparar Executar Verificar): uma convenção que divide cada
teste em três fases explícitas (preparação do contexto, execução do comportamento e verificação do
resultado).

O [code style](../variables.md) se aplica dentro dos testes. O assert recebe variáveis nomeadas, sem expressões, acessos de propriedade ou literais inline.

As variáveis de assert são sempre nomeadas de forma expressiva (`actualPrice`, `expectedName`, `actualOrder` em vez de genéricos) e o `expected` é sempre declarado explicitamente, mesmo quando o valor já tem nome. Isso mantém o padrão AAA consistente: cada fase é visível e o assert lê como uma frase.

Usa [xUnit](https://xunit.net/) como referência: o framework mais adotado no ecossistema .NET, sem boilerplate de `[TestClass]`.

```csharp
using Xunit;
```

> [!NOTE]
> A ordem do assert varia por framework: cada script de teste indica a convenção no topo.
> - **xUnit**: `Assert.Equal(expected, actual)` — expected primeiro
> - **MSTest**: `Assert.AreEqual(expected, actual)` — expected primeiro
> - **NUnit**: `Assert.That(actual, Is.EqualTo(expected))` — actual primeiro

## Fases misturadas: AAA

Cada teste é dividido em três fases separadas por uma linha em branco: preparação do contexto,
execução do comportamento e verificação do resultado.

<details>
<summary>❌ Bad — tudo inline, fases invisíveis</summary>
<br>

```csharp
[Fact]
public void AppliesDiscount()
{
    Assert.Equal(90m, ApplyDiscount(new Order { Price = 100m, DiscountPct = 10 }));
}
```

</details>

<br>

<details>
<summary>✅ Good — arrange, act e assert separados</summary>
<br>

```csharp
[Fact]
public void AppliesTenPercentDiscountToOrderPrice()
{
    var order = new Order { Price = 100m, DiscountPct = 10 };         // arrange

    var actualPrice = ApplyDiscount(order);                           // act

    var expectedPrice = 90m;                                          // assert
    Assert.Equal(expectedPrice, actualPrice);
}
```

</details>

## Assert inline: semantic assert

`expected` e `actual` são nomeados antes da comparação. O assert lê como uma frase, não como um cálculo. A regra vale sempre: mesmo quando o valor já tem nome, declare `expected` explicitamente para manter consistência e deixar o assert sem ambiguidade.

<details>
<summary>❌ Bad — literais inline, falha não diz o que era esperado</summary>
<br>

```csharp
[Fact]
public void FormatsFullName()
{
    Assert.Equal("John Doe", FormatName("John", "Doe"));
}

[Fact]
public void ReturnsActiveUsersOnly()
{
    var users = new[] { new User("Alice", true), new User("Bob", false) };
    Assert.Equal(new[] { new User("Alice", true) }, FilterActive(users));
}
```

</details>

<br>

<details>
<summary>✅ Good — expected e actual declarados, assert semântico</summary>
<br>

```csharp
[Fact]
public void FormatsFullName()
{
    var actualName = FormatName("John", "Doe");

    var expectedName = "John Doe";
    Assert.Equal(expectedName, actualName);
}

[Fact]
public void ReturnsActiveUsersOnly()
{
    var users = new[] { new User("Alice", true), new User("Bob", false) };

    var actualUsers = FilterActive(users);

    var expectedUsers = new[] { new User("Alice", true) };
    Assert.Equal(expectedUsers, actualUsers);
}
```

</details>

## Nome genérico

O nome do teste descreve o cenário e o resultado esperado, não o nome do método nem uma afirmação
vaga. Sem prefixos: `Should` não agrega informação, `GivenWhenThen` é mecânico e verboso.

<details>
<summary>❌ Bad — prefixo vazio, nome que repete a implementação</summary>
<br>

```csharp
[Fact]
public void Test1() { /* ... */ }

[Fact]
public void ShouldApplyDiscount() { /* ... */ }

[Fact]
public void ApplyDiscount() { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — cenário + resultado esperado no título</summary>
<br>

```csharp
[Fact]
public void AppliesDiscountWhenOrderTotalExceedsMinimum() { /* ... */ }

[Fact]
public void ReturnsOriginalPriceWhenNoDiscountApplies() { /* ... */ }

[Fact]
public void ThrowsValidationExceptionWhenDiscountIsNegative() { /* ... */ }
```

</details>

## Estado compartilhado

Cada teste monta seu próprio contexto. Nenhum teste depende de outro para funcionar.

<details>
<summary>❌ Bad — campo estático mutável compartilhado entre testes</summary>
<br>

```csharp
public class OrderTests
{
    private static Order _order;

    [Fact]
    public void CreatesOrder()
    {
        _order = new Order { Items = [new Item(1, 50m)] };

        Assert.NotNull(_order.Id);
    }

    [Fact]
    public void AppliesDiscount()
    {
        var actual = ApplyDiscount(_order, 10); // depende do teste anterior
        var actualPrice = actual.Price;

        var expected = 45m;
        Assert.Equal(expected, actualPrice);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — cada teste isolado, sem dependência de execução</summary>
<br>

```csharp
public class OrderTests
{
    [Fact]
    public void CreatesOrderWithGeneratedId()
    {
        var order = new Order { Items = [new Item(1, 50m)] };

        var actualId = order.Id;

        Assert.NotNull(actualId);
    }

    [Fact]
    public void AppliesTenPercentDiscountToOrderPrice()
    {
        var order = new Order { Items = [new Item(1, 50m)], Total = 100m };

        var actualOrder = ApplyDiscount(order, 10);
        var actualPrice = actualOrder.Price;

        var expectedPrice = 90m;
        Assert.Equal(expectedPrice, actualPrice);
    }
}
```

</details>

## Exceção sem tipo

Testar que um erro foi lançado é diferente de testar _qual_ erro foi lançado. `Assert.Throws<T>`
verifica o tipo, não apenas a presença.

<details>
<summary>❌ Bad — try/catch manual, tipo não verificado</summary>
<br>

```csharp
[Fact]
public async Task ThrowsOnMissingOrder()
{
    try
    {
        await FindOrderAsync(null);
    }
    catch (Exception ex)
    {
        Assert.NotNull(ex); // qualquer exceção passa
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — Assert.ThrowsAsync com tipo explícito</summary>
<br>

```csharp
[Fact]
public async Task ThrowsNotFoundExceptionWhenOrderDoesNotExist()
{
    var invalidId = "nonexistent-id";

    var act = () => FindOrderAsync(invalidId);

    await Assert.ThrowsAsync<NotFoundException>(act);
}
```

</details>
