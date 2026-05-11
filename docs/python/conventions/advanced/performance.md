# Performance

> Escopo: Python. Idiomas específicos deste ecossistema.

Python prioriza legibilidade. Otimize onde há medição — não por antecipação. As regras abaixo
resolvem problemas reais e frequentes no ecossistema.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **generator** (gerador) | função com `yield` que produz valores sob demanda; não materializa lista intermediária |
| **list comprehension** (compreensão de lista) | sintaxe declarativa para construir listas: `[f(x) for x in xs if p(x)]` |
| **hot path** (caminho crítico de execução) | trecho chamado com altíssima frequência; overhead é amplificado |
| **GIL** (Global Interpreter Lock, Trava Global do Interpretador) | trava do CPython que serializa execução de bytecode em um único thread |
| **CPU-bound** (limitado pela CPU) | operação cujo gargalo é processamento; `multiprocessing` ajuda |
| **I/O-bound** (limitado por entrada e saída) | operação cujo gargalo é rede, disco ou banco; `asyncio` resolve melhor |
| **profiler** (perfilador) | ferramenta como `cProfile` que mede onde o tempo é gasto antes de otimizar |

## Generators vs listas

Quando o resultado é consumido uma vez (loop, `sum`, `any`, `next`), um generator evita criar
uma lista intermediária em memória.

<details>
<summary>❌ Ruim — lista completa criada antes de consumir</summary>

```python
def sum_active_prices(products: list) -> float:
    prices = [product.price for product in products if product.is_active]
    total = sum(prices)

    return total
```

</details>

<details>
<summary>✅ Bom — generator expression, sem lista intermediária</summary>

```python
def sum_active_prices(products: list) -> float:
    total = sum(product.price for product in products if product.is_active)
    return total
```

</details>

## set para busca e deduplicação

Busca em `list` é O(n). Busca em `set` é O(1). Quando a ordem não importa e a operação é
"está contido?", `set` é a escolha correta.

<details>
<summary>❌ Ruim — in list: percorre tudo a cada verificação</summary>

```python
def filter_blocked_users(users: list, blocked_ids: list) -> list:
    active_users = [user for user in users if user.user_id not in blocked_ids]

    return active_users
```

</details>

<details>
<summary>✅ Bom — in set: O(1) por verificação</summary>

```python
def filter_blocked_users(users: list, blocked_ids: list) -> list:
    blocked_set = set(blocked_ids)
    active_users = [user for user in users if user.user_id not in blocked_set]
    return active_users
```

</details>

## Concatenação de strings em loop

`str + str` cria um novo objeto a cada iteração. Para montar uma string a partir de partes,
use `"".join()`.

<details>
<summary>❌ Ruim — concatenação O(n²) em loop</summary>

```python
def build_csv_row(fields: list[str]) -> str:
    row = ""
    for field in fields:
        row += field + ","

    return row.rstrip(",")
```

</details>

<details>
<summary>✅ Bom — join: uma única alocação</summary>

```python
def build_csv_row(fields: list[str]) -> str:
    row = ",".join(fields)
    return row
```

</details>

## Leitura de arquivo grande — iteração vs leitura total

`read()` carrega o arquivo inteiro em memória. Para arquivos grandes, iterar linha a linha
mantém o uso de memória constante.

<details>
<summary>❌ Ruim — arquivo inteiro em memória</summary>

```python
def count_error_lines(log_path: str) -> int:
    with open(log_path) as file:
        content = file.read()

    error_count = content.count("ERROR")

    return error_count
```

</details>

<details>
<summary>✅ Bom — iteração linha a linha, memória constante</summary>

```python
def count_error_lines(log_path: str) -> int:
    error_count = sum(1 for line in open(log_path) if "ERROR" in line)
    return error_count
```

</details>

## dict.get() vs acesso direto

`dict["key"]` lança `KeyError` se a chave não existir. `dict.get("key", default)` retorna o
default sem exceção — sem try/except desnecessário.

<details>
<summary>❌ Ruim — try/except para controle de fluxo normal</summary>

```python
def get_user_role(permissions: dict, user_id: str) -> str:
    try:
        role = permissions[user_id]
    except KeyError:
        role = "viewer"

    return role
```

</details>

<details>
<summary>✅ Bom — dict.get com default declarativo</summary>

```python
def get_user_role(permissions: dict, user_id: str) -> str:
    role = permissions.get(user_id, "viewer")
    return role
```

</details>

## __slots__ em classes de dados

Classes sem `__slots__` armazenam atributos em um `__dict__` por instância. Em coleções com
milhares de objetos, `__slots__` reduz o uso de memória consideravelmente.

<details>
<summary>❌ Ruim — __dict__ implícito em classe de dado intensivo</summary>

```python
class OrderItem:
    def __init__(self, product_id: int, quantity: int, unit_price: float) -> None:
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
```

</details>

<details>
<summary>✅ Bom — dataclass com slots=True</summary>

```python
from dataclasses import dataclass

@dataclass(slots=True)
class OrderItem:
    product_id: int
    quantity: int
    unit_price: float
```

</details>
