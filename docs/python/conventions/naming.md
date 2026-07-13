# Nomes em Python

Um nome que descreve a intenção poupa o comentário que explicaria a mesma coisa. Python define suas convenções no **PEP 8** (Python Enhancement Proposal 8 · Proposta de Melhoria 8), o guia oficial de estilo: `snake_case` para identificadores, `PascalCase` para classes. Seguir essas formas é parte de escrever Python, e não preferência pessoal.

Esta página cobre as convenções de caixa, a escolha do verbo e os nomes que revelam o domínio do problema.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PEP 8** (Python Enhancement Proposal 8 · Proposta de Melhoria 8) | guia oficial de estilo da linguagem; define as convenções de nome |
| **snake_case** (caixa-baixa com underline) | convenção para variáveis, funções e módulos: `user_name`, `find_by_id` |
| **PascalCase** (caixa camelo iniciando em maiúscula) | convenção para classes e exceções: `OrderService`, `ValidationError` |
| **SCREAMING_SNAKE_CASE** (caixa-alta com underline) | convenção para constantes de módulo: `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **dunder** (double underscore · duplo sublinhado) | nomes no formato `__nome__`, reservados pela linguagem: `__init__`, `__repr__` |
| **intention-revealing name** (nome que revela a intenção) | nome que descreve o propósito do valor: `expiration_days` diz o que guarda, `int_d` esconde |
| **boolean prefix** (prefixo booleano) | `is_`, `has_`, `should_` marcam o identificador que guarda verdadeiro ou falso: `is_active`, `has_permission` |

<a id="meaningless-identifiers"></a>

## Identificadores sem significado

<details>
<summary>❌ Ruim</summary>

```python
r = apply(d, p, c)

def apply(x, p, c):
    if p["inadimplente"]:
        return False
    return c(x)
```

</details>

<details>
<summary>✅ Bom</summary>

```python
discounted_order = apply_discount(order, calculate_discount)

def apply_discount(order, calculate_discount):
    if order.customer.defaulted:
        return None

    discounted_order = calculate_discount(order)
    return discounted_order
```

</details>

<a id="portuguese-names"></a>

## Nomes em português

<details>
<summary>❌ Ruim: snake_case com português fica desajeitado</summary>

```python
nome_do_usuario = "Alice"
lista_de_ids = [1, 2, 3]

def retorna_o_usuario(id):
    ...

def busca_endereco_do_cliente(id):
    ...
```

</details>

<details>
<summary>✅ Bom: em inglês o nome fica curto e legível para qualquer time</summary>

```python
user_name = "Alice"
id_list = [1, 2, 3]

def get_user(user_id):
    ...

def get_customer_address(customer_id):
    ...
```

</details>

<a id="case-conventions"></a>

## Convenções de caixa

A PEP 8 fixa uma convenção por contexto. A tabela abaixo é a lista inteira que aparece no dia a dia.

| Contexto                              | Convenção         | Exemplos                              |
| ------------------------------------- | ----------------- | ------------------------------------- |
| Variáveis e funções                   | `snake_case`      | `user_name`, `calculate_total`        |
| Classes                               | `PascalCase`      | `UserService`, `OrderRepository`      |
| Constantes de módulo                  | `UPPER_SNAKE_CASE`| `MAX_RETRIES`, `ONE_DAY_SECONDS`      |
| Atributos privados (convenção)        | `_snake_case`     | `_cache`, `_connection`               |
| Métodos especiais (dunder)            | `__snake_case__`  | `__init__`, `__str__`, `__repr__`     |
| Parâmetro descartado                  | `_`               | `for _ in range(3):`                  |

<details>
<summary>❌ Ruim: a caixa não combina com o contexto</summary>

```python
maxRetries = 3
def CalculateTotal(items):
    ...

class order_repository:
    ...
```

</details>

<details>
<summary>✅ Bom: convenções PEP 8 respeitadas</summary>

```python
MAX_RETRIES = 3

def calculate_total(items):
    ...

class OrderRepository:
    ...
```

</details>

## Ordem das palavras no nome

Em inglês, o nome segue a ordem da fala: ação, depois objeto, depois contexto. `get_user_profile` lê como uma frase; `get_profile_user` obriga o leitor a reordenar as palavras na cabeça.

<details>
<summary>❌ Ruim: ordem invertida</summary>

```python
get_profile_user()
update_status_order()

calculate_total_invoice()
```

</details>

<details>
<summary>✅ Bom: ordem natural</summary>

```python
get_user_profile()
update_order_status()

calculate_invoice_total()
```

</details>

## Verbos genéricos

`handle`, `process`, `manage` e `do` cabem em qualquer função, e por isso não descrevem nenhuma. Quem lê a chamada continua sem saber o que acontece lá dentro.

<details>
<summary>❌ Ruim: verbos que servem para qualquer coisa</summary>

```python
def handle(data):
    ...

def process(input_data):
    ...

def manage(items):
    ...

def do_stuff(x):
    ...
```

</details>

<details>
<summary>✅ Bom: verbo de intenção</summary>

```python
def validate_payment(payment):
    ...

def calculate_order_total(items):
    ...

def notify_customer_default(order):
    ...

def apply_seasonal_discount(order):
    ...
```

</details>

## Taxonomia de verbos

| Intenção           | Preferir                                  | Evitar             |
| ------------------ | ----------------------------------------- | ------------------ |
| Ler de storage     | `fetch`, `load`, `find`, `get`            | `retrieve`, `pull` |
| Escrever/persistir | `save`, `persist`, `create`, `insert`     | `put`, `push`      |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build` | `get`, `do`        |
| Transformar        | `map`, `transform`, `convert`, `format`   | `process`, `parse` |
| Validar            | `validate`, `check`, `assert`, `verify`   | `handle`, `test`   |
| Notificar          | `send`, `dispatch`, `notify`, `emit`      | `fire`, `trigger`  |

## Nomes que falam a linguagem do negócio

O nome descreve a intenção de negócio. `charge_customer` continua verdadeiro depois que a Stripe virar outro provedor; `call_stripe` vira mentira no dia da troca, e o nome passa a apontar para uma infraestrutura que saiu.

<details>
<summary>❌ Ruim: o nome expõe a infraestrutura escolhida</summary>

```python
def call_stripe(amount):
    ...

def get_user_from_db(user_id):
    ...

def post_to_slack(message):
    ...

def save_to_s3(file):
    ...
```

</details>

<details>
<summary>✅ Bom: nome fala a linguagem do negócio</summary>

```python
def charge_customer(amount):
    ...

def find_user(user_id):
    ...

def notify_team(message):
    ...

def archive_document(file):
    ...
```

</details>

<a id="code-as-documentation"></a>

## Código como documentação

Um comentário que descreve o que a linha faz fica desatualizado assim que alguém altera a linha e esquece o comentário logo acima. O nome extraído para uma variável resolve o mesmo problema e acompanha a mudança, porque ele faz parte do código.

Guarde o comentário para o que o código sozinho não mostra: a restrição externa, a razão da escolha, o link para o chamado que originou a regra.

<details>
<summary>❌ Ruim: o comentário repete o que a linha abaixo já diz</summary>

```python
# verifica se o usuário pode excluir registros
if user.status == "active" and "admin" in user.roles:
    delete_record(record_id)

# incrementa tentativas
attempts += 1
```

</details>

<details>
<summary>✅ Bom: nome expressivo torna o comentário desnecessário</summary>

```python
can_delete_record = user.status == "active" and "admin" in user.roles
if can_delete_record:
    delete_record(record_id)

attempts += 1
```

</details>

## Nomes de booleano

O prefixo avisa o leitor de que o identificador guarda verdadeiro ou falso, antes que ele chegue no `if`. Use `is_` para estado, `has_` para posse, `can_` para permissão e `should_` para decisão.

<details>
<summary>❌ Ruim: booleano sem prefixo, indistinguível de um valor comum</summary>

```python
loading = True
error = False

active = user.status == "active"
valid = "@" in email
```

</details>

<details>
<summary>✅ Bom: prefixos is_, has_, can_, should_</summary>

```python
is_active = user.status == "active"
has_permission = "admin" in user.roles

can_delete = is_active and has_permission
should_retry = attempt < MAX_RETRIES
```

</details>
