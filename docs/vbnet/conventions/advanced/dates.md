# Datas em VB.NET

> Escopo: VB.NET. Idiomas específicos deste ecossistema.

O `DateTime` do .NET guarda, junto com a data, um campo `Kind` que diz se aquele instante é local, é **UTC** ou é indefinido. A armadilha está no valor padrão: a maioria das formas de criar um `DateTime` produz `Unspecified`, e o compilador não avisa. Duas datas com `Kind` diferente comparadas entre si dão o resultado errado sem lançar erro nenhum. O `DateTimeOffset` resolve isso na origem, porque carrega o fuso dentro do próprio valor.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) | Referência de tempo sem fuso; é como as datas são gravadas e transmitidas |
| **ISO 8601** (International Organization for Standardization 8601 · Norma Internacional de Datas) | Formato de data em texto: `YYYY-MM-DDTHH:mm:ssZ` |
| **Kind** (natureza do instante) | Campo do `DateTime` que diz se aquele valor é `Local`, `Utc` ou `Unspecified` |
| **offset** (diferença para o UTC) | Quanto o horário local se afasta do UTC, por exemplo `-03:00` no horário de Brasília |
| **DateTimeOffset** (data com o fuso embutido) | Tipo do .NET que guarda o instante junto com o offset |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | Objeto que leva dados entre camadas; datas nele viajam em UTC no formato ISO 8601 |
| **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) | Banco relacional; a coluna `datetimeoffset` guarda o fuso junto com a data |

<a id="utcnow-over-now"></a>

## DateTimeOffset.UtcNow no lugar de DateTime.Now

`DateTime.Now` devolve a hora do relógio do servidor. Dois servidores em fusos diferentes rodando o mesmo código gravam horas diferentes para o mesmo evento, e comparar esses registros depois dá resultado errado. `DateTimeOffset.UtcNow` devolve o mesmo instante em qualquer máquina, com o offset gravado junto.

<details>
<summary>❌ Ruim: hora local do servidor, Kind implícito</summary>

```vbnet
Dim createdAt = DateTime.Now
' Kind: Local: depende do timezone do servidor
' Comparações entre servidores em timezones diferentes produzem resultados errados
```

</details>

<details>
<summary>✅ Bom: UTC explícito, comparável em qualquer ambiente</summary>

```vbnet
Dim createdAt = DateTimeOffset.UtcNow
' Offset: +00:00: inequívoco, portável
' Serializa como "2026-04-19T14:00:00+00:00"
```

</details>

<a id="datetime-vs-datetimeoffset"></a>

## DateTimeOffset guarda o fuso junto com a data

Um `DateTime` com `Kind` igual a `Unspecified` traz a data e a hora, e nada mais. Para interpretar aquele instante, quem lê precisa conhecer uma convenção que mora fora do código, do tipo "aqui a gente sempre grava em UTC". Quando essa convenção falha em um único ponto do sistema, o valor gravado fica três horas deslocado e ninguém descobre até o relatório sair errado. `DateTimeOffset` carrega o offset no valor.

<details>
<summary>❌ Ruim: DateTime sem Kind perde contexto de timezone</summary>

```vbnet
Public Class OrderDto
    Public Property Id As Guid
    Public Property CreatedAt As DateTime
    ' Kind: Unspecified: impossível saber se é UTC ou local sem convenção externa
End Class
```

</details>

<details>
<summary>✅ Bom: DateTimeOffset carrega o offset, sem ambiguidade</summary>

```vbnet
Public Class OrderDto
    Public Property Id As Guid
    Public Property CreatedAt As DateTimeOffset
    ' "2026-04-19T14:00:00+00:00": timezone embutida no valor
End Class
```

</details>

<a id="specify-kind"></a>

## DateTime.SpecifyKind troca o rótulo e mantém a hora

`SpecifyKind` escreve outro valor no campo `Kind` e deixa a hora exatamente como estava. Em um servidor no fuso de Brasília, `11:00` local marcado como `Utc` continua sendo `11:00`, embora o UTC daquele instante seja `14:00`. O valor passa a mentir sobre si mesmo, e as três horas de diferença aparecem depois, em qualquer comparação ou relatório. Comece com `DateTimeOffset` e o ajuste deixa de ser necessário.

<details>
<summary>❌ Ruim: SpecifyKind muda o rótulo, não o valor</summary>

```vbnet
' servidor no fuso -03:00; valor real é 11:00 local
Dim local = DateTime.Now                              ' 11:00:00, Kind: Local
Dim wrongUtc = DateTime.SpecifyKind(local, DateTimeKind.Utc)
' wrongUtc = 11:00:00, Kind: Utc: mas o UTC real seria 14:00:00
```

</details>

<details>
<summary>✅ Bom: conversão explícita preserva o instante correto</summary>

```vbnet
' converte com o offset correto do servidor
Dim utcNow = DateTime.UtcNow
' ou use DateTimeOffset desde o início
Dim createdAt = DateTimeOffset.UtcNow
```

</details>

<a id="date-only"></a>

## Data de aniversário não tem hora

O .NET Framework 4.8 não tem o tipo `DateOnly`, que só chegou no .NET 6. Guardar uma data de nascimento em um `DateTime` cria uma hora que ninguém pediu, a meia-noite, e essa hora vira alvo de conversão de fuso na serialização. Meia-noite de 21/08 em Brasília é dia 20 às 21:00 em UTC, então a data de nascimento anda um dia para trás no JSON. No **DTO**, a data viaja como texto no formato `yyyy-MM-dd`, e o service converte para `DateTime` com `TryParseExact`.

<details>
<summary>❌ Ruim: DateTime com hora fantasma, sujeita a shift na serialização</summary>

```vbnet
Public Class CustomerRequest
    Public Property Name As String
    Public Property BirthDate As DateTime
    ' "1990-08-21T00:00:00": hora zero sem sentido
    ' JSON.NET pode aplicar timezone e virar "1990-08-20T21:00:00-03:00"
End Class
```

</details>

<details>
<summary>✅ Bom: string **ISO** (International Organization for Standardization · Organização Internacional de Normalização) no DTO, parse explícito no domínio</summary>

```vbnet
' DTO recebe a data como string, sem ambiguidade de timezone
Public Class CustomerRequest
    Public Property Name As String
    Public Property BirthDate As String  ' "1990-08-21": ISO 8601 date-only
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

<a id="dates-in-the-database"></a>

## A coluna do banco também guarda o fuso

Um `DateTime` lido de uma coluna `datetime2` chega ao código com `Kind` igual a `Unspecified`, porque a coluna guardou a data e descartou o fuso. Comparar esse valor com `DateTime.UtcNow` mistura duas referências diferentes e produz uma diferença de horas. A coluna `datetimeoffset` do SQL Server guarda o offset junto, e o Dapper mapeia direto para `DateTimeOffset` no modelo.

<details>
<summary>❌ Ruim: DateTime lido do banco sem Kind, interpretação ambígua</summary>

```vbnet
Public Function FindById(id As Guid) As Order
    Using connection = ConnectionFactory.Create()
        Dim sql = "SELECT Id, CreatedAt FROM Orders WHERE Id = @Id"
        Return connection.QueryFirstOrDefault(Of Order)(sql, New With {.Id = id})
        ' Order.CreatedAt: Kind = Unspecified: perigoso comparar com DateTime.UtcNow
    End Using
End Function
```

</details>

<details>
<summary>✅ Bom: coluna datetimeoffset no banco, DateTimeOffset no modelo</summary>

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
        Return order
    End Using
End Function
```

</details>

<a id="explicit-culture"></a>

## Toda formatação de data recebe a cultura

`ToString("dd/MM/yyyy")` sem cultura usa a cultura da thread, que vem da configuração do sistema operacional onde o processo roda. O mesmo código imprime `19/04/2026` na máquina do desenvolvedor e outra coisa no servidor. Passe a cultura no argumento: `CultureInfo("pt-BR")` para o que o usuário lê, `CultureInfo.InvariantCulture` com formato ISO 8601 para o que a API devolve.

<details>
<summary>❌ Ruim: formatação dependente da cultura do servidor</summary>

```vbnet
Dim label = order.CreatedAt.ToString("dd/MM/yyyy")
' resultado varia conforme o locale do servidor
```

</details>

<details>
<summary>✅ Bom: cultura explícita, resultado previsível</summary>

```vbnet
Dim label = order.CreatedAt.ToString("dd/MM/yyyy", New CultureInfo("pt-BR"))
' "19/04/2026": independente do locale do servidor

' para APIs: ISO 8601 com InvariantCulture
Dim iso = order.CreatedAt.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture)
' "2026-04-19T14:00:00+00:00"
```

</details>
