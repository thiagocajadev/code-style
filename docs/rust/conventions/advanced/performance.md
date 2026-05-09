# Performance

> Escopo: Rust 1.95.
> Princípios gerais de performance: [shared/platform/performance.md](../../../../shared/platform/performance.md)

Rust é zero-cost por design: abstrações não têm overhead de runtime. O maior risco de
performance em Rust é a clonagem desnecessária de dados e a alocação onde referências
seriam suficientes.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **ownership** (posse) | Cada valor tem um único dono; transferir ownership move o valor sem copiar |
| **borrowing** (empréstimo) | Referência temporária ao valor sem transferir ownership: `&T` (imutável) ou `&mut T` (mutável) |
| **clone** | Cópia profunda explícita; nunca implícita em Rust; use quando necessário |
| **zero-cost abstraction** | Iteradores, closures e generics compilam para código equivalente ao manual |
| `Cow<'a, T>` | Clone-on-write: usa referência quando possível, aloca apenas ao modificar |
| `Arc<T>` | Referência contada para ownership compartilhado entre threads |

## Clone desnecessário

Clone só quando o valor precisa viver mais que a referência ou quando não é possível emprestar.

<details>
<summary>❌ Bad — clone onde &str seria suficiente</summary>
<br>

```rust
fn log_order_id(order: &Order) {
    let id = order.id.to_string().clone(); // clone desnecessário de String
    println!("processing order {}", id);
}

fn find_by_name(orders: &[Order], name: String) -> Option<&Order> { // String quando &str bastaria
    orders.iter().find(|o| o.name == name)
}
```

</details>

<br>

<details>
<summary>✅ Good — referências onde o valor não precisa ser owned</summary>
<br>

```rust
fn log_order_id(order: &Order) {
    tracing::info!(order_id = order.id, "processing order");
}

fn find_by_name<'a>(orders: &'a [Order], name: &str) -> Option<&'a Order> {
    orders.iter().find(|o| o.name == name)
}
```

</details>

## &str vs String em parâmetros

Parâmetros de função que apenas leem strings devem aceitar `&str` para ser compatíveis
com tanto `String` quanto `&str` sem alocação.

<details>
<summary>❌ Bad — String em parâmetro que só lê</summary>
<br>

```rust
fn validate_email(email: String) -> bool {
    email.contains('@') && email.len() > 3
}

// chamador precisa clonar ou mover:
validate_email(user.email.clone());
```

</details>

<br>

<details>
<summary>✅ Good — &str aceita String e &str sem alocação</summary>
<br>

```rust
fn validate_email(email: &str) -> bool {
    email.contains('@') && email.len() > 3
}

// chamador usa referência direta:
validate_email(&user.email);
validate_email("alice@example.com");
```

</details>

## Iteradores vs collect antecipado

Não colete em `Vec` antes de precisar do resultado final. Encadeie iteradores lazy.

<details>
<summary>❌ Bad — coleta intermediária desnecessária</summary>
<br>

```rust
fn get_paid_order_totals(orders: &[Order]) -> f64 {
    let paid: Vec<&Order> = orders.iter().filter(|o| o.is_paid).collect();
    let totals: Vec<f64> = paid.iter().map(|o| o.total).collect();
    totals.iter().sum()
}
```

</details>

<br>

<details>
<summary>✅ Good — pipeline lazy sem alocação intermediária</summary>
<br>

```rust
fn get_paid_order_totals(orders: &[Order]) -> f64 {
    orders
        .iter()
        .filter(|o| o.is_paid)
        .map(|o| o.total)
        .sum()
}
```

</details>

## HashMap com capacidade pré-alocada

Quando o tamanho do `HashMap` é conhecido de antemão, pré-aloque para evitar rehashing.

<details>
<summary>❌ Bad — HashMap sem capacidade inicial</summary>
<br>

```rust
fn index_orders(orders: &[Order]) -> std::collections::HashMap<u64, &Order> {
    let mut index = std::collections::HashMap::new(); // cresce com rehashing

    for order in orders {
        index.insert(order.id, order);
    }

    index
}
```

</details>

<br>

<details>
<summary>✅ Good — with_capacity evita rehashing</summary>
<br>

```rust
fn index_orders(orders: &[Order]) -> std::collections::HashMap<u64, &Order> {
    let mut index = std::collections::HashMap::with_capacity(orders.len());

    for order in orders {
        index.insert(order.id, order);
    }

    index
}
```

</details>

## Benchmarks com Criterion

Use `criterion` para benchmarks reproduzíveis. Não confie em timing manual.

<details>
<summary>✅ Good — benchmark com criterion</summary>
<br>

```rust
// benches/order_bench.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn benchmark_order_total(bencher: &mut Criterion) {
    let orders = generate_test_orders(1000);

    bencher.bench_function("calculate_totals_1k_orders", |b| {
        b.iter(|| get_paid_order_totals(&orders))
    });
}

criterion_group!(benches, benchmark_order_total);
criterion_main!(benches);
```

</details>
