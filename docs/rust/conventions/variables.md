# Variables

> Escopo: Rust 1.95.

Rust é imutável por padrão. `let` cria uma ligação imutável; `let mut` é necessário apenas
quando o valor precisa mudar. O compilador avisa sobre `mut` desnecessário.

## let vs let mut

<details>
<summary>❌ Bad — mut desnecessário</summary>
<br>

```rust
let mut user_id = 42_u64;      // nunca muda
let mut order_total = 0.0_f64; // calculado uma vez e lido

let mut status = "active";
println!("{}", status);        // status nunca alterado após a declaração
```

</details>

<br>

<details>
<summary>✅ Good — mut apenas onde necessário</summary>
<br>

```rust
let user_id = 42_u64;

let mut total = 0.0_f64;
for item in &order.items {
    total += item.price;
}

let is_eligible = total >= MINIMUM_ORDER_VALUE;
```

</details>

## Constantes nomeadas

Evite literais mágicos inline. `const` é avaliada em tempo de compilação e pode ser
usada em qualquer escopo, incluindo dentro de funções.

<details>
<summary>❌ Bad — valores mágicos sem nome</summary>
<br>

```rust
fn is_order_eligible(total: f64) -> bool {
    total >= 50.0 // o que significa 50?
}

fn retry_request(attempt: u32) -> bool {
    attempt < 3 // e 3?
}
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas com intenção</summary>
<br>

```rust
const MINIMUM_ORDER_VALUE: f64 = 50.0;
const MAX_RETRIES: u32 = 3;

fn is_order_eligible(total: f64) -> bool {
    total >= MINIMUM_ORDER_VALUE
}

fn should_retry(attempt: u32) -> bool {
    attempt < MAX_RETRIES
}
```

</details>

## Shadowing

Shadowing substitui uma ligação no mesmo escopo ou em um escopo interno.
É idiomático para transformações progressivas do mesmo dado.

<details>
<summary>❌ Bad — variáveis intermediárias desnecessárias</summary>
<br>

```rust
let raw_input = read_input();
let parsed_input = parse(raw_input).unwrap();
let validated_input = validate(parsed_input).unwrap();
let order_from_input = build_order(validated_input);
```

</details>

<br>

<details>
<summary>✅ Good — shadowing para transformações progressivas</summary>
<br>

```rust
let order = read_input()?;
let order = parse_order(order)?;
let order = validate_order(order)?;
let order = enrich_order(order)?;
```

</details>

## Inferência de tipo vs anotação explícita

O compilador infere tipos na maioria dos casos. Anote explicitamente quando a inferência
não fica óbvia ou quando o tipo comunica intenção.

<details>
<summary>❌ Bad — anotação redundante onde a inferência é clara</summary>
<br>

```rust
let user_id: u64 = 42_u64;
let name: String = String::from("Alice");
let items: Vec<Item> = vec![item_a, item_b];
```

</details>

<br>

<details>
<summary>✅ Good — anote quando agrega informação</summary>
<br>

```rust
let user_id = 42_u64; // sufixo já diz o tipo

let timeout: Duration = Duration::from_secs(30); // tipo comunica intenção

let scores: HashMap<u64, f64> = HashMap::new(); // sem valor inicial, inferência falha
```

</details>

## Escopo mínimo

Declare variáveis no escopo mais estreito possível. Evite declarar no topo da função
variáveis que só serão usadas no final.

<details>
<summary>❌ Bad — variáveis declaradas longe do uso</summary>
<br>

```rust
fn process_order(order: &Order) -> anyhow::Result<Receipt> {
    let discount_rate: f64;
    let final_total: f64;
    let receipt: Receipt;

    // ... 20 linhas de lógica ...

    discount_rate = compute_discount(order);
    final_total = order.total * (1.0 - discount_rate);
    receipt = Receipt::new(final_total);

    Ok(receipt)
}
```

</details>

<br>

<details>
<summary>✅ Good — declaração próxima ao uso</summary>
<br>

```rust
fn process_order(order: &Order) -> anyhow::Result<Receipt> {
    validate_order(order)?;

    let discount_rate = compute_discount(order);
    let final_total = order.total * (1.0 - discount_rate);
    let receipt = Receipt::new(final_total);

    Ok(receipt)
}
```

</details>
