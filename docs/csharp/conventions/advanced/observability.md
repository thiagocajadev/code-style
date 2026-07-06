# Observability

> Escopo: C#. Visão transversal: [shared/standards/observability.md](../../../shared/standards/observability.md).

Logging estruturado, níveis corretos, proteção de dados sensíveis e rastreamento por requisição.
**ILogger** preserva campos como propriedades; **message template** evita interpolação. **PII** nunca pode aparecer em logs.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ILogger** (interface de logging do .NET) | Abstração de logging do `Microsoft.Extensions.Logging`; sinks (Serilog, Application Insights) consomem os campos estruturados |
| **structured logging** (logging estruturado) | Cada argumento vira propriedade indexável no sink, não texto formatado |
| **message template** (template de mensagem) | String com placeholders nomeados (`{OrderId}`) que preservam a estrutura |
| **log level** (nível de severidade) | `Trace`/`Debug`/`Information`/`Warning`/`Error`/`Critical`; controla volume e roteamento |
| **scope** (escopo de log) | `BeginScope` adiciona campos a todos os logs dentro do bloco; correlaciona requisição e operação |
| **correlation ID** (identificador de correlação) | ID único por requisição que conecta logs entre serviços |
| **PII** (Personally Identifiable Information, Informação de Identificação Pessoal) | Dados que identificam pessoa: nunca em logs sem mascaramento |
| **Activity** (atividade de tracing) | API do .NET para distributed tracing (OpenTelemetry); cobre spans e propagação de contexto |

## Logging estruturado

Interpolação de string em `ILogger` destrói a estrutura: o valor vira texto, não campo. Message
templates preservam cada argumento como propriedade estruturada no sink (Serilog, Application
Insights, etc.).

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

## Níveis de log

O nível comunica severidade e roteia alertas: `Debug` para diagnóstico local, `Warning` para
anomalia tolerada, `Error` para falha que exige ação. Logar tudo como `Information` esconde o que
importa.

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

## O que nunca logar

Credenciais, tokens e PII ficam fora do log. Registre IDs e referências: eles permitem rastrear a
operação sem expor o dado.

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

## Correlation ID

Sem um identificador comum, logs de uma mesma requisição são ilhas: rastrear o fluxo se torna inviável.
Um **middleware** (componente de pipeline) injeta o `correlationId` no `LogContext` do Serilog, enriquecendo todos os logs da
requisição automaticamente.

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
