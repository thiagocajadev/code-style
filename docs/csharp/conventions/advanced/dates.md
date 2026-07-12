# Datas e horas em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

O `DateTime` do C# guarda, além da data e da hora, um campo `Kind` que diz se aquele instante é local, é **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) ou é indefinido. O problema é que a maior parte das formas de criar um `DateTime` deixa esse campo como indefinido, e o valor passa a depender de quem o lê. Use **DateTimeOffset**, que carrega o deslocamento em relação ao UTC dentro do próprio valor. Guarde tudo em UTC, que é a referência comum entre servidores, e converta para o **timezone** (fuso horário) do usuário só na hora de exibir.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **DateTime** (data e hora) | Tipo de data/hora cujo campo `Kind` pode ser `Local`, `Utc` ou `Unspecified`; ambíguo por padrão |
| **DateTimeOffset** (data, hora e deslocamento) | Tipo que carrega o offset junto com o instante; elimina ambiguidade entre fusos |
| **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) | Referência global de tempo sem fuso; padrão para armazenamento e troca entre serviços |
| **Kind** (tipo de instante) | Campo de `DateTime` que indica se o valor é local, UTC ou indefinido |
| **TimeZoneInfo** (informação de fuso horário) | Tipo que descreve um fuso e suas regras; usado para converter UTC em hora local |
| **DateOnly / TimeOnly** (apenas data / apenas hora) | Tipos do .NET 6+ para representar apenas data ou apenas hora, sem componente residual |
| **ISO 8601** (padrão internacional de formato de data) | Formato textual `YYYY-MM-DDTHH:mm:ssZ` para troca interoperável de instantes |

<a id="datetime-now-vs-utcnow"></a>

## Marcar o instante em UTC

`DateTime.Now` devolve a hora do relógio da máquina onde o código roda. Dois servidores em regiões diferentes, ou dois containers com fuso diferente, gravam horas diferentes para o mesmo acontecimento, e comparar esses valores depois produz respostas erradas. `DateTimeOffset.UtcNow` devolve sempre o mesmo instante, com o deslocamento explícito no valor.

<details>
<summary>❌ Ruim: hora local do servidor, Kind implícito</summary>

```csharp
var createdAt = DateTime.Now;
// Kind: Local (depende do timezone do servidor)
// Comparações entre servidores em timezones diferentes produzem resultados errados
```

</details>

<details>
<summary>✅ Bom: UTC explícito, comparável em qualquer ambiente</summary>

```csharp
var createdAt = DateTimeOffset.UtcNow;
// Offset: +00:00 (inequívoco, portável)
// Serializa como "2026-04-19T14:00:00+00:00"
```

</details>

<a id="datetime-vs-datetimeoffset"></a>

## DateTimeOffset carrega o fuso junto do valor

Um `DateTime` com `Kind` indefinido no contrato da API entrega ao cliente um `"2026-04-19T14:00:00"` que não diz de que fuso aquilo veio. Cada lado interpreta com a própria convenção, e a diferença aparece como um pedido criado três horas no futuro. `DateTimeOffset` serializa `"2026-04-19T14:00:00+00:00"`, e o `+00:00` responde a pergunta sem depender de combinação prévia.

<details>
<summary>❌ Ruim: DateTime sem Kind perde contexto de timezone</summary>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required DateTime CreatedAt { get; init; }
    // Kind: Unspecified: impossível saber se é UTC ou local sem convenção externa
}
```

</details>

<details>
<summary>✅ Bom: DateTimeOffset carrega o offset, sem ambiguidade</summary>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    // "2026-04-19T14:00:00+00:00" (timezone embutida no valor)
}
```

</details>

<a id="dateonly-and-timeonly"></a>

## DateOnly e TimeOnly

Uma data de nascimento não tem hora. Guardá-la num `DateTime` acrescenta um `00:00:00` que ninguém pediu, e esse zero vira problema quando o valor é convertido de fuso: a meia-noite de 21 de agosto em São Paulo é o dia 20 em UTC, e a data de nascimento anda um dia para trás. `DateOnly` e `TimeOnly` (.NET 6+) guardam só o que interessa e não têm o que deslocar.

<details>
<summary>❌ Ruim: DateTime para data pura, hora fantasma causa bugs</summary>

```csharp
public record CustomerRequest
{
    public required string Name { get; init; }
    public required DateTime BirthDate { get; init; }
    // "1990-08-21T00:00:00": hora zero sem sentido, sujeita a deslocamento de timezone
}
```

</details>

<details>
<summary>✅ Bom: DateOnly para data, TimeOnly para hora, intenção clara</summary>

```csharp
public record CustomerRequest
{
    public required string Name { get; init; }
    public required DateOnly BirthDate { get; init; }
    // "1990-08-21" (só data, sem componente de hora)
}

public record ScheduleRequest
{
    public required DateOnly Date { get; init; }
    public required TimeOnly StartTime { get; init; }
    // "09:30:00" (só hora, sem data acoplada)
}
```

</details>

<a id="ef-store-utc"></a>

## Gravar e ler no banco sem perder o fuso

O EF Core grava o `DateTime` conforme o `Kind` que ele encontrar. Quando o `Kind` é indefinido, o valor vai para o banco sem conversão e volta indefinido na leitura: a informação de fuso não estava lá para se perder. Declarar a propriedade como `DateTimeOffset` resolve na origem. O EF mapeia para `datetimeoffset` no SQL Server e `timestamptz` no PostgreSQL, e o deslocamento sobrevive à ida e à volta sem configuração extra.

<details>
<summary>❌ Ruim: DateTime sem Kind, round-trip ambíguo com o banco</summary>

```csharp
public class Order
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; } // Kind: Unspecified após leitura do banco
}
```

</details>

<details>
<summary>✅ Bom: DateTimeOffset no modelo, EF preserva offset no banco</summary>

```csharp
public class Order
{
    public Guid Id { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    // SQL Server: datetimeoffset, PostgreSQL: timestamptz
    // Offset preservado no round-trip, sem configuração extra
}
```

</details>
