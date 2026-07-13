# Variáveis em Python

Python não tem `const`. Duas ferramentas cobrem o espaço: `Final`, que avisa ao verificador de tipos que a variável não deve receber outro valor, e `dataclass(frozen=True)`, que faz o objeto recusar alteração já em tempo de execução.

A diferença entre as duas está em quem acusa o erro, e quando. `Final` é uma anotação: o verificador de tipos aponta a reatribuição enquanto você ainda edita o arquivo, e o programa roda mesmo assim. `frozen=True` levanta `FrozenInstanceError` em tempo de execução, e a operação para.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Final** (valor fixo) | Anotação do módulo `typing`: marca a variável que não deve receber outro valor. Quem verifica é o type checker |
| **frozen dataclass** (classe de dados congelada) | `@dataclass(frozen=True)`: a instância recusa alteração de atributo em tempo de execução |
| **type hint** (anotação de tipo) | A declaração do tipo esperado na assinatura: `def find_user(user_id: int) -> User \| None` |
| **f-string** (string formatada) | Interpola o valor direto no texto: `f"olá, {name}"`. O resultado já sai pronto |
| **t-string** (string de template, Python 3.14) | Devolve um objeto `Template` em vez do texto pronto, e permite sanitizar o valor antes de montar a string |
| **injection** (injeção) | O valor vindo do usuário é lido como comando pelo destino, e não como dado. É o risco que a t-string existe para fechar |

## Final: o valor fixo por padrão

<details>
<summary>❌ Ruim: a constante aceita outro valor sem ninguém reclamar</summary>

```python
MAX_RETRIES = 3
API_URL = "https://api.example.com"

MAX_RETRIES = 5  # reatribuição silenciosa
```

</details>

<details>
<summary>✅ Bom: Final sinaliza intenção ao type checker</summary>

```python
from typing import Final

MAX_RETRIES: Final = 3
API_URL: Final = "https://api.example.com"
```

</details>

## Dataclass congelada: o objeto de valor que não muda

Um objeto de valor representa uma quantia, um endereço, uma data: coisas que o sistema compara e substitui inteiras. Deixá-lo aceitar alteração de atributo abre espaço para um trecho distante zerar o preço de uma instância que outro trecho ainda vai ler.

<details>
<summary>❌ Ruim: qualquer trecho do código altera o atributo depois</summary>

```python
class Money:
    def __init__(self, amount: float, currency: str) -> None:
        self.amount = amount
        self.currency = currency

price = Money(100.0, "BRL")
price.amount = 0  # alteração acidental sem aviso
```

</details>

<details>
<summary>✅ Bom: com frozen=True o atributo não muda depois de criado</summary>

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

<a id="direct-mutation"></a>

## Alteração do objeto recebido

O parâmetro chega como referência ao mesmo objeto que o chamador tem em mãos. Escrever num campo dele altera o estado lá fora, e quem chamou a função nunca vê essa escrita na própria linha de chamada. Meses depois, alguém vai procurar onde o total do pedido mudou e não vai encontrar, porque a alteração mora dentro de uma função cujo nome só promete calcular um desconto.

Devolva um objeto novo. A linha de chamada passa a mostrar o que entrou e o que saiu.

<details>
<summary>❌ Ruim: a função escreve no objeto do chamador</summary>

```python
def apply_discount(order):
    order["discount"] = 10   # altera o objeto recebido
    order["total"] -= 10     # efeito colateral escondido
```

</details>

<details>
<summary>✅ Bom: devolve um objeto novo e deixa o original intacto</summary>

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

<a id="magic-values"></a>

## Valores mágicos

Um número solto no meio de uma condição obriga o leitor a adivinhar de onde ele veio. O `18` é maioridade, idade mínima para dirigir ou o limite de algum contrato? A constante nomeada responde a pergunta no próprio identificador, e concentra a mudança num lugar quando a regra virar 21.

<details>
<summary>❌ Ruim: o leitor precisa adivinhar o que 18 e 86400 significam</summary>

```python
if user.age >= 18:
    ...

if order.status == 2:
    ...

time.sleep(86400)
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas</summary>

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

## Anotações de tipo modernas (Python 3.10 ou superior)

A sintaxe `X | Y` substitui `Optional[X]` e `Union[X, Y]`, e dispensa os imports do módulo `typing`. Desde o Python 3.14 (PEP 649), a anotação que cita uma classe declarada mais abaixo no arquivo também dispensa as aspas em volta do nome.

<details>
<summary>❌ Ruim: a sintaxe antiga, com import para cada tipo</summary>

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

<details>
<summary>✅ Bom: sintaxe moderna, sem imports extras</summary>

```python
def find_user(user_id: int) -> User | None:
    ...

def parse_ids(raw: str | list[int]) -> list[int]:
    ...

def load_config() -> dict[str, str]:
    ...
```

</details>

## Quando usar t-string no lugar de f-string

A f-string interpola o valor direto no texto e entrega a string pronta. Isso serve para log e mensagem de tela. Serve mal para **SQL** (Structured Query Language · Linguagem de Consulta Estruturada), **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto) e comando de shell, porque nesses destinos o texto vira comando: um nome digitado como `'; DROP TABLE users; --` chega ao banco como instrução, e não como nome.

A t-string (Python 3.14, PEP 750) devolve um objeto `Template` em vez do texto pronto. Quem recebe esse objeto sabe quais pedaços vieram do usuário, e escapa cada um antes de montar a string final.

<details>
<summary>❌ Ruim: f-string montando SQL com texto que veio do usuário</summary>

```python
def build_query(user_input: str) -> str:
    query = f"SELECT * FROM users WHERE name = '{user_input}'"

    return query
```

</details>

<details>
<summary>✅ Bom: t-string deixa o destino escapar o valor antes de montar o texto</summary>

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

> Use f-string quando o texto vai para os olhos de alguém: log, mensagem de tela, rótulo de botão.
> Use t-string quando o texto vira comando no destino: consulta SQL, marcação HTML, linha de shell.

## pathlib: os caminhos de arquivo

`pathlib.Path` vem na biblioteca padrão e monta caminho com o operador `/`, o que dispensa a concatenação manual e acerta o separador em qualquer sistema operacional. O Python 3.14 trouxe `.copy()` e `.move()` para dentro do próprio `Path`, e o `shutil` sai da maioria dos arquivos.

<details>
<summary>❌ Ruim: os.path e shutil espalhados pelo mesmo trecho</summary>

```python
import os
import shutil

config_path = os.path.join(os.getcwd(), "config", "app.json")
if os.path.exists(config_path):
    shutil.copy(config_path, "/backup/app.json")
```

</details>

<details>
<summary>✅ Bom: pathlib.Path monta o caminho e checa a existência no mesmo objeto</summary>

```python
from pathlib import Path

config_path = Path.cwd() / "config" / "app.json"
if config_path.exists():
    config_path.copy(Path("/backup/app.json"))  # Python 3.14+
```

</details>
