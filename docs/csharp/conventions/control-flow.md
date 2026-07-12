# Controle de fluxo em C#

A estrutura certa depende de três perguntas: quantas condições existem, se elas escolhem um valor ou disparam uma ação, e se o método pode sair antes do fim. **Guard clauses** (cláusulas de proteção) tratam o caso inválido no topo e devolvem o fluxo principal sem aninhamento. O **pattern matching** (correspondência de padrões) do C# moderno troca cadeias longas de `if/else` por um `switch` que o compilador consegue conferir.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de proteção) | `if` no topo do método que retorna cedo em caso inválido; reduz aninhamento |
| **early return** (retorno antecipado) | Sair do método assim que o resultado for conhecido, sem `else` desnecessário |
| **ternary** (ternário) | `cond ? a : b`; expressão condicional curta; legível só quando as três partes são curtas |
| **switch expression** (expressão switch) | Forma de C# 8+ que devolve valor: `x switch { 1 => "a", _ => "b" }` |
| **pattern matching** (correspondência de padrões) | Recurso do C# moderno para casar tipo, propriedade, tupla; usado em `is` e `switch` |
| **null-conditional** (acesso seguro a nulo, `?.`) | Operador que evita `NullReferenceException` ao acessar membro de null |
| **null-coalescing** (coalescência de ausente, `??`) | Operador que devolve o lado direito quando o esquerdo é null |

<a id="if-and-else"></a>

## Retornar cedo dispensa o else

Depois de um `return`, o `else` não decide mais nada: se o programa chegou à linha seguinte, é porque a condição anterior era falsa. Escrever o `else` mesmo assim só acrescenta um nível de indentação a cada caso.

<details>
<summary>❌ Ruim: else desnecessário após return</summary>

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
<summary>✅ Bom: early return elimina o else</summary>

```csharp
public decimal GetDiscount(string customerType)
{
    if (customerType == "VIP") return 0.20m;
    if (customerType == "PREMIUM") return 0.10m;

    return 0.0m;
}
```

</details>

<a id="ternary"></a>

## Ternário para dois valores em uma linha

O ternário (`cond ? a : b`) cabe quando existem dois resultados possíveis e os três pedaços da expressão são curtos. A partir de três alternativas, use `switch` expression. Ternário dentro de ternário obriga o leitor a contar `?` e `:` para descobrir qual condição pertence a qual resultado.

<details>
<summary>❌ Ruim: if/else imperativo para atribuição simples</summary>

```csharp
string label;
if (order.IsSettled)
    label = "Settled";
else
    label = "Pending";
```

</details>

<details>
<summary>✅ Bom: ternário na atribuição</summary>

```csharp
var label = order.IsSettled ? "Settled" : "Pending";
```

</details>

<details>
<summary>❌ Ruim: ternário aninhado para 3+ alternativas</summary>

```csharp
var priority = isUrgent ? isCritical ? "Critical" : "High" : "Normal";
```

</details>

<details>
<summary>✅ Bom: switch expression para 3+ alternativas</summary>

```csharp
var priority = (isUrgent, isCritical) switch
{
    (true, true)  => "Critical",
    (true, false) => "High",
    _             => "Normal",
};
```

</details>

<a id="cascading-nesting"></a>

## Guard clause no topo achata o aninhamento

Quando cada validação abre um `if` novo dentro do anterior, o código útil vai parar no fundo de uma pirâmide de chaves, e a condição que levou até lá fica cinco linhas acima. Inverta: valide o caso inválido primeiro e saia do método. O que sobra depois das guardas é o caminho feliz, sem indentação e sem `else`.

<details>
<summary>❌ Ruim: lógica enterrada em múltiplos níveis</summary>

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
<summary>✅ Bom: guard clauses no topo, fluxo principal livre</summary>

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

<a id="pattern-matching"></a>

## Pattern matching testa o tipo e já entrega a variável

`if (payment is CreditCardPayment creditCard)` faz duas coisas de uma vez: confere o tipo e declara `creditCard` já convertido, válido dentro do bloco. O compilador garante que a variável só existe onde o teste passou. A alternativa antiga, testar com `is` e depois converter na mão com `(CreditCardPayment)payment`, escreve o nome do tipo duas vezes e deixa a conversão longe da checagem.

<details>
<summary>❌ Ruim: cast manual após verificação de tipo</summary>

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
        return $"Pix: chave {pix.KeyType}";
    }

    return "Pagamento desconhecido";
}
```

</details>

<details>
<summary>✅ Bom: pattern matching extrai e verifica em uma expressão</summary>

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
        var summary = $"Pix: chave {pix.KeyType}";
        return summary;
    }

    return "Pagamento desconhecido";
}
```

</details>

<a id="switch-expression"></a>

## Switch expression quando a entrada vira um valor

Uma cadeia de `if/else` que só escolhe qual valor atribuir cabe melhor num `switch` expression. Cada braço mapeia uma entrada a um resultado, e o compilador cobra o caso `_` que cobre o resto: um valor de entrada sem tratamento vira erro de compilação em vez de retorno silencioso. O segundo exemplo mostra o mesmo recurso lendo propriedades de dentro do objeto (`{ Error.Code: "NOT_FOUND" }`) para traduzir um `Result` em resposta HTTP.

<details>
<summary>❌ Ruim: if/else encadeado para mapeamento de valor</summary>

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
<summary>✅ Bom: switch expression declarativo e exaustivo</summary>

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
<summary>❌ Ruim: if/else encadeado para mapear Result em resposta HTTP</summary>

```csharp
public IResult MapResult(Result<Order> result)
{
    if (result.IsSuccess)
        return Results.Ok(result.Value!);
    else if (result.Error.Code == "NOT_FOUND")
        return Results.NotFound();
    else if (result.Error.Code == "UNAUTHORIZED")
        return Results.Unauthorized();
    else
        return Results.Problem();
}
```

</details>

<details>
<summary>✅ Bom: switch expression com pattern matching em Result</summary>

```csharp
public IResult MapResult(Result<Order> result)
{
    var response = result switch
    {
        { IsSuccess: true, Value: var order } => TypedResults.Ok(order),
        { Error.Code: "NOT_FOUND" } => TypedResults.NotFound(),
        { Error.Code: "UNAUTHORIZED" } => TypedResults.Unauthorized(),
        _ => Results.Problem(),
    };

    return response;
}
```

</details>

<a id="switch-statement"></a>

## Switch statement quando cada caso executa ações

O `switch` expression devolve um valor. Quando o caso precisa disparar várias chamadas, como mandar e-mail e atualizar estoque, use o `switch` statement. Feche cada `case` com `break` explícito: sem ele, o C# passa a execução para o caso seguinte, e esse **fall-through** (execução que escorre para o próximo caso) é um bug que roda sem reclamar.

<details>
<summary>❌ Ruim: if/else encadeado para despacho de ações</summary>

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
<summary>✅ Bom: switch statement para despacho de comportamento</summary>

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

<a id="dictionary"></a>

## Dictionary quando as opções vêm de fora do código

`switch` serve para o conjunto de casos que já se conhece ao escrever o programa. Quando as opções chegam de um arquivo de configuração, do banco ou de uma API, elas mudam sem recompilação, e um `Dictionary<TKey, TValue>` é a estrutura que aceita essa mudança. `GetValueOrDefault` ainda resolve a chave ausente na mesma linha da busca.

<details>
<summary>❌ Ruim: lógica hardcoded para dados que vêm de fonte externa</summary>

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
<summary>✅ Bom: Dictionary para lookup dinâmico</summary>

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

_As estruturas acima escolhem um caminho entre vários. As de baixo repetem um trecho de código sobre uma coleção._

<a id="circuit-break"></a>

## Parar de percorrer assim que encontrar

Antes de escrever o loop, veja se `FirstOrDefault`, `Any` ou `All` já resolve. Esses métodos **LINQ** (Language Integrated Query · consulta integrada à linguagem) param no primeiro item que decide a resposta e ignoram o resto da coleção. Um `foreach` que guarda o achado numa variável e continua rodando até o fim faz trabalho que ninguém vai usar, e numa lista grande esse trabalho aparece no tempo de resposta.

<details>
<summary>❌ Ruim: percorre tudo mesmo após encontrar o resultado</summary>

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
<summary>✅ Bom: foreach com return antecipado</summary>

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
<summary>❌ Ruim: percorre tudo com flag booleana para verificar existência</summary>

```csharp
public bool HasExpiredOrders(IEnumerable<Order> orders)
{
    bool hasExpired = false;

    foreach (var order in orders)
    {
        if (order.IsExpired)
            hasExpired = true; // continua iterando mesmo após encontrar
    }

    return hasExpired;
}
```

</details>

<details>
<summary>✅ Bom: LINQ declarativo com circuit break nativo</summary>

```csharp
// para no primeiro match
var expiredOrder = orders.FirstOrDefault(order => order.IsExpired);

// para no primeiro true
var hasExpiredOrders = orders.Any(order => order.IsExpired);

// para no primeiro false
var allOrdersActive = orders.All(order => order.IsActive);
```

</details>

<a id="foreach"></a>

## foreach para percorrer a coleção inteira

`foreach` percorre os itens sem pedir índice, sem variável de controle e sem risco de errar o limite do último elemento. Ele aceita `break` e `continue` normalmente. Reserve o `for` com índice para quando a posição do item importa de verdade, como percorrer de trás para frente ou saltar de dois em dois.

<details>
<summary>❌ Ruim: for com índice quando o índice nunca é usado</summary>

```csharp
for (int i = 0; i < orders.Count; i++)
{
    NotifyCustomer(orders[i]);
}
```

</details>

<details>
<summary>✅ Bom: foreach para iteração sobre valores</summary>

```csharp
foreach (var order in orders)
{
    NotifyCustomer(order);
}
```

</details>

<a id="while"></a>

## while quando a parada depende de uma condição

Use `while` quando não existe uma coleção para percorrer e a repetição continua enquanto um estado for verdadeiro: a conexão ainda não subiu, a fila ainda tem item. Nesses casos o `for` com contador finge ter um índice que ninguém usa. Use `do...while` quando a primeira execução acontece sempre e a condição só decide se haverá uma segunda.

<details>
<summary>❌ Ruim: for simulando condição de parada por estado</summary>

```csharp
for (int attempt = 0; attempt < maxAttempts; attempt++)
{
    var connection = ConnectToDatabase();
    if (connection.IsReady) break; // o índice não representa nada aqui
}
```

</details>

<details>
<summary>✅ Bom: while para condição de parada por estado</summary>

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
<summary>❌ Ruim: while com verificação duplicada antes do loop</summary>

```csharp
// verifica a condição antes de entrar, mas a primeira iteração é sempre necessária
if (taskQueue.Count > 0)
{
    while (taskQueue.Count > 0)
    {
        var task = taskQueue.Dequeue();
        ExecuteTask(task);
    }
}
```

</details>

<details>
<summary>✅ Bom: do...while quando a primeira execução é garantida</summary>

```csharp
// drena a fila: processa pelo menos um item antes de verificar
do
{
    var task = taskQueue.Dequeue();
    ExecuteTask(task);
} while (taskQueue.Count > 0);
```

</details>
