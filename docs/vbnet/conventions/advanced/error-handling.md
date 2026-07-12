# Tratamento de erros em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

Tratamento de erro em VB.NET convive com duas heranças. Uma é o modelo estruturado da plataforma .NET, o **Try/Catch/Finally**. A outra é o **On Error GoTo**, que vem do Basic clássico e desvia a execução para um rótulo quando algo falha. O padrão atual é `Try/Catch` em tudo. O `On Error` só aparece em código legado, e os dois modelos nunca convivem no mesmo método.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **exception** (exceção) | Evento para falhas inesperadas: bugs, infraestrutura indisponível, estado impossível |
| **Try/Catch/Finally** (tentar / capturar / por fim) | Modelo estruturado de tratamento de exceções da plataforma .NET |
| **On Error GoTo** (ao erro, vá para) | Modelo do Basic clássico; só sobrevive em código legado e nunca se mistura com `Try/Catch` |
| **Throw** (relançar) | `Throw` sozinho, sem expressão, propaga a mesma exceção e preserva o stack trace original |
| **stack trace** (rastro de chamadas) | Lista das chamadas que levaram até o erro; é o que aponta a linha onde a falha nasceu |
| **When clause** (cláusula When) | Filtro condicional em `Catch ... When (...)`; decide se captura sem perder o stack trace |
| **business rule** (regra de negócio) | Falha esperada modelada como dado e devolvida por um tipo de resultado |
| **Result(Of T)** (tipo de resultado) | Valor que representa sucesso ou falha; deixa o contrato de erro explícito na assinatura |
| **boundary** (limite do sistema) | Camada externa onde o `Result` vira resposta HTTP ou JSON |

<a id="trycatch-vs-on-error-goto"></a>

## Todo tratamento de erro usa Try/Catch

`Try/Catch/Finally` é o modelo da plataforma .NET: captura por tipo de exceção, tem escopo delimitado e funciona com o resto do ecossistema. O `On Error GoTo` do Basic clássico desvia o fluxo para um rótulo e entrega o erro em uma variável global (`Err`), que já perdeu o tipo e o stack trace. Os dois modelos no mesmo método deixam o comportamento indefinido, então escolha `Try/Catch` e fique com ele.

<details>
<summary>❌ Ruim: On Error GoTo, modelo VB clássico</summary>

```vbnet
Sub SavePurchase(purchase As Purchase)
    On Error GoTo ErrorHandler

    _repository.Save(purchase)
    Exit Sub

ErrorHandler:
    LogError(Err.Description)
End Sub
```

</details>

<details>
<summary>✅ Bom: Try/Catch estruturado, tipado e propagável</summary>

```vbnet
Sub SavePurchase(purchase As Purchase)
    Try
        _repository.Save(purchase)
    Catch ex As SqlException
        _logger.LogError(ex, "Database error saving purchase {PurchaseId}", purchase.Id)
        Throw
    End Try
End Sub
```

</details>

<a id="specific-catch-first"></a>

## O Catch específico vem antes do genérico

O runtime testa os `Catch` de cima para baixo e para no primeiro que casa. Um `Catch ex As Exception` no topo casa com tudo, então os blocos abaixo dele nunca rodam, e uma falha de rede acaba tratada com o mesmo código que trataria um bug de programação. Cada tipo de falha pede uma resposta diferente, então liste do mais específico para o mais genérico.

<details>
<summary>❌ Ruim: Exception genérico silencia falhas específicas</summary>

```vbnet
Try
    Dim response = Await _client.GetAsync(endpoint)
    Dim content = Await response.Content.ReadAsStringAsync()
    Return JsonConvert.DeserializeObject(Of PurchaseDto)(content)
Catch ex As Exception
    LogError(ex.Message)
    Return Nothing
End Try
```

</details>

<details>
<summary>✅ Bom: tipos específicos, cada um com tratamento adequado</summary>

```vbnet
Try
    Dim response = Await _client.GetAsync(endpoint)
    Dim content = Await response.Content.ReadAsStringAsync()

    Dim dto = JsonConvert.DeserializeObject(Of PurchaseDto)(content)
    Return dto
Catch ex As HttpRequestException
    _logger.LogWarning(ex, "HTTP error fetching purchase from {Endpoint}", endpoint)
    Return Nothing
Catch ex As JsonException
    _logger.LogError(ex, "Malformed purchase response from {Endpoint}", endpoint)
    Throw
End Try
```

</details>

<a id="empty-catch"></a>

## O Catch que captura o erro e não avisa ninguém

Um `Catch` de corpo vazio faz o programa seguir em frente como se nada tivesse acontecido. O estado já está corrompido, e a próxima falha vai aparecer longe da causa, em um lugar onde ninguém encontra a origem. Quando você não sabe o que fazer com a exceção, registre no log e relance com `Throw`.

<details>
<summary>❌ Ruim: Catch silencioso oculta falha</summary>

```vbnet
Try
    ProcessPurchase(purchase)
Catch ex As Exception
    ' silently ignore
End Try

' versão ainda pior: nem loga
Try
    _cache.Set(key, value)
Catch
End Try
```

</details>

<details>
<summary>✅ Bom: loga e relança, ou trata com intenção clara</summary>

```vbnet
Try
    ProcessPurchase(purchase)
Catch ex As Exception
    _logger.LogError(ex, "Failed to process purchase {PurchaseId}", purchase.Id)
    Throw
End Try

' quando a falha é realmente ignorável, documente por que
Try
    _cache.Set(key, value)
Catch ex As Exception
    ' why: cache miss é aceitável; a operação principal continua sem cache
    _logger.LogWarning(ex, "Cache write failed for key {Key}", key)
End Try
```

</details>

<a id="catch-when"></a>

## Catch When filtra a exceção por condição

A cláusula `When` decide se aquele `Catch` vai capturar. Quando a condição dá falso, a exceção segue procurando outro bloco, e o stack trace continua apontando para o ponto de origem. Serve para tratar um subconjunto de uma exceção (por exemplo, só o `404` de um `HttpRequestException`) sem precisar criar subclasses.

<details>
<summary>✅ Bom: Catch When filtra sem captura desnecessária</summary>

```vbnet
Try
    Dim response = Await _client.PostAsync(endpoint, content)
    response.EnsureSuccessStatusCode()
Catch ex As HttpRequestException When ex.StatusCode = HttpStatusCode.NotFound
    Dim notFound = OperationResult.Fail("Resource not found.", "NOT_FOUND")
    Return notFound
Catch ex As HttpRequestException When ex.StatusCode = HttpStatusCode.Conflict
    Dim conflict = OperationResult.Fail("Conflict: resource already exists.", "CONFLICT")
    Return conflict
Catch ex As HttpRequestException
    _logger.LogError(ex, "Unexpected HTTP error calling {Endpoint}", endpoint)
    Throw
End Try
```

</details>

<a id="using-for-disposables"></a>

## Using para recursos que precisam ser liberados

Todo objeto que implementa `IDisposable` (conexão de banco, arquivo, stream) nasce dentro de um `Using`. O bloco chama `Dispose()` na saída, mesmo quando uma exceção interrompe o caminho no meio. É o mesmo que escrever um `Try/Finally` com `Dispose()` dentro, com menos código para esquecer.

<details>
<summary>❌ Ruim: Dispose manual, não garante limpeza em exceção</summary>

```vbnet
Dim connection = New SqlConnection(_connectionString)
connection.Open()
Dim command = connection.CreateCommand()
command.CommandText = "SELECT * FROM Purchases WHERE Id = @Id"
command.Parameters.AddWithValue("@Id", purchaseId)
Dim reader = command.ExecuteReader()
' ... se lançar aqui, connection e command não são descartados
reader.Close()
command.Dispose()
connection.Dispose()
```

</details>

<details>
<summary>✅ Bom: Using garante Dispose em qualquer caminho</summary>

```vbnet
Using connection = New SqlConnection(_connectionString)
    connection.Open()

    Using command = connection.CreateCommand()
        command.CommandText = "SELECT * FROM Purchases WHERE Id = @Id"
        command.Parameters.AddWithValue("@Id", purchaseId)

        Using reader = command.ExecuteReader()
            ' ... processa reader ...
        End Using
    End Using
End Using
```

</details>

<a id="finally-cleanup"></a>

## Finally para limpeza quando não há Using

Quando o recurso precisa de limpeza mas não implementa `IDisposable`, a limpeza vai no `Finally`. Ele roda em qualquer saída do bloco: fim normal, `Return` no meio ou exceção.

<details>
<summary>✅ Bom: Finally garante limpeza em qualquer saída</summary>

```vbnet
Dim lockAcquired = False

Try
    Monitor.Enter(_syncLock, lockAcquired)
    ProcessCriticalSection()
Finally
    If lockAcquired Then Monitor.Exit(_syncLock)
End Try
```

</details>

<a id="exception-for-unexpected"></a>

## A exceção sinaliza o que não era esperado

Exceção é para bug, infraestrutura fora do ar e violação de contrato, ou seja, para o que o código não sabia tratar. Falha de negócio previsível (validação reprovada, recurso não encontrado, conflito) é resultado esperado da operação e volta como valor de retorno tipado. A diferença aparece em quem chama: com resultado tipado, o fluxo normal é um `If`, e não um `Try/Catch` escrito para conduzir o caso comum.

<details>
<summary>❌ Ruim: exceção como controle de fluxo de negócio</summary>

```vbnet
Public Function FindPurchase(purchaseId As Guid) As Purchase
    Dim purchase = _repository.FindById(purchaseId)
    If purchase Is Nothing Then
        Throw New Exception("Purchase not found.")  ' fluxo normal tratado como excepcional
    End If
    Return purchase
End Function

' caller precisa de Try/Catch para fluxo normal
Try
    Dim purchase = FindPurchase(id)
    ProcessPurchase(purchase)
Catch ex As Exception When ex.Message = "Purchase not found."
    ShowNotFound()
End Try
```

</details>

<details>
<summary>✅ Bom: resultado tipado para falhas previsíveis</summary>

```vbnet
Public Function FindPurchase(purchaseId As Guid) As OperationResult(Of Purchase)
    Dim purchase = _repository.FindById(purchaseId)
    If purchase Is Nothing Then
        Dim notFound = OperationResult(Of Purchase).Fail("Purchase not found.", "NOT_FOUND")
        Return notFound
    End If

    Dim result = OperationResult(Of Purchase).Success(purchase)
    Return result
End Function

' caller lê o resultado sem Try/Catch
Dim result = FindPurchase(id)
If Not result.IsSuccess Then
    ShowNotFound()
    Return
End If

ProcessPurchase(result.Value)
```

</details>
