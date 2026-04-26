# Project Foundation

> Escopo: Rust 1.95 (2024 Edition).

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Rust. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point enxuto,
> módulos por domínio, configuração centralizada.

Um projeto Rust bem fundado começa com `Cargo.toml` declarando o crate e suas dependências.
O entry point em `src/main.rs` inicializa configuração e delega para módulos de domínio.
Workspaces organizam múltiplos crates com dependências compartilhadas.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **crate** (pacote) | Unidade de compilação Rust; pode ser binário (`main.rs`) ou biblioteca (`lib.rs`) |
| **workspace** | Agrupa múltiplos crates sob um `Cargo.toml` raiz; dependências compartilhadas |
| **Cargo.toml** | Manifesto do crate: nome, versão, dependências, features |
| **Cargo.lock** | Versões exatas de todas as dependências; commitado em binários, ignorado em libs |
| **feature flags** | Compilação condicional de dependências opcionais declaradas em `[features]` |
| `rustup` | Gerenciador de toolchain: instala versões do compilador e targets cross-compile |

## Estrutura de arquivos

```
my-app/
├── Cargo.toml              ← crate: nome, versão, dependências
├── Cargo.lock              ← versões exatas (commitado em binários)
├── rust-toolchain.toml    ← versão fixa do compilador (channel = "stable")
├── .editorconfig           ← indentação, charset, trailing whitespace
├── .env.example            ← template — nunca commite .env
├── src/
│   ├── main.rs             ← entry point: carrega config, inicializa runtime
│   ├── config.rs           ← leitura de variáveis de ambiente
│   ├── error.rs            ← tipos de erro globais da aplicação
│   ├── order/
│   │   ├── mod.rs          ← re-exporta handler, service, repository
│   │   ├── handler.rs      ← HTTP handler (fronteira)
│   │   ├── service.rs      ← lógica de domínio
│   │   └── repository.rs   ← trait + implementação de persistência
│   └── user/
│       ├── mod.rs
│       ├── handler.rs
│       ├── service.rs
│       └── repository.rs
└── tests/
    └── order_integration.rs ← testes de integração (crate separado)
```

## Cargo.toml — configuração central

`Cargo.toml` declara o crate, versão mínima e dependências. Versões fixas garantem builds reproduzíveis.

<details>
<summary>❌ Bad — versões sem pin, sem toolchain</summary>
<br>

```toml
[package]
name = "my-app"
version = "0.1.0"

[dependencies]
tokio = "*"
serde = "*"
```

</details>

<br>

<details>
<summary>✅ Good — dependências versionadas e features explícitas</summary>
<br>

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2024"

[dependencies]
tokio = { version = "1.44", features = ["full"] }
axum = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "2"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
dotenvy = "0.15"

[dev-dependencies]
tokio = { version = "1.44", features = ["full", "test-util"] }
```

```toml
# rust-toolchain.toml
[toolchain]
channel = "stable"
```

</details>

## Entry point enxuto

`src/main.rs` declara intenção, não implementa. Toda lógica fica em módulos.

<details>
<summary>❌ Bad — main.rs como dumping ground</summary>
<br>

```rust
#[tokio::main]
async fn main() {
    let database_url = std::env::var("DATABASE_URL").unwrap();
    let pool = sqlx::PgPool::connect(&database_url).await.unwrap();

    let app = axum::Router::new()
        .route("/orders", axum::routing::get(|_| async {
            // lógica de negócio inline
            let rows = sqlx::query!("SELECT * FROM orders").fetch_all(&pool).await.unwrap();
            axum::Json(rows)
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

</details>

<br>

<details>
<summary>✅ Good — main.rs como índice, lógica delegada</summary>
<br>

```rust
mod config;
mod error;
mod order;
mod user;

use anyhow::Context;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let cfg = config::load().context("failed to load config")?;
    let app = server::build(&cfg).await.context("failed to build server")?;

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr)
        .await
        .context("failed to bind")?;

    tracing::info!(addr = %cfg.bind_addr, "server started");
    axum::serve(listener, app).await.context("server error")
}
```

</details>

## Configuração centralizada

`src/config.rs` é o único ponto de leitura de variáveis de ambiente.
Nenhum módulo acessa `std::env::var` diretamente.

<details>
<summary>❌ Bad — env var lida em qualquer lugar</summary>
<br>

```rust
// src/order/repository.rs
pub fn new() -> Self {
    let db_url = std::env::var("DATABASE_URL").unwrap(); // leitura direta
    Self { db_url }
}

// src/auth/middleware.rs
let secret = std::env::var("JWT_SECRET").unwrap(); // espalhado
```

</details>

<br>

<details>
<summary>✅ Good — Config como único ponto de entrada de env vars</summary>
<br>

```rust
// src/config.rs
use anyhow::{Context, Result};

pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub bind_addr: String,
}

pub fn load() -> Result<Config> {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .context("DATABASE_URL is required")?;

    let jwt_secret = std::env::var("JWT_SECRET")
        .context("JWT_SECRET is required")?;

    let bind_addr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:3000".to_string());

    let cfg = Config { database_url, jwt_secret, bind_addr };

    Ok(cfg)
}
```

```rust
// src/order/repository.rs — recebe Config por injeção
pub struct OrderRepository {
    pool: sqlx::PgPool,
}

impl OrderRepository {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}
```

</details>

## Módulos por domínio

Cada domínio agrupa handler, service e repository. Evite estrutura por camada técnica.

<details>
<summary>❌ Bad — estrutura por camada</summary>
<br>

```
src/
├── handlers/
│   ├── order.rs
│   └── user.rs
├── services/
│   ├── order.rs
│   └── user.rs
└── repositories/
    ├── order.rs
    └── user.rs
```

</details>

<br>

<details>
<summary>✅ Good — estrutura por domínio</summary>
<br>

```
src/
├── order/
│   ├── mod.rs         ← re-exporta o que o router precisa
│   ├── handler.rs     ← deserializa request, chama service, serializa response
│   ├── service.rs     ← regras de negócio
│   └── repository.rs  ← trait Repository + implementação com sqlx
└── user/
    ├── mod.rs
    ├── handler.rs
    ├── service.rs
    └── repository.rs
```

</details>
