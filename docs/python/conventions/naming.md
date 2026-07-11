# Naming

Quando o nome carrega a intenção, o comentário deixa de fazer falta. Use
**snake_case** (caixa-baixa com underline) para identificadores e **PascalCase** (pascal) para
classes: é o padrão do **PEP 8** (Python Enhancement Proposal 8, Proposta de Melhoria 8).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **PEP 8** (Python Enhancement Proposal 8, Proposta de Melhoria 8) | guia oficial de estilo da linguagem; define convenções de nome |
| **snake_case** (caixa-baixa com underline) | convenção para variáveis, funções e módulos: `user_name`, `find_by_id` |
| **PascalCase** (pascal) | convenção para classes e exceções: `OrderService`, `ValidationError` |
| **SCREAMING_SNAKE_CASE** (caixa-alta com underline) | convenção para constantes de módulo: `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **dunder** (double underscore, duplo sublinhado) | nomes `__nome__` reservados pela linguagem: `__init__`, `__repr__` |
| **intention-revealing name** (nome que revela intenção) | nome que descreve propósito, não tipo: `expiration_days`, não `int_d` |
| **boolean prefix** (prefixo booleano) | `is_`, `has_`, `should_` deixa booleanos óbvios: `is_active`, `has_permission` |

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
<summary>✅ Bom: inglês: curto, direto, universal</summary>

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

## Convenções de case

Python tem convenções fortes definidas pela PEP 8. Segui-las é parte do idioma, não preferência.

| Contexto                              | Convenção         | Exemplos                              |
| ------------------------------------- | ----------------- | ------------------------------------- |
| Variáveis e funções                   | `snake_case`      | `user_name`, `calculate_total`        |
| Classes                               | `PascalCase`      | `UserService`, `OrderRepository`      |
| Constantes de módulo                  | `UPPER_SNAKE_CASE`| `MAX_RETRIES`, `ONE_DAY_SECONDS`      |
| Atributos privados (convenção)        | `_snake_case`     | `_cache`, `_connection`               |
| Métodos especiais (dunder)            | `__snake_case__`  | `__init__`, `__str__`, `__repr__`     |
| Parâmetro descartado                  | `_`               | `for _ in range(3):`                  |

<details>
<summary>❌ Ruim: case errado para o contexto</summary>

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

## Ordem semântica invertida

Em inglês, o nome segue a ordem natural da fala: **ação + objeto + contexto**.

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

<details>
<summary>❌ Ruim: handle, process, manage, do não dizem nada</summary>

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

## Domain-first naming

O nome reflete a intenção de negócio, não o detalhe técnico de como ou onde a operação acontece.

<details>
<summary>❌ Ruim: nome revela infraestrutura, não domínio</summary>

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

Comentários que explicam o _quê_ mentem: o código muda, o comentário fica. Um nome expressivo
substitui qualquer comentário.

<details>
<summary>❌ Ruim: comentário repete o que o código já diz</summary>

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

## Boolean naming

<details>
<summary>❌ Ruim: booleanos sem prefixo semântico</summary>

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
