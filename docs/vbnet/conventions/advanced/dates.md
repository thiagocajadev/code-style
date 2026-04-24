# Dates

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

`DateTime` em .NET tem uma armadilha central: o campo `Kind` pode ser `Local`, `Utc` ou `Unspecified`, e a maioria das construções produz `Unspecified` sem aviso. Prefira `DateTimeOffset` para eliminar a ambiguidade: o offset está embutido no tipo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **UTC** (Coordinated Universal Time, Tempo Universal Coordenado) | Referência de tempo sem fuso; formato canônico para armazenar e transmitir |
| **ISO 8601** (International Organization for Standardization 8601, Norma Internacional de Datas) | Formato padrão `YYYY-MM-DDTHH:mm:ssZ` para datas em texto |
| **DateTimeOffset** (data com fuso) | Tipo .NET que carrega o offset embutido; elimina ambiguidade do `Kind` |
| **DTO** (Data Transfer Object, Objeto de Transferência de Dados) | Contrato que transporta datas entre camadas; sempre em UTC ISO 8601 |
| **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) | Banco relacional; colunas `datetime2` + UTC é o padrão seguro |

## DateTime.Now vs DateTimeOffset.UtcNow

`DateTime.Now` captura a hora local do servidor. Em deploys com servidores em timezones diferentes, o mesmo código produz valores incomparáveis.

<details>
<summary>❌ Bad — hora local do servidor, Kind implícito</summary>
<br>

```vbnet
Dim createdAt = DateTime.Now
' Kind: Local — depende do timezone do servidor
' Comparações entre servidores em timezones diferentes produzem resultados errados
```

</details>

<br>

<details>
<summary>✅ Good — UTC explícito, comparável em qualquer ambiente</summary>
<br>

```vbnet
Dim createdAt = DateTimeOffset.UtcNow
' Offset: +00:00 — inequívoco, portável
' Serializa como "2026-04-19T14:00:00+00:00"
```

</details>

## DateTime vs DateTimeOffset

`DateTime` perde a informação de timezone. `DateTimeOffset` carrega o offset junto ao valor, sem precisar de contexto externo para interpretar o instante.

<details>
<summary>❌ Bad — DateTime sem Kind perde contexto de timezone</summary>
<br>

```vbnet
Public Class OrderDto
    Public Property Id As Guid
    Public Property CreatedAt As DateTime
    ' Kind: Unspecified — impossível saber se é UTC ou local sem convenção externa
End Class
```

</details>

<br>

<details>
<summary>✅ Good — DateTimeOffset carrega o offset, sem ambiguidade</summary>
<br>

```vbnet
Public Class OrderDto
    Public Property Id As Guid
    Public Property CreatedAt As DateTimeOffset
    ' "2026-04-19T14:00:00+00:00" — timezone embutida no valor
End Class
```

</details>

## DateTime.SpecifyKind: falsa segurança

`DateTime.SpecifyKind` apenas muda o campo `Kind` sem converter o valor. Um `DateTime` local marcado como `Utc` tem o valor errado — a hora não é ajustada.

<details>
<summary>❌ Bad — SpecifyKind muda o rótulo, não o valor</summary>
<br>

```vbnet
' servidor no fuso -03:00; valor real é 11:00 local
Dim local = DateTime.Now                              ' 11:00:00, Kind: Local
Dim wrongUtc = DateTime.SpecifyKind(local, DateTimeKind.Utc)
' wrongUtc = 11:00:00, Kind: Utc — mas o UTC real seria 14:00:00
```

</details>

<br>

<details>
<summary>✅ Good — conversão explícita preserva o instante correto</summary>
<br>

```vbnet
' converte com o offset correto do servidor
Dim utcNow = DateTime.UtcNow
' ou use DateTimeOffset desde o início
Dim createdAt = DateTimeOffset.UtcNow
```

</details>

## Datas sem hora: evite hora fantasma

.NET Framework 4.8 não tem `DateOnly` (disponível só no .NET 6+). Para representar apenas uma data, use `DateTime` com hora zerada — mas documente a convenção e garanta consistência na serialização para evitar shifts de timezone.

<details>
<summary>❌ Bad — DateTime com hora fantasma, sujeita a shift na serialização</summary>
<br>

```vbnet
Public Class CustomerRequest
    Public Property Name As String
    Public Property BirthDate As DateTime
    ' "1990-08-21T00:00:00" — hora zero sem sentido
    ' JSON.NET pode aplicar timezone e virar "1990-08-20T21:00:00-03:00"
End Class
```

</details>

<br>

<details>
<summary>✅ Good — string **ISO** (International Organization for Standardization, Organização Internacional de Normalização) no DTO, parse explícito no domínio</summary>
<br>

```vbnet
' DTO recebe a data como string, sem ambiguidade de timezone
Public Class CustomerRequest
    Public Property Name As String
    Public Property BirthDate As String  ' "1990-08-21" — ISO 8601 date-only
End Class

' parse explícito no service
Public Function CreateCustomer(request As CustomerRequest) As OperationResult(Of Customer)
    Dim birthDate As DateTime
    If Not DateTime.TryParseExact(
            request.BirthDate, "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            birthDate) Then
        Dim invalid = OperationResult(Of Customer).Fail("Invalid birth date format.", "INVALID_INPUT")
        Return invalid
    End If

    ' trabalha com DateTime zerado, sem serialização
    Dim customer = New Customer With {.Name = request.Name, .BirthDate = birthDate.Date}

    Dim result = OperationResult(Of Customer).Success(customer)

    Return result
End Function
```

</details>

## ADO.NET e Dapper: colunas de data

Ao ler `DateTime` do banco, o valor volta como `DateTimeKind.Unspecified`. Trate na camada de dados: converta para UTC explicitamente ou use `DateTimeOffset` na coluna (`datetimeoffset` no SQL Server).

<details>
<summary>❌ Bad — DateTime lido do banco sem Kind, interpretação ambígua</summary>
<br>

```vbnet
Public Function FindById(id As Guid) As Order
    Using connection = ConnectionFactory.Create()
        Dim sql = "SELECT Id, CreatedAt FROM Orders WHERE Id = @Id"
        Return connection.QueryFirstOrDefault(Of Order)(sql, New With {.Id = id})
        ' Order.CreatedAt: Kind = Unspecified — perigoso comparar com DateTime.UtcNow
    End Using
End Function
```

</details>

<br>

<details>
<summary>✅ Good — coluna datetimeoffset no banco, DateTimeOffset no modelo</summary>
<br>

```sql
-- migração: coluna com offset preservado
ALTER TABLE Orders ALTER COLUMN CreatedAt datetimeoffset NOT NULL
```

```vbnet
Public Class Order
    Public Property Id As Guid
    Public Property CreatedAt As DateTimeOffset  ' Dapper mapeia datetimeoffset direto
End Class

Public Function FindById(id As Guid) As Order
    Using connection = ConnectionFactory.Create()
        Dim sql = "SELECT Id, CreatedAt FROM Orders WHERE Id = @Id"
        Dim order = connection.QueryFirstOrDefault(Of Order)(sql, New With {.Id = id})
        ' CreatedAt: "2026-04-19T14:00:00+00:00" — offset preservado

        Return order
    End Using
End Function
```

</details>

## Formatação: cultura explícita

`ToString()` sem cultura usa a cultura do thread atual — varia entre servidores e máquinas. Sempre passe a cultura explicitamente ao formatar datas.

<details>
<summary>❌ Bad — formatação dependente da cultura do servidor</summary>
<br>

```vbnet
Dim label = order.CreatedAt.ToString("dd/MM/yyyy")
' resultado varia conforme o locale do servidor
```

</details>

<br>

<details>
<summary>✅ Good — cultura explícita, resultado previsível</summary>
<br>

```vbnet
Dim label = order.CreatedAt.ToString("dd/MM/yyyy", New CultureInfo("pt-BR"))
' "19/04/2026" — independente do locale do servidor

' para APIs: ISO 8601 com InvariantCulture
Dim iso = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)
' "2026-04-19T14:00:00+00:00"
```

</details>
