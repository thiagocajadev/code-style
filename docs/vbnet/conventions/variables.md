# Variables

Variáveis em VB.NET começam antes da primeira linha de código: **Option Strict On** e **Option Explicit On** precisam estar ativos em todo arquivo. Sem isso, o compilador aceita conversões implícitas perigosas e variáveis não declaradas. A partir daí, **Dim** tipado, uso consciente de **ByVal**/**ByRef** e nomes por propósito do domínio.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Option Strict On** (modo estrito de tipos) | Diretiva que proíbe conversões implícitas perigosas e late binding |
| **Option Explicit On** (declaração obrigatória) | Diretiva que exige `Dim` para toda variável; bloqueia uso sem declaração |
| **Option Infer On** (inferência local) | Permite ao compilador inferir tipo via `Dim x = ...` quando o lado direito é claro |
| **Dim** (declaração de variável) | Palavra-chave que declara variável local; primeiro gesto após sanidade do compilador |
| **ByVal** (passagem por valor) | Modo padrão: o método recebe uma cópia do argumento |
| **ByRef** (passagem por referência) | Modo que permite escrever no argumento original; usar com parcimônia |
| **ReadOnly** (somente leitura) | Modificador que impede reatribuição após o construtor; comunica valor fixo |
| **Const** (constante de compilação) | Valor literal conhecido em tempo de compilação; embutido nos chamadores |

## Option Strict e Option Explicit

Dois switches de compilador precisam estar ativos em todo arquivo VB.NET. São desativados por padrão; ativar é o primeiro gesto de qualidade em qualquer projeto.

```vbnet
Option Strict On
Option Explicit On
Option Infer On
```

`Option Strict On` proíbe conversões implícitas e late binding, eliminando uma classe inteira de bugs em runtime. `Option Explicit On` exige declaração explícita de toda variável. `Option Infer On` habilita inferência de tipo com `Dim`, permitindo `Dim purchase = New Purchase()` sem repetição do tipo.

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

Com `Option Infer On`, o compilador infere o tipo quando o lado direito é inequívoco. Use inferência quando o tipo é óbvio pela expressão; declare explicitamente quando o tipo não é imediato.

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

`Const` para valores conhecidos em tempo de compilação. `ReadOnly` para valores computados em runtime que não mudam depois da atribuição. Variáveis mutáveis sem necessidade de mutação são bugs esperando para acontecer.

| Modificador | Quando usar | Exemplo |
| --- | --- | --- |
| `Const` | Valor fixo, tempo de compilação | `Const MaxRetries As Integer = 3` |
| `ReadOnly` | Valor calculado, atribuído uma vez | `Private ReadOnly _timeout As TimeSpan` |
| `Dim` | Mutável, precisa mudar | `Dim attempt As Integer = 0` |

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

## Nothing: Is e IsNot

Para verificar `Nothing`, use os operadores `Is` e `IsNot`. `IsNothing()` é uma função legacy do módulo `Microsoft.VisualBasic`, verbosa e inconsistente com o resto do .NET. Comparar com `= Nothing` é um erro semântico: `=` testa igualdade de valor, não referência nula.

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

## AndAlso e OrElse

`And` e `Or` avaliam **ambos** os operandos sempre. `AndAlso` e `OrElse` fazem curto-circuito: param assim que o resultado é determinado. Usar `And`/`Or` em condições com objetos que podem ser `Nothing` causa `NullReferenceException`.

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

Números e strings literais inline são código sem contexto. O leitor precisa deduzir o significado. Uma constante nomeada declara a intenção e centraliza a mudança.

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
