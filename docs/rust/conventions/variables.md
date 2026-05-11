# Variables

> Escopo: Rust 1.95.

Rust é imutável por padrão. `let` cria uma ligação imutável; `let mut` é necessário apenas
quando o valor precisa mudar. O compilador avisa sobre `mut` desnecessário.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **let** (ligação imutável) | Declara binding que não pode ser reatribuído; default em Rust |
| **let mut** (ligação alterável) | Declara binding que aceita reatribuição ou alteração in-place |
| **shadowing** (sombreamento) | Redeclarar `let x` no mesmo escopo; cria novo binding, pode mudar tipo |
| **type inference** (inferência de tipo) | Compilador deduz o tipo a partir do uso; anote só quando ambíguo ou na fronteira pública |
| **const** (constante avaliada em compilação) | Valor inlinado em todo call site; tipo obrigatório, sem endereço de memória |
| **static** (variável global de duração `'static`) | Item com endereço fixo durante a execução do programa |

## let vs let mut

<details>
<summary>❌ Ruim — mut desnecessário</summary>

```rust
let mut user_id = 42_u64;      // nunca muda
let mut order_total = 0.0_f64; // calculado uma vez e lido

let mut status = "active";
println!("{}", status);        // status nunca alterado após a declaração
```

</details>

<details>
<summary>✅ Bom — mut apenas onde necessário</summary>

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
<summary>❌ Ruim — valores mágicos sem nome</summary>

```rust
fn is_order_eligible(total: f64) -> bool {
    total >= 50.0 // o que significa 50?
}

fn retry_request(attempt: u32) -> bool {
    attempt < 3 // e 3?
}
```

</details>

<details>
<summary>✅ Bom — constantes nomeadas com intenção</summary>

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
<summary>❌ Ruim — variáveis intermediárias desnecessárias</summary>

```rust
let raw_input = read_input();
let parsed_input = parse(raw_input).unwrap();
let validated_input = validate(parsed_input).unwrap();
let order_from_input = build_order(validated_input);
```

</details>

<details>
<summary>✅ Bom — shadowing para transformações progressivas</summary>

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
<summary>❌ Ruim — anotação redundante onde a inferência é clara</summary>

```rust
let user_id: u64 = 42_u64;
let name: String = String::from("Alice");
let items: Vec<Item> = vec![item_a, item_b];
```

</details>

<details>
<summary>✅ Bom — anote quando agrega informação</summary>

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
<summary>❌ Ruim — variáveis declaradas longe do uso</summary>

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

<details>
<summary>✅ Bom — declaração próxima ao uso</summary>

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
