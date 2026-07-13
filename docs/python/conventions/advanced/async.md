# Código assíncrono em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Toda operação que espera por algo de fora do processo (uma resposta do banco, um arquivo em disco, uma chamada de rede) deve ser assíncrona. Enquanto ela espera, o **event loop** (o laço que reveza as tarefas) atende outras requisições.

O contrário também vale, e é o erro mais comum: uma chamada que trava a espera dentro de uma função `async` para o laço inteiro. Nenhuma outra requisição avança enquanto aquele `time.sleep(3)` conta os três segundos, mesmo que o servidor tenha mil conexões abertas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **I/O** (Input/Output · Entrada/Saída) | A operação que sai do processo: rede, disco, banco de dados |
| **event loop** (laço de eventos) | O laço que reveza as tarefas assíncronas. Ele roda uma coroutine até o próximo `await` e passa a vez para outra |
| **coroutine** (corrotina) | A função declarada com `async def`. Ela pode pausar num `await` sem travar a thread |
| **await** (espera) | Pausa a coroutine atual até o resultado ficar pronto, e devolve a vez ao laço enquanto isso |
| **asyncio.gather** (execução concorrente) | Dispara várias coroutines ao mesmo tempo e junta os resultados |
| **TaskGroup** (grupo de tarefas, Python 3.11 ou superior) | Um escopo que cancela todas as tarefas do grupo assim que uma delas falha |
| **CPU-bound** (limitado pelo processador) | A operação cujo gargalo é cálculo, e não espera. O asyncio não ajuda aqui |

<a id="blocking-sync-call"></a>

## A chamada que trava o laço

<details>
<summary>❌ Ruim: uma espera síncrona dentro de função async trava o laço inteiro</summary>

```python
import time

async def process_order(order_id: int):
    time.sleep(3)  # congela o event loop por 3 segundos
    order = get_order_sync(order_id)  # I/O síncrono

    return order
```

</details>

<details>
<summary>✅ Bom: asyncio.sleep devolve a vez ao laço durante a espera</summary>

```python
import asyncio

async def process_order(order_id: int):
    await asyncio.sleep(3)

    order = await get_order(order_id)
    return order
```

</details>

## Espere em sequência só quando um passo depende do anterior

Encadear `await` faz sentido quando o segundo passo precisa do resultado do primeiro: buscar o usuário, e então buscar os pedidos daquele usuário. O exemplo bom abaixo mostra essa cadeia real, em que cada linha usa o valor da anterior.

<details>
<summary>❌ Ruim: três esperas em fila, e nenhuma depende da outra</summary>

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
<summary>✅ Bom: a fila se justifica, porque cada passo usa o resultado do anterior</summary>

```python
async def fetch_user_data(user_id: int):
    user = await get_user(user_id)
    orders = await get_orders(user.user_id)
    invoices = await get_invoices(orders[0].order_id)

    user_data = {"user": user, "orders": orders, "invoices": invoices}
    return user_data
```

</details>

<a id="gather-parallel-execution"></a>

## gather: disparar tudo ao mesmo tempo

Quando as chamadas não dependem umas das outras, esperar uma por vez soma os tempos. Três chamadas de 200 milissegundos em fila levam 600. Disparadas juntas com `asyncio.gather`, levam os 200 da mais lenta.

<details>
<summary>❌ Ruim: três esperas em fila somam os tempos sem necessidade</summary>

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
<summary>✅ Bom: asyncio.gather dispara as três e espera pela mais lenta</summary>

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
> Por padrão, se uma delas levantar exceção, a chamada inteira falha. Passe
> `asyncio.gather(*tasks, return_exceptions=True)` quando quiser receber os
> resultados que deram certo junto com os erros dos que falharam.

## Leitura de arquivo em código assíncrono

O `open()` da biblioteca padrão espera pelo disco travando a thread, e trava o laço junto. Use `asyncio.to_thread` para empurrar a leitura para outra thread, ou a biblioteca `aiofiles`.

<details>
<summary>❌ Ruim: open() trava o laço enquanto lê o arquivo</summary>

```python
async def read_config() -> dict:
    with open("config.json") as file:  # bloqueia o event loop
        content = file.read()

    config = json.loads(content)

    return config
```

</details>

<details>
<summary>✅ Bom: asyncio.to_thread lê o arquivo fora do laço</summary>

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

## Gerenciador de contexto assíncrono

Recursos que abrem e fecham de forma assíncrona (a conexão de banco, a sessão **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto)) usam `async with`.

O ganho está no caminho do erro. No exemplo ruim, se a consulta levantar exceção, a linha do `close()` nunca roda e a conexão fica presa até o servidor derrubá-la por tempo. Com `async with`, o fechamento acontece na saída do bloco, inclusive quando a saída é uma exceção.

<details>
<summary>❌ Ruim: se a consulta falhar, a conexão nunca fecha</summary>

```python
async def fetch_orders(user_id: int):
    conn = await database.connect()
    orders = await conn.query("SELECT * FROM orders WHERE user_id = $1", user_id)
    await conn.close()  # não executado se query lançar exceção

    return orders
```

</details>

<details>
<summary>✅ Bom: async with fecha a conexão inclusive quando dá erro</summary>

```python
async def fetch_orders(user_id: int):
    async with database.connect() as conn:
        orders = await conn.query("SELECT * FROM orders WHERE user_id = $1", user_id)

    return orders
```

</details>

## Quando declarar a função como async

A regra é o `await`. Se o corpo da função tem um, ela precisa ser `async`. Se não tem, ela fica síncrona.

Marcar como `async` uma função que só faz contas cria uma coroutine que ninguém precisava: quem chamar vai ter que escrever `await` na frente, e a espera não compra nada. E deixar síncrona uma função que vai ao banco trava o laço, que é o problema da primeira seção desta página.

<details>
<summary>❌ Ruim: async numa função de cálculo, e uma ida ao banco sem async</summary>

```python
async def calculate_tax(amount: float) -> float:  # async desnecessário
    return amount * 0.1

def fetch_user(user_id: int):  # I/O sem async
    user = database.query_sync(user_id)
    return user
```

</details>

<details>
<summary>✅ Bom: async onde há espera, síncrona onde há só cálculo</summary>

```python
def calculate_tax(amount: float) -> float:
    tax = amount * 0.1
    return tax

async def fetch_user(user_id: int):
    user = await user_repository.find_by_id(user_id)
    return user
```

</details>
