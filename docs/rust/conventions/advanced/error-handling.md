# Error Handling

> Escopo: Rust 1.95.

Em Rust, erros são valores. `Result<T, E>` é o tipo de retorno para qualquer operação
que pode falhar. O compilador exige tratamento explícito. `unwrap()` é pânico garantido
na presença de `Err` ou `None` e não tem lugar em código de produção.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `Result<T, E>` | `Ok(T)` em sucesso, `Err(E)` em falha; retornado explicitamente |
| `?` | Propaga `Err` para o chamador; equivalente a `return Err(e.into())` |
| **thiserror** | Crate para definir tipos de erro tipados em bibliotecas |
| **anyhow** | Crate para contexto de erro progressivo em aplicações |
| `.context()` | Método de `anyhow` que adiciona uma mensagem ao erro original |
| `unwrap()` / `expect()` | Pânico imediato em `Err` ou `None`; permitido apenas em testes e demos |

## unwrap e expect

Nunca use `unwrap()` ou `expect()` em código de produção. Use `?` ou trate o `Result`.

<details>
<summary>❌ Bad — unwrap que pânica em produção</summary>
<br>

```rust
fn load_config() -> Config {
    let raw = std::fs::read_to_string("config.toml").unwrap(); // pânico se arquivo ausente
    toml::from_str(&raw).unwrap()                              // pânico se TOML inválido
}
```

</details>

<br>

<details>
<summary>✅ Good — ? propaga o erro ao chamador</summary>
<br>

```rust
fn load_config() -> anyhow::Result<Config> {
    let raw = std::fs::read_to_string("config.toml")
        .context("failed to read config.toml")?;

    let config = toml::from_str(&raw)
        .context("failed to parse config.toml")?;

    Ok(config)
}
```

</details>

## anyhow para aplicações

`anyhow::Result` elimina a necessidade de definir tipos de erro quando o objetivo é
propagar contexto legível até o ponto de log ou resposta HTTP.

<details>
<summary>❌ Bad — Box<dyn Error> sem contexto</summary>
<br>

```rust
fn find_order(order_id: u64) -> Result<Order, Box<dyn std::error::Error>> {
    let order = db::query(order_id)?;
    Ok(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — anyhow com contexto progressivo</summary>
<br>

```rust
use anyhow::{Context, Result};

async fn find_order(pool: &sqlx::PgPool, order_id: u64) -> Result<Order> {
    let order = sqlx::query_as!(Order, "SELECT * FROM orders WHERE id = $1", order_id as i64)
        .fetch_optional(pool)
        .await
        .context("failed to query orders")?
        .ok_or_else(|| anyhow::anyhow!("order {} not found", order_id))?;

    Ok(order)
}
```

</details>

## Tipos de erro com thiserror

Use `thiserror` em bibliotecas e módulos com múltiplos tipos de falha distintos.
Permite que o chamador faça match no tipo de erro.

<details>
<summary>❌ Bad — String como tipo de erro</summary>
<br>

```rust
fn charge_customer(amount: f64) -> Result<Receipt, String> {
    if amount <= 0.0 {
        return Err("amount must be positive".to_string());
    }
    // ...
    Err("payment gateway timeout".to_string())
}
```

</details>

<br>

<details>
<summary>✅ Good — enum de erro tipado com thiserror</summary>
<br>

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PaymentError {
    #[error("amount must be positive, got {0}")]
    InvalidAmount(f64),

    #[error("payment gateway timeout after {timeout_ms}ms")]
    GatewayTimeout { timeout_ms: u64 },

    #[error("insufficient funds: balance {balance:.2}, required {required:.2}")]
    InsufficientFunds { balance: f64, required: f64 },

    #[error("gateway error: {0}")]
    Gateway(#[from] GatewayError),
}

async fn charge_customer(amount: f64) -> Result<Receipt, PaymentError> {
    if amount <= 0.0 {
        return Err(PaymentError::InvalidAmount(amount));
    }

    let receipt = gateway::charge(amount).await?;

    Ok(receipt)
}
```

</details>

## Erro silencioso

Nunca ignore um erro com `let _ = ...`. Propague ou registre no log.

<details>
<summary>❌ Bad — erro descartado silenciosamente</summary>
<br>

```rust
let _ = send_notification(user_id, message).await;    // falha ignorada
let _ = update_order_status(order_id, status).await;  // falha ignorada
```

</details>

<br>

<details>
<summary>✅ Good — erro registrado ou propagado</summary>
<br>

```rust
if let Err(error) = send_notification(user_id, message).await {
    tracing::warn!(%error, user_id, "failed to send notification");
}

update_order_status(order_id, status).await
    .context("failed to update order status")?;
```

</details>

## Fronteira HTTP — Result para resposta

Converta `Result` em resposta HTTP na fronteira do handler. Nunca deixe `anyhow::Error`
vazar para o cliente.

<details>
<summary>❌ Bad — erro interno exposto na resposta</summary>
<br>

```rust
async fn get_order(path: axum::extract::Path<u64>) -> String {
    let order = find_order(*path).await.unwrap();
    serde_json::to_string(&order).unwrap()
}
```

</details>

<br>

<details>
<summary>✅ Good — Result mapeado para status HTTP na fronteira</summary>
<br>

```rust
async fn get_order(
    axum::extract::Path(order_id): axum::extract::Path<u64>,
    axum::extract::State(pool): axum::extract::State<sqlx::PgPool>,
) -> Result<axum::Json<Order>, AppError> {
    let order = find_order(&pool, order_id).await?;

    Ok(axum::Json(order))
}

// AppError implementa IntoResponse e mapeia erros para status HTTP
impl axum::response::IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let status = match &self.0 {
            _ if self.0.to_string().contains("not found") => axum::http::StatusCode::NOT_FOUND,
            _ => axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        };

        (status, self.0.to_string()).into_response()
    }
}
```

</details>
