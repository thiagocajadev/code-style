# Functions

> Escopo: Rust 1.95.

Funções Rust retornam a última expressão implicitamente ou usam `return` explícito para
saída antecipada. O operador `?` propaga erros sem ruído. Closures são primeiro-classe.

## SLA — uma responsabilidade, um nível

Cada função executa uma operação ou orquestra outras. Nunca as duas ao mesmo tempo.

<details>
<summary>❌ Bad — função que faz tudo</summary>
<br>

```rust
async fn process_checkout(user_id: u64, cart: Cart) -> anyhow::Result<Receipt> {
    // valida
    if cart.items.is_empty() {
        return Err(anyhow::anyhow!("cart is empty"));
    }

    // calcula
    let total = cart.items.iter().map(|i| i.price * i.qty as f64).sum::<f64>();
    let discount = if user_id % 2 == 0 { 0.1 } else { 0.0 };
    let final_total = total * (1.0 - discount);

    // persiste
    let order_id = sqlx::query_scalar!(
        "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id",
        user_id as i64,
        final_total,
    )
    .fetch_one(&pool)
    .await?;

    // notifica
    send_email(user_id, order_id).await?;

    Ok(Receipt { order_id, total: final_total })
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador + funções de detalhe</summary>
<br>

```rust
async fn process_checkout(user_id: u64, cart: Cart) -> anyhow::Result<Receipt> {
    validate_cart(&cart)?;

    let total = calculate_total(&cart, user_id);
    let order_id = persist_order(user_id, total).await?;

    notify_customer(user_id, order_id).await?;

    let receipt = Receipt { order_id, total };

    Ok(receipt)
}

fn validate_cart(cart: &Cart) -> anyhow::Result<()> {
    anyhow::ensure!(!cart.items.is_empty(), "cart is empty");
    Ok(())
}

fn calculate_total(cart: &Cart, user_id: u64) -> f64 {
    let subtotal: f64 = cart.items.iter().map(|i| i.price * i.qty as f64).sum();
    let discount_rate = compute_discount_rate(user_id);

    subtotal * (1.0 - discount_rate)
}
```

</details>

## Stepdown — orquestrador acima dos detalhes

Leia o código de cima para baixo: funções de alto nível primeiro, detalhes depois.

<details>
<summary>❌ Bad — detalhes antes do orquestrador</summary>
<br>

```rust
fn compute_discount_rate(user_id: u64) -> f64 {
    if user_id % 2 == 0 { 0.1 } else { 0.0 }
}

fn calculate_total(cart: &Cart, user_id: u64) -> f64 {
    let subtotal: f64 = cart.items.iter().map(|i| i.price * i.qty as f64).sum();
    subtotal * (1.0 - compute_discount_rate(user_id))
}

async fn process_checkout(user_id: u64, cart: Cart) -> anyhow::Result<Receipt> {
    // orquestrador no final do arquivo
}
```

</details>

<br>

<details>
<summary>✅ Good — orquestrador declarado primeiro</summary>
<br>

```rust
async fn process_checkout(user_id: u64, cart: Cart) -> anyhow::Result<Receipt> {
    validate_cart(&cart)?;
    let total = calculate_total(&cart, user_id);
    let order_id = persist_order(user_id, total).await?;
    notify_customer(user_id, order_id).await?;

    Ok(Receipt { order_id, total })
}

fn calculate_total(cart: &Cart, user_id: u64) -> f64 {
    let subtotal: f64 = cart.items.iter().map(|i| i.price * i.qty as f64).sum();
    subtotal * (1.0 - compute_discount_rate(user_id))
}

fn compute_discount_rate(user_id: u64) -> f64 {
    if user_id % 2 == 0 { 0.1 } else { 0.0 }
}
```

</details>

## Sem lógica no retorno

Extraia o resultado antes de retornar. O `return` (ou a última expressão) nomeia o resultado,
não o computa.

<details>
<summary>❌ Bad — lógica inline no retorno</summary>
<br>

```rust
fn find_active_orders(orders: &[Order]) -> Vec<&Order> {
    orders.iter().filter(|o| o.status == OrderStatus::Active && o.total > 0.0).collect()
}
```

</details>

<br>

<details>
<summary>✅ Good — resultado extraído antes do retorno</summary>
<br>

```rust
fn find_active_orders(orders: &[Order]) -> Vec<&Order> {
    let active_orders = orders
        .iter()
        .filter(|o| o.status == OrderStatus::Active && o.total > 0.0)
        .collect();

    active_orders
}
```

</details>

## Explaining return

Quando o retorno não é óbvio, nomeie o resultado para comunicar intenção.

<details>
<summary>❌ Bad — retorno anônimo obscuro</summary>
<br>

```rust
fn build_invoice(order: &Order) -> Invoice {
    Invoice {
        id: uuid::Uuid::new_v4(),
        customer_id: order.customer_id,
        total: order.items.iter().map(|i| i.price).sum(),
        issued_at: chrono::Utc::now(),
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — resultado nomeado antes do retorno</summary>
<br>

```rust
fn build_invoice(order: &Order) -> Invoice {
    let invoice = Invoice {
        id: uuid::Uuid::new_v4(),
        customer_id: order.customer_id,
        total: order.items.iter().map(|i| i.price).sum(),
        issued_at: chrono::Utc::now(),
    };

    invoice
}
```

</details>

## Closures

Closures capturam o ambiente. Prefira closures curtas inline; extraia para função nomeada
quando a lógica crescer além de uma expressão.

<details>
<summary>❌ Bad — closure longa e sem nome</summary>
<br>

```rust
let processed: Vec<_> = orders.iter().map(|o| {
    let discount = if o.customer.is_vip { 0.15 } else { 0.05 };
    let total = o.total * (1.0 - discount);
    ProcessedOrder { id: o.id, total, discount }
}).collect();
```

</details>

<br>

<details>
<summary>✅ Good — lógica nomeada, closure como delegate</summary>
<br>

```rust
fn apply_pricing(order: &Order) -> ProcessedOrder {
    let discount = compute_discount_rate(&order.customer);
    let total = order.total * (1.0 - discount);

    ProcessedOrder { id: order.id, total, discount }
}

let processed: Vec<_> = orders.iter().map(apply_pricing).collect();
```

</details>
