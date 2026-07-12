# Desempenho em C#

> Escopo: C#. Visão transversal: [shared/platform/performance.md](../../../shared/platform/performance.md).

As técnicas deste guia valem para **hot paths** (caminhos quentes), os trechos que executam muitas vezes por segundo ou processam volume grande. Fora deles, escolha a versão mais legível. Meça antes de trocar código legível por código rápido, porque a intuição sobre onde está o gargalo erra com frequência, e `BenchmarkDotNet` responde em minutos. As duas ferramentas que mais aparecem aqui são **Span\<T\>**, que fatia texto e arrays sem alocar memória nova, e o **StringBuilder**, que monta texto sem criar uma string a cada volta do laço.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **hot path** (caminho quente) | Trecho executado em volume ou frequência alta; única região onde otimizações pagam o custo |
| **Span\<T\>** (fatia de memória) | Tipo do .NET que representa janela sobre memória existente; sem alocação |
| **ReadOnlySpan\<char\>** (fatia somente leitura) | Janela somente leitura sobre uma string; substitui `Substring` em hot paths |
| **GC** (Garbage Collector · Coletor de Lixo) | Subsistema que libera memória; alocações em laço pressionam o GC e geram pausas |
| **allocation** (alocação) | Reserva de memória no heap gerenciado; `new`, boxing e concatenação alocam |
| **boxing** (encaixotamento) | Cópia de tipo de valor para o heap quando atribuído a `object`/interface; evite em laços |
| **StringBuilder** (construtor de strings) | Tipo que acumula strings sem realocar a cada concatenação |
| **BenchmarkDotNet** (biblioteca de benchmarking) | Ferramenta padrão para medir antes de decidir; números reais antes de mudar código |

<a id="span"></a>

## Span\<T\>

`Split`, `Substring` e `IndexOf` criam objetos novos a cada chamada. Numa rota chamada mil vezes por segundo, esse lixo se acumula e o **GC** (Garbage Collector · Coletor de Lixo) precisa pausar a aplicação para limpá-lo. `ReadOnlySpan<char>` aponta para um pedaço da string que já existe na memória, sem copiar nada: mesma posição, janela diferente. A alocação só acontece no `.ToString()` final, quando o pedaço precisa virar string de verdade.

<details>
<summary>❌ Ruim: Split aloca array e strings intermediárias</summary>

```csharp
public string ExtractProductCode(string sku)
{
    var parts = sku.Split('-');
    var code = parts[0];

    return code;
}
```

</details>

<details>
<summary>✅ Bom: Span fatia sem alocar</summary>

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

`Span<T>` também serve para arrays. Quando o método recebe `T[]` e o laço roda em alta frequência, `ReadOnlySpan<T>` percorre os itens direto pelo índice, sem passar pelo enumerador que o `foreach` cria.

<details>
<summary>❌ Ruim: foreach sobre array em hot path</summary>

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

<details>
<summary>✅ Bom: ReadOnlySpan elimina a indireção do enumerador</summary>

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

<a id="stringbuilder"></a>

## StringBuilder

Em .NET, a string não muda depois de criada. Por isso `summary += "..."` dentro de um laço não acrescenta texto ao que existia: ele cria uma string nova, com o conteúdo antigo mais o novo, e joga a anterior fora. Cem itens produzem cem strings descartadas. `StringBuilder` mantém um buffer que cresce conforme necessário e produz a string uma única vez, no `ToString()`.

<details>
<summary>❌ Ruim: nova string alocada por iteração</summary>

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

<details>
<summary>✅ Bom: StringBuilder reutiliza o buffer</summary>

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

<a id="valuetask"></a>

## ValueTask

Todo `Task<T>` cria um objeto na memória, mesmo quando a resposta já estava pronta e nada precisou ser esperado. É o caso do método que consulta o cache e encontra o valor: ele aloca o objeto de uma operação assíncrona sem ter esperado por nada. `ValueTask<T>` evita essa alocação quando o resultado vem na hora, e por isso cabe em repositório, cache e validator, que são chamados o tempo todo e acertam o cache na maioria das vezes.

<details>
<summary>❌ Ruim: <b>Task</b> aloca mesmo quando o resultado está em cache</summary>

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

<details>
<summary>✅ Bom: <b>ValueTask</b> sem alocação no caminho síncrono</summary>

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

Deixe o `Task` onde o método quase sempre espera de verdade por uma resposta. Ali o ganho não aparece, e o `ValueTask` traz uma regra a mais para lembrar: ele só pode ser aguardado uma vez, e aguardá-lo duas vezes é um bug que o compilador não pega.

<a id="guid-v4-vs-v7"></a>

## Guid v4 e Guid v7 como identificador

`Guid.NewGuid()` produz um **UUID** (Universally Unique Identifier · Identificador Universalmente Único) v4, que é aleatório. Como chave primária, isso significa que cada linha nova vai parar num ponto qualquer do índice, e o banco precisa abrir espaço no meio de páginas já cheias. `Guid.CreateVersion7()` (.NET 9+) começa pelo horário de criação, então os identificadores nascem em ordem crescente e cada linha nova entra no fim do índice. Veja o efeito disso no banco em [sql/conventions/advanced/performance.md](../../../sql/conventions/advanced/performance.md#tipo-de-id-bigint-vs-uuid).

<details>
<summary>❌ Ruim: Guid.NewGuid() é v4: random, fragmenta índice</summary>

```csharp
public Order CreateOrder(CreateOrderRequest request)
{
    var orderId = Guid.NewGuid(); // v4: random, page splits no banco
    var order = new Order(orderId, request.CustomerId, request.Total);

    return order;
}
```

</details>

<details>
<summary>✅ Bom: Guid.CreateVersion7() é time-ordered, sem fragmentação</summary>

```csharp
public Order CreateOrder(CreateOrderRequest request)
{
    var orderId = Guid.CreateVersion7(); // .NET 9+: time-ordered, sequencial no índice
    var order = new Order(orderId, request.CustomerId, request.Total);
    return order;
}
```

</details>
