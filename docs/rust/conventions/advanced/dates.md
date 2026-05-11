# Dates

> Escopo: Rust 1.95.

O ecossistema Rust usa a crate `chrono` para datas e horários. UTC é o padrão para
armazenamento e transmissão; timezone local só na camada de apresentação.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `DateTime<Utc>` | Instante com timezone UTC explícito; use para persistir e transmitir |
| `DateTime<Local>` | Instante no timezone local do sistema; use apenas na UI |
| `NaiveDateTime` | Data/hora sem timezone; nunca use em produção |
| `NaiveDate` | Data sem hora e sem timezone; aceitável para datas de calendário |
| **RFC 3339** (perfil do ISO 8601 para internet) | Formato padrão de serialização: `2026-04-26T14:30:00Z` |
| `Utc::now()` | Instante atual em UTC; substitui `Local::now()` em qualquer lógica de negócio |

## Timezone explícito

Sempre use `DateTime<Utc>` em structs de domínio, persistência e APIs.
Nunca armazene `NaiveDateTime` sem documentar explicitamente que o timezone é implícito.

<details>
<summary>❌ Ruim: NaiveDateTime sem timezone</summary>

```rust
use chrono::NaiveDateTime;

struct Order {
    pub id: u64,
    pub created_at: NaiveDateTime, // qual timezone? não dá para saber
}

fn order_is_expired(order: &Order) -> bool {
    let now = chrono::Local::now().naive_local();
    now > order.created_at + chrono::Duration::days(30)
    // comparação errada se servidor mudar de timezone
}
```

</details>

<details>
<summary>✅ Bom: DateTime<Utc> explícito</summary>

```rust
use chrono::{DateTime, Utc};

struct Order {
    pub id: u64,
    pub created_at: DateTime<Utc>,
}

fn order_is_expired(order: &Order) -> bool {
    let expiry = order.created_at + chrono::Duration::days(30);
    Utc::now() > expiry
}
```

</details>

## Parsing de datas externas

Parse datas de entrada com formato explícito. Nunca confie em inferência de formato.

<details>
<summary>❌ Ruim: parse sem formato definido</summary>

```rust
fn parse_due_date(raw: &str) -> chrono::NaiveDate {
    chrono::NaiveDate::parse_from_str(raw, "%d/%m/%Y").unwrap() // pânico em formato inesperado
}
```

</details>

<details>
<summary>✅ Bom: parse com Result e formato documentado</summary>

```rust
use chrono::NaiveDate;

fn parse_due_date(raw: &str) -> anyhow::Result<NaiveDate> {
    // Formato esperado: YYYY-MM-DD (ISO 8601)
    NaiveDate::parse_from_str(raw, "%Y-%m-%d")
        .with_context(|| format!("invalid date '{}', expected YYYY-MM-DD", raw))
}
```

</details>

## Serialização com Serde

`chrono` integra com Serde via feature `serde`. Use o formato RFC 3339 para APIs.

<details>
<summary>❌ Ruim: timestamp como inteiro sem contexto</summary>

```rust
#[derive(serde::Serialize)]
struct OrderResponse {
    pub id: u64,
    pub created_at: i64, // Unix timestamp ambíguo: segundos ou milissegundos?
}
```

</details>

<details>
<summary>✅ Bom: DateTime<Utc> serializado como RFC 3339</summary>

```rust
use chrono::{DateTime, Utc};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OrderResponse {
    pub id: u64,

    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    // serializa como: "2026-04-26T14:30:00Z"
}
```

</details>

## Duração e intervalos

Use `chrono::Duration` para operações de data. Evite aritmética manual com segundos.

<details>
<summary>❌ Ruim: aritmética manual com segundos</summary>

```rust
fn is_session_valid(created_at: DateTime<Utc>) -> bool {
    let now = Utc::now().timestamp();
    let elapsed = now - created_at.timestamp();
    elapsed < 3600 // 3600: quantas horas? não é óbvio
}
```

</details>

<details>
<summary>✅ Bom: Duration com intenção legível</summary>

```rust
const SESSION_DURATION: chrono::Duration = chrono::Duration::hours(1);

fn is_session_valid(created_at: DateTime<Utc>) -> bool {
    let elapsed = Utc::now() - created_at;
    elapsed < SESSION_DURATION
}
```

</details>
