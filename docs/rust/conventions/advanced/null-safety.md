# Null Safety

> Escopo: Rust 1.95.

Rust não tem `null`. A ausência de valor é representada por `Option<T>`: `Some(T)` quando
o valor existe, `None` quando não existe. O compilador exige que cada `Option` seja
tratado antes de usar o valor interno.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `Option<T>` | Tipo que representa presença (`Some`) ou ausência (`None`) de um valor |
| `.unwrap()` | Extrai `Some(T)` ou pânica em `None`; proibido em produção |
| `.expect("msg")` | Como `unwrap()`, com mensagem de pânico customizada; proibido em produção |
| `?` em Option | Com `#[feature(try_trait_v2)]` ou convertido para `Result` via `.ok_or` |
| `if let Some(x)` | Desestrutura `Option` em uma condição |
| `let-else` | Guard clause com desestruturação: `let Some(x) = opt else { return; }` |
| `.map()` | Transforma `Some(T)` em `Some(U)` sem tocar `None` |
| `.and_then()` | Encadeia uma operação que retorna `Option` (flatmap) |
| `.unwrap_or()` | Retorna o valor ou um fallback em `None` |

## unwrap em produção

<details>
<summary>❌ Bad — unwrap pânica em None</summary>
<br>

```rust
fn get_shipping_address(order: &Order) -> String {
    order.shipping_address.clone().unwrap() // pânica se endereço não foi informado
}
```

</details>

<br>

<details>
<summary>✅ Good — Option propagada ou tratada explicitamente</summary>
<br>

```rust
fn get_shipping_address(order: &Order) -> Option<&str> {
    order.shipping_address.as_deref()
}

// ou com fallback:
fn get_shipping_address_or_default(order: &Order) -> &str {
    order.shipping_address.as_deref().unwrap_or("endereço não informado")
}
```

</details>

## let-else como guard clause

`let-else` é a forma idiomática de guard clause com desestruturação de `Option`.

<details>
<summary>❌ Bad — if/else aninhado para Option</summary>
<br>

```rust
fn apply_coupon(order: &mut Order, coupon_code: Option<String>) {
    if coupon_code.is_some() {
        let code = coupon_code.unwrap();
        if code.len() > 3 {
            order.discount = Some(0.1);
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — let-else para guard, if para validação</summary>
<br>

```rust
fn apply_coupon(order: &mut Order, coupon_code: Option<String>) {
    let Some(code) = coupon_code else {
        return;
    };

    if code.len() <= 3 {
        return;
    }

    order.discount = Some(0.1);
}
```

</details>

## Encadeamento com map e and_then

Transforme e encadeie `Option` sem sair da cadeia funcional.

<details>
<summary>❌ Bad — checagem manual com if let em cada passo</summary>
<br>

```rust
fn get_customer_city(order: &Order) -> Option<String> {
    if let Some(customer) = &order.customer {
        if let Some(address) = &customer.address {
            if let Some(city) = &address.city {
                return Some(city.to_uppercase());
            }
        }
    }
    None
}
```

</details>

<br>

<details>
<summary>✅ Good — cadeia map/and_then</summary>
<br>

```rust
fn get_customer_city(order: &Order) -> Option<String> {
    let city = order.customer
        .as_ref()
        .and_then(|customer| customer.address.as_ref())
        .and_then(|address| address.city.as_ref())
        .map(|city| city.to_uppercase());

    city
}
```

</details>

## Option para Result

Converta `Option` em `Result` quando precisar de `?` para propagação de erro.

<details>
<summary>❌ Bad — match manual para converter Option em Result</summary>
<br>

```rust
async fn find_active_order(order_id: u64) -> anyhow::Result<Order> {
    let order = match fetch_order(order_id).await? {
        Some(o) => o,
        None => return Err(anyhow::anyhow!("order not found")),
    };

    Ok(order)
}
```

</details>

<br>

<details>
<summary>✅ Good — ok_or_else converte Option em Result idiomaticamente</summary>
<br>

```rust
async fn find_active_order(order_id: u64) -> anyhow::Result<Order> {
    let order = fetch_order(order_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("order {} not found", order_id))?;

    Ok(order)
}
```

</details>

## Arc para ownership compartilhado em async

Em contextos async, dados compartilhados entre tasks requerem `Arc` para contagem de
referências thread-safe. `Mutex` ou `RwLock` para mutabilidade compartilhada.

<details>
<summary>❌ Bad — clone excessivo de dados grandes</summary>
<br>

```rust
async fn process_batch(orders: Vec<Order>) {
    for order in orders.clone() { // clone caro do vetor inteiro
        tokio::spawn(async move {
            process_order(order).await;
        });
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — Arc para ownership compartilhado sem clone</summary>
<br>

```rust
use std::sync::Arc;

async fn process_batch(orders: Vec<Order>) {
    let orders = Arc::new(orders);

    let handles: Vec<_> = (0..orders.len()).map(|i| {
        let orders = Arc::clone(&orders);

        tokio::spawn(async move {
            process_order(&orders[i]).await;
        })
    }).collect();

    for handle in handles {
        handle.await.ok();
    }
}
```

</details>
