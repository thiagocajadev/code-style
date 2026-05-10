# Observability

> Escopo: Rust 1.95.
> Princípios gerais de observabilidade: [shared/platform/observability.md](../../../../shared/platform/observability.md)

O ecossistema Rust usa a crate `tracing` como padrão de observabilidade estruturada.
`tracing` emite eventos e spans com campos estruturados, compatível com exportadores
OpenTelemetry, Jaeger e Datadog.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **span** (unidade rastreável de trabalho) | Início, fim e campos estruturados; rastreável em distributed tracing |
| **event** (evento pontual) | Ponto no tempo dentro de um span; equivale a uma linha de log |
| `#[instrument]` | Macro que cria um span automaticamente para a função anotada |
| **subscriber** (consumidor de eventos de tracing) | Configura saída (stdout, JSON, OTLP) |
| **level** (nível de severidade) | `trace`, `debug`, `info`, `warn`, `error` |

## Setup do subscriber

Configure `tracing_subscriber` no entry point. Use `env-filter` para controle por nível.

<details>
<summary>❌ Ruim — println! como logging</summary>
<br>

```rust
fn main() {
    println!("server started on port 3000");
    println!("connecting to database...");
}
```

</details>

<br>

<details>
<summary>✅ Bom — tracing_subscriber inicializado no entry point</summary>
<br>

```rust
fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into())
        )
        .init();

    tracing::info!("server started");

    Ok(())
}
```

</details>

## #[instrument] — span automático

`#[instrument]` cria um span para a função e registra os parâmetros como campos.
Use `skip` para omitir campos sensíveis ou grandes.

<details>
<summary>❌ Ruim — sem span, sem contexto de rastreamento</summary>
<br>

```rust
async fn find_order(pool: &sqlx::PgPool, order_id: u64) -> anyhow::Result<Option<Order>> {
    println!("looking for order {}", order_id); // sem correlation
    sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", order_id as i64)
        .fetch_optional(pool)
        .await
        .map_err(Into::into)
}
```

</details>

<br>

<details>
<summary>✅ Bom — #[instrument] com campos estruturados</summary>
<br>

```rust
#[tracing::instrument(skip(pool), fields(order_id))]
async fn find_order(pool: &sqlx::PgPool, order_id: u64) -> anyhow::Result<Option<Order>> {
    let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", order_id as i64)
        .fetch_optional(pool)
        .await
        .context("failed to query order")?;

    Ok(order)
}
```

</details>

## Níveis de evento

Use o nível adequado para cada tipo de informação.

| Nível | Quando usar |
| ----- | ----------- |
| `trace!` | Detalhe de execução interna; só em desenvolvimento |
| `debug!` | Estado útil para diagnóstico; desabilitado em produção por padrão |
| `info!` | Eventos de negócio e marcos do ciclo de vida |
| `warn!` | Situação inesperada mas recuperável |
| `error!` | Falha que impede a operação; requer atenção |

<details>
<summary>❌ Ruim — tudo em info, campos como strings</summary>
<br>

```rust
tracing::info!("error processing order: {}", error);
tracing::info!("order not found for user: {}", user_id);
tracing::info!("db query: SELECT * FROM orders WHERE id = {}", order_id);
```

</details>

<br>

<details>
<summary>✅ Bom — nível adequado + campos estruturados</summary>
<br>

```rust
tracing::error!(%error, order_id, "failed to process order");
tracing::warn!(user_id, "order not found, returning empty response");
tracing::debug!(order_id, "executing order query");
```

</details>

## Campos estruturados

Campos estruturados são indexáveis em ferramentas como Grafana Loki e Datadog.
Use `%value` para Display, `?value` para Debug, `field = value` para valores próprios.

<details>
<summary>❌ Ruim — contexto embutido na string</summary>
<br>

```rust
tracing::error!("failed to charge customer {} for order {} with amount {:.2}", customer_id, order_id, amount);
```

</details>

<br>

<details>
<summary>✅ Bom — campos estruturados separados da mensagem</summary>
<br>

```rust
tracing::error!(
    customer_id,
    order_id,
    amount,
    %error,
    "failed to charge customer",
);
```

</details>
