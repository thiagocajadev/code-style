# Visual Density

> Escopo: Rust 1.95.

Densidade visual é o espaçamento intencional entre grupos de código. Linhas semanticamente
relacionadas ficam juntas; grupos distintos são separados por uma linha em branco.

## Parede de código

Código sem respiro força o leitor a segmentar mentalmente blocos que deveriam ser visíveis.

<details>
<summary>❌ Bad — nenhuma separação entre fases lógicas</summary>
<br>

```rust
async fn create_order(pool: &sqlx::PgPool, request: CreateOrderRequest) -> anyhow::Result<Order> {
    request.validate()?;
    let customer = find_customer(pool, request.customer_id).await?;
    let discount_rate = compute_discount_rate(&customer);
    let total = request.items.iter().map(|i| i.price * i.qty as f64).sum::<f64>();
    let final_total = total * (1.0 - discount_rate);
    let order_id = sqlx::query_scalar!("INSERT INTO orders (customer_id, total) VALUES ($1, $2) RETURNING id", customer.id, final_total).fetch_one(pool).await?;
    let order = Order { id: order_id, customer_id: customer.id, total: final_total };
    Ok(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — fases separadas por linha em branco</summary>
<br>

```rust
async fn create_order(pool: &sqlx::PgPool, request: CreateOrderRequest) -> anyhow::Result<Order> {
    request.validate()?;

    let customer = find_customer(pool, request.customer_id).await?;
    let discount_rate = compute_discount_rate(&customer);

    let subtotal: f64 = request.items.iter().map(|i| i.price * i.qty as f64).sum();
    let final_total = subtotal * (1.0 - discount_rate);

    let order_id = insert_order(pool, customer.id, final_total).await?;
    let order = Order { id: order_id, customer_id: customer.id, total: final_total };

    Ok(order)
}
```

</details>

## Blank antes do return em funções com múltiplos passos

Quando a função tem mais de uma fase, separe o return final por uma linha em branco.
Funções de uma linha ou expressão simples não precisam.

<details>
<summary>❌ Bad — return colado ao último passo</summary>
<br>

```rust
fn calculate_invoice_total(order: &Order) -> f64 {
    let subtotal: f64 = order.items.iter().map(|i| i.price).sum();
    let tax = subtotal * TAX_RATE;
    let total = subtotal + tax;
    total
}
```

</details>

<br>

<details>
<summary>✅ Good — return separado por blank</summary>
<br>

```rust
fn calculate_invoice_total(order: &Order) -> f64 {
    let subtotal: f64 = order.items.iter().map(|i| i.price).sum();
    let tax = subtotal * TAX_RATE;
    let total = subtotal + tax;

    total
}
```

</details>

## Orphan de uma linha

Uma linha isolada entre dois grupos densos força o olho a parar sem motivo.
Agrupe atomics relacionados ou separe em dois grupos distintos.

<details>
<summary>❌ Bad — linha isolada no meio do fluxo</summary>
<br>

```rust
let customer = find_customer(pool, request.customer_id).await?;

let discount_rate = compute_discount_rate(&customer);
let subtotal: f64 = request.items.iter().map(|i| i.price).sum();
let final_total = subtotal * (1.0 - discount_rate);

let order_id = insert_order(pool, customer.id, final_total).await?;
```

</details>

<br>

<details>
<summary>✅ Good — agrupamento semântico coeso</summary>
<br>

```rust
let customer = find_customer(pool, request.customer_id).await?;
let discount_rate = compute_discount_rate(&customer);

let subtotal: f64 = request.items.iter().map(|i| i.price).sum();
let final_total = subtotal * (1.0 - discount_rate);

let order_id = insert_order(pool, customer.id, final_total).await?;
```

</details>

## Struct e impl

Separe campos de struct por grupo semântico. Em `impl`, separe métodos por linha em branco.

<details>
<summary>❌ Bad — campos e métodos sem respiração</summary>
<br>

```rust
struct Order {
    pub id: u64,
    pub customer_id: u64,
    pub status: OrderStatus,
    pub total: f64,
    pub discount: Option<f64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}
impl Order {
    pub fn is_paid(&self) -> bool { self.status == OrderStatus::Paid }
    pub fn apply_discount(&mut self, rate: f64) { self.discount = Some(rate); self.total *= 1.0 - rate; }
    pub fn mark_cancelled(&mut self) { self.status = OrderStatus::Cancelled; }
}
```

</details>

<br>

<details>
<summary>✅ Good — grupos semânticos com respiro</summary>
<br>

```rust
struct Order {
    pub id: u64,
    pub customer_id: u64,
    pub status: OrderStatus,

    pub total: f64,
    pub discount: Option<f64>,

    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl Order {
    pub fn is_paid(&self) -> bool {
        self.status == OrderStatus::Paid
    }

    pub fn apply_discount(&mut self, rate: f64) {
        self.discount = Some(rate);
        self.total *= 1.0 - rate;
    }

    pub fn mark_cancelled(&mut self) {
        self.status = OrderStatus::Cancelled;
    }
}
```

</details>
