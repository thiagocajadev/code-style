# Quick Reference

> Escopo: Python. Cheat-sheet das convenções; detalhes em `conventions/`.

## Nomenclatura

| Categoria          | Convenção                            | Exemplos                                        |
| ------------------ | ------------------------------------ | ----------------------------------------------- |
| Variáveis          | snake_case                           | `user_name`, `total_amount`, `is_active`        |
| Funções            | snake_case                           | `fetch_user`, `calculate_tax`, `validate_email` |
| Constantes         | UPPER_SNAKE_CASE                     | `MAX_RETRIES`, `ONE_DAY_SECONDS`, `API_URL`     |
| Classes            | PascalCase                           | `UserService`, `OrderRepository`, `AppError`    |
| Atributos privados | `_snake_case`                        | `_cache`, `_connection`, `_config`              |
| Booleanos          | `is_/has_/can_/should_` + snake_case | `is_valid`, `has_permission`, `can_retry`       |
| Coleções           | plural snake_case                    | `orders`, `active_users`, `pending_items`       |

## Verbos

| Verbo                    | Uso          | Exemplos                                               |
| ------------------------ | ------------ | ------------------------------------------------------ |
| `fetch` / `find` / `get` | Busca        | `fetch_user_by_id`, `find_active_orders`, `get_config` |
| `save` / `persist`       | Persistência | `save_invoice`, `persist_changes`                      |
| `compute` / `calculate`  | Cálculo      | `compute_total`, `calculate_discount`                  |
| `validate` / `check`     | Verificação  | `validate_email`, `check_permission`                   |
| `notify` / `send`        | Comunicação  | `notify_user`, `send_confirmation`                     |
| `format` / `render`      | Apresentação | `format_date`, `render_template`                       |
| `build` / `create`       | Construção   | `build_report`, `create_instance`                      |
| `parse` / `map`          | Conversão    | `parse_date`, `map_to_view_model`                      |

## Taboos

Nomes que não dizem nada. Troque pelo verbo ou conceito correto.

| Evitar                           | Usar                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send` |
| `data`, `info`, `result`         | nome do conceito: `user`, `invoice`, `summary`        |
| `tmp`, `val`, `arr`, `obj`       | nome completo e expressivo                            |
| `item`, `thing`, `x`             | nome do domínio: `order`, `product`, `entry`          |

## Type hints modernos (3.10+)

<details>
<summary>❌ Bad — sintaxe legada</summary>
<br>

```python
from typing import Optional, Union, List, Dict

def find_user(user_id: int) -> Optional[User]: ...
def parse_ids(raw: Union[str, List[int]]) -> List[int]: ...
def load_config() -> Dict[str, str]: ...
```

</details>

<br>

<details>
<summary>✅ Good — sintaxe moderna, sem imports extras</summary>
<br>

```python
def find_user(user_id: int) -> User | None: ...
def parse_ids(raw: str | list[int]) -> list[int]: ...
def load_config() -> dict[str, str]: ...
```

</details>

## Strings

<details>
<summary>❌ Bad — f-string em contexto sensível a injeção</summary>
<br>

```python
query = f"SELECT * FROM users WHERE name = '{user_input}'"
```

</details>

<br>

<details>
<summary>✅ Good — f-string para interpolação segura; t-string para sanitização (Python 3.14+)</summary>
<br>

```python
# interpolação segura: UI, logs, mensagens
message = f"Order {order.order_id} placed by {user.name}"

# contextos que sanitizam: SQL, HTML, shell
safe_query = t"SELECT user_id, name FROM users WHERE name = {user_input}"
```

</details>

## Destructuring

Sempre no corpo da função, nunca inline no return.

<details>
<summary>❌ Bad — acesso encadeado inline</summary>
<br>

```python
def format_address(user):
    return f"{user.address.street}, {user.address.city} - {user.address.state}"
```

</details>

<br>

<details>
<summary>✅ Good — extrai antes de usar</summary>
<br>

```python
def format_address(user):
    street = user.address.street
    city = user.address.city
    state = user.address.state

    address = f"{street}, {city} - {state}"

    return address
```

</details>
