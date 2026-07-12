# Testes em C#

> Escopo: C#. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

Um teste é a descrição executável do comportamento esperado. Quando ele falha, a mensagem precisa contar três coisas sem que ninguém abra o código: o que foi chamado, o que voltou e o que se esperava.

Os exemplos usam a divisão **AAA** (Arrange Act Assert · Preparar Executar Verificar), com as declarações agrupadas e a verificação isolada por uma linha em branco. O [code style](../variables.md) vale dentro do teste também: a comparação recebe variáveis com nome (`actualPrice`, `expectedName`), sem cálculo, acesso a propriedade ou valor solto escrito no meio do `Assert`.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange Act Assert · Preparar Executar Verificar) | Convenção que divide o teste em três fases explícitas |
| **xUnit** (framework de teste do .NET) | Framework padrão do projeto: `[Fact]` para casos únicos, `[Theory]` parametrizadas |
| **mock** (dados fictícios) | Objeto que substitui dependência real e expõe verificações de chamada (`Moq`, `NSubstitute`) |
| **stub** (substituto passivo) | Implementação fixa que devolve valor pré-definido sem verificar interação |
| **fake** (implementação simplificada) | Substituto funcional, mais leve que o real (ex: `InMemoryRepository`) |
| **fixture** (estado compartilhado de teste) | Objeto que prepara contexto reutilizado entre testes (`IClassFixture<T>`) |
| **assert** (verificação de resultado) | Última fase do teste; recebe variáveis nomeadas, nunca expressões inline |
| **FluentAssertions** (biblioteca de asserts fluentes) | API que torna asserts legíveis: `actualOrder.Should().BeEquivalentTo(expectedOrder)` |

O guia usa [xUnit](https://xunit.net/) como referência: é o framework mais adotado no ecossistema .NET e dispensa o **boilerplate** (código repetitivo de cerimônia) de `[TestClass]`.

```csharp
using Xunit;
```

> [!NOTE]
> A ordem do assert varia por framework: cada script de teste indica a convenção no topo.
> - **xUnit**: `Assert.Equal(expected, actual)`: expected primeiro
> - **MSTest**: `Assert.AreEqual(expected, actual)`: expected primeiro
> - **NUnit**: `Assert.That(actual, Is.EqualTo(expected))`: actual primeiro

<a id="aaa-phases"></a>

## As três fases do teste

Preparar o cenário, executar a operação e declarar o valor esperado ficam juntos, em um bloco. A verificação vem depois de uma linha em branco. Escrever tudo dentro do `Assert`, como em `Assert.Equal(90m, ApplyDiscount(new Order { ... }))`, economiza linhas e atrapalha na hora que o teste quebra: a mensagem de falha mostra números sem dizer de onde vieram.

<details>
<summary>❌ Ruim: tudo inline, fases invisíveis</summary>

```csharp
[Fact]
public void AppliesDiscount()
{
    Assert.Equal(90m, ApplyDiscount(new Order { Price = 100m, DiscountPct = 10 }));
}
```

</details>

<details>
<summary>✅ Bom: setup agrupado, asserção isolada por linha em branco</summary>

```csharp
[Fact]
public void AppliesTenPercentDiscountToOrderPrice()
{
    var order = new Order { Price = 100m, DiscountPct = 10 };
    var actualPrice = ApplyDiscount(order);
    var expectedPrice = 90m;

    Assert.Equal(expectedPrice, actualPrice);
}
```

</details>

<a id="semantic-assert"></a>

## Nomeie o esperado e o obtido antes de comparar

Dê nome aos dois lados da comparação: `actualName` para o que o código produziu, `expectedName` para o que deveria produzir. O `Assert` passa a se ler como uma frase. Mantenha a regra mesmo quando o valor já tem nome, porque a simetria entre `expected` e `actual` é o que deixa claro qual dos dois está sob teste.

<details>
<summary>❌ Ruim: literais inline, falha não diz o que era esperado</summary>

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

<details>
<summary>✅ Bom: expected e actual declarados, assert semântico</summary>

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

<a id="test-naming"></a>

## O nome do teste conta o cenário e o resultado

`AppliesDiscountWhenOrderTotalExceedsMinimum` responde duas perguntas: em que situação, e o que acontece. É esse nome que aparece na lista de falhas do CI, então ele precisa se explicar sozinho. `Test1` não diz nada. `ApplyDiscount` repete o nome do método e some com o cenário. `Should` na frente ocupa espaço sem acrescentar informação, e `GivenWhenThen` alonga o nome sem melhorar a leitura.

<details>
<summary>❌ Ruim: prefixo vazio, nome que repete a implementação</summary>

```csharp
[Fact]
public void Test1() { /* ... */ }

[Fact]
public void ShouldApplyDiscount() { /* ... */ }

[Fact]
public void ApplyDiscount() { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: cenário + resultado esperado no título</summary>

```csharp
[Fact]
public void AppliesDiscountWhenOrderTotalExceedsMinimum() { /* ... */ }

[Fact]
public void ReturnsOriginalPriceWhenNoDiscountApplies() { /* ... */ }

[Fact]
public void ThrowsValidationExceptionWhenDiscountIsNegative() { /* ... */ }
```

</details>

<a id="shared-state"></a>

## Cada teste monta o próprio contexto

Um campo estático que um teste escreve e o outro lê cria uma ordem de execução obrigatória que ninguém declarou. O segundo teste passa quando roda depois do primeiro e falha quando roda sozinho, e a mensagem de erro não vai contar isso. Monte o cenário dentro de cada teste, mesmo que a linha se repita entre eles.

<details>
<summary>❌ Ruim: campo estático que um teste escreve e outro lê</summary>

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

<details>
<summary>✅ Bom: cada teste isolado, sem dependência de execução</summary>

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

<a id="exception-type"></a>

## Verificar qual exceção foi lançada

Um `try/catch` que captura `Exception` e confirma que ela não é nula passa mesmo quando o código quebrou por um motivo diferente do esperado: um `NullReferenceException` acidental satisfaz o teste tão bem quanto o `NotFoundException` que ele queria provar. `Assert.ThrowsAsync<NotFoundException>` só passa quando a exceção lançada é do tipo declarado.

<details>
<summary>❌ Ruim: try/catch manual, tipo não verificado</summary>

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

<details>
<summary>✅ Bom: Assert.ThrowsAsync com tipo explícito</summary>

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
