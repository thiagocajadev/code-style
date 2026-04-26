# Control Flow

> Escopo: Rust 1.95.
> Referência canônica: [shared/standards/control-flow.md](../../../shared/standards/control-flow.md)

Rust favorece fluxo linear e explícito. O operador `?` propaga erros cedo sem aninhamento.
`match` é exaustivo por design: o compilador rejeita casos não cobertos.

## if/else

Dois caminhos mutuamente exclusivos. Nunca use `else` após um `return` — isso cria
indentação desnecessária e esconde o caminho feliz.

<details>
<summary>❌ Bad — else após return</summary>
<br>

```rust
fn get_discount(order: &Order) -> f64 {
    if !order.customer.is_active {
        return 0.0;
    } else {
        return order.total * 0.1; // else desnecessário
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — retorno antecipado, sem else</summary>
<br>

```rust
fn get_discount(order: &Order) -> f64 {
    if !order.customer.is_active {
        return 0.0;
    }

    order.total * 0.1
}
```

</details>

## if como expressão — ternário

Rust não tem operador ternário (`?:`). Use `if` como expressão para atribuir dois valores
possíveis em uma linha. Nunca aninhe `if` expressões.

<details>
<summary>❌ Bad — variável mutável para simular ternário</summary>
<br>

```rust
let label;
if order.is_paid {
    label = "pago";
} else {
    label = "pendente";
}
```

</details>

<br>

<details>
<summary>✅ Good — if como expressão</summary>
<br>

```rust
let label = if order.is_paid { "pago" } else { "pendente" };
```

</details>

## Guard clause com `?`

`?` propaga `Err` ou `None` para o chamador imediatamente. É o mecanismo idiomático de
guard clause em funções que retornam `Result` ou `Option`.

<details>
<summary>❌ Bad — match aninhado para propagação de erro</summary>
<br>

```rust
fn load_order(order_id: u64) -> Result<Order, AppError> {
    match find_order(order_id) {
        Err(e) => Err(e),
        Ok(order) => {
            match validate_order(&order) {
                Err(e) => Err(e),
                Ok(_) => {
                    match enrich_order(order) {
                        Err(e) => Err(e),
                        Ok(enriched) => Ok(enriched),
                    }
                }
            }
        }
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — ? em cadeia linear</summary>
<br>

```rust
fn load_order(order_id: u64) -> anyhow::Result<Order> {
    let order = find_order(order_id)?;

    validate_order(&order)?;

    let enriched = enrich_order(order)?;

    Ok(enriched)
}
```

</details>

## if let e let-else

Use `if let` quando apenas um braço tem ação. Use `let-else` para guard clause com
desestruturação de `Option` ou `Result` — saída antecipada se o valor não existe.

<details>
<summary>❌ Bad — unwrap que pânica em None</summary>
<br>

```rust
fn apply_coupon(order: &mut Order, coupon: Option<String>) {
    let code = coupon.unwrap(); // pânica se None
    order.discount = Some(compute_discount(&code));
}
```

</details>

<br>

<details>
<summary>✅ Good — let-else como guard clause</summary>
<br>

```rust
fn apply_coupon(order: &mut Order, coupon: Option<String>) {
    let Some(code) = coupon else {
        return;
    };

    order.discount = Some(compute_discount(&code));
}
```

</details>

## Lookup com HashMap

Substitua chains de `if/else` para mapeamento de chave → valor por um `HashMap`.
Com 3 ou mais entradas, o mapa é mais legível e extensível.

<details>
<summary>❌ Bad — if/else chain para mapear chave em valor</summary>
<br>

```rust
fn get_status_label(status: &str) -> &str {
    if status == "paid" {
        "Pago"
    } else if status == "pending" {
        "Pendente"
    } else if status == "cancelled" {
        "Cancelado"
    } else if status == "refunded" {
        "Reembolsado"
    } else {
        "Desconhecido"
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — HashMap como tabela de mapeamento</summary>
<br>

```rust
use std::collections::HashMap;

fn get_status_label(status: &str) -> &str {
    let labels: HashMap<&str, &str> = HashMap::from([
        ("paid",      "Pago"),
        ("pending",   "Pendente"),
        ("cancelled", "Cancelado"),
        ("refunded",  "Reembolsado"),
    ]);

    labels.get(status).copied().unwrap_or("Desconhecido")
}
```

</details>

## match

`match` cobre 3 ou mais casos sobre o mesmo valor. É exaustivo por garantia do compilador:
todos os casos precisam ser cobertos. Evite `_ => {}` silencioso que esconde variantes.

<details>
<summary>❌ Bad — catch-all que esconde variantes não tratadas</summary>
<br>

```rust
fn handle_status(status: OrderStatus) {
    match status {
        OrderStatus::Paid => process_payment(),
        _ => {} // esconde Pending, Cancelled, Refunded — sem intenção explícita
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — match exaustivo, cada variante com ação explícita</summary>
<br>

```rust
fn handle_status(status: OrderStatus) {
    match status {
        OrderStatus::Paid      => process_payment(),
        OrderStatus::Pending   => schedule_reminder(),
        OrderStatus::Cancelled => archive_order(),
        OrderStatus::Refunded  => notify_finance(),
    }
}
```

</details>

<details>
<summary>✅ Good — match para 3+ variantes com valor (substitui ternário aninhado)</summary>
<br>

```rust
let label = match order.status {
    OrderStatus::Paid      => "pago",
    OrderStatus::Pending   => "pendente",
    OrderStatus::Cancelled => "cancelado",
    OrderStatus::Refunded  => "reembolsado",
};
```

</details>

## Circuit break — `.find()`, `.any()`, `.all()`

Para busca ou verificação que deve parar no primeiro match, use iteradores funcionais.
Evite `for` com `break` manual.

<details>
<summary>❌ Bad — for com flag e break manual</summary>
<br>

```rust
let mut has_overdue = false;

for order in &orders {
    if order.is_overdue {
        has_overdue = true;
        break;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — .any() para verificação que para no primeiro true</summary>
<br>

```rust
let has_overdue = orders.iter().any(|order| order.is_overdue);
```

</details>

<details>
<summary>✅ Good — .find() para busca do primeiro elemento que satisfaz condição</summary>
<br>

```rust
let first_paid = orders.iter().find(|order| order.status == OrderStatus::Paid);
```

</details>

<details>
<summary>✅ Good — .all() para verificar se todos satisfazem condição</summary>
<br>

```rust
let all_delivered = orders.iter().all(|order| order.is_delivered);
```

</details>

## for — iteração com efeito colateral

Use `for` para iterar com efeito colateral por item. Prefira iteradores funcionais quando
o objetivo é transformar ou filtrar — reserve `for` para efeitos como enviar, salvar, logar.

<details>
<summary>❌ Bad — for com índice quando o índice não é usado</summary>
<br>

```rust
for i in 0..orders.len() {
    send_notification(&orders[i]);
}
```

</details>

<br>

<details>
<summary>✅ Good — for sobre referência direta</summary>
<br>

```rust
for order in &orders {
    send_notification(order);
}
```

</details>

<details>
<summary>✅ Good — iterador funcional quando o resultado importa</summary>
<br>

```rust
let paid_totals: Vec<f64> = orders
    .iter()
    .filter(|order| order.status == OrderStatus::Paid)
    .map(|order| order.total)
    .collect();
```

</details>

## while e while let

`while` para critério de parada por condição sem coleção pré-definida.
`while let` para consumir um `Option` iterativamente — para quando `None`.

<details>
<summary>❌ Bad — while com flag booleano desnecessário</summary>
<br>

```rust
let mut done = false;
let mut result = None;

while !done {
    if let Some(item) = queue.pop() {
        if item.is_valid() {
            result = Some(item);
            done = true;
        }
    } else {
        done = true;
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — while let idiomático</summary>
<br>

```rust
let mut result = None;

while let Some(item) = queue.pop() {
    if item.is_valid() {
        result = Some(item);
        break;
    }
}
```

</details>

## loop — equivalente ao do-while

`loop` garante ao menos uma execução antes de verificar a condição de saída.
É o equivalente Rust de `do-while`. Use `break value` para retornar um resultado.

<details>
<summary>❌ Bad — while com inicialização fora do loop</summary>
<br>

```rust
let mut attempt = 0;
let mut result = Err(anyhow::anyhow!("not started"));

while attempt < MAX_RETRIES {
    result = try_connect();
    if result.is_ok() {
        break;
    }
    attempt += 1;
}
```

</details>

<br>

<details>
<summary>✅ Good — loop com break value</summary>
<br>

```rust
let connection = loop {
    match try_connect() {
        Ok(conn) => break conn,
        Err(error) if attempt < MAX_RETRIES => {
            tracing::warn!(%error, attempt, "retrying connection");
            attempt += 1;
        }
        Err(error) => return Err(error).context("failed to connect after retries"),
    }
};
```

</details>
