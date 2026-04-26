# Security Setup

> Escopo: Rust 1.95. Especificidades do ecossistema Rust.
> Princípios gerais de segurança: [shared/platform/security.md](../../../shared/platform/security.md)

Rust elimina classes inteiras de vulnerabilidade por design (buffer overflow, use-after-free,
data races). O que resta requer atenção explícita: gestão de secrets, validação de entrada
e uso seguro de `unsafe`.

## Secrets e variáveis de ambiente

Use `dotenvy` para carregar `.env` localmente. Nunca commite `.env`. Centralize
toda leitura de env vars em `src/config.rs`.

<details>
<summary>❌ Bad — secret hardcoded</summary>
<br>

```rust
const JWT_SECRET: &str = "minha-chave-super-secreta"; // exposto no git

fn sign_token(user_id: u64) -> String {
    jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &Claims { sub: user_id },
        &jsonwebtoken::EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .unwrap()
}
```

</details>

<br>

<details>
<summary>✅ Good — secret via variável de ambiente</summary>
<br>

```rust
// .env.example
// JWT_SECRET=troque-por-valor-seguro-em-producao

// src/config.rs
pub struct Config {
    pub jwt_secret: String,
}

pub fn load() -> anyhow::Result<Config> {
    dotenvy::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .context("JWT_SECRET is required")?;

    Ok(Config { jwt_secret })
}

// src/auth/token.rs
pub fn sign_token(user_id: u64, secret: &str) -> anyhow::Result<String> {
    let key = jsonwebtoken::EncodingKey::from_secret(secret.as_bytes());

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &Claims { sub: user_id },
        &key,
    )?;

    Ok(token)
}
```

</details>

## Validação na fronteira

Valide toda entrada externa no handler antes de passar para o service.
Use tipos como contratos: se o compilador aceita o tipo, os invariantes estão garantidos.

<details>
<summary>❌ Bad — dado cru repassado sem validação</summary>
<br>

```rust
async fn create_order(
    axum::Json(body): axum::Json<serde_json::Value>,
) -> impl axum::response::IntoResponse {
    let customer_id = body["customer_id"].as_u64().unwrap(); // pânico em prod
    let amount = body["amount"].as_f64().unwrap();           // sem validação

    order_service::create(customer_id, amount).await
}
```

</details>

<br>

<details>
<summary>✅ Good — tipo validado na fronteira do handler</summary>
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
}

async fn create_order(
    axum::Json(body): axum::Json<CreateOrderRequest>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    body.validate()?;

    let order = order_service::create(body.customer_id, body.amount).await?;

    Ok(axum::Json(order))
}
```

</details>

## Uso de `unsafe`

`unsafe` desabilita as garantias do compilador. Exige justificativa explícita no comentário
e revisão obrigatória em code review.

<details>
<summary>❌ Bad — unsafe sem justificativa</summary>
<br>

```rust
fn read_config_ptr(ptr: *const u8, len: usize) -> &'static str {
    unsafe { std::str::from_utf8_unchecked(std::slice::from_raw_parts(ptr, len)) }
}
```

</details>

<br>

<details>
<summary>✅ Good — unsafe justificado ou eliminado com safe alternative</summary>
<br>

```rust
// Versão safe — prefira sempre que possível
fn read_config(raw: &[u8]) -> anyhow::Result<&str> {
    let text = std::str::from_utf8(raw)
        .context("config bytes are not valid UTF-8")?;

    Ok(text)
}

// Quando unsafe for inevitável: justifique o invariante que garante segurança
//
// SAFETY: `ptr` aponta para um buffer válido de `len` bytes alinhado e inicializado.
// O chamador garante que o buffer vive pelo menos tão longo quanto 'a.
unsafe fn read_raw<'a>(ptr: *const u8, len: usize) -> &'a str {
    let slice = std::slice::from_raw_parts(ptr, len);
    std::str::from_utf8_unchecked(slice)
}
```

</details>
