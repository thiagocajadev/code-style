# Referência rápida

> Escopo: Python. O resumo das convenções, para consulta. Os detalhes estão em `conventions/`.

## Nomes

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

## O que evitar

Os nomes abaixo cabem em qualquer coisa, e por isso não descrevem nada. Troque pelo verbo ou pelo conceito de que a linha trata.

| Evitar                           | Usar                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send` |
| `data`, `info`, `result`         | nome do conceito: `user`, `invoice`, `summary`        |
| `tmp`, `val`, `arr`, `obj`       | nome completo e expressivo                            |
| `item`, `thing`, `x`             | nome do domínio: `order`, `product`, `entry`          |

## Anotações de tipo modernas (3.10 ou superior)

<details>
<summary>❌ Ruim: a sintaxe antiga, com um import para cada tipo</summary>

```python
from typing import Optional, Union, List, Dict

def find_user(user_id: int) -> Optional[User]: ...
def parse_ids(raw: Union[str, List[int]]) -> List[int]: ...
def load_config() -> Dict[str, str]: ...
```

</details>

<details>
<summary>✅ Bom: a sintaxe moderna, sem import nenhum</summary>

```python
def find_user(user_id: int) -> User | None: ...
def parse_ids(raw: str | list[int]) -> list[int]: ...
def load_config() -> dict[str, str]: ...
```

</details>

## Strings

<details>
<summary>❌ Ruim: f-string montando SQL com texto que veio do usuário</summary>

```python
query = f"SELECT * FROM users WHERE name = '{user_input}'"
```

</details>

<details>
<summary>✅ Bom: f-string quando o texto vai para os olhos, t-string quando ele vira comando</summary>

```python
# interpolação segura: UI, logs, mensagens
message = f"Order {order.order_id} placed by {user.name}"

# contextos que sanitizam: SQL, HTML, shell
safe_query = t"SELECT user_id, name FROM users WHERE name = {user_input}"
```

</details>

## Extrair os campos antes de usar

Dê nome a cada campo no corpo da função, e deixe a linha final montar o resultado a partir dos nomes.

<details>
<summary>❌ Ruim: a cadeia de acessos inteira dentro do return</summary>

```python
def format_address(user):
    return f"{user.address.street}, {user.address.city} - {user.address.state}"
```

</details>

<details>
<summary>✅ Bom: cada campo ganha um nome, e o texto final fica legível</summary>

```python
def format_address(user):
    street = user.address.street
    city = user.address.city
    state = user.address.state

    address = f"{street}, {city} - {state}"
    return address
```

</details>
