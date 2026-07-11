# Variables

Variáveis em C# equilibram ergonomia (`var`) e clareza (tipo explícito). A decisão não é estilística: quando o tipo está óbvio no lado direito, `var` reduz ruído; quando o leitor precisa rastrear, o tipo explícito é obrigação. **readonly** comunica que o valor não é alterado depois da atribuição.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **var** (inferência de tipo local) | Palavra-chave que deixa o compilador inferir o tipo; usar quando o lado direito deixa óbvio |
| **explicit type** (tipo explícito) | Declarar o tipo (`Order order = ...`); obrigatório quando a leitura precisa rastrear o tipo |
| **readonly** (somente leitura) | Modificador que impede reatribuição de campo após o construtor; comunica valor fixo |
| **const** (constante de compilação) | Valor literal conhecido em tempo de compilação; embutido nos chamadores |
| **scope** (escopo) | Região onde a variável é visível; manter o escopo curto reduz superfície de bugs |
| **target-typed new** (`new()` com alvo inferido) | Sintaxe C# 9+ que omite o tipo: `List<int> xs = new();` |
| **domain term** (termo de domínio) | Nome reflete propósito (`pendingInvoice`), não estrutura técnica (`invoiceVar`) |

## `var` e tipo explícito

`var` é adequado quando o tipo é óbvio pelo lado direito. Quando a leitura exige rastrear o tipo mentalmente, declare explicitamente: o leitor não deve precisar inferir.

<details>
<summary>❌ Ruim: tipo obscuro</summary>

```csharp
var result = ProcessOrder(request); // Order? InvoiceResult? ViewModel? impossível saber
var discount = Calculate(order);    // decimal? int? percentual ou valor absoluto?
```

</details>

<details>
<summary>✅ Bom: tipo legível; `var` apenas onde óbvio</summary>

```csharp
Order order = ProcessOrder(request);
decimal discount = Calculate(order);

var items = new List<OrderItem>(); // tipo explícito no lado direito
```

</details>

## `const` e `readonly`

`const` é resolvido em tempo de compilação: apenas para primitivos e strings. `readonly` vale para valores determinados em runtime: atribuído no construtor, não pode ser alterado depois. Campos que mudam onde só leitura é necessária são um contrato fraco.

<details>
<summary>❌ Ruim: campo reatribuível onde o valor deveria ser fixo</summary>

```csharp
public class OrderService
{
    private static int maxRetries = 3; // qualquer método pode alterar
    private string _apiUrl;             // reatribuível após o construtor

    public OrderService(IConfiguration config)
    {
        _apiUrl = config["ApiUrl"];
    }
}
```

</details>

<details>
<summary>✅ Bom: valor fixo declarado explicitamente</summary>

```csharp
public class OrderService(IConfiguration config)
{
    private const int MaxRetries = 3;
    private readonly string _apiUrl = config["ApiUrl"];
}
```

</details>

## Records immutable

`record` expressa um contrato de dados immutable (que não muda) sem cerimônia. Prefira `record` sobre `class` para DTOs, requests, responses e value objects: a semântica de igualdade por valor vem de graça.

<details>
<summary>❌ Ruim: class aberta a alteração como contrato de dados</summary>

```csharp
public class OrderRequest
{
    public string ProductId { get; set; } // setter público: qualquer código pode alterar
    public int Quantity { get; set; }     // estado alterado sem controle
}
```

</details>

<details>
<summary>✅ Bom: record immutable, contrato explícito</summary>

```csharp
public record OrderRequest(string ProductId, int Quantity);
```

</details>

<a id="magic-values"></a>

## Sem valores mágicos

Literais embutidos escondem intenção. `const` nomeado documenta o significado: o nome é a documentação.

<details>
<summary>❌ Ruim: literais sem significado</summary>

```csharp
if (order.Status == 2)    // o que é 2?
    return;

if (discount > 0.15m)    // limite de desconto? taxa? de onde vem esse número?
    return;
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas</summary>

```csharp
private const int OrderStatusApproved = 2;
private const decimal MaxDiscountRate = 0.15m;

if (order.Status == OrderStatusApproved)
    return;

if (discount > MaxDiscountRate)
    return;
```

</details>

<a id="direct-mutation"></a>

## Alteração direta

`record` suporta `with` para criar cópias com campos alterados. Prefira retornar novo estado a alterar o objeto recebido: o chamador não deve ter seu estado alterado silenciosamente.

<details>
<summary>❌ Ruim: alteração acoplada e efeito colateral oculto</summary>

```csharp
public void ApplyDiscount(Order order)
{
    order.Discount = 10; // altera o objeto do chamador
    order.Total -= 10;   // efeito colateral invisível
}
```

</details>

<details>
<summary>✅ Bom: retorna novo estado, sem efeitos colaterais</summary>

```csharp
public Order ApplyDiscount(Order order)
{
    var discountedOrder = order with { Discount = 10, Total = order.Total - 10 };
    return discountedOrder;
}
```

</details>
