# Variables

Python não tem `const` nativo. Use `Final` para sinalizar que uma variável não deve ser reatribuída.
Para objetos de valor, `dataclass(frozen=True)` garante a imutabilidade em tempo de execução.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Final** (valor fixo) | Anotação do `typing` que sinaliza variável não reatribuível; verificada por type checker |
| **Frozen dataclass** (classe de dados congelada) | `@dataclass(frozen=True)` torna instâncias imutáveis em tempo de execução |
| **SQL** (Structured Query Language, Linguagem de Consulta Estruturada) | Linguagem de consulta relacional; strings constantes nomeadas por propósito |
| **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) | Marcação da web; valores fixos típicos incluem nomes de classes e IDs |
| **UI** (User Interface, Interface do Usuário) | Superfície visual; constantes de UI separam dados de apresentação |

## Final — valor fixo por padrão

<details>
<summary>❌ Bad — constante sem tipo, reatribuível sem aviso</summary>
<br>

```python
MAX_RETRIES = 3
API_URL = "https://api.example.com"

MAX_RETRIES = 5  # reatribuição silenciosa
```

</details>

<br>

<details>
<summary>✅ Good — Final sinaliza intenção ao type checker</summary>
<br>

```python
from typing import Final

MAX_RETRIES: Final = 3
API_URL: Final = "https://api.example.com"
```

</details>

## Dataclass frozen — objetos de valor não mutáveis

<details>
<summary>❌ Bad — objeto de valor mutável por padrão</summary>
<br>

```python
class Money:
    def __init__(self, amount: float, currency: str) -> None:
        self.amount = amount
        self.currency = currency

price = Money(100.0, "BRL")
price.amount = 0  # alteração acidental sem aviso
```

</details>

<br>

<details>
<summary>✅ Good — frozen=True garante imutabilidade</summary>
<br>

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str

price = Money(100.0, "BRL")
# price.amount = 0  → FrozenInstanceError em tempo de execução
```

</details>

## Mutação direta

Objetos passados como parâmetro são referências. Alterar um parâmetro muda o estado do chamador:
um efeito colateral invisível e difícil de rastrear. Prefira retornar um novo objeto.

<details>
<summary>❌ Bad — mutação acoplada e difícil de rastrear</summary>
<br>

```python
def apply_discount(order):
    order["discount"] = 10   # altera o objeto recebido
    order["total"] -= 10     # efeito colateral escondido
```

</details>

<br>

<details>
<summary>✅ Good — retorna novo estado, sem efeitos colaterais</summary>
<br>

```python
def apply_discount(order):
    discounted_order = {
        **order,
        "discount": 10,
        "total": order["total"] - 10,
    }

    return discounted_order
```

</details>

## Valores mágicos

Números e strings soltos no código não dizem nada. Constantes nomeadas tornam a intenção visível.

<details>
<summary>❌ Bad — o que significa 18? e 86400?</summary>
<br>

```python
if user.age >= 18:
    ...

if order.status == 2:
    ...

time.sleep(86400)
```

</details>

<br>

<details>
<summary>✅ Good — constantes nomeadas</summary>
<br>

```python
from typing import Final

MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2
ONE_DAY_SECONDS: Final = 86_400

if user.age >= MINIMUM_DRIVING_AGE:
    ...

if order.status == ORDER_STATUS_APPROVED:
    ...

time.sleep(ONE_DAY_SECONDS)
```

</details>

## Type hints modernos (Python 3.10+)

Use a sintaxe `X | Y` no lugar de `Optional[X]` e `Union[X, Y]`. Com as anotações diferidas do
Python 3.14 (PEP 649), forward references não precisam mais de aspas.

<details>
<summary>❌ Bad — sintaxe legada, verbose</summary>
<br>

```python
from typing import Optional, Union, List, Dict

def find_user(user_id: int) -> Optional["User"]:
    ...

def parse_ids(raw: Union[str, List[int]]) -> List[int]:
    ...

def load_config() -> Dict[str, str]:
    ...
```

</details>

<br>

<details>
<summary>✅ Good — sintaxe moderna, sem imports extras</summary>
<br>

```python
def find_user(user_id: int) -> User | None:
    ...

def parse_ids(raw: str | list[int]) -> list[int]:
    ...

def load_config() -> dict[str, str]:
    ...
```

</details>

## t-strings vs f-strings

`f-strings` interpolam diretamente — conveniente, mas inseguro em contextos onde o valor pode
conter conteúdo malicioso (SQL, HTML, shell). `t-strings` (Python 3.14, PEP 750) retornam um
objeto `Template` que pode ser sanitizado antes de produzir a string final.

<details>
<summary>❌ Bad — f-string em contexto sensível a injeção</summary>
<br>

```python
def build_query(user_input: str) -> str:
    query = f"SELECT * FROM users WHERE name = '{user_input}'"

    return query
```

</details>

<br>

<details>
<summary>✅ Good — t-string para contextos que exigem sanitização</summary>
<br>

```python
from string.templatelib import Template

def build_safe_query(user_input: str) -> Template:
    safe_query = t"""
        SELECT
            user_id,
            name,
            email
        FROM users
        WHERE name = {user_input}
    """

    return safe_query
```

</details>

> Use `f-strings` para interpolação segura (logs, mensagens de UI, labels).
> Use `t-strings` quando o resultado for passado para um contexto que sanitiza a entrada
> (SQL builders, template engines, comandos shell).

## pathlib — operações de arquivo

`pathlib.Path` é o idioma moderno para caminhos — stdlib, sem instalação. Python 3.14 adiciona
`.copy()` e `.move()` nativos; substitua `shutil` onde possível.

<details>
<summary>❌ Bad — os.path e shutil fragmentados</summary>
<br>

```python
import os
import shutil

config_path = os.path.join(os.getcwd(), "config", "app.json")
if os.path.exists(config_path):
    shutil.copy(config_path, "/backup/app.json")
```

</details>

<br>

<details>
<summary>✅ Good — pathlib.Path fluente e legível</summary>
<br>

```python
from pathlib import Path

config_path = Path.cwd() / "config" / "app.json"
if config_path.exists():
    config_path.copy(Path("/backup/app.json"))  # Python 3.14+
```

</details>
