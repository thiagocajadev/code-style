# Validation

> Escopo: Rust 1.95.
> Princípios gerais de validação: [shared/platform/security.md](../../../../shared/platform/security.md)

Valide na fronteira do sistema, não no interior do domínio. Use tipos como contratos:
um `OrderId` válido nunca chega ao service como zero ou negativo se o handler validar antes.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **fronteira de validação** | Ponto de entrada de dados externos (handler HTTP, CLI, mensagem de fila) |
| **tipo como contrato** | Encapsula invariantes no tipo; se compilou, o invariante está garantido |
| **parse, don't validate** | Transforme o dado bruto em um tipo validado imediatamente; não repasse `String` bruta |
| `validator` | Crate que deriva regras de validação via `#[validate(...)]` em structs |

## Parse, don't validate

Converta o dado bruto em um tipo validado o mais cedo possível. Funções internas aceitam
apenas o tipo validado.

<details>
<summary>❌ Bad — String bruta repassada para o domínio</summary>
<br>

```rust
async fn create_order(email: String, amount: f64) -> anyhow::Result<Order> {
    // email pode ser inválido, amount pode ser negativo — sem garantia
    let order = OrderService::create(email, amount).await?;
    Ok(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — tipo validado como contrato</summary>
<br>

```rust
pub struct ValidatedEmail(String);

impl ValidatedEmail {
    pub fn parse(raw: &str) -> anyhow::Result<Self> {
        anyhow::ensure!(raw.contains('@') && raw.len() > 3, "invalid email: {}", raw);
        Ok(Self(raw.to_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub struct PositiveAmount(f64);

impl PositiveAmount {
    pub fn new(amount: f64) -> anyhow::Result<Self> {
        anyhow::ensure!(amount > 0.0, "amount must be positive, got {}", amount);
        Ok(Self(amount))
    }

    pub fn value(&self) -> f64 {
        self.0
    }
}

async fn create_order(email: ValidatedEmail, amount: PositiveAmount) -> anyhow::Result<Order> {
    // o compilador garante que email e amount são válidos
    let order = OrderService::create(email.as_str(), amount.value()).await?;
    Ok(order)
}
```

</details>

## validator — regras declarativas em structs

Use `#[derive(Validate)]` para validação declarativa de requests de entrada.

<details>
<summary>❌ Bad — validação manual espalhada no handler</summary>
<br>

```rust
async fn create_order_handler(
    axum::Json(body): axum::Json<serde_json::Value>,
) -> impl axum::response::IntoResponse {
    let customer_id = body["customer_id"].as_u64().unwrap_or(0);
    if customer_id == 0 {
        return (axum::http::StatusCode::BAD_REQUEST, "invalid customer_id").into_response();
    }

    let amount = body["amount"].as_f64().unwrap_or(-1.0);
    if amount <= 0.0 {
        return (axum::http::StatusCode::BAD_REQUEST, "amount must be positive").into_response();
    }

    // ...
    axum::http::StatusCode::OK.into_response()
}
```

</details>

<br>

<details>
<summary>✅ Good — validator derive + validação centralizada</summary>
<br>

```rust
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOrderRequest {
    #[validate(range(min = 1))]
    pub customer_id: u64,

    #[validate(range(min = 0.01))]
    pub amount: f64,

    #[validate(length(min = 1, max = 10))]
    pub items: Vec<OrderItem>,
}

async fn create_order_handler(
    axum::Json(body): axum::Json<CreateOrderRequest>,
) -> Result<axum::Json<Order>, AppError> {
    body.validate()?;

    let order = order_service::create(body).await?;

    Ok(axum::Json(order))
}
```

</details>

## Erros de validação — mensagem útil ao cliente

Mensagens de erro de validação devem ser legíveis e identificar o campo problemático.

<details>
<summary>❌ Bad — erro genérico sem campo</summary>
<br>

```rust
fn validate_payment(payment: &Payment) -> anyhow::Result<()> {
    anyhow::ensure!(payment.amount > 0.0, "invalid payment");
    anyhow::ensure!(!payment.card_number.is_empty(), "invalid payment");
    Ok(())
}
```

</details>

<br>

<details>
<summary>✅ Good — erro com campo e valor</summary>
<br>

```rust
fn validate_payment(payment: &Payment) -> anyhow::Result<()> {
    anyhow::ensure!(
        payment.amount > 0.0,
        "payment.amount must be positive, got {}",
        payment.amount
    );
    anyhow::ensure!(
        !payment.card_number.is_empty(),
        "payment.card_number is required"
    );

    Ok(())
}
```

</details>
