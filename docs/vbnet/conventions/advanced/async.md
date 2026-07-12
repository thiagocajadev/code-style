# Código assíncrono em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

`Async`/`Await` chegou ao VB.NET com o .NET Framework 4.5, e os padrões são os mesmos do C#. Existe uma diferença que custa caro: o VB.NET tem **Async Sub**, que o C# não tem, e usá-lo fora de um event handler cria falhas que ninguém percebe. **Async Function** devolve uma `Task`, pode ser aguardada com `Await` e entrega as exceções a quem chamou.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Task** (tarefa) | Tipo `Task` ou `Task(Of T)` que representa um resultado que ainda vai ficar pronto |
| **Async/Await** (assíncrono / aguardar) | Palavras que marcam o método como assíncrono e param a execução ali até o resultado chegar |
| **Async Function** (função assíncrona) | Devolve `Task` ou `Task(Of T)`; quem chamou consegue aguardar e receber as exceções |
| **Async Sub** (subrotina assíncrona) | Não devolve `Task`, então ninguém consegue aguardar; use apenas em event handler de Windows Forms ou WebForms |
| **thread** (linha de execução que roda o código) | Uma execução do programa; enquanto ela está bloqueada, nada mais roda naquela linha |
| **I/O** (Input/Output · Entrada/Saída) | Operação que sai do processo: rede, disco, banco |
| **deadlock** (impasse) | Travamento em que a thread espera a `Task` e a `Task` espera aquela mesma thread |
| **SynchronizationContext** (contexto de sincronização) | Regra de qual thread continua o código depois do `Await`; existe em ASP.NET e Windows Forms |
| **CancellationToken** (sinalizador de cancelamento) | Token passado pela cadeia de chamadas para interromper uma operação longa |
| **ConfigureAwait** (configurar a continuação) | Método que dispensa a volta ao contexto original; em biblioteca, usa-se `False` |

<a id="async-function-vs-async-sub"></a>

## Async Function em tudo, Async Sub só no event handler

`Async Sub` não devolve `Task`, então quem chama não tem o que aguardar nem como saber se a operação terminou. A exceção lançada lá dentro também não chega a quem chamou: ela sobe direto para o thread pool e derruba a aplicação. Reserve o `Async Sub` para o event handler do Windows Forms ou WebForms, onde a assinatura do evento não aceita `Task` como retorno.

<details>
<summary>❌ Ruim: Async Sub fora de event handler</summary>

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

<details>
<summary>✅ Bom: Async Function: aguardável, exceções propagam corretamente</summary>

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

<a id="no-blocking-await"></a>

## Aguarde com Await, sem `.Result` e sem `.Wait()`

`.Result` e `.Wait()` param a thread atual até a `Task` terminar. Em ASP.NET e em Windows Forms existe um **SynchronizationContext**, que exige que o código depois do `Await` continue naquela mesma thread. O impasse se monta assim: a thread está parada esperando a `Task`, e a `Task` só termina quando conseguir a thread para rodar o resto do trabalho. Nenhuma das duas cede, e a requisição trava para sempre.

<details>
<summary>❌ Ruim: .Result e .Wait() bloqueiam e causam deadlock</summary>

```vbnet
Public Function GetPurchase(id As Guid) As Purchase
    ' bloqueia a thread: deadlock em contextos com SynchronizationContext
    Dim purchase = _repository.FindByIdAsync(id).Result
    Return purchase
End Function

Public Sub SavePurchase(purchase As Purchase)
    _repository.SaveAsync(purchase).Wait()  ' mesmo problema
End Sub
```

</details>

<details>
<summary>✅ Bom: Await propaga o contexto corretamente</summary>

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

<a id="task-whenall"></a>

## Task.WhenAll quando uma chamada não depende da outra

Chamadas de **I/O** que não dependem umas das outras devem sair juntas. Aguardar uma de cada vez soma os tempos: 100 ms de usuário, mais 80 ms de compras, mais 60 ms de notificações, dá 240 ms de espera. Disparadas juntas, as três correm ao mesmo tempo, e o total fica perto dos 100 ms da mais lenta.

<details>
<summary>❌ Ruim: chamadas independentes em sequência</summary>

```vbnet
Public Async Function GetDashboardAsync(userId As Guid) As Task(Of Dashboard)
    Dim user = Await _users.FindByIdAsync(userId)           ' 100ms
    Dim purchases = Await _purchases.FindByUserAsync(userId)      ' 80ms
    Dim notifications = Await _notifications.FindAsync(userId) ' 60ms

    ' total: ~240ms: poderia ser ~100ms
    Dim dashboard = New Dashboard(user, purchases, notifications)
    Return dashboard
End Function
```

</details>

<details>
<summary>✅ Bom: Task.WhenAll dispara em paralelo</summary>

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

<a id="configure-await"></a>

## ConfigureAwait(False) em código de biblioteca

Em biblioteca reutilizável, use `ConfigureAwait(False)` em cada `Await`. Ele dispensa a volta ao **SynchronizationContext** original, que a biblioteca não precisa e que custa uma espera a mais por chamada. Em código de aplicação (controller, code-behind, ViewModel), omita: ali o contexto é o que permite atualizar um controle da tela ou ler o `HttpContext` depois do `Await`.

<details>
<summary>✅ Bom: ConfigureAwait(False) em código de biblioteca</summary>

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

<details>
<summary>✅ Bom: sem ConfigureAwait em code-behind (contexto necessário)</summary>

```vbnet
' em Windows Forms ou WebForms: contexto necessário para atualizar controles
Private Async Sub BtnLoad_Click(sender As Object, e As EventArgs) Handles BtnLoad.Click
    Dim purchase = Await _service.FindPurchaseAsync(CurrentPurchaseId)  ' sem ConfigureAwait(False)

    ' continua no UI thread: pode atualizar controles
    LblTotal.Text = purchase.Total.ToString("C")
    GridItems.DataSource = purchase.Items
End Sub
```

</details>

<a id="async-all-the-way"></a>

## O async vai até o ponto de entrada

Quando um método vira `Async`, quem o chama também precisa virar, e assim por diante até o ponto de entrada da aplicação (o event handler, o endpoint, a thread inicial). Quebrar essa cadeia no meio significa chamar `.Result` ou `.Wait()` em algum ponto, o que traz de volta o impasse descrito acima.

<details>
<summary>❌ Ruim: mistura síncrono/assíncrono na cadeia</summary>

```vbnet
Public Function GetSummary(purchaseId As Guid) As PurchaseSummary
    ' tenta chamar async de forma síncrona: deadlock
    Dim purchase = FindPurchaseAsync(purchaseId).Result
    Dim summary = BuildSummary(purchase)
    Return summary
End Function
```

</details>

<details>
<summary>✅ Bom: cadeia async até o ponto de entrada</summary>

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
