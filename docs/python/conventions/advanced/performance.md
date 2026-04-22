# Performance

> Escopo: Python. Idiomas específicos deste ecossistema.

Python prioriza legibilidade. Otimize onde há medição — não por antecipação. As regras abaixo
resolvem problemas reais e frequentes no ecossistema.

## Generators vs listas

Quando o resultado é consumido uma vez (loop, `sum`, `any`, `next`), um generator evita criar
uma lista intermediária em memória.

<details>
<summary>❌ Bad — lista completa criada antes de consumir</summary>
<br>

```python
def sum_active_prices(products: list) -> float:
    prices = [product.price for product in products if product.is_active]
    total = sum(prices)

    return total
```

</details>

<br>

<details>
<summary>✅ Good — generator expression, sem lista intermediária</summary>
<br>

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
<summary>❌ Bad — in list: percorre tudo a cada verificação</summary>
<br>

```python
def filter_blocked_users(users: list, blocked_ids: list) -> list:
    active_users = [user for user in users if user.user_id not in blocked_ids]

    return active_users
```

</details>

<br>

<details>
<summary>✅ Good — in set: O(1) por verificação</summary>
<br>

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
<summary>❌ Bad — concatenação O(n²) em loop</summary>
<br>

```python
def build_csv_row(fields: list[str]) -> str:
    row = ""
    for field in fields:
        row += field + ","

    return row.rstrip(",")
```

</details>

<br>

<details>
<summary>✅ Good — join: uma única alocação</summary>
<br>

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
<summary>❌ Bad — arquivo inteiro em memória</summary>
<br>

```python
def count_error_lines(log_path: str) -> int:
    with open(log_path) as file:
        content = file.read()

    error_count = content.count("ERROR")

    return error_count
```

</details>

<br>

<details>
<summary>✅ Good — iteração linha a linha, memória constante</summary>
<br>

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
<summary>❌ Bad — try/except para controle de fluxo normal</summary>
<br>

```python
def get_user_role(permissions: dict, user_id: str) -> str:
    try:
        role = permissions[user_id]
    except KeyError:
        role = "viewer"

    return role
```

</details>

<br>

<details>
<summary>✅ Good — dict.get com default declarativo</summary>
<br>

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
<summary>❌ Bad — __dict__ implícito em classe de dado intensivo</summary>
<br>

```python
class OrderItem:
    def __init__(self, product_id: int, quantity: int, unit_price: float) -> None:
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
```

</details>

<br>

<details>
<summary>✅ Good — dataclass com slots=True</summary>
<br>

```python
from dataclasses import dataclass

@dataclass(slots=True)
class OrderItem:
    product_id: int
    quantity: int
    unit_price: float
```

</details>
