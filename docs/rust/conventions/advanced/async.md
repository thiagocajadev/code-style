# Async

> Escopo: Rust 1.95.

Rust async é baseado em `Future`s poll-driven e zero-cost. O runtime padrão é o Tokio.
Funções `async fn` retornam um `Future` que só executa quando aguardado com `.await`.

→ Para ownership e `Arc` em contextos async, veja [null-safety.md](null-safety.md).

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `async fn` | Declara uma função assíncrona; retorna um `Future<Output = T>` implicitamente |
| `.await` | Suspende a task corrente até o `Future` resolver; não bloqueia a thread |
| **Tokio** | Runtime async mais usado; gerencia thread pool, I/O e timers |
| `tokio::spawn` | Lança uma task independente no runtime; retorna `JoinHandle<T>` |
| `tokio::select!` | Aguarda múltiplos `Future`s em paralelo; retorna o que resolver primeiro |
| `tokio::join!` | Aguarda múltiplos `Future`s em paralelo; retorna todos os resultados |
| **graceful shutdown** (encerramento suave) | Sinaliza tasks para completar o trabalho corrente antes de encerrar |

## Tokio runtime

`#[tokio::main]` configura o runtime multi-thread no entry point.
Use `#[tokio::test]` nos testes assíncronos.

<details>
<summary>❌ Bad — runtime bloqueante misturado com async</summary>
<br>

```rust
fn main() {
    let order = tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(fetch_order(1)); // runtime inline, sem controle de ciclo de vida
    println!("{:?}", order);
}
```

</details>

<br>

<details>
<summary>✅ Good — #[tokio::main] no entry point</summary>
<br>

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cfg = config::load()?;
    let app = server::build(&cfg).await?;

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;

    axum::serve(listener, app).await?;

    Ok(())
}
```

</details>

## Concorrência com tokio::join!

Para operações independentes, execute em paralelo com `tokio::join!` em vez de `.await` sequencial.

<details>
<summary>❌ Bad — .await sequencial quando as operações são independentes</summary>
<br>

```rust
async fn load_dashboard(user_id: u64) -> anyhow::Result<Dashboard> {
    let orders = fetch_orders(user_id).await?;       // espera ~50ms
    let invoices = fetch_invoices(user_id).await?;   // espera ~50ms depois
    let balance = fetch_balance(user_id).await?;     // espera ~50ms depois
    // total: ~150ms
    Ok(Dashboard { orders, invoices, balance })
}
```

</details>

<br>

<details>
<summary>✅ Good — tokio::join! executa em paralelo</summary>
<br>

```rust
async fn load_dashboard(user_id: u64) -> anyhow::Result<Dashboard> {
    let (orders, invoices, balance) = tokio::try_join!(
        fetch_orders(user_id),
        fetch_invoices(user_id),
        fetch_balance(user_id),
    )?;
    // total: ~50ms

    let dashboard = Dashboard { orders, invoices, balance };

    Ok(dashboard)
}
```

</details>

## tokio::spawn — tasks independentes

Use `spawn` para tasks que devem rodar em segundo plano, independentes do fluxo atual.
Sempre faça `await` no `JoinHandle` ou capture erros.

<details>
<summary>❌ Bad — spawn sem controle de ciclo de vida</summary>
<br>

```rust
async fn process_order(order: Order) {
    tokio::spawn(async move {
        send_confirmation_email(&order).await.unwrap(); // pânico sem visibilidade
    });
    // JoinHandle descartado: erro silenciado, sem shutdown seguro
}
```

</details>

<br>

<details>
<summary>✅ Good — JoinHandle capturado e erro registrado</summary>
<br>

```rust
async fn process_order(order: Order) -> anyhow::Result<()> {
    persist_order(&order).await?;

    let handle = tokio::spawn(async move {
        if let Err(error) = send_confirmation_email(&order).await {
            tracing::error!(%error, order_id = order.id, "failed to send confirmation");
        }
    });

    handle.await.context("email task panicked")?;

    Ok(())
}
```

</details>

## Graceful shutdown

Use `tokio::signal` para capturar `SIGTERM`/`Ctrl-C` e encerrar o servidor sem cortar
requisições em andamento.

<details>
<summary>❌ Bad — processo encerrado abruptamente</summary>
<br>

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    axum::serve(listener, app).await?;
    Ok(())
}
```

</details>

<br>

<details>
<summary>✅ Good — shutdown signal aguardado antes de encerrar</summary>
<br>

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }

    tracing::info!("shutdown signal received");
}
```

</details>

## Bloqueio em async context

Nunca execute operações bloqueantes diretamente em tasks async. Use `spawn_blocking` para
código CPU-intensivo ou I/O síncrono.

<details>
<summary>❌ Bad — bloqueio na thread do runtime</summary>
<br>

```rust
async fn generate_report(order_id: u64) -> anyhow::Result<Vec<u8>> {
    let pdf = heavy_pdf_library::render_pdf(order_id); // bloqueia a thread do Tokio
    Ok(pdf)
}
```

</details>

<br>

<details>
<summary>✅ Good — CPU-bound em thread dedicada via spawn_blocking</summary>
<br>

```rust
async fn generate_report(order_id: u64) -> anyhow::Result<Vec<u8>> {
    let pdf = tokio::task::spawn_blocking(move || {
        heavy_pdf_library::render_pdf(order_id)
    })
    .await
    .context("report generation task panicked")??;

    Ok(pdf)
}
```

</details>
