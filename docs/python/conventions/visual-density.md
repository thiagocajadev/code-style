# Visual Density

> Escopo: Python. Idioma nativo aplicado à densidade visual.

Linhas relacionadas ficam juntas. Grupos distintos se separam com exatamente uma linha em branco.
Nunca duas. O return fica separado do último grupo de trabalho.

## Parede de código

<details>
<summary>❌ Bad — parede de código sem respiro entre grupos</summary>
<br>

```python
async def process_order(order_id: int):
    order = await fetch_order(order_id)
    if not order:
        return None
    discounted_order = apply_discount(order)
    invoice = build_invoice(discounted_order)
    await save_invoice(invoice)
    await notify_customer(invoice)
    return invoice
```

</details>

<br>

<details>
<summary>✅ Good — parágrafos de intenção</summary>
<br>

```python
async def process_order(order_id: int):
    order = await fetch_order(order_id)
    if not order:
        return None

    discounted_order = apply_discount(order)
    invoice = build_invoice(discounted_order)

    await save_invoice(invoice)
    await notify_customer(invoice)

    return invoice
```

</details>

## Agrupamento incorreto

Blank lines em excesso dentro de um grupo quebram o ritmo. Blank lines ausentes entre grupos
colam o que não se relaciona. A regra: 0 linhas dentro, 1 entre, nunca 2+.

<details>
<summary>❌ Bad — espaço dentro dos grupos, sem separação entre grupos</summary>
<br>

```python
async def register_user(name: str, email: str, password: str):

    exists = await user_repository.find_by_email(email)

    if exists:
        raise ConflictError("Email taken")

    hashed = await hash_password(password)
    user = await user_repository.create(name, email, hashed)

    token = generate_token(user.user_id)
    await send_welcome_email(email, token)

    return user
```

</details>

<br>

<details>
<summary>✅ Good — 0 linhas dentro do grupo, 1 entre grupos</summary>
<br>

```python
async def register_user(name: str, email: str, password: str):
    exists = await user_repository.find_by_email(email)
    if exists:
        raise ConflictError("Email taken")

    hashed = await hash_password(password)
    user = await user_repository.create(name, email, hashed)

    token = generate_token(user.user_id)
    await send_welcome_email(email, token)

    return user
```

</details>

## Return separado

O `return` final fica separado do último grupo de trabalho por uma linha em branco, exceto quando
a função tem um único statement.

<details>
<summary>❌ Bad — return colado no último grupo</summary>
<br>

```python
def calculate_order_total(items: list) -> float:
    subtotal = sum(item.price for item in items)
    tax = subtotal * 0.1
    total = subtotal + tax
    return total
```

</details>

<br>

<details>
<summary>✅ Good — return separado por blank line</summary>
<br>

```python
def calculate_order_total(items: list) -> float:
    subtotal = sum(item.price for item in items)
    tax = subtotal * 0.1
    total = subtotal + tax

    return total
```

</details>

## Declaração + guarda — sem linha em branco entre elas

Quando uma variável é declarada e imediatamente guardada contra um estado inválido, as duas linhas
formam um único grupo: sem blank entre elas.

<details>
<summary>❌ Bad — blank entre declaração e guarda dispersa o que é um grupo</summary>
<br>

```python
async def process_checkout(user_id: int, cart_id: int):
    user = await user_repository.find_by_id(user_id)

    if not user:
        raise NotFoundError(f"User {user_id} not found.")

    cart = await cart_repository.find_by_id(cart_id)

    if not cart:
        raise NotFoundError(f"Cart {cart_id} not found.")

    if not cart.items:
        raise ValidationError("Cart is empty.")

    order = checkout(user, cart)

    return order
```

</details>

<br>

<details>
<summary>✅ Good — declaração e guarda coladas; grupos distintos separados</summary>
<br>

```python
async def process_checkout(user_id: int, cart_id: int):
    user = await user_repository.find_by_id(user_id)
    if not user:
        raise NotFoundError(f"User {user_id} not found.")

    cart = await cart_repository.find_by_id(cart_id)
    if not cart:
        raise NotFoundError(f"Cart {cart_id} not found.")
    if not cart.items:
        raise ValidationError("Cart is empty.")

    order = checkout(user, cart)

    return order
```

</details>

## Strings longas

f-string gigante? Extraia as partes compostas em variáveis nomeadas.

<details>
<summary>❌ Bad — todos os detalhes interpolados inline</summary>
<br>

```python
def build_confirmation_email(user, order) -> str:
    message = f"Olá {user.first_name} {user.last_name}, seu pedido #{order.order_id} foi confirmado e será entregue no endereço {order.address.street}, {order.address.city} - {order.address.state} em até {order.delivery_days} dias úteis."

    return message
```

</details>

<br>

<details>
<summary>✅ Good — compostos extraídos, string final legível</summary>
<br>

```python
def build_confirmation_email(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"

    greeting = f"Olá {full_name}"
    order_info = f"seu pedido #{order.order_id} foi confirmado"
    delivery_info = f"e será entregue em {address} em até {order.delivery_days} dias úteis"

    message = f"{greeting}, {order_info} {delivery_info}."

    return message
```

</details>
