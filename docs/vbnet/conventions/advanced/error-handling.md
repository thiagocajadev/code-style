# Error Handling

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

Tratamento de erros em VB.NET convive com duas heranças: o modelo estruturado da plataforma .NET (`Try/Catch/Finally`) e o `On Error GoTo` do Basic clássico. O padrão atual é `Try/Catch` em tudo; `On Error` só sobrevive em código legado e nunca se mistura com o modelo estruturado no mesmo método.

## Try/Catch vs On Error GoTo

`On Error GoTo` é o modelo de tratamento de erro do Basic clássico. Em VB.NET, `Try/Catch/Finally` é o padrão da plataforma .NET: tipado, estruturado e compatível com todo o ecossistema. Nunca misture os dois modelos no mesmo método — comportamento indefinido.

<details>
<summary>❌ Bad — On Error GoTo, modelo VB clássico</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Try/Catch estruturado, tipado e propagável</summary>
<br>

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

## Catch específico antes do genérico

Catch mais específico captura primeiro. `Exception` genérico no topo silencia erros que deveriam propagar — cada tipo de falha tem semântica diferente e merece tratamento diferente.

<details>
<summary>❌ Bad — Exception genérico silencia falhas específicas</summary>
<br>

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

<br>

<details>
<summary>✅ Good — tipos específicos, cada um com tratamento adequado</summary>
<br>

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

## Catch vazio

Um `Catch` sem tratamento é pior que não ter `Try`: silencia o erro, esconde o estado corrompido e dificulta diagnóstico. Se não sabe o que fazer com a exceção, relance com `Throw`.

<details>
<summary>❌ Bad — Catch silencioso oculta falha</summary>
<br>

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

<br>

<details>
<summary>✅ Good — loga e relança, ou trata com intenção clara</summary>
<br>

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

## Catch When

A cláusula `When` filtra a exceção por condição sem capturá-la quando a condição é falsa. Útil para tratar apenas subconjuntos de uma exceção sem criar subclasses.

<details>
<summary>✅ Good — Catch When filtra sem captura desnecessária</summary>
<br>

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

## Using para recursos descartáveis

Qualquer objeto que implementa `IDisposable` deve ser criado dentro de `Using`. Garante `Dispose()` mesmo em caso de exceção — equivalente a `try/finally` com `Dispose()`, sem o boilerplate.

<details>
<summary>❌ Bad — Dispose manual, não garante limpeza em exceção</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Using garante Dispose em qualquer caminho</summary>
<br>

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

## Finally para limpeza sem Using

Quando o recurso não implementa `IDisposable` mas precisa de limpeza, use `Finally`. Executa independente de exceção ou `Return`.

<details>
<summary>✅ Good — Finally garante limpeza em qualquer saída</summary>
<br>

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

## Exceções para falhas inesperadas

Exceções sinalizam condições inesperadas — bugs, falhas de infraestrutura, violações de contrato. Para falhas de negócio previsíveis (validação, recurso não encontrado, conflito), retorne um resultado tipado em vez de lançar.

<details>
<summary>❌ Bad — exceção como controle de fluxo de negócio</summary>
<br>

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

<br>

<details>
<summary>✅ Good — resultado tipado para falhas previsíveis</summary>
<br>

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
