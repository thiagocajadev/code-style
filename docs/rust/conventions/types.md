# Types

> Escopo: Rust 1.95.

O sistema de tipos Rust é a principal ferramenta de modelagem de domínio. Structs,
enums e traits eliminam classes de bugs em tempo de compilação, sem custo em runtime.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **struct** | Produto de tipos: agrupa campos nomeados em um tipo composto |
| **enum** | Soma de tipos: uma variante de um conjunto fixo, cada uma podendo carregar dados |
| **trait** | Conjunto de comportamentos que um tipo pode implementar; equivalente a interface |
| **impl** | Bloco de implementação de métodos para um tipo ou trait |
| **Option\<T\>** | `Some(T)` ou `None`; substitui ponteiros nulos |
| **Result\<T, E\>** | `Ok(T)` ou `Err(E)`; operação que pode falhar |
| **newtype** | Wrapper de um único campo para distinguir tipos com o mesmo dado bruto |
| **generics** (genéricos) | Parâmetros de tipo `<T>` para reutilizar código sem perda de tipo |

## Struct — campos nomeados

Derive traits comuns com `#[derive]`. Não derive o que não vai usar.

<details>
<summary>❌ Bad — struct anêmica sem semântica</summary>
<br>

```rust
struct Data {
    pub a: String,
    pub b: f64,
    pub c: bool,
}
```

</details>

<br>

<details>
<summary>✅ Good — campos nomeados por domínio + derives úteis</summary>
<br>

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Order {
    pub id: u64,
    pub customer_id: u64,
    pub status: OrderStatus,
    pub total: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
```

</details>

## Enum como ADT

Enums Rust são **tipos de soma** (Algebraic Data Types): cada variante pode carregar
dados diferentes. Use para modelar estados e resultados distintos.

<details>
<summary>❌ Bad — status como string magic</summary>
<br>

```rust
struct Order {
    pub status: String, // "active", "paid", "cancelled" — sem garantia do compilador
}

fn is_paid(order: &Order) -> bool {
    order.status == "paid" // typo silencioso
}
```

</details>

<br>

<details>
<summary>✅ Good — enum exaustivo com dados por variante</summary>
<br>

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum OrderStatus {
    Pending,
    Paid { payment_id: String },
    Cancelled { reason: String },
    Refunded { amount: f64 },
}

fn is_paid(order: &Order) -> bool {
    matches!(order.status, OrderStatus::Paid { .. })
}
```

</details>

## Trait — comportamento sem herança

Traits definem contratos. Tipos implementam traits independentemente.
Prefira `impl Trait` em parâmetros para funções simples; `Box<dyn Trait>` para despacho dinâmico.

<details>
<summary>❌ Bad — lógica acoplada a um tipo concreto</summary>
<br>

```rust
struct EmailNotifier;
struct SmsNotifier;

fn notify_order_paid_email(notifier: &EmailNotifier, order: &Order) {}
fn notify_order_paid_sms(notifier: &SmsNotifier, order: &Order) {}
```

</details>

<br>

<details>
<summary>✅ Good — trait como contrato, impl por tipo</summary>
<br>

```rust
pub trait Notifier {
    async fn send(&self, user_id: u64, message: &str) -> anyhow::Result<()>;
}

pub struct EmailNotifier { pub smtp: SmtpClient }
pub struct SmsNotifier { pub twilio: TwilioClient }

impl Notifier for EmailNotifier {
    async fn send(&self, user_id: u64, message: &str) -> anyhow::Result<()> {
        // envia email
        Ok(())
    }
}

impl Notifier for SmsNotifier {
    async fn send(&self, user_id: u64, message: &str) -> anyhow::Result<()> {
        // envia SMS
        Ok(())
    }
}

async fn notify_order_paid(notifier: &impl Notifier, order: &Order) -> anyhow::Result<()> {
    notifier.send(order.customer_id, "seu pedido foi pago").await
}
```

</details>

## Option vs null

`Option<T>` força o tratamento explícito da ausência. Nunca use `unwrap()` em código de produção.

<details>
<summary>❌ Bad — unwrap que pânica em Option None</summary>
<br>

```rust
fn get_discount_label(order: &Order) -> String {
    let rate = order.discount_rate.unwrap(); // pânico se None
    format!("{:.0}% off", rate * 100.0)
}
```

</details>

<br>

<details>
<summary>✅ Good — Option tratado com map ou let-else</summary>
<br>

```rust
fn get_discount_label(order: &Order) -> Option<String> {
    let label = order.discount_rate.map(|rate| format!("{:.0}% off", rate * 100.0));

    label
}
```

</details>

## Newtype — distinção por tipo

Use newtype para distinguir valores com o mesmo tipo primitivo mas significados diferentes.
O compilador rejeita trocas acidentais.

<details>
<summary>❌ Bad — IDs intercambiáveis pelo compilador</summary>
<br>

```rust
fn transfer(from_account: u64, to_account: u64, amount: f64) {}

// chamada silenciosamente invertida:
transfer(to_id, from_id, 100.0);
```

</details>

<br>

<details>
<summary>✅ Good — newtype impede inversão silenciosa</summary>
<br>

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AccountId(u64);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Amount(f64);

fn transfer(from: AccountId, to: AccountId, amount: Amount) {}

// erro de compilação se from e to estiverem invertidos
```

</details>

## Generics — reutilização com tipo preservado

Generics evitam duplicação sem perder informação de tipo.

<details>
<summary>❌ Bad — lógica duplicada por tipo</summary>
<br>

```rust
fn find_first_active_order(orders: &[Order]) -> Option<&Order> {
    orders.iter().find(|o| o.is_active)
}

fn find_first_active_product(products: &[Product]) -> Option<&Product> {
    products.iter().find(|p| p.is_active)
}
```

</details>

<br>

<details>
<summary>✅ Good — trait bound genérico</summary>
<br>

```rust
pub trait HasActiveStatus {
    fn is_active(&self) -> bool;
}

fn find_first_active<T: HasActiveStatus>(items: &[T]) -> Option<&T> {
    items.iter().find(|item| item.is_active())
}
```

</details>
