# Observabilidade em C#

> Escopo: C#. Visão transversal: [shared/standards/observability.md](../../../shared/standards/observability.md).

Um **log** (registro de evento) serve para responder perguntas depois que o problema já aconteceu. Para isso ele precisa de quatro coisas: guardar os valores como campos consultáveis, usar o nível de severidade certo, deixar de fora o dado sensível e trazer um identificador que ligue as linhas de uma mesma requisição. O **ILogger** do .NET guarda cada argumento como propriedade separada quando você usa **message template** (mensagem com marcadores nomeados). **PII** (Personally Identifiable Information · Informação de Identificação Pessoal) fica fora do log em qualquer situação.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **log** (registro de evento) | Linha que a aplicação grava a cada acontecimento relevante, como o diário de bordo do sistema: é o que resta para investigar depois que o problema já passou |
| **ILogger** (interface de logging do .NET) | Abstração de logging do `Microsoft.Extensions.Logging`; sinks (Serilog, Application Insights) consomem os campos estruturados |
| **structured logging** (logging estruturado) | Cada argumento vira propriedade indexável no sink, não texto formatado |
| **message template** (template de mensagem) | String com placeholders nomeados (`{OrderId}`) que preservam a estrutura |
| **log level** (nível de severidade) | `Trace`/`Debug`/`Information`/`Warning`/`Error`/`Critical`; controla volume e roteamento |
| **scope** (escopo de log) | `BeginScope` adiciona campos a todos os logs dentro do bloco; correlaciona requisição e operação |
| **correlation ID** (identificador de correlação) | ID único por requisição que conecta logs entre serviços |
| **PII** (Personally Identifiable Information · Informação de Identificação Pessoal) | Dados que identificam pessoa: nunca em logs sem mascaramento |
| **Activity** (atividade de tracing) | API do .NET para distributed tracing (OpenTelemetry); cobre spans e propagação de contexto |

<a id="structured-logging"></a>

## Logging estruturado

Escreva `"Order {OrderId} processed"` com o valor como argumento, e não `$"Order {order.Id} processed"` com interpolação. Parecem a mesma coisa, e o resultado é diferente: na interpolação, o C# monta o texto antes de o logger ver o valor, e chega ao destino uma frase pronta. Com o marcador nomeado, o `OrderId` chega como campo, e você consegue filtrar por ele no Serilog ou no Application Insights. Buscar um pedido específico deixa de ser busca por trecho de texto.

<details>
<summary>❌ Ruim: interpolação destrói campos, perde stack trace</summary>

```csharp
_logger.LogInformation($"Order {order.Id} processed by {user.Id}: total: {order.Total}");
_logger.LogError($"Payment failed: {ex.Message} for order {order.Id}");
```

</details>

<details>
<summary>✅ Bom: message templates: cada argumento vira campo estruturado</summary>

```csharp
_logger.LogInformation(
    "Order {OrderId} processed by {UserId}, total {Total}",
    order.Id, user.Id, order.Total);

_logger.LogError(ex, "Payment failed for {OrderId}", order.Id);
```

</details>

Repare no segundo caso: a exceção vai como primeiro argumento do `LogError`, e não dentro do texto. É assim que o stack trace chega inteiro ao destino, em vez de virar a string curta de `ex.Message`.

<a id="log-levels"></a>

## Níveis de log

O nível decide quem é acordado de madrugada. `Debug` serve ao diagnóstico durante o desenvolvimento e costuma ficar desligado em produção. `Warning` marca a anomalia que o sistema aguentou, como uma consulta lenta. `Error` marca a falha que precisa de alguém. Registrar tudo como `Information` transforma o log num fluxo constante em que o problema real passa despercebido, e o alerta que deveria disparar não tem por onde.

<details>
<summary>❌ Ruim: LogInformation para tudo, sem distinção de severidade</summary>

```csharp
_logger.LogInformation("Checkout started");
_logger.LogInformation("Query took {Duration}ms", durationMs);
_logger.LogInformation("User {UserId} not found", userId);
```

</details>

<details>
<summary>✅ Bom: nível correto por situação</summary>

```csharp
_logger.LogDebug("Checkout handler invoked for {CartId}", cartId);

_logger.LogWarning("Slow query: {Duration}ms on {Query}", durationMs, queryName);

_logger.LogError("User {UserId} not found during checkout", userId);
```

</details>

<a id="never-log"></a>

## O que nunca logar

Senha, token, número de cartão e dado pessoal ficam fora do log. O log costuma ser copiado para outro sistema, guardado por meses e lido por gente que não tem acesso ao banco, então o que entra ali sai do controle do time. Registre o identificador (`UserId`, `PaymentId`) e os últimos quatro dígitos quando precisar: dá para rastrear a operação inteira sem carregar o dado junto.

<details>
<summary>❌ Ruim: PII e credenciais em log</summary>

```csharp
_logger.LogInformation("Login: {Email} {Password}", user.Email, user.Password);
_logger.LogInformation("Payment: {CardNumber} {Cvv}", payment.CardNumber, payment.Cvv);
_logger.LogInformation("Token issued: {Token}", token);
```

</details>

<details>
<summary>✅ Bom: IDs e referências, nunca dados sensíveis</summary>

```csharp
_logger.LogInformation("User {UserId} authenticated", user.Id);

_logger.LogInformation("Payment {PaymentId} initiated, last4 {Last4}", payment.Id, payment.LastFour);

_logger.LogInformation("Token issued for {UserId}", user.Id);
```

</details>

<a id="correlation-id"></a>

## Identificador de correlação

Sem um identificador comum, as linhas de log de uma mesma requisição ficam soltas no meio das linhas de todas as outras, e reconstruir o que aconteceu com aquele usuário vira adivinhação. O `correlationId` resolve: um **middleware** (função que roda antes do handler) lê o identificador do cabeçalho da requisição, ou usa o que o ASP.NET já gerou, e o coloca no contexto de log. A partir daí todo log daquela requisição sai com o campo, sem ninguém precisar passá-lo adiante método a método.

<details>
<summary>❌ Ruim: logs sem contexto de requisição</summary>

```csharp
public async Task<Invoice> ProcessCheckoutAsync(CheckoutRequest request, CancellationToken ct)
{
    _logger.LogInformation("Processing checkout");
    var invoice = await BuildInvoiceAsync(request, ct);
    _logger.LogInformation("Checkout complete");

    return invoice;
}
// {"msg":"Processing checkout"}: impossível saber qual request originou
```

</details>

<details>
<summary>✅ Bom: correlationId enriquecido via LogContext para toda a request</summary>

```csharp
// Program.cs: middleware que enriquece o contexto de log
app.Use(async (httpContext, next) =>
{
    var correlationId = httpContext.Request.Headers["X-Correlation-Id"].FirstOrDefault()
        ?? httpContext.TraceIdentifier;

    httpContext.Response.Headers["X-Correlation-Id"] = correlationId;

    using (LogContext.PushProperty("CorrelationId", correlationId))
        await next();
});

// handler: CorrelationId incluído automaticamente em todos os logs da request
public async Task<Invoice> ProcessCheckoutAsync(CheckoutRequest request, CancellationToken ct)
{
    _logger.LogInformation("Checkout started for {CartId}", request.CartId);

    var invoice = await BuildInvoiceAsync(request, ct);

    _logger.LogInformation("Checkout complete, invoice {InvoiceId}", invoice.Id);

    return invoice;
}
// {"CorrelationId":"abc-123","CartId":"...","msg":"Checkout started for ..."}
```

</details>

O mesmo identificador devolvido no cabeçalho da resposta fecha o ciclo: o cliente que reclama de um erro manda o `X-Correlation-Id`, e o time acha a requisição dele sem procurar por horário.
