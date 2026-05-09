# Testing

> Escopo: Rust 1.95.

Testes em Rust são first-class: `#[test]` é nativo. Testes unitários ficam no mesmo arquivo
do código que testam, em um módulo `#[cfg(test)]`. Testes de integração ficam em `tests/`.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `#[test]` | Marca uma função como teste unitário; executada por `cargo test` |
| `#[cfg(test)]` | Compila o bloco apenas durante `cargo test`; não vai para o binário de produção |
| `#[tokio::test]` | Variante async de `#[test]` para código que usa `.await` |
| **table-driven tests** | Vec de structs com entrada + saída esperada; um loop roda todos os casos |
| `assert_eq!` | Falha com mensagem legível se os dois valores não forem iguais; exige `PartialEq + Debug` |
| `assert!` | Falha se a expressão booleana for `false` |
| `tests/` | Diretório para testes de integração; cada arquivo é uma crate separada |
| `PartialEq` | Trait que habilita `==` e `assert_eq!`; derive em todos os tipos testados |
| `Debug` | Trait que habilita a mensagem de falha do assert; derive junto com `PartialEq` |

## Estrutura do módulo de teste

<details>
<summary>❌ Bad — teste misturado com código de produção, sem módulo</summary>
<br>

```rust
pub fn calculate_discount(total: f64) -> f64 {
    if total >= 100.0 { total * 0.1 } else { 0.0 }
}

#[test]
fn test_discount() {
    assert_eq!(calculate_discount(200.0), 20.0);
}
```

</details>

<br>

<details>
<summary>✅ Good — testes isolados em #[cfg(test)]</summary>
<br>

```rust
pub fn calculate_discount(total: f64) -> f64 {
    if total >= 100.0 { total * 0.1 } else { 0.0 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_discount_when_total_meets_threshold() {
        let discount = calculate_discount(200.0);

        assert_eq!(discount, 20.0);
    }

    #[test]
    fn no_discount_below_threshold() {
        let discount = calculate_discount(50.0);

        assert_eq!(discount, 0.0);
    }
}
```

</details>

## Table-driven tests

Agrupe variações do mesmo comportamento em uma tabela de casos. Evite copiar o mesmo
teste com valores diferentes.

<details>
<summary>❌ Bad — um test por variação</summary>
<br>

```rust
#[test]
fn discount_100() { assert_eq!(calculate_discount(100.0), 10.0); }

#[test]
fn discount_200() { assert_eq!(calculate_discount(200.0), 20.0); }

#[test]
fn no_discount_50() { assert_eq!(calculate_discount(50.0), 0.0); }

#[test]
fn no_discount_99() { assert_eq!(calculate_discount(99.0), 0.0); }
```

</details>

<br>

<details>
<summary>✅ Good — table-driven com casos nomeados</summary>
<br>

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discount_cases() {
        let cases = vec![
            ("at threshold", 100.0, 10.0),
            ("above threshold", 200.0, 20.0),
            ("below threshold", 99.99, 0.0),
            ("zero total", 0.0, 0.0),
        ];

        for (label, total, expected) in cases {
            let discount = calculate_discount(total);
            assert_eq!(discount, expected, "case: {}", label);
        }
    }
}
```

</details>

## Testes assíncronos com tokio::test

<details>
<summary>❌ Bad — block_on manual em teste async</summary>
<br>

```rust
#[test]
fn find_order_returns_none_when_missing() {
    let result = tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(find_order(999));
    assert!(result.is_none());
}
```

</details>

<br>

<details>
<summary>✅ Good — #[tokio::test] como runtime do teste</summary>
<br>

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn returns_none_when_order_not_found() {
        let pool = setup_test_pool().await;

        let order = find_order(&pool, 999).await.unwrap();

        assert!(order.is_none());
    }
}
```

</details>

## Naming de testes

O nome do teste descreve o comportamento esperado, não o método chamado.
Formato: `<contexto>_<ação>_<resultado esperado>` ou `<comportamento em prosa>`.

<details>
<summary>❌ Bad — nome que repete o método</summary>
<br>

```rust
#[test] fn test_calculate_discount() {}
#[test] fn test_find_order() {}
#[test] fn test_apply_coupon() {}
```

</details>

<br>

<details>
<summary>✅ Good — nome que descreve o comportamento</summary>
<br>

```rust
#[test] fn applies_10_percent_discount_when_total_at_threshold() {}
#[test] fn returns_none_when_order_does_not_exist() {}
#[test] fn ignores_coupon_when_code_is_too_short() {}
```

</details>

## assert — traits obrigatórias

`assert_eq!` e `assert_ne!` exigem que o tipo implemente `PartialEq` e `Debug`.
Sem essas derives, o compilador rejeita o assert. Adicione-as em todos os tipos usados em testes.

<details>
<summary>❌ Bad — tipo sem PartialEq e Debug</summary>
<br>

```rust
pub struct Order {
    pub id: u64,
    pub total: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_order_with_correct_total() {
        let order = Order { id: 1, total: 99.0 };

        assert_eq!(order.total, 99.0); // compila
        assert_eq!(order, Order { id: 1, total: 99.0 }); // erro: PartialEq não implementado
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — derives que habilitam assert_eq! e mensagem de falha legível</summary>
<br>

```rust
#[derive(Debug, PartialEq)]
pub struct Order {
    pub id: u64,
    pub total: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_order_with_correct_total() {
        let order = Order { id: 1, total: 99.0 };

        assert_eq!(order, Order { id: 1, total: 99.0 });
        // falha exibe: left: Order { id: 1, total: 50.0 }
        //             right: Order { id: 1, total: 99.0 }
    }
}
```

</details>

## Fases AAA — Arrange, Act, Assert, Arrumar, Agir, Atestar

Testes Rust são funções comuns: AAA aplica sem adaptação. Separe as fases por linha em branco.

<details>
<summary>❌ Bad — fases misturadas, dois comportamentos no mesmo teste</summary>
<br>

```rust
#[test]
fn applies_vip_discount() {
    let discount = calculate_discount(Order { total: 500.0, customer: Customer { is_vip: true } });
    assert_eq!(discount, 75.0);
    let no_discount = calculate_discount(Order { total: 500.0, customer: Customer { is_vip: false } });
    assert_eq!(no_discount, 50.0);
}
```

</details>

<br>

<details>
<summary>✅ Good — um comportamento por teste, fases explícitas</summary>
<br>

```rust
#[test]
fn applies_extra_discount_for_vip_customers() {
    let order = Order {
        total: 500.0,
        customer: Customer { is_vip: true },
    };

    let discount = calculate_discount(&order);

    assert_eq!(discount, 75.0);
}
```

</details>
