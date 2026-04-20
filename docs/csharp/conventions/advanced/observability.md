# Observability

Logging estruturado, níveis corretos, proteção de dados sensíveis e rastreamento por requisição.
Veja os princípios agnósticos em [shared/observability.md](../../../shared/observability.md).

## Logging estruturado

Interpolação de string em `ILogger` destrói a estrutura: o valor vira texto, não campo. Message
templates preservam cada argumento como propriedade estruturada no sink (Serilog, Application
Insights, etc.).

<details>
<summary>❌ Bad — interpolação destrói campos, perde stack trace</summary>
<br>

```csharp
_logger.LogInformation($"Order {order.Id} processed by {user.Id} — total: {order.Total}");
_logger.LogError($"Payment failed: {ex.Message} for order {order.Id}");
```

</details>

<br>

<details>
<summary>✅ Good — message templates: cada argumento vira campo estruturado</summary>
<br>

```csharp
_logger.LogInformation(
    "Order {OrderId} processed by {UserId}, total {Total}",
    order.Id, user.Id, order.Total);

_logger.LogError(ex, "Payment failed for {OrderId}", order.Id);
```

</details>

## Níveis de log

<details>
<summary>❌ Bad — LogInformation para tudo, sem distinção de severidade</summary>
<br>

```csharp
_logger.LogInformation("Checkout started");
_logger.LogInformation("Query took {Duration}ms", durationMs);
_logger.LogInformation("User {UserId} not found", userId);
```

</details>

<br>

<details>
<summary>✅ Good — nível correto por situação</summary>
<br>

```csharp
_logger.LogDebug("Checkout handler invoked for {CartId}", cartId);

_logger.LogWarning("Slow query: {Duration}ms on {Query}", durationMs, queryName);

_logger.LogError("User {UserId} not found during checkout", userId);
```

</details>

## O que nunca logar

<details>
<summary>❌ Bad — PII e credenciais em log</summary>
<br>

```csharp
_logger.LogInformation("Login: {Email} {Password}", user.Email, user.Password);
_logger.LogInformation("Payment: {CardNumber} {Cvv}", payment.CardNumber, payment.Cvv);
_logger.LogInformation("Token issued: {Token}", token);
```

</details>

<br>

<details>
<summary>✅ Good — IDs e referências, nunca dados sensíveis</summary>
<br>

```csharp
_logger.LogInformation("User {UserId} authenticated", user.Id);

_logger.LogInformation("Payment {PaymentId} initiated, last4 {Last4}", payment.Id, payment.LastFour);

_logger.LogInformation("Token issued for {UserId}", user.Id);
```

</details>

## Correlation ID

Sem um identificador comum, logs de uma mesma requisição são ilhas: rastrear o fluxo se torna inviável.
Um middleware injeta o `correlationId` no `LogContext` do Serilog, enriquecendo todos os logs da
requisição automaticamente.

<details>
<summary>❌ Bad — logs sem contexto de requisição</summary>
<br>

```csharp
public async Task<Invoice> ProcessCheckoutAsync(CheckoutRequest request, CancellationToken ct)
{
    _logger.LogInformation("Processing checkout");
    var invoice = await BuildInvoiceAsync(request, ct);
    _logger.LogInformation("Checkout complete");

    return invoice;
}
// {"msg":"Processing checkout"} — impossível saber qual request originou
```

</details>

<br>

<details>
<summary>✅ Good — correlationId enriquecido via LogContext para toda a request</summary>
<br>

```csharp
// Program.cs — middleware que enriquece o contexto de log
app.Use(async (ctx, next) =>
{
    var correlationId = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
        ?? ctx.TraceIdentifier;

    ctx.Response.Headers["X-Correlation-Id"] = correlationId;

    using (LogContext.PushProperty("CorrelationId", correlationId))
        await next();
});

// handler — CorrelationId incluído automaticamente em todos os logs da request
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
