# Performance em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Meça antes de otimizar. Um `cProfile` mostra onde o tempo vai, e quase sempre o lugar é outro. A regra de ouro é escrever o código legível primeiro, e mexer nele quando a medição apontar aquele trecho.

Os casos desta página são a exceção que vale saber de cor. Eles aparecem toda hora, a forma correta é tão legível quanto a errada, e a diferença cresce com o tamanho do dado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **generator** (gerador) | Produz um valor por vez, conforme quem consome pede. Nunca monta a lista inteira na memória |
| **list comprehension** (compreensão de lista) | A sintaxe `[f(x) for x in xs if p(x)]`, que monta uma lista a partir de outra |
| **hot path** (trecho de execução frequente) | O código que roda milhares de vezes por segundo. Um custo pequeno ali é multiplicado |
| **GIL** (Global Interpreter Lock · Trava Global do Interpretador) | A trava do CPython que deixa uma thread por vez executando código Python |
| **CPU-bound** (limitado pelo processador) | A operação cujo gargalo é cálculo. O `multiprocessing` ajuda, e o `asyncio` não |
| **I/O-bound** (limitado por entrada e saída) | A operação cujo gargalo é a espera por rede, disco ou banco. É onde o `asyncio` resolve |
| **profiler** (medidor) | A ferramenta, como o `cProfile`, que mostra onde o tempo foi gasto de verdade |

## Gerador no lugar da lista

Quando o resultado é consumido uma vez só (num `for`, num `sum`, num `any`), o gerador entrega os valores um por um. A lista intermediária deixa de existir, e o pico de memória cai junto: uma lista com um milhão de preços ocupa memória, e o gerador ocupa uma linha por vez.

<details>
<summary>❌ Ruim: monta a lista inteira só para somá-la em seguida</summary>

```python
def sum_active_prices(products: list) -> float:
    prices = [product.price for product in products if product.is_active]
    total = sum(prices)

    return total
```

</details>

<details>
<summary>✅ Bom: soma um preço por vez, sem montar a lista</summary>

```python
def sum_active_prices(products: list) -> float:
    total = sum(product.price for product in products if product.is_active)
    return total
```

</details>

## set quando a pergunta é "está aí dentro?"

Perguntar `x in lista` percorre a lista até achar. Perguntar `x in conjunto` responde num passo só, porque o `set` guarda os itens pelo endereço calculado a partir do valor.

A diferença cresce rápido. Filtrar mil usuários contra mil bloqueados faz um milhão de comparações com a lista, e mil com o conjunto. Converter a lista em `set` uma vez, antes do laço, é o que a linha extra do exemplo bom faz.

<details>
<summary>❌ Ruim: cada usuário percorre a lista de bloqueados inteira</summary>

```python
def filter_blocked_users(users: list, blocked_ids: list) -> list:
    active_users = [user for user in users if user.user_id not in blocked_ids]

    return active_users
```

</details>

<details>
<summary>✅ Bom: o conjunto responde a cada busca num passo só</summary>

```python
def filter_blocked_users(users: list, blocked_ids: list) -> list:
    blocked_set = set(blocked_ids)
    active_users = [user for user in users if user.user_id not in blocked_set]
    return active_users
```

</details>

## Montar texto dentro de um laço

Em Python, o texto não muda depois de criado. Cada `row += field` monta um texto novo, copiando tudo o que já estava lá. Numa lista de mil campos, a última linha do laço copia os 999 anteriores de novo.

O `"".join()` percorre os pedaços, soma os tamanhos, reserva o espaço uma vez e copia cada pedaço uma vez.

<details>
<summary>❌ Ruim: cada volta do laço copia o texto inteiro de novo</summary>

```python
def build_csv_row(fields: list[str]) -> str:
    row = ""
    for field in fields:
        row += field + ","

    return row.rstrip(",")
```

</details>

<details>
<summary>✅ Bom: o join copia cada pedaço uma única vez</summary>

```python
def build_csv_row(fields: list[str]) -> str:
    row = ",".join(fields)
    return row
```

</details>

## Ler um arquivo grande

O `read()` traz o arquivo inteiro para a memória. Num log de dois gigabytes, o processo pede dois gigabytes e o servidor pode derrubá-lo antes da primeira linha ser contada.

Percorrer o arquivo linha a linha mantém uma linha por vez na memória, e o consumo fica igual para um arquivo de dois megabytes e para um de dois gigabytes.

<details>
<summary>❌ Ruim: puxa o arquivo inteiro para a memória antes de contar</summary>

```python
def count_error_lines(log_path: str) -> int:
    with open(log_path) as file:
        content = file.read()

    error_count = content.count("ERROR")

    return error_count
```

</details>

<details>
<summary>✅ Bom: lê uma linha por vez, e a memória não cresce com o arquivo</summary>

```python
def count_error_lines(log_path: str) -> int:
    error_count = sum(1 for line in open(log_path) if "ERROR" in line)
    return error_count
```

</details>

## dict.get() quando a chave pode não existir

`permissions[user_id]` levanta `KeyError` quando a chave não está lá, e obriga o `try/except` em volta. `permissions.get(user_id, "viewer")` devolve o valor padrão na mesma linha.

São quatro linhas a menos, e a intenção fica declarada: quem não tem papel definido é visitante.

<details>
<summary>❌ Ruim: try/except para uma chave que pode faltar por rotina</summary>

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
<summary>✅ Bom: o get devolve "viewer" quando a chave não existe</summary>

```python
def get_user_role(permissions: dict, user_id: str) -> str:
    role = permissions.get(user_id, "viewer")
    return role
```

</details>

## __slots__ em classes com muitas instâncias

Toda instância de uma classe comum carrega um dicionário interno para guardar os atributos, e esse dicionário ocupa espaço mesmo quando a classe tem três campos. Declarar `slots=True` troca o dicionário por uma estrutura fixa com as três posições.

A diferença só importa em volume. Numa classe com dez instâncias, não mude nada. Em duzentos mil itens de pedido carregados de uma vez, o consumo de memória cai à metade.

<details>
<summary>❌ Ruim: cada item carrega um dicionário interno para três campos</summary>

```python
class OrderItem:
    def __init__(self, product_id: int, quantity: int, unit_price: float) -> None:
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
```

</details>

<details>
<summary>✅ Bom: slots=True troca o dicionário por três posições fixas</summary>

```python
from dataclasses import dataclass

@dataclass(slots=True)
class OrderItem:
    product_id: int
    quantity: int
    unit_price: float
```

</details>
