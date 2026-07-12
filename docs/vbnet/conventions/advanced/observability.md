# Observabilidade em VB.NET

> Escopo: VB.NET. Visão transversal: [shared/standards/observability.md](../../../shared/standards/observability.md).

Observabilidade é a capacidade de responder, olhando os logs, o que aconteceu com uma requisição que deu errado em produção. Isso depende de quatro coisas: o log guardar campos consultáveis, o nível de severidade dizer a verdade, os dados pessoais ficarem de fora e todos os logs de uma mesma requisição carregarem o mesmo identificador. Os exemplos usam o **NLog**, biblioteca de logging mais comum no .NET Framework.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **NLog** (biblioteca de logging do .NET) | Framework de logging usado no .NET Framework; escreve em arquivo, banco e outros destinos |
| **structured logging** (log estruturado) | Cada argumento do log vira um campo que dá para consultar depois |
| **message template** (modelo de mensagem) | Texto com marcadores nomeados, como `{OrderId}`, que preservam o valor como campo |
| **log level** (nível de severidade) | `Trace`, `Debug`, `Info`, `Warn`, `Error` ou `Fatal`; decide o volume e para onde o log vai |
| **MDC** (Mapped Diagnostic Context · Contexto de Diagnóstico Mapeado) | Conjunto de campos guardado por thread; leva o mesmo dado a todos os logs da operação |
| **correlation ID** (identificador de correlação) | Identificador único da requisição; conecta os logs dela, mesmo entre serviços |
| **PII** (Personally Identifiable Information · Informação de Identificação Pessoal) | Dado que identifica uma pessoa; não entra no log |
| **sink** (destino do log) | Para onde o log é escrito: arquivo, banco, Seq, Application Insights |

<a id="structured-logging"></a>

## O log guarda campos, não uma frase pronta

Concatenar os valores dentro do texto entrega ao destino uma frase só. A busca "todos os erros do pedido X" vira uma busca por trecho de texto, que falha quando alguém muda uma palavra da mensagem. Com o modelo de mensagem, `{OrderId}` chega ao destino como um campo com nome e valor, e a consulta filtra por ele. O `Error` também recebe a exceção no primeiro argumento, que é o que preserva o stack trace.

<details>
<summary>❌ Ruim: concatenação destrói campos, perde stack trace</summary>

```vbnet
_logger.Info("Order " & order.Id.ToString() & " processed by " & user.Id.ToString() & ": total: " & order.Total.ToString())
_logger.Error("Payment failed: " & ex.Message & " for order " & order.Id.ToString())
```

</details>

<details>
<summary>✅ Bom: message templates: cada argumento vira campo estruturado</summary>

```vbnet
_logger.Info("Order {OrderId} processed by {UserId}, total {Total}",
    order.Id, user.Id, order.Total)

_logger.Error(ex, "Payment failed for {OrderId}", order.Id)
```

</details>

<a id="log-levels"></a>

## O nível de severidade separa o ruído do incidente

Logar tudo como `Info` iguala a entrada em um handler, uma consulta lenta e um usuário que não foi encontrado. Quem responde a um incidente às três da manhã filtra por `Error` e recebe de volta o fluxo inteiro da aplicação. Cada situação tem seu nível, e a tabela abaixo diz qual.

<details>
<summary>❌ Ruim: Info para tudo, sem distinção de severidade</summary>

```vbnet
_logger.Info("Checkout started")
_logger.Info("Query took {Duration}ms", durationMs)
_logger.Info("User {UserId} not found", userId)
```

</details>

<details>
<summary>✅ Bom: nível correto por situação</summary>

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

<a id="never-log"></a>

## Senha, cartão e token ficam fora do log

O log é escrito em arquivo, copiado para outro sistema e lido por quem opera a aplicação. Tudo o que entra nele passa a existir em todos esses lugares, e apagar depois não desfaz as cópias. Senha, número de cartão, CVV e token de acesso ficam de fora. O que entra é o identificador, que permite achar o registro sem carregar o dado junto.

<details>
<summary>❌ Ruim: PII e credenciais em log</summary>

```vbnet
_logger.Info("Login: {Email} {Password}", user.Email, user.Password)
_logger.Info("Payment: {CardNumber} {Cvv}", payment.CardNumber, payment.Cvv)
_logger.Info("Token issued: {Token}", token)
```

</details>

<details>
<summary>✅ Bom: IDs e referências, nunca dados sensíveis</summary>

```vbnet
_logger.Info("User {UserId} authenticated", user.Id)

_logger.Info("Payment {PaymentId} initiated, last4 {Last4}", payment.Id, payment.LastFour)

_logger.Info("Token issued for {UserId}", user.Id)
```

</details>

<a id="correlation-id"></a>

## O Correlation ID costura os logs de uma requisição

Em produção, dezenas de requisições escrevem no mesmo arquivo ao mesmo tempo. Sem um identificador comum, as cinco linhas de uma requisição ficam intercaladas com as de todas as outras, e não há como saber quais pertencem ao pedido que falhou. Um `ActionFilterAttribute` gera o **correlation ID** no início da requisição e o coloca no **MDC** do NLog, que passa a incluí-lo em cada linha escrita dali em diante, sem que nenhuma chamada de log precise repassá-lo.

<details>
<summary>❌ Ruim: logs sem contexto de requisição</summary>

```vbnet
Public Async Function ProcessCheckoutAsync(request As CheckoutRequest) As Task(Of Invoice)
    _logger.Info("Processing checkout")
    Dim invoice = Await BuildInvoiceAsync(request)
    _logger.Info("Checkout complete")
    Return invoice
End Function
' {"msg":"Processing checkout"}: impossível saber qual request originou
```

</details>

<details>
<summary>✅ Bom: CorrelationId no MDC enriquece todos os logs da request</summary>

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
<!-- NLog.config: inclui CorrelationId em todos os logs -->
<target name="file" xsi:type="File" fileName="logs/app.log"
        layout="${longdate} [${mdc:item=CorrelationId}] ${level:uppercase=true} ${logger} ${message} ${exception:format=tostring}" />
```

```vbnet
' handler: CorrelationId incluído automaticamente em todos os logs da request
Public Async Function ProcessCheckoutAsync(request As CheckoutRequest) As Task(Of Invoice)
    _logger.Info("Checkout started for {CartId}", request.CartId)

    Dim invoice = Await BuildInvoiceAsync(request)

    _logger.Info("Checkout complete, invoice {InvoiceId}", invoice.Id)
    Return invoice
End Function
' {"CorrelationId":"abc-123","CartId":"...","msg":"Checkout started for ..."}
```

</details>

<a id="nlog-config"></a>

## Configuração do NLog

O arquivo abaixo cobre o que um projeto Web API 2 precisa no começo: um arquivo de log por dia, trinta dias de histórico, o `CorrelationId` no início de cada linha e a saída de console para o ambiente de desenvolvimento. O `LoadConfiguration` roda uma vez, no `Application_Start`.

<details>
<summary>✅ Bom: NLog.config mínimo para Web **API** (Application Programming Interface · Interface de Programação de Aplicações) 2</summary>

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
            layout="${longdate} [${mdc:item=CorrelationId}] ${level:uppercase=true:padding=5} ${logger:shortName=true}: ${message} ${exception:format=tostring}" />

    <target name="console"
            xsi:type="Console"
            layout="${time} ${level:uppercase=true:padding=5} ${logger:shortName=true}: ${message}" />
  </targets>

  <rules>
    <logger name="*" minlevel="Debug" writeTo="file" />
    <logger name="*" minlevel="Info" writeTo="console" />
  </rules>
</nlog>
```

```vbnet
' Global.asax.vb: instancia o logger na raiz do domínio
Public Class MvcApplication
    Inherits System.Web.HttpApplication

    Protected Sub Application_Start()
        LogManager.LoadConfiguration(Server.MapPath("~/NLog.config"))
        ' ...
    End Sub
End Class
```

</details>
