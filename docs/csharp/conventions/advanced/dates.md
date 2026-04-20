# Dates

> Escopo: C#. Idiomas específicos deste ecossistema.

`DateTime` em C# tem uma armadilha central: o campo `Kind` pode ser `Local`, `Utc` ou
`Unspecified`, e a maioria das construções produz `Unspecified` sem aviso. Prefira
`DateTimeOffset` para eliminar a ambiguidade: o offset está embutido no tipo.

## DateTime.Now vs DateTimeOffset.UtcNow

`DateTime.Now` captura a hora local do servidor. Em deploys multi-region ou containers com
timezones diferentes, o mesmo código produz valores incomparáveis.

<details>
<summary>❌ Bad — hora local do servidor, Kind implícito</summary>
<br>

```csharp
var createdAt = DateTime.Now;
// Kind: Local — depende do timezone do servidor
// Comparações entre servidores em timezones diferentes produzem resultados errados
```

</details>

<br>

<details>
<summary>✅ Good — UTC explícito, comparável em qualquer ambiente</summary>
<br>

```csharp
var createdAt = DateTimeOffset.UtcNow;
// Offset: +00:00 — inequívoco, portável
// Serializa como "2026-04-19T14:00:00+00:00"
```

</details>

## DateTime vs DateTimeOffset

`DateTime` perde a informação de timezone. `DateTimeOffset` carrega o offset junto ao valor,
sem precisar de contexto externo para interpretar o instante.

<details>
<summary>❌ Bad — DateTime sem Kind perde contexto de timezone</summary>
<br>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required DateTime CreatedAt { get; init; }
    // Kind: Unspecified — impossível saber se é UTC ou local sem convenção externa
}
```

</details>

<br>

<details>
<summary>✅ Good — DateTimeOffset carrega o offset, sem ambiguidade</summary>
<br>

```csharp
public record OrderResponse
{
    public required Guid Id { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    // "2026-04-19T14:00:00+00:00" — timezone embutida no valor
}
```

</details>

## DateOnly e TimeOnly

`DateTime` para representar apenas uma data arrasta um componente de hora (`00:00:00`) sem
significado, que pode causar bugs de timezone ao ser serializado. `DateOnly` e `TimeOnly`
(.NET 6+) expressam a intenção com precisão.

<details>
<summary>❌ Bad — DateTime para data pura, hora fantasma causa bugs</summary>
<br>

```csharp
public record CustomerRequest
{
    public required string Name { get; init; }
    public required DateTime BirthDate { get; init; }
    // "1990-08-21T00:00:00" — hora zero sem sentido, sujeita a shift de timezone
}
```

</details>

<br>

<details>
<summary>✅ Good — DateOnly para data, TimeOnly para hora — intenção clara</summary>
<br>

```csharp
public record CustomerRequest
{
    public required string Name { get; init; }
    public required DateOnly BirthDate { get; init; }
    // "1990-08-21" — só data, sem componente de hora
}

public record ScheduleRequest
{
    public required DateOnly Date { get; init; }
    public required TimeOnly StartTime { get; init; }
    // "09:30:00" — só hora, sem data acoplada
}
```

</details>

## Entity Framework: armazenar UTC

EF Core serializa `DateTime` conforme o `Kind`. Sem configuração explícita, valores `Unspecified`
são salvos sem conversão; o que for lido do banco volta como `Unspecified` também.

<details>
<summary>❌ Bad — DateTime sem Kind, round-trip ambíguo com o banco</summary>
<br>

```csharp
public class Order
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; } // Kind: Unspecified após leitura do banco
}
```

</details>

<br>

<details>
<summary>✅ Good — DateTimeOffset no modelo, EF preserva offset no banco</summary>
<br>

```csharp
public class Order
{
    public Guid Id { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    // SQL Server: datetimeoffset — PostgreSQL: timestamptz
    // Offset preservado no round-trip, sem configuração extra
}
```

</details>
