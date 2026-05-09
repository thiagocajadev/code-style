# Control Flow

Controle de fluxo evolui com a complexidade. A ferramenta certa depende de quantas condições
existem, se mapeiam valores ou executam ações, e se o fluxo pode precisar de saída antecipada.

## If e else

O ponto de partida. Para dois caminhos, `if/else` funciona. O `else` após um `return` é ruído:
o fluxo já saiu.

<details>
<summary>❌ Bad — else desnecessário após return</summary>
<br>

```python
def get_discount(user) -> float:
    if user.is_premium:
        return 0.2
    else:
        return 0.05
```

</details>

<br>

<details>
<summary>✅ Good — early return elimina o else</summary>
<br>

```python
def get_discount(user) -> float:
    if user.is_premium:
        return 0.2

    return 0.05
```

</details>

## Expressão condicional

Para atribuição de dois valores possíveis em uma linha. Três ou mais alternativas → dicionário de
lookup ou `match/case`. Nunca aninhar expressões condicionais.

<details>
<summary>❌ Bad — if/else imperativo para atribuição simples</summary>
<br>

```python
if order.is_paid:
    label = "Paid"
else:
    label = "Pending"
```

</details>

<br>

<details>
<summary>✅ Good — expressão condicional na atribuição</summary>
<br>

```python
label = "Paid" if order.is_paid else "Pending"
```

</details>

<details>
<summary>❌ Bad — expressão condicional aninhada para 3+ alternativas</summary>
<br>

```python
priority = "Critical" if is_urgent and is_critical else "High" if is_urgent else "Normal"
```

</details>

<br>

<details>
<summary>✅ Good — dicionário de lookup para 3+ alternativas</summary>
<br>

```python
PRIORITY_MAP = {
    (True, True):  "Critical",
    (True, False): "High",
}

priority = PRIORITY_MAP.get((is_urgent, is_critical), "Normal")
```

</details>

## Aninhamento em cascata

Quando as condições crescem e se aninham, cada nível enterra a lógica um nível mais fundo. O fluxo
vira uma pirâmide: o _arrow antipattern_. Guard clauses invertem: valide as saídas no topo e deixe
o fluxo principal limpo.

<details>
<summary>❌ Bad — lógica enterrada em múltiplos níveis</summary>
<br>

```python
def process_order(order):
    if order:
        if order.is_active:
            if order.items:
                if order.customer:
                    return process(order)
```

</details>

<br>

<details>
<summary>✅ Good — guard clauses, fluxo principal ao fundo</summary>
<br>

```python
def process_order(order):
    if not order:
        return None
    if not order.is_active:
        return None

    if not order.items:
        return None
    if not order.customer:
        return None

    invoice = process(order)

    return invoice
```

</details>

## match/case — mapeamento de valor

Quando múltiplos `if/elif` retornam um valor para cada chave, substitua por um dicionário de
lookup ou um `match` com guard:

<details>
<summary>❌ Bad — if/elif repetitivo mapeando chave → valor</summary>
<br>

```python
def get_status_label(status: str) -> str:
    if status == "pending":
        return "Pending review"
    elif status == "approved":
        return "Approved"
    elif status == "rejected":
        return "Rejected"
    elif status == "cancelled":
        return "Cancelled"
    else:
        return "Unknown"
```

</details>

<br>

<details>
<summary>✅ Good — lookup dict: legível e extensível</summary>
<br>

```python
STATUS_LABELS: dict[str, str] = {
    "pending": "Pending review",
    "approved": "Approved",
    "rejected": "Rejected",
    "cancelled": "Cancelled",
}

def get_status_label(status: str) -> str:
    label = STATUS_LABELS.get(status, "Unknown")

    return label
```

</details>

## match/case — despacho de comportamento

`match/case` (Python 3.10+) substitui `if/elif` encadeado quando o fluxo despacha comportamento
por valor. Cada `case` termina de forma explícita — não há fall-through acidental como em C.

<details>
<summary>❌ Bad — if/elif encadeado para despacho de ações</summary>
<br>

```python
def process_payment_event(event):
    if event.event_type == "payment_success":
        send_receipt(event.order_id)
        update_order_status(event.order_id, "paid")
    elif event.event_type == "payment_failed":
        notify_failure(event.user_id)
        schedule_retry(event.order_id)
    elif event.event_type == "payment_refunded":
        send_refund_confirmation(event.user_id)
        update_order_status(event.order_id, "refunded")
```

</details>

<br>

<details>
<summary>✅ Good — match/case para despacho de comportamento</summary>
<br>

```python
def process_payment_event(event):
    match event.event_type:
        case "payment_success":
            send_receipt(event.order_id)
            update_order_status(event.order_id, "paid")

        case "payment_failed":
            notify_failure(event.user_id)
            schedule_retry(event.order_id)

        case "payment_refunded":
            send_refund_confirmation(event.user_id)
            update_order_status(event.order_id, "refunded")
```

</details>

## match/case — pattern matching estrutural

`match/case` vai além de valores literais: desestrutura objetos, sequências e dataclasses, reduzindo
o código de validação de tipo e forma.

<details>
<summary>❌ Bad — isinstance + acesso de atributo manual</summary>
<br>

```python
def build_notification_message(event):
    if isinstance(event, dict):
        if event.get("type") == "order_placed" and "order_id" in event and "customer_id" in event:
            return f"Order {event['order_id']} placed by customer {event['customer_id']}"
        elif event.get("type") == "payment_received" and "amount" in event and "currency" in event:
            return f"Payment received: {event['amount']} {event['currency']}"
    return "Unknown event"
```

</details>

<br>

<details>
<summary>✅ Good — match/case desestrutura e nomeia</summary>
<br>

```python
def build_notification_message(event: dict) -> str:
    match event:
        case {"type": "order_placed", "order_id": order_id, "customer_id": customer_id}:
            message = f"Order {order_id} placed by customer {customer_id}"

        case {"type": "payment_received", "amount": amount, "currency": currency}:
            message = f"Payment received: {amount} {currency}"

        case _:
            message = "Unknown event"

    return message
```

</details>

## Saída antecipada em laços

Antes de escrever um loop, verifique se `next()`, `any()` ou `all()` já resolve. Essas funções
param no primeiro match — sem percorrer o resto.

<details>
<summary>❌ Bad — loop com flag força percorrer tudo</summary>
<br>

```python
def find_first_expired_product(products: list):
    expired_product = None

    for product in products:
        if not expired_product and product.is_expired:
            expired_product = product

    return expired_product
```

</details>

<br>

<details>
<summary>✅ Good — next() sai no primeiro match</summary>
<br>

```python
def find_first_expired_product(products: list):
    expired_product = next(
        (product for product in products if product.is_expired),
        None,
    )

    return expired_product
```

</details>

<br>

<details>
<summary>✅ Good — any() e all() com circuit break nativo</summary>
<br>

```python
has_expired_product = any(product.is_expired for product in products)

all_products_active = all(product.is_active for product in products)
```

</details>

## Comprehensions vs loops

Para transformação pura de coleção, list/dict/set comprehensions são declarativas e diretas. Para
efeitos colaterais por item, use `for`.

<details>
<summary>❌ Bad — loop imperativo para transformação pura</summary>
<br>

```python
def get_active_user_emails(users: list) -> list[str]:
    emails = []
    for user in users:
        if user.is_active:
            emails.append(user.email)

    return emails
```

</details>

<br>

<details>
<summary>✅ Good — list comprehension para transformação pura</summary>
<br>

```python
def get_active_user_emails(users: list) -> list[str]:
    active_emails = [user.email for user in users if user.is_active]

    return active_emails
```

</details>

<br>

<details>
<summary>❌ Bad — comprehension para efeitos colaterais</summary>
<br>

```python
[notify_customer(order) for order in pending_orders]
```

</details>

<br>

<details>
<summary>✅ Good — for loop quando há efeito colateral</summary>
<br>

```python
for order in pending_orders:
    notify_customer(order)
```

</details>

## while

Quando não há coleção pré-definida e o critério de parada é uma condição, não um índice, `while`
é a escolha natural. Python não tem `do-while` — use `while True` com `break` quando a primeira
execução é garantida.

<details>
<summary>❌ Bad — for simulando condição de parada por estado</summary>
<br>

```python
for attempt in range(max_attempts):
    connection = connect_to_database()
    if connection.is_ready:
        break  # o índice não representa nada aqui
```

</details>

<br>

<details>
<summary>✅ Good — while para condição de parada por estado</summary>
<br>

```python
attempt = 0

while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready:
        break

    attempt += 1
```

</details>

<br>

<details>
<summary>✅ Good — while True com break quando a primeira execução é garantida</summary>
<br>

```python
# drena a fila: processa pelo menos um item antes de verificar
while True:
    task = task_queue.dequeue()
    process_task(task)

    if task_queue.is_empty():
        break
```

</details>
