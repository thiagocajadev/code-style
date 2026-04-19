# Control Flow

Controle de fluxo evolui com a complexidade. A ferramenta certa depende de quantas condições
existem, se mapeiam valores ou executam ações, e se o fluxo pode precisar de saída antecipada.

## If e else

O ponto de partida. Para dois caminhos, `if/else` funciona — mas o `else` após um `return` é ruído
estrutural: o compilador já descartou o branch anterior.

<details>
<summary>❌ Bad — else desnecessário após return</summary>

```csharp
public decimal GetDiscount(string customerType)
{
    if (customerType == "VIP")
        return 0.20m;
    else if (customerType == "PREMIUM")
        return 0.10m;
    else
        return 0.0m;
}
```

</details>

<details>
<summary>✅ Good — early return elimina o else</summary>

```csharp
public decimal GetDiscount(string customerType)
{
    if (customerType == "VIP") return 0.20m;
    if (customerType == "PREMIUM") return 0.10m;
    return 0.0m;
}
```

</details>

## Aninhamento em cascata

Quando as condições crescem e se aninham, o fluxo vira uma pirâmide — o _arrow antipattern_. Guard
clauses invertem: valide as saídas no topo e deixe o fluxo principal limpo.

<details>
<summary>❌ Bad — lógica enterrada em múltiplos níveis</summary>

```csharp
public async Task<Result<Invoice>> CheckoutAsync(CartRequest request, CancellationToken ct)
{
    if (request is not null)
    {
        if (request.Items.Count > 0)
        {
            var user = await _users.FindByIdAsync(request.UserId, ct);
            if (user is not null)
            {
                if (user.IsActive)
                {
                    var invoice = await BuildInvoiceAsync(request, user, ct);
                    return Result<Invoice>.Success(invoice);
                }
            }
        }
    }

    return Result<Invoice>.Fail("Checkout failed.", "INVALID_INPUT");
}
```

</details>

<details>
<summary>✅ Good — guard clauses no topo, fluxo principal livre</summary>

```csharp
public async Task<Result<Invoice>> CheckoutAsync(CartRequest request, CancellationToken ct)
{
    if (request is null || request.Items.Count == 0)
        return Result<Invoice>.Fail("Cart is empty.", "INVALID_INPUT");

    var user = await _users.FindByIdAsync(request.UserId, ct);
    if (user is null)
        return Result<Invoice>.Fail("User not found.", "NOT_FOUND");

    if (!user.IsActive)
        return Result<Invoice>.Fail("User is inactive.", "UNAUTHORIZED");

    var invoice = await BuildInvoiceAsync(request, user, ct);
    return Result<Invoice>.Success(invoice);
}
```

</details>

## Pattern matching

Guard clauses resolvem pré-condições simples. Quando a condição envolve verificação de tipo, `is`
extrai e verifica em uma única expressão — sem cast manual, com escopo garantido pelo compilador.

<details>
<summary>❌ Bad — cast manual após verificação de tipo</summary>

```csharp
public string SummarizePayment(object payment)
{
    if (payment is CreditCardPayment)
    {
        var creditCard = (CreditCardPayment)payment;
        return $"Cartão {creditCard.Brand} •••• {creditCard.LastFour}";
    }

    if (payment is PixPayment)
    {
        var pix = (PixPayment)payment;
        return $"Pix — chave {pix.KeyType}";
    }

    return "Pagamento desconhecido";
}
```

</details>

<details>
<summary>✅ Good — pattern matching extrai e verifica em uma expressão</summary>

```csharp
public string SummarizePayment(object payment)
{
    if (payment is CreditCardPayment creditCard)
    {
        var summary = $"Cartão {creditCard.Brand} •••• {creditCard.LastFour}";
        return summary;
    }

    if (payment is PixPayment pix)
    {
        var summary = $"Pix — chave {pix.KeyType}";
        return summary;
    }

    return "Pagamento desconhecido";
}
```

</details>

## Switch expression

Quando múltiplos `if/else` mapeiam uma entrada para um valor, `switch` expression substitui com
clareza declarativa. Cada arm retorna um valor e o compilador exige exaustividade — sem `default`
esquecido, sem caso não tratado.

<details>
<summary>❌ Bad — if/else encadeado para mapeamento de valor</summary>

```csharp
public string GetStatusLabel(string status)
{
    if (status == "PENDING") return "Aguardando";
    else if (status == "APPROVED") return "Aprovado";
    else if (status == "CANCELLED") return "Cancelado";
    else return "Desconhecido";
}
```

</details>

<details>
<summary>✅ Good — switch expression declarativo e exaustivo</summary>

```csharp
public string GetStatusLabel(string status)
{
    var label = status switch
    {
        "PENDING" => "Aguardando",
        "APPROVED" => "Aprovado",
        "CANCELLED" => "Cancelado",
        _ => "Desconhecido",
    };
    return label;
}
```

</details>

<details>
<summary>✅ Good — switch expression com pattern matching em Result</summary>

```csharp
public IResult MapResult(Result<Order> result)
{
    var response = result switch
    {
        { IsSuccess: true, Value: var order } => Results.Ok(order),
        { Error.Code: "NOT_FOUND" } => Results.NotFound(),
        { Error.Code: "UNAUTHORIZED" } => Results.Unauthorized(),
        _ => Results.Problem(),
    };
    return response;
}
```

</details>

## Switch statement

Switch expression resolve mapeamento de valores. Quando cada caso precisa executar múltiplas ações —
não retornar um valor, mas fazer algo — `switch` statement torna a intenção mais clara que um
`if/else` encadeado. Cada `case` termina com `break` explícito: fall-through acidental é bug
silencioso.

<details>
<summary>❌ Bad — if/else encadeado para despacho de ações</summary>

```csharp
public void ProcessOrderEvent(OrderEvent orderEvent)
{
    if (orderEvent.Type == "order_confirmed")
    {
        SendConfirmationEmail(orderEvent.OrderId);
        UpdateInventory(orderEvent.OrderId);
    }
    else if (orderEvent.Type == "order_shipped")
    {
        SendShippingNotification(orderEvent.OrderId);
        UpdateTrackingStatus(orderEvent.OrderId);
    }
    else if (orderEvent.Type == "order_delivered")
    {
        SendDeliveryConfirmation(orderEvent.OrderId);
        CloseOrder(orderEvent.OrderId);
    }
}
```

</details>

<details>
<summary>✅ Good — switch statement para despacho de comportamento</summary>

```csharp
public void ProcessOrderEvent(OrderEvent orderEvent)
{
    switch (orderEvent.Type)
    {
        case "order_confirmed":
            SendConfirmationEmail(orderEvent.OrderId);
            UpdateInventory(orderEvent.OrderId);
            break;

        case "order_shipped":
            SendShippingNotification(orderEvent.OrderId);
            UpdateTrackingStatus(orderEvent.OrderId);
            break;

        case "order_delivered":
            SendDeliveryConfirmation(orderEvent.OrderId);
            CloseOrder(orderEvent.OrderId);
            break;
    }
}
```

</details>

## Dictionary

Switch expression e switch statement resolvem casos estáticos conhecidos em tempo de compilação.
Quando os dados são dinâmicos — carregados de config, banco ou fonte externa —
`Dictionary<TKey, TValue>` é a estrutura certa.

<details>
<summary>❌ Bad — lógica hardcoded para dados que vêm de fonte externa</summary>

```csharp
public string GetCurrencyCode(string region)
{
    if (region == "BR") return "BRL";
    if (region == "US") return "USD";
    if (region == "EU") return "EUR";
    return "USD";
}
```

</details>

<details>
<summary>✅ Good — Dictionary para lookup dinâmico</summary>

```csharp
private readonly Dictionary<string, string> _currencyByRegion = new()
{
    ["BR"] = "BRL",
    ["US"] = "USD",
    ["EU"] = "EUR",
};

public string GetCurrencyCode(string region)
{
    var currencyCode = _currencyByRegion.GetValueOrDefault(region, "USD");
    return currencyCode;
}
```

</details>

---

_As ferramentas acima resolvem **decisão** — qual caminho seguir. As abaixo resolvem **iteração** —
quantas vezes percorrer._

## foreach

Para iterar sobre uma coleção executando ações por item, `foreach` é direto — sem índice, sem
variável de controle, com suporte nativo a `break` e `continue`.

<details>
<summary>❌ Bad — for com índice quando o índice nunca é usado</summary>

```csharp
for (int i = 0; i < orders.Count; i++)
{
    NotifyCustomer(orders[i]);
}
```

</details>

<details>
<summary>✅ Good — foreach para iteração sobre valores</summary>

```csharp
foreach (var order in orders)
{
    NotifyCustomer(order);
}
```

</details>

## Circuit break

Quando o objetivo é encontrar, verificar ou validar elementos de uma coleção, percorrer tudo é
desperdício. `foreach` com `return` antecipado sai no primeiro match. Para casos declarativos, os
métodos LINQ fazem circuit break internamente — param no primeiro resultado relevante.

<details>
<summary>❌ Bad — percorre tudo mesmo após encontrar o resultado</summary>

```csharp
public Order? FindFirstExpiredOrder(IEnumerable<Order> orders)
{
    Order? expiredOrder = null;

    foreach (var order in orders)
    {
        if (expiredOrder is null && order.IsExpired)
            expiredOrder = order; // continua iterando mesmo após encontrar
    }

    return expiredOrder;
}
```

</details>

<details>
<summary>✅ Good — foreach com return antecipado</summary>

```csharp
public Order? FindFirstExpiredOrder(IEnumerable<Order> orders)
{
    foreach (var order in orders)
    {
        if (order.IsExpired) return order;
    }

    return null;
}
```

</details>

<details>
<summary>✅ Good — LINQ declarativo com circuit break nativo</summary>

```csharp
// para no primeiro match
var expiredOrder = orders.FirstOrDefault(order => order.IsExpired);

// para no primeiro true
var hasExpiredOrders = orders.Any(order => order.IsExpired);

// para no primeiro false
var allOrdersActive = orders.All(order => order.IsActive);
```

</details>

## while

Quando não há coleção pré-definida e o critério de parada é uma condição — não um índice ou tamanho
— `while` é a escolha natural. Use `do...while` quando a primeira iteração deve sempre executar,
independente da condição.

<details>
<summary>❌ Bad — for simulando condição de parada por estado</summary>

```csharp
for (int attempt = 0; attempt < maxAttempts; attempt++)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break; // o índice não representa nada aqui
}
```

</details>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>

```csharp
var attempt = 0;

while (attempt < maxAttempts)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break;
    attempt++;
}
```

</details>

<details>
<summary>✅ Good — do...while quando a primeira execução é garantida</summary>

```csharp
// drena a fila — processa pelo menos um item antes de verificar
do
{
    var task = taskQueue.Dequeue();
    ExecuteTask(task);
} while (taskQueue.Count > 0);
```

</details>
