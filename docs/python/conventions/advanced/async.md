# Async

> Escopo: Python. Idiomas específicos deste ecossistema.

Toda operação que depende de **I/O** (Input/Output, Entrada/Saída) é assíncrona. Bloquear o
**event loop** (laço de eventos) congela a aplicação inteira.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **I/O** (Input/Output, Entrada/Saída) | operação que atravessa o limite do processo: rede, disco, banco |
| **event loop** (laço de eventos) | despachante de tarefas async; processa coroutines até `await` |
| **coroutine** (corrotina) | função `async def` que pode pausar com `await` sem bloquear o thread |
| **await** (palavra-chave de espera) | suspende a coroutine atual até o awaitable resolver |
| **asyncio.gather** (execução concorrente de coroutines) | roda várias coroutines em paralelo e coleta os resultados |
| **TaskGroup** (grupo estruturado de tarefas) | escopo (Python 3.11+) que cancela todas as tarefas se uma falhar |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é processamento; não escala com asyncio |

## Bloqueio síncrono

<details>
<summary>❌ Ruim: I/O síncrono dentro de função async bloqueia o event loop</summary>

```python
import time

async def process_order(order_id: int):
    time.sleep(3)  # congela o event loop por 3 segundos
    order = get_order_sync(order_id)  # I/O síncrono

    return order
```

</details>

<details>
<summary>✅ Bom: asyncio.sleep libera o event loop enquanto aguarda</summary>

```python
import asyncio

async def process_order(order_id: int):
    await asyncio.sleep(3)

    order = await get_order(order_id)
    return order
```

</details>

## await sequencial desnecessário

<details>
<summary>❌ Ruim: await encadeado quando não há dependência</summary>

```python
async def fetch_user_data(user_id: int):
    user = await get_user(user_id)       # espera terminar
    orders = await get_orders(user_id)   # só começa depois
    invoices = await get_invoices(user_id)  # só começa depois

    user_data = {"user": user, "orders": orders, "invoices": invoices}

    return user_data
```

</details>

<details>
<summary>✅ Bom: async/await linear e legível</summary>

```python
async def fetch_user_data(user_id: int):
    user = await get_user(user_id)
    orders = await get_orders(user.user_id)
    invoices = await get_invoices(orders[0].order_id)

    user_data = {"user": user, "orders": orders, "invoices": invoices}
    return user_data
```

</details>

## gather: execução paralela

Quando as operações são independentes entre si, rodá-las em paralelo reduz o tempo total de espera.

<details>
<summary>❌ Ruim: await sequencial quando não há dependência entre chamadas</summary>

```python
async def fetch_dashboard(user_id: int):
    orders = await fetch_orders(user_id)
    invoices = await fetch_invoices(user_id)
    profile = await fetch_profile(user_id)

    dashboard = {"orders": orders, "invoices": invoices, "profile": profile}

    return dashboard
```

</details>

<details>
<summary>✅ Bom: asyncio.gather dispara tudo ao mesmo tempo</summary>

```python
import asyncio

async def fetch_dashboard(user_id: int):
    orders, invoices, profile = await asyncio.gather(
        fetch_orders(user_id),
        fetch_invoices(user_id),
        fetch_profile(user_id),
    )

    dashboard = {"orders": orders, "invoices": invoices, "profile": profile}
    return dashboard
```

</details>

> Use `asyncio.gather` quando as operações não dependem umas das outras.
> Se uma falhar, todas falham. Use `asyncio.gather(*tasks, return_exceptions=True)`
> quando quiser continuar mesmo com erros parciais.

## Leitura de arquivo assíncrona

`open()` padrão bloqueia o event loop. Use `aiofiles` ou `asyncio.to_thread` para operações de
arquivo em código async.

<details>
<summary>❌ Ruim: open() síncrono bloqueia o event loop</summary>

```python
async def read_config() -> dict:
    with open("config.json") as file:  # bloqueia o event loop
        content = file.read()

    config = json.loads(content)

    return config
```

</details>

<details>
<summary>✅ Bom: asyncio.to_thread para I/O de arquivo</summary>

```python
import asyncio
import json
from pathlib import Path

async def read_config() -> dict:
    content = await asyncio.to_thread(Path("config.json").read_text)
    config = json.loads(content)
    return config
```

</details>

## Context managers assíncronos

Recursos que exigem setup e teardown assíncronos (conexões de banco, sessões **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto)) usam
`async with`. O protocolo `__aenter__`/`__aexit__` garante que o recurso seja liberado mesmo em
caso de exceção.

<details>
<summary>❌ Ruim: conexão aberta sem garantia de fechamento</summary>

```python
async def fetch_orders(user_id: int):
    conn = await database.connect()
    orders = await conn.query("SELECT * FROM orders WHERE user_id = $1", user_id)
    await conn.close()  # não executado se query lançar exceção

    return orders
```

</details>

<details>
<summary>✅ Bom: async with garante fechamento em qualquer cenário</summary>

```python
async def fetch_orders(user_id: int):
    async with database.connect() as conn:
        orders = await conn.query("SELECT * FROM orders WHERE user_id = $1", user_id)

    return orders
```

</details>

## Quando criar uma função async

Toda função que contém um `await` deve ser `async`. Funções que não fazem I/O não precisam ser
`async`. Adicionar `async` sem `await` cria uma coroutine inútil que o chamador precisa
aguardar sem ganho algum.

<details>
<summary>❌ Ruim: async sem await, e I/O síncrono sem async</summary>

```python
async def calculate_tax(amount: float) -> float:  # async desnecessário
    return amount * 0.1

def fetch_user(user_id: int):  # I/O sem async
    user = database.query_sync(user_id)
    return user
```

</details>

<details>
<summary>✅ Bom: async só quando há I/O; funções puras são síncronas</summary>

```python
def calculate_tax(amount: float) -> float:
    tax = amount * 0.1
    return tax

async def fetch_user(user_id: int):
    user = await user_repository.find_by_id(user_id)
    return user
```

</details>
