# Functions

Uma função faz uma coisa. Seu nome diz o quê. Seu tamanho cabe na tela. **SRP** (Single
Responsibility Principle, Princípio da Responsabilidade Única) e **cohesion** (coesão) guiam o
desenho.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SRP** (Single Responsibility Principle, Princípio da Responsabilidade Única) | cada função tem uma única razão para mudar |
| **cohesion** (coesão) | grau em que as instruções da função pertencem à mesma tarefa |
| **god function** (função-deus) | função que faz tudo: busca, valida, calcula, persiste, loga |
| **side effect** (efeito colateral) | alteração observável fora do retorno (I/O, estado global, mutação de argumento) |
| **pure function** (função pura) | sem efeito colateral; mesma entrada produz mesma saída |
| **type hint** (anotação de tipo) | `def f(x: int) -> str` documenta contrato e habilita type checker |
| **keyword-only argument** (argumento exclusivo por nome) | argumento após `*` na assinatura; obriga chamada nominal e elimina ambiguidade |

## God function: múltiplas responsabilidades

<details>
<summary>❌ Ruim: busca, valida, calcula, persiste e loga na mesma função</summary>

```python
def realiza_venda(x):
    p = busca_pedido(x)
    resultado = None

    if p is not None:
        if p["itens"] and len(p["itens"]) > 0:
            if not p["cliente"]["inadimplente"]:
                if p["total"] > 100:
                    p["desconto"] = 10
                else:
                    p["desconto"] = 0

                p["total"] = p["total"] - p["desconto"]
                salvo = salva_pedido(p)
                resultado = salvo if salvo else None

                import random
                if random.random() > 0.5:
                    print("Log qualquer")
            else:
                print("cliente inadimplente", p.get("cliente", {}).get("nome"))
                resultado = False
        else:
            resultado = None
    else:
        resultado = None

    return resultado
```

</details>

<details>
<summary>✅ Bom: orquestrador no topo, responsabilidades separadas</summary>

```python
async def process_order(order_id: int):
    order = await get_order(order_id)
    if not is_valid(order):
        return None

    invoice = await issue_invoice(order)
    return invoice

def is_valid(order) -> bool:
    if not order or not order.items:
        return False

    if order.customer.defaulted:
        notify_default(order)
        return False

    return True

async def issue_invoice(order):
    discounted_order = apply_discount(order)
    invoice = await save_order(discounted_order)
    return invoice
```

</details>

## SLA: orquestrador ou implementação, nunca os dois

<details>
<summary>❌ Ruim: mesma função orquestra e implementa</summary>

```python
def build_order_summary(order):
    header = f"Order #{order.order_id}"
    line_items = "\n".join(
        f"  - {item.name}: ${item.price:.2f}"
        for item in order.items
    )

    return f"{header}\n{line_items}"
```

</details>

<details>
<summary>✅ Bom: orquestrador chama helpers, cada um faz uma coisa</summary>

```python
def build_order_summary(order) -> str:
    header = build_header(order)
    line_items = build_line_items(order)

    summary = f"{header}\n{line_items}"
    return summary

def build_header(order) -> str:
    header = f"Order #{order.order_id}"
    return header

def build_line_items(order) -> str:
    lines = [f"  - {item.name}: ${item.price:.2f}" for item in order.items]
    line_items = "\n".join(lines)
    return line_items
```

</details>

## Separar cálculo de formatação

<details>
<summary>❌ Ruim: cálculo e formatação misturados</summary>

```python
def get_order_summary(order):
    subtotal = sum(item.price for item in order.items)
    tax = subtotal * 0.1
    total = subtotal + tax

    return f"Order #{order.order_id}: ${subtotal:.2f} + tax ${tax:.2f} = ${total:.2f}"
```

</details>

<details>
<summary>✅ Bom: cálculo separado da formatação</summary>

```python
def get_order_summary(order) -> str:
    totals = calculate_totals(order.items)
    summary = format_summary(order.order_id, totals)
    return summary

def calculate_totals(items) -> dict:
    subtotal = sum(item.price for item in items)
    tax = subtotal * 0.1

    totals = {"subtotal": subtotal, "tax": tax, "total": subtotal + tax}
    return totals

def format_summary(order_id: int, totals: dict) -> str:
    subtotal = totals["subtotal"]
    tax = totals["tax"]
    total = totals["total"]

    summary = f"Order #{order_id}: ${subtotal:.2f} + tax ${tax:.2f} = ${total:.2f}"
    return summary
```

</details>

## Direct return

O retorno fica no topo da função, com os detalhes encapsulados em auxiliares abaixo dela.

<details>
<summary>❌ Ruim: variável auxiliar desnecessária, else após raise</summary>

```python
async def find_product_by_id(product_id: int):
    product_found = None

    results = await database.query(product_id)

    if not results:
        raise NotFoundError("Product not found.")
    else:
        product_found = results[0]

    return product_found
```

</details>

<details>
<summary>✅ Bom: intenção clara no topo, detalhe abaixo</summary>

```python
async def find_product_by_id(product_id: int):
    product = await fetch_product(product_id)
    return product

async def fetch_product(product_id: int):
    product = await product_repository.find_by_id(product_id)

    if not product:
        raise NotFoundError(f"Product {product_id} not found.")

    return product
```

</details>

## Sem lógica no retorno

O retorno nomeia o resultado, não o computa. A variável é expressiva e simétrica com a intenção da
função.

<details>
<summary>❌ Ruim: lógica ou expressão inline direto no return</summary>

```python
def build_greeting(user):
    return f"Hello, {user.name}! You have {len(user.notifications)} notifications."

def get_active_users(users):
    return [user for user in users if user.is_active and not user.is_banned]
```

</details>

<details>
<summary>✅ Bom: variável expressiva antes do return</summary>

```python
def build_greeting(user) -> str:
    greeting = f"Hello, {user.name}! You have {len(user.notifications)} notifications."
    return greeting

def get_active_users(users) -> list:
    active_users = [user for user in users if user.is_active and not user.is_banned]
    return active_users
```

</details>

<details>
<summary>❌ Ruim: bare return: pass-through sem nome, o retorno não diz o que é</summary>

```python
def find_pending_orders(user_id: int):
    return order_repository.find_by_status(user_id, "pending")

async def process_checkout(cart_id: int):
    return await checkout_service.process(cart_id)
```

</details>

<details>
<summary>✅ Bom: nome simétrico com a função deixa claro o que sai</summary>

```python
def find_pending_orders(user_id: int) -> list:
    pending_orders = order_repository.find_by_status(user_id, "pending")
    return pending_orders

async def process_checkout(cart_id: int):
    invoice = await checkout_service.process(cart_id)
    return invoice
```

</details>

## Parâmetros: estilo vertical

Até 3 parâmetros na mesma linha. Com 4 ou mais, use um objeto (dataclass ou dict).

<details>
<summary>❌ Ruim: 4+ parâmetros inline, intenção obscura na chamada</summary>

```python
def create_invoice(order_id, customer_id, amount, due_date, currency):
    ...

create_invoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL")
```

</details>

<details>
<summary>✅ Bom: dataclass quando 4+ parâmetros</summary>

```python
from dataclasses import dataclass

@dataclass
class InvoiceData:
    order_id: str
    customer_id: str
    amount: float
    due_date: str
    currency: str

def create_invoice(invoice_data: InvoiceData):
    ...

create_invoice(InvoiceData(
    order_id="ord-1",
    customer_id="cust-99",
    amount=149.90,
    due_date="2026-05-01",
    currency="BRL",
))
```

</details>

## Código morto

<details>
<summary>❌ Ruim: condição impossível, função nunca chamada</summary>

```python
def get_status(value: int) -> str:
    if False:
        print("never runs")

    return "active" if value > 0 else "inactive"

# migrada para v2, mas continua aqui sem ser chamada
def legacy_transform(items):
    return [item.item_id for item in items]
```

</details>

<details>
<summary>✅ Bom: remove o que não é usado</summary>

```python
def get_status(value: int) -> str:
    status = "active" if value > 0 else "inactive"
    return status
```

</details>
