# Variáveis em VB.NET

O trabalho com variáveis em VB.NET começa antes da primeira linha de código, ligando **Option Strict On** e **Option Explicit On** em todo o projeto. Com as duas diretivas desligadas, que é o padrão da linguagem, o compilador aceita `Dim total = "100" + 50` e uma variável que ninguém declarou. O erro aparece em produção.

Com o compilador ajustado, o resto segue: **Dim** com o tipo certo, **ByVal** e **ByRef** escolhidos com atenção, e nomes tirados do domínio.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Option Strict On** (modo estrito de tipos) | Diretiva que proíbe conversões implícitas perigosas e late binding |
| **Option Explicit On** (declaração obrigatória) | Diretiva que exige `Dim` para toda variável; bloqueia uso sem declaração |
| **Option Infer On** (inferência local) | Permite ao compilador inferir tipo via `Dim x = ...` quando o lado direito é claro |
| **Dim** (declaração de variável) | Palavra-chave que declara variável local: `Dim purchase = New Purchase()` |
| **ByVal** (passagem por valor) | Modo padrão: o método recebe uma cópia do argumento |
| **ByRef** (passagem por referência) | Modo que permite escrever no argumento original; usar com parcimônia |
| **ReadOnly** (somente leitura) | Modificador que impede reatribuição após o construtor; comunica valor fixo |
| **Const** (constante de compilação) | Valor literal conhecido em tempo de compilação; embutido nos chamadores |

<a id="compiler-options"></a>

## Option Strict e Option Explicit ligados em todo projeto

VB.NET vem com as duas diretivas desligadas por padrão, herança da compatibilidade com o VB clássico. Ligue as duas antes de escrever qualquer coisa.

```vbnet
Option Strict On
Option Explicit On
Option Infer On
```

`Option Strict On` proíbe conversão implícita e **late binding** (resolução do método só na execução, sem checagem do compilador). Os erros que ele passa a acusar na compilação são os mesmos que apareceriam como exceção no cliente. `Option Explicit On` exige `Dim` para toda variável, o que transforma um nome digitado errado em erro de compilação. `Option Infer On` deixa o compilador deduzir o tipo a partir do lado direito, e assim `Dim purchase = New Purchase()` dispensa escrever `Purchase` duas vezes.

Configure como padrão de projeto no `.vbproj` para não precisar repetir em cada arquivo:

```xml
<PropertyGroup>
  <OptionStrict>On</OptionStrict>
  <OptionExplicit>On</OptionExplicit>
  <OptionInfer>On</OptionInfer>
</PropertyGroup>
```

<details>
<summary>❌ Ruim: sem Option Strict, conversões silenciosas e late binding</summary>

```vbnet
' Option Strict Off (default)
Dim total = "100" + 50       ' runtime error disfarçado de compilação bem-sucedida
Dim obj As Object = GetService()
obj.Process()                ' late binding: só falha em runtime
Dim value As Integer = 3.7   ' truncamento silencioso
```

</details>

<details>
<summary>✅ Bom: Option Strict On, compilador captura os erros</summary>

```vbnet
Option Strict On

Dim total As Decimal = Decimal.Parse("100") + 50D
Dim service = DirectCast(GetService(), IDataService)
service.Process()
Dim value As Integer = CInt(3.7)  ' conversão explícita e intencional
```

</details>

## Dim e inferência de tipo

Com `Option Infer On`, o compilador deduz o tipo a partir do lado direito da atribuição. Deixe ele deduzir quando a expressão já mostra o tipo, como em `New Customer()`. Escreva o tipo quando ele não estiver à vista, como no retorno de um método: `Dim discount As Decimal = ApplyPromotion(...)` poupa quem lê de abrir a assinatura de `ApplyPromotion`.

<details>
<summary>❌ Ruim: tipo redundante quando a construção já o declara</summary>

```vbnet
Dim customer As Customer = New Customer()
Dim purchases As List(Of Purchase) = New List(Of Purchase)()
Dim total As Decimal = CalculateTotal(purchases)
Dim name As String = customer.Name
```

</details>

<details>
<summary>✅ Bom: inferência onde o tipo é óbvio, explícito onde não é</summary>

```vbnet
Dim customer = New Customer()
Dim purchases = New List(Of Purchase)()
Dim total = CalculateTotal(purchases)

' explícito quando o retorno não é imediato
Dim discount As Decimal = ApplyPromotion(purchase, promoCode)
```

</details>

## Const e ReadOnly

`Const` guarda o valor que já é conhecido na compilação. `ReadOnly` guarda o valor calculado durante a execução que não muda depois de atribuído. Declarar como `Dim` o que nunca deveria mudar deixa qualquer um reatribuir o valor no meio do método, e o compilador aceita a reatribuição.

| Modificador | Quando usar | Exemplo |
| --- | --- | --- |
| `Const` | Valor fixo, conhecido na compilação | `Const MaxRetries As Integer = 3` |
| `ReadOnly` | Valor calculado, atribuído uma vez | `Private ReadOnly _timeout As TimeSpan` |
| `Dim` | Valor que precisa mudar durante a execução | `Dim attempt As Integer = 0` |

<details>
<summary>❌ Ruim: constante como variável mutável</summary>

```vbnet
Dim maxRetries = 3
Dim defaultTimeout = 30
Dim apiVersion = "v2"

' usado como se fossem constantes, mas podem ser acidentalmente reatribuídos
```

</details>

<details>
<summary>✅ Bom: semântica declarada no modificador</summary>

```vbnet
Private Const MaxRetries As Integer = 3
Private Const ApiVersion As String = "v2"
Private ReadOnly _defaultTimeout As TimeSpan = TimeSpan.FromSeconds(30)
```

</details>

<a id="nothing-checks"></a>

## Nothing se testa com Is e IsNot

`Is` e `IsNot` comparam referência, que é o que a checagem de `Nothing` precisa. As duas alternativas comuns têm defeito. `IsNothing()` vem do módulo `Microsoft.VisualBasic`, herança do VB clássico que o resto do .NET não usa. E `= Nothing` compara valor: para um `Integer`, `value = Nothing` é verdadeiro quando o valor é zero, então a checagem passa por um número válido como se ele estivesse ausente.

<details>
<summary>❌ Ruim: verificações de nulo inconsistentes</summary>

```vbnet
If IsNothing(user) Then Return
If Not IsNothing(purchase) Then ProcessPurchase(purchase)
If user = Nothing Then Return        ' = compara valor, não referência
If purchase <> Nothing Then SaveAsync() ' erro silencioso para value types
```

</details>

<details>
<summary>✅ Bom: Is e IsNot, consistentes com o padrão .NET</summary>

```vbnet
If user Is Nothing Then Return
If purchase IsNot Nothing Then ProcessPurchase(purchase)
```

</details>

<a id="short-circuit-operators"></a>

## AndAlso e OrElse param assim que sabem a resposta

`And` e `Or` avaliam sempre os dois lados da condição. `AndAlso` e `OrElse` fazem **curto-circuito** (param na hora em que o resultado já está decidido): se o lado esquerdo do `AndAlso` deu falso, o direito nem roda.

A diferença aparece na checagem de `Nothing`. Em `If user IsNot Nothing And user.IsActive`, o `And` avalia `user.IsActive` mesmo quando `user` é `Nothing`, e a execução falha com `NullReferenceException`. Com `AndAlso`, a avaliação para no primeiro operando e o segundo nem roda.

<details>
<summary>❌ Ruim: And/Or avaliam os dois lados, NullReferenceException em runtime</summary>

```vbnet
If user <> Nothing And user.IsActive Then
    DoSomething()
End If

If config <> Nothing Or config.RetryEnabled Then
    Retry()
End If
```

</details>

<details>
<summary>✅ Bom: AndAlso/OrElse com curto-circuito seguro</summary>

```vbnet
If user IsNot Nothing AndAlso user.IsActive Then
    DoSomething()
End If

If config Is Nothing OrElse config.RetryEnabled Then
    Retry()
End If
```

</details>

<a id="magic-values"></a>

## Sem valores mágicos

Um literal solto no meio da condição não diz o que ele significa. Lendo `If purchase.Items.Count > 50`, ninguém sabe se 50 é limite do carrinho, limite da transportadora ou um chute que ficou. `MaxItemsPerPurchase` responde isso, e mudar o limite passa a ser uma linha em vez de uma busca por todas as ocorrências de `50` no projeto.

<details>
<summary>❌ Ruim: literais sem contexto</summary>

```vbnet
If purchase.Items.Count > 50 Then
    Throw New InvalidOperationException("Too many items.")
End If

If user.FailedAttempts >= 5 Then
    LockAccount(user)
End If

Dim tax = subtotal * 0.15D
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas declaram a intenção</summary>

```vbnet
Private Const MaxItemsPerPurchase As Integer = 50
Private Const MaxFailedLoginAttempts As Integer = 5
Private Const TaxRate As Decimal = 0.15D

If purchase.Items.Count > MaxItemsPerPurchase Then
    Throw New InvalidOperationException("Too many items.")
End If

If user.FailedAttempts >= MaxFailedLoginAttempts Then
    LockAccount(user)
End If

Dim tax = subtotal * TaxRate
```

</details>
