# Funções em Python

Uma função cuida de uma tarefa, e o nome dela conta qual é. Quando o corpo passa de uma tela, quase sempre há duas tarefas ali dentro esperando para virar duas funções.

Esta página parte da função que cresceu demais e mostra o caminho até a versão em que a leitura de cima para baixo conta a história: o orquestrador chama os passos, e cada passo aparece logo abaixo com o detalhe.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SRP** (Single Responsibility Principle · Princípio da Responsabilidade Única) | Cada função tem uma única razão para mudar |
| **SLA** (Single Level of Abstraction · Único Nível de Abstração) | Cada função fica num só nível de detalhe: ou ela chama os passos, ou ela executa um passo |
| **cohesion** (coesão) | O quanto as instruções de uma função pertencem à mesma tarefa |
| **god function** (função-deus) | A função que faz tudo: busca, valida, calcula, grava e escreve o log |
| **helper** (função auxiliar) | A função de apoio que executa um passo e dá nome ao detalhe |
| **side effect** (efeito colateral) | Qualquer alteração que a função faz além de devolver o resultado: gravar em disco, escrever num estado global, alterar o objeto que recebeu |
| **pure function** (função pura) | A função sem efeito colateral: a mesma entrada devolve sempre a mesma saída |
| **type hint** (anotação de tipo) | `def f(x: int) -> str` declara o contrato e permite ao verificador de tipos conferir as chamadas |
| **keyword-only argument** (argumento passado só por nome) | O argumento que vem depois do `*` na assinatura, e que a chamada precisa nomear |

<a id="god-function"></a>

## A função que faz tudo

<details>
<summary>❌ Ruim: busca, valida, calcula, grava e escreve o log na mesma função</summary>

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
        notify_rejection(order)
        return None

    invoice = await issue_invoice(order)
    return invoice

def is_valid(order) -> bool:
    if not order or not order.items:
        return False

    if order.customer.defaulted:
        return False

    return True

def notify_rejection(order) -> None:
    customer_name = order.customer.name if order else None
    print("pedido rejeitado", customer_name)

async def issue_invoice(order):
    discounted_order = apply_discount(order)
    invoice = await save_order(discounted_order)
    return invoice
```

</details>

<a id="single-level-of-abstraction"></a>

## Um nível de abstração por função

Cada função escolhe um dos dois papéis. Ou ela chama os passos e deixa o detalhe para as auxiliares abaixo, ou ela executa um passo inteiro. Quando os dois papéis convivem no mesmo corpo, o leitor pula de "monta o resumo do pedido" para "formata centavos com duas casas" no meio da mesma leitura.

<details>
<summary>❌ Ruim: a função chama um passo e executa o outro no mesmo corpo</summary>

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
<summary>✅ Bom: o orquestrador chama as auxiliares, e cada uma cuida de um passo</summary>

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

## Separar o cálculo da formatação

O cálculo produz números, e a formatação produz texto para alguém ler. Separar os dois deixa o cálculo testável sem que o teste precise conhecer o formato do cifrão, e deixa o formato mudar sem tocar na conta.

<details>
<summary>❌ Ruim: a mesma função soma os itens e monta o texto final</summary>

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

## Retorno direto

A função de cima diz o que acontece, e devolve o resultado em duas linhas. A busca no banco, a checagem do vazio e o `raise` moram na auxiliar logo abaixo, onde quem procura o detalhe encontra.

<details>
<summary>❌ Ruim: variável de apoio sem função, e um else depois do raise</summary>

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
<summary>✅ Bom: a intenção no topo, o detalhe na auxiliar abaixo</summary>

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

<a id="no-logic-in-return"></a>

## Sem lógica no retorno

O `return` entrega um resultado que já está pronto e já tem nome. A linha acima dele faz a conta e guarda o valor numa variável cujo nome combina com o da função: `build_greeting` termina em `greeting`, `get_active_users` termina em `active_users`.

Ganha-se em duas frentes. O leitor que só quer saber o que a função devolve lê uma palavra em vez de decifrar uma expressão, e o depurador para numa linha que tem um valor com nome para inspecionar.

<details>
<summary>❌ Ruim: a expressão inteira dentro do return</summary>

```python
def build_greeting(user):
    return f"Hello, {user.name}! You have {len(user.notifications)} notifications."

def get_active_users(users):
    return [user for user in users if user.is_active and not user.is_banned]
```

</details>

<details>
<summary>✅ Bom: a variável nomeia o resultado, e o return só entrega</summary>

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
<summary>❌ Ruim: a função repassa a chamada e o retorno não diz o que sai dali</summary>

```python
def find_pending_orders(user_id: int):
    return order_repository.find_by_status(user_id, "pending")

async def process_checkout(cart_id: int):
    return await checkout_service.process(cart_id)
```

</details>

<details>
<summary>✅ Bom: o nome da variável combina com o da função e mostra o que sai</summary>

```python
def find_pending_orders(user_id: int) -> list:
    pending_orders = order_repository.find_by_status(user_id, "pending")
    return pending_orders

async def process_checkout(cart_id: int):
    invoice = await checkout_service.process(cart_id)
    return invoice
```

</details>

## Quantos parâmetros a assinatura aguenta

Até três parâmetros cabem na mesma linha. Com quatro ou mais, agrupe num objeto, uma `dataclass` ou um `dict`.

O motivo aparece na linha de chamada. Em `create_invoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL")`, nada diz qual string é o cliente e qual é o pedido, e trocar as duas de lugar passa pelo verificador de tipos sem um pio. A `dataclass` obriga cada valor a chegar com o nome do campo em volta.

<details>
<summary>❌ Ruim: cinco parâmetros soltos, e a chamada não diz o que é cada um</summary>

```python
def create_invoice(order_id, customer_id, amount, due_date, currency):
    ...

create_invoice("ord-1", "cust-99", 149.90, "2026-05-01", "BRL")
```

</details>

<details>
<summary>✅ Bom: com quatro ou mais, uma dataclass nomeia cada valor na chamada</summary>

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

Código que nunca roda ocupa espaço na leitura e sugere que alguém ainda depende dele. O histórico do git guarda o que foi removido, e quem precisar recupera de lá.

<details>
<summary>❌ Ruim: uma condição que nunca é verdadeira, uma função que ninguém chama</summary>

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
<summary>✅ Bom: o que ninguém usa sai do arquivo</summary>

```python
def get_status(value: int) -> str:
    status = "active" if value > 0 else "inactive"
    return status
```

</details>
