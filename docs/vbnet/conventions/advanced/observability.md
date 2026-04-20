# Observability

> Escopo: VB.NET. Visão transversal: [shared/observability.md](../../../shared/observability.md).

Logging estruturado, níveis corretos, proteção de dados sensíveis e rastreamento por requisição.
Veja os princípios agnósticos em [shared/observability.md](../../../../shared/observability.md).

Os exemplos usam [NLog](https://nlog-project.org/) — amplamente adotado no ecossistema .NET Framework.

## Logging estruturado

Concatenação de string em logs destrói a estrutura: o valor vira texto, não campo. Message templates do NLog preservam cada argumento como propriedade estruturada no sink (arquivo, banco, Seq, etc.).

<details>
<summary>❌ Bad — concatenação destrói campos, perde stack trace</summary>
<br>

```vbnet
_logger.Info("Order " & order.Id.ToString() & " processed by " & user.Id.ToString() & " — total: " & order.Total.ToString())
_logger.Error("Payment failed: " & ex.Message & " for order " & order.Id.ToString())
```

</details>

<br>

<details>
<summary>✅ Good — message templates: cada argumento vira campo estruturado</summary>
<br>

```vbnet
_logger.Info("Order {OrderId} processed by {UserId}, total {Total}",
    order.Id, user.Id, order.Total)

_logger.Error(ex, "Payment failed for {OrderId}", order.Id)
```

</details>

## Níveis de log

<details>
<summary>❌ Bad — Info para tudo, sem distinção de severidade</summary>
<br>

```vbnet
_logger.Info("Checkout started")
_logger.Info("Query took {Duration}ms", durationMs)
_logger.Info("User {UserId} not found", userId)
```

</details>

<br>

<details>
<summary>✅ Good — nível correto por situação</summary>
<br>

```vbnet
_logger.Debug("Checkout handler invoked for {CartId}", cartId)

_logger.Warn("Slow query: {Duration}ms on {Query}", durationMs, queryName)

_logger.Error("User {UserId} not found during checkout", userId)
```

| Nível | Quando usar |
| --- | --- |
| `Trace` | Diagnóstico detalhado, só em dev |
| `Debug` | Fluxo interno, entrada em handlers |
| `Info` | Eventos de negócio relevantes (pedido criado, pagamento aprovado) |
| `Warn` | Situação inesperada mas recuperável (lentidão, retry) |
| `Error` | Falha que impede a operação, mas a aplicação continua |
| `Fatal` | Falha irrecuperável, processo vai encerrar |

</details>

## O que nunca logar

<details>
<summary>❌ Bad — PII e credenciais em log</summary>
<br>

```vbnet
_logger.Info("Login: {Email} {Password}", user.Email, user.Password)
_logger.Info("Payment: {CardNumber} {Cvv}", payment.CardNumber, payment.Cvv)
_logger.Info("Token issued: {Token}", token)
```

</details>

<br>

<details>
<summary>✅ Good — IDs e referências, nunca dados sensíveis</summary>
<br>

```vbnet
_logger.Info("User {UserId} authenticated", user.Id)

_logger.Info("Payment {PaymentId} initiated, last4 {Last4}", payment.Id, payment.LastFour)

_logger.Info("Token issued for {UserId}", user.Id)
```

</details>

## Correlation ID

Sem um identificador comum, logs de uma mesma requisição são ilhas: rastrear o fluxo se torna inviável. Um `ActionFilterAttribute` ou `HttpModule` injeta o `CorrelationId` no `MappedDiagnosticsContext` (MDC) do NLog, enriquecendo todos os logs da requisição automaticamente.

<details>
<summary>❌ Bad — logs sem contexto de requisição</summary>
<br>

```vbnet
Public Async Function ProcessCheckoutAsync(request As CheckoutRequest) As Task(Of Invoice)
    _logger.Info("Processing checkout")
    Dim invoice = Await BuildInvoiceAsync(request)
    _logger.Info("Checkout complete")
    Return invoice
End Function
' {"msg":"Processing checkout"} — impossível saber qual request originou
```

</details>

<br>

<details>
<summary>✅ Good — CorrelationId no MDC enriquece todos os logs da request</summary>
<br>

```vbnet
' Infrastructure/Filters/CorrelationIdFilter.vb
Public Class CorrelationIdFilter
    Inherits ActionFilterAttribute

    Public Overrides Sub OnActionExecuting(context As HttpActionContext)
        Dim correlationId = String.Empty
        Dim header As IEnumerable(Of String) = Nothing

        If context.Request.Headers.TryGetValues("X-Correlation-Id", header) Then
            correlationId = header.FirstOrDefault()
        End If

        If String.IsNullOrEmpty(correlationId) Then
            correlationId = Guid.NewGuid().ToString()
        End If

        context.Request.Properties("CorrelationId") = correlationId
        context.Response = context.Response  ' resposta pode adicionar o header depois

        MappedDiagnosticsContext.Set("CorrelationId", correlationId)
    End Sub

    Public Overrides Sub OnActionExecuted(context As HttpActionExecutedContext)
        MappedDiagnosticsContext.Remove("CorrelationId")
    End Sub
End Class
```

```xml
<!-- NLog.config — inclui CorrelationId em todos os logs -->
<target name="file" xsi:type="File" fileName="logs/app.log"
        layout="${longdate} [${mdc:item=CorrelationId}] ${level:uppercase=true} ${logger} ${message} ${exception:format=tostring}" />
```

```vbnet
' handler — CorrelationId incluído automaticamente em todos os logs da request
Public Async Function ProcessCheckoutAsync(request As CheckoutRequest) As Task(Of Invoice)
    _logger.Info("Checkout started for {CartId}", request.CartId)

    Dim invoice = Await BuildInvoiceAsync(request)

    _logger.Info("Checkout complete, invoice {InvoiceId}", invoice.Id)
    Return invoice
End Function
' {"CorrelationId":"abc-123","CartId":"...","msg":"Checkout started for ..."}
```

</details>

## Configuração do NLog

<details>
<summary>✅ Good — NLog.config mínimo para Web API 2</summary>
<br>

```xml
<!-- NLog.config -->
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      autoReload="true"
      internalLogLevel="Warn"
      internalLogFile="logs/nlog-internal.log">

  <targets>
    <target name="file"
            xsi:type="File"
            fileName="logs/app-${shortdate}.log"
            archiveEvery="Day"
            maxArchiveFiles="30"
            layout="${longdate} [${mdc:item=CorrelationId}] ${level:uppercase=true:padding=5} ${logger:shortName=true} — ${message} ${exception:format=tostring}" />

    <target name="console"
            xsi:type="Console"
            layout="${time} ${level:uppercase=true:padding=5} ${logger:shortName=true} — ${message}" />
  </targets>

  <rules>
    <logger name="*" minlevel="Debug" writeTo="file" />
    <logger name="*" minlevel="Info" writeTo="console" />
  </rules>
</nlog>
```

```vbnet
' Global.asax.vb — instancia o logger na raiz do domínio
Public Class MvcApplication
    Inherits System.Web.HttpApplication

    Protected Sub Application_Start()
        LogManager.LoadConfiguration(Server.MapPath("~/NLog.config"))
        ' ...
    End Sub
End Class
```

</details>
