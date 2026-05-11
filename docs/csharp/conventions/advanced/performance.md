# Performance

> Escopo: C#. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

Estas diretrizes se aplicam a **hot paths** (caminhos quentes): fluxos executados em volume ou frequência alta. Fora desse
contexto, prefira legibilidade. Meça antes de otimizar — **Span\<T\>** elimina alocações em fatiamento de string; **GC** pressiona a aplicação quando alocações crescem em laço.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho quente) | Trecho executado em volume ou frequência alta; única região onde otimizações pagam o custo |
| **Span\<T\>** (fatia de memória) | Tipo do .NET que representa janela sobre memória existente; sem alocação |
| **ReadOnlySpan\<char\>** (fatia somente leitura) | Janela imutável sobre uma string; substitui `Substring` em hot paths |
| **GC** (Garbage Collector, Coletor de Lixo) | Subsistema que libera memória; alocações em laço pressionam o GC e geram pausas |
| **allocation** (alocação) | Reserva de memória no heap gerenciado; `new`, boxing e concatenação alocam |
| **boxing** (encaixotamento) | Cópia de tipo de valor para o heap quando atribuído a `object`/interface; evite em laços |
| **StringBuilder** (construtor de strings) | Tipo que acumula strings sem realocar a cada concatenação |
| **BenchmarkDotNet** (biblioteca de benchmarking) | Ferramenta padrão para medir antes de decidir; números reais antes de mudar código |

## Span\<T\>

Operações em strings com `Split`, `Substring` e `IndexOf` alocam novos objetos a cada chamada. Em
hot paths, isso pressiona o GC. `ReadOnlySpan<char>` fatia a string original sem nenhuma alocação:
mesma posição de memória, janela diferente.

<details>
<summary>❌ Ruim — Split aloca array e strings intermediárias</summary>
<br>

```csharp
public string ExtractProductCode(string sku)
{
    var parts = sku.Split('-');
    var code = parts[0];

    return code;
}
```

</details>

<br>

<details>
<summary>✅ Bom — Span fatia sem alocar</summary>
<br>

```csharp
public string ExtractProductCode(string sku)
{
    var span = sku.AsSpan();
    var separatorIndex = span.IndexOf('-');

    var code = span[..separatorIndex].ToString();
    return code;
}
```

</details>
<br>

`Span<T>` também funciona sobre arrays. Quando o método recebe `T[]` e itera em alta frequência, `ReadOnlySpan<T>` elimina a indireção do enumerador.

<details>
<summary>❌ Ruim — foreach sobre array em hot path</summary>
<br>

```csharp
public decimal SumLineItemAmounts(OrderItem[] items)
{
    var total = 0m;
    foreach (var item in items)
    {
        total += item.Amount;
    }

    return total;
}
```

</details>

<br>

<details>
<summary>✅ Bom — ReadOnlySpan elimina a indireção do enumerador</summary>
<br>

```csharp
public decimal SumLineItemAmounts(OrderItem[] items)
{
    ReadOnlySpan<OrderItem> span = items;
    var total = 0m;

    for (var i = 0; i < span.Length; i++)
    {
        total += span[i].Amount;
    }

    return total;
}
```

</details>

## StringBuilder

Concatenação com `+` ou interpolação dentro de um loop aloca uma nova string a cada iteração: cada
string é imutável em .NET. Para construir strings dinamicamente, `StringBuilder` reutiliza um buffer
interno e aloca uma vez no final.

<details>
<summary>❌ Ruim — nova string alocada por iteração</summary>
<br>

```csharp
public string BuildOrderSummary(IEnumerable<OrderItem> items)
{
    var summary = "";
    foreach (var item in items)
    {
        summary += $"{item.ProductName}: {item.Quantity}x\n";
    }

    return summary;
}
```

</details>

<br>

<details>
<summary>✅ Bom — StringBuilder reutiliza o buffer</summary>
<br>

```csharp
public string BuildOrderSummary(IEnumerable<OrderItem> items)
{
    var builder = new StringBuilder();
    foreach (var item in items)
    {
        builder.AppendLine($"{item.ProductName}: {item.Quantity}x");
    }

    var summary = builder.ToString();
    return summary;
}
```

</details>

## ValueTask

`Task<T>` aloca um objeto no heap a cada chamada, mesmo quando o resultado já está disponível
sincronamente. `ValueTask<T>` evita essa alocação nos caminhos síncronos: resultado em cache, dado
já computado. Indicado para métodos de alta frequência: repositórios, caches, validators.

<details>
<summary>❌ Ruim — <b>Task</b> aloca mesmo quando o resultado está em cache</summary>
<br>

```csharp
public async Task<Product?> FindProductAsync(Guid id, CancellationToken ct)
{
    if (_cache.TryGetValue(id, out var cached))
        return cached;

    var product = await _repo.FindByIdAsync(id, ct);
    return product;
}
```

</details>

<br>

<details>
<summary>✅ Bom — <b>ValueTask</b> sem alocação no caminho síncrono</summary>
<br>

```csharp
public async ValueTask<Product?> FindProductAsync(Guid id, CancellationToken ct)
{
    if (_cache.TryGetValue(id, out var cached))
        return cached;

    var product = await _repo.FindByIdAsync(id, ct);
    return product;
}
```

</details>
<br>

`ValueTask` não é substituto universal de `Task`. Quando o método é quase sempre assíncrono, `Task` tem menos overhead de leitura e não oferece risco de double-await.

## ID: Guid v4 vs Guid v7

`Guid.NewGuid()` gera **UUID** (Universally Unique Identifier, Identificador Universalmente Único) v4: aleatório. Inserções aleatórias fragmentam o índice primário
progressivamente. `Guid.CreateVersion7()` gera UUID v7: time-ordered, insere sempre próximo ao fim
da B-tree, sem fragmentação. Veja o impacto no banco em [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md#tipo-de-id--bigint-vs-uuid).

<details>
<summary>❌ Ruim — Guid.NewGuid() é v4: random, fragmenta índice</summary>
<br>

```csharp
public Order CreateOrder(CreateOrderRequest request)
{
    var orderId = Guid.NewGuid(); // v4 — random, page splits no banco
    var order = new Order(orderId, request.CustomerId, request.Total);

    return order;
}
```

</details>

<br>

<details>
<summary>✅ Bom — Guid.CreateVersion7() é time-ordered, sem fragmentação</summary>
<br>

```csharp
public Order CreateOrder(CreateOrderRequest request)
{
    var orderId = Guid.CreateVersion7(); // .NET 9+ — time-ordered, sequencial no índice
    var order = new Order(orderId, request.CustomerId, request.Total);
    return order;
}
```

</details>
