# Variables

## `var` e tipo explícito

`var` é adequado quando o tipo é óbvio pelo lado direito. Quando a leitura exige rastrear o tipo mentalmente, declare explicitamente: o leitor não deve precisar inferir.

<details>
<summary>❌ Bad — tipo obscuro</summary>
<br>

```csharp
var result = ProcessOrder(request); // Order? InvoiceResult? ViewModel? impossível saber
var discount = Calculate(order);    // decimal? int? percentual ou valor absoluto?
```

</details>

<br>

<details>
<summary>✅ Good — tipo legível; `var` apenas onde óbvio</summary>
<br>

```csharp
Order order = ProcessOrder(request);
decimal discount = Calculate(order);

var items = new List<OrderItem>(); // tipo explícito no lado direito
```

</details>

## `const` e `readonly`

`const` é resolvido em tempo de compilação: apenas para primitivos e strings. `readonly` é imutável após o construtor, para valores determinados em runtime. Campos mutáveis onde só leitura é necessária são um contrato fraco.

<details>
<summary>❌ Bad — campo mutável onde deveria ser imutável</summary>
<br>

```csharp
public class OrderService
{
    private static int maxRetries = 3; // mutável — qualquer método pode alterar
    private string _apiUrl;             // reatribuível após o construtor

    public OrderService(IConfiguration config)
    {
        _apiUrl = config["ApiUrl"];
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — imutabilidade declarada explicitamente</summary>
<br>

```csharp
public class OrderService(IConfiguration config)
{
    private const int MaxRetries = 3;
    private readonly string _apiUrl = config["ApiUrl"];
}
```

</details>

## Records imutáveis

`record` expressa um contrato de dados imutável sem cerimônia. Prefira `record` sobre `class` para DTOs, requests, responses e value objects: a semântica de igualdade por valor vem de graça.

<details>
<summary>❌ Bad — class mutável como contrato de dados</summary>
<br>

```csharp
public class OrderRequest
{
    public string ProductId { get; set; } // setter público — qualquer código pode mutar
    public int Quantity { get; set; }     // estado mutável sem controle
}
```

</details>

<br>

<details>
<summary>✅ Good — record imutável, contrato explícito</summary>
<br>

```csharp
public record OrderRequest(string ProductId, int Quantity);
```

</details>

## Sem valores mágicos

Literais embutidos escondem intenção. `const` nomeado documenta o significado: o nome é a documentação.

<details>
<summary>❌ Bad — literais sem significado</summary>
<br>

```csharp
if (order.Status == 2)    // o que é 2?
    return;

if (discount > 0.15m)    // limite de desconto? taxa? de onde vem esse número?
    return;
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas</summary>
<br>

```csharp
private const int OrderStatusApproved = 2;
private const decimal MaxDiscountRate = 0.15m;

if (order.Status == OrderStatusApproved)
    return;

if (discount > MaxDiscountRate)
    return;
```

</details>

## Mutação direta

`record` suporta `with` para criar cópias com campos alterados. Prefira retornar novo estado a mutar o objeto recebido: o chamador não deve ter seu estado alterado silenciosamente.

<details>
<summary>❌ Bad — mutação acoplada e efeito colateral oculto</summary>
<br>

```csharp
public void ApplyDiscount(Order order)
{
    order.Discount = 10; // altera o objeto do chamador
    order.Total -= 10;   // efeito colateral invisível
}
```

</details>

<br>

<details>
<summary>✅ Good — retorna novo estado, sem efeitos colaterais</summary>
<br>

```csharp
public Order ApplyDiscount(Order order)
{
    var discountedOrder = order with { Discount = 10, Total = order.Total - 10 };

    return discountedOrder;
}
```

</details>
