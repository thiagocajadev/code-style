# Async

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

Async/Await chegou ao VB.NET com o .NET Framework 4.5. Os padrões são os mesmos do C# — com uma diferença crítica: VB.NET tem `Async Sub`, que não existe em C#, e seu uso fora de event handlers cria bugs silenciosos.

## Async Function vs Async Sub

`Async Sub` não é aguardável. Exceções lançadas dentro de `Async Sub` não podem ser capturadas pelo caller — vão direto para o thread pool e travam a aplicação. Use `Async Sub` **apenas** para event handlers do Windows Forms ou WebForms, onde o assinante não pode retornar `Task`.

<details>
<summary>❌ Bad — Async Sub fora de event handler</summary>
<br>

```vbnet
' caller não pode aguardar, exceções são indetectáveis
Public Async Sub SavePurchaseAsync(purchase As Purchase)
    Await _repository.SaveAsync(purchase)
    Await _notifications.SendAsync(New PurchaseSavedEvent(purchase.Id))
End Sub

' uso: chamada "fire and forget" involuntária
SavePurchaseAsync(purchase)  ' não há como saber se concluiu ou falhou
```

</details>

<br>

<details>
<summary>✅ Good — Async Function: aguardável, exceções propagam corretamente</summary>
<br>

```vbnet
Public Async Function SavePurchaseAsync(purchase As Purchase) As Task
    Await _repository.SaveAsync(purchase)
    Await _notifications.SendAsync(New PurchaseSavedEvent(purchase.Id))
End Function

' Async Sub APENAS para event handlers
Private Async Sub BtnSave_Click(sender As Object, e As EventArgs) Handles BtnSave.Click
    Try
        Await SavePurchaseAsync(_currentPurchase)
        ShowSuccess("Purchase saved.")
    Catch ex As Exception
        ShowError(ex.Message)
    End Try
End Sub
```

</details>

## Await: nunca .Result ou .Wait()

`.Result` e `.Wait()` bloqueiam a thread atual até a Task completar. Em contextos com SynchronizationContext (ASP.NET, Windows Forms), causam deadlock: a Task espera a thread, a thread espera a Task.

<details>
<summary>❌ Bad — .Result e .Wait() bloqueiam e causam deadlock</summary>
<br>

```vbnet
Public Function GetPurchase(id As Guid) As Purchase
    ' bloqueia a thread — deadlock em contextos com SynchronizationContext
    Dim purchase = _repository.FindByIdAsync(id).Result
    Return purchase
End Function

Public Sub SavePurchase(purchase As Purchase)
    _repository.SaveAsync(purchase).Wait()  ' mesmo problema
End Sub
```

</details>

<br>

<details>
<summary>✅ Good — Await propaga o contexto corretamente</summary>
<br>

```vbnet
Public Async Function GetPurchaseAsync(id As Guid) As Task(Of Purchase)
    Dim purchase = Await _repository.FindByIdAsync(id)
    Return purchase
End Function

Public Async Function SavePurchaseAsync(purchase As Purchase) As Task
    Await _repository.SaveAsync(purchase)
End Function
```

</details>

## Task.WhenAll para chamadas independentes

Chamadas de **I/O** (Input/Output, Entrada/Saída) sem dependência entre si devem ser disparadas em paralelo. Aguardá-las sequencialmente multiplica o tempo de resposta sem necessidade.

<details>
<summary>❌ Bad — chamadas independentes em sequência</summary>
<br>

```vbnet
Public Async Function GetDashboardAsync(userId As Guid) As Task(Of Dashboard)
    Dim user = Await _users.FindByIdAsync(userId)           ' 100ms
    Dim purchases = Await _purchases.FindByUserAsync(userId)      ' 80ms
    Dim notifications = Await _notifications.FindAsync(userId) ' 60ms

    ' total: ~240ms — poderia ser ~100ms
    Dim dashboard = New Dashboard(user, purchases, notifications)
    Return dashboard
End Function
```

</details>

<br>

<details>
<summary>✅ Good — Task.WhenAll dispara em paralelo</summary>
<br>

```vbnet
Public Async Function GetDashboardAsync(userId As Guid) As Task(Of Dashboard)
    Dim userTask = _users.FindByIdAsync(userId)
    Dim purchasesTask = _purchases.FindByUserAsync(userId)
    Dim notificationsTask = _notifications.FindAsync(userId)

    Await Task.WhenAll(userTask, purchasesTask, notificationsTask)

    Dim dashboard = New Dashboard(userTask.Result, purchasesTask.Result, notificationsTask.Result)
    Return dashboard
End Function
```

</details>

## ConfigureAwait

Em bibliotecas reutilizáveis (não **UI** (User Interface, Interface do Usuário), não ASP.NET), use `ConfigureAwait(False)` para evitar captura desnecessária do SynchronizationContext. Em código de aplicação (controllers, code-behind, ViewModels), omita — o contexto é necessário para atualizar UI ou HttpContext.

<details>
<summary>✅ Good — ConfigureAwait(False) em código de biblioteca</summary>
<br>

```vbnet
' em uma biblioteca de acesso a dados
Public Async Function FindPurchaseAsync(id As Guid) As Task(Of Purchase)
    Using connection = New SqlConnection(_connectionString)
        Await connection.OpenAsync().ConfigureAwait(False)

        Dim purchase = Await QueryPurchaseAsync(connection, id).ConfigureAwait(False)
        Return purchase
    End Using
End Function
```

</details>

<br>

<details>
<summary>✅ Good — sem ConfigureAwait em code-behind (contexto necessário)</summary>
<br>

```vbnet
' em Windows Forms ou WebForms: contexto necessário para atualizar controles
Private Async Sub BtnLoad_Click(sender As Object, e As EventArgs) Handles BtnLoad.Click
    Dim purchase = Await _service.FindPurchaseAsync(CurrentPurchaseId)  ' sem ConfigureAwait(False)

    ' continua no UI thread — pode atualizar controles
    LblTotal.Text = purchase.Total.ToString("C")
    GridItems.DataSource = purchase.Items
End Sub
```

</details>

## Async até a raiz

Async é contagioso. Quando um método torna-se `Async`, seus callers devem tornar-se `Async` também — até o ponto de entrada (event handler, endpoint, thread entry point). Misturar síncrono e assíncrono no meio da cadeia causa deadlock.

<details>
<summary>❌ Bad — mistura síncrono/assíncrono na cadeia</summary>
<br>

```vbnet
Public Function GetSummary(purchaseId As Guid) As PurchaseSummary
    ' tenta chamar async de forma síncrona — deadlock
    Dim purchase = FindPurchaseAsync(purchaseId).Result
    Dim summary = BuildSummary(purchase)
    Return summary
End Function
```

</details>

<br>

<details>
<summary>✅ Good — cadeia async até o ponto de entrada</summary>
<br>

```vbnet
Public Async Function GetSummaryAsync(purchaseId As Guid) As Task(Of PurchaseSummary)
    Dim purchase = Await FindPurchaseAsync(purchaseId)
    Dim summary = BuildSummary(purchase)
    Return summary
End Function

' ponto de entrada: event handler ou Page_Load
Private Async Sub Page_Load(sender As Object, e As EventArgs) Handles Me.Load
    Dim summary = Await GetSummaryAsync(CurrentPurchaseId)
    BindSummary(summary)
End Sub
```

</details>
