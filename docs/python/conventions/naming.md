# Naming

Nomes bons tornam comentários desnecessários. O código deve contar a história por si só.

## Identificadores sem significado

<details>
<summary>❌ Bad</summary>
<br>

```python
r = apply(d, p, c)

def apply(x, p, c):
    if p["inadimplente"]:
        return False
    return c(x)
```

</details>

<br>

<details>
<summary>✅ Good</summary>
<br>

```python
discounted_order = apply_discount(order, calculate_discount)

def apply_discount(order, calculate_discount):
    if order.customer.defaulted:
        return None

    discounted_order = calculate_discount(order)

    return discounted_order
```

</details>

## Nomes em português

<details>
<summary>❌ Bad — snake_case com português fica desajeitado</summary>
<br>

```python
nome_do_usuario = "Alice"
lista_de_ids = [1, 2, 3]

def retorna_o_usuario(id):
    ...

def busca_endereco_do_cliente(id):
    ...
```

</details>

<br>

<details>
<summary>✅ Good — inglês: curto, direto, universal</summary>
<br>

```python
user_name = "Alice"
id_list = [1, 2, 3]

def get_user(user_id):
    ...

def get_customer_address(customer_id):
    ...
```

</details>

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
<summary>❌ Bad — case errado para o contexto</summary>
<br>

```python
maxRetries = 3
def CalculateTotal(items):
    ...

class order_repository:
    ...
```

</details>

<br>

<details>
<summary>✅ Good — convenções PEP 8 respeitadas</summary>
<br>

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
<summary>❌ Bad — ordem invertida</summary>
<br>

```python
get_profile_user()
update_status_order()

calculate_total_invoice()
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural</summary>
<br>

```python
get_user_profile()
update_order_status()

calculate_invoice_total()
```

</details>

## Verbos genéricos

<details>
<summary>❌ Bad — handle, process, manage, do não dizem nada</summary>
<br>

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

<br>

<details>
<summary>✅ Good — verbo de intenção</summary>
<br>

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
<summary>❌ Bad — nome revela infraestrutura, não domínio</summary>
<br>

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

<br>

<details>
<summary>✅ Good — nome fala a linguagem do negócio</summary>
<br>

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

## Código como documentação

Comentários que explicam o _quê_ mentem: o código muda, o comentário fica. Um nome expressivo
substitui qualquer comentário.

<details>
<summary>❌ Bad — comentário repete o que o código já diz</summary>
<br>

```python
# verifica se o usuário pode excluir registros
if user.status == "active" and "admin" in user.roles:
    delete_record(record_id)

# incrementa tentativas
attempts += 1
```

</details>

<br>

<details>
<summary>✅ Good — nome expressivo torna o comentário desnecessário</summary>
<br>

```python
can_delete_record = user.status == "active" and "admin" in user.roles
if can_delete_record:
    delete_record(record_id)

attempts += 1
```

</details>

## Boolean naming

<details>
<summary>❌ Bad — booleanos sem prefixo semântico</summary>
<br>

```python
loading = True
error = False

active = user.status == "active"
valid = "@" in email
```

</details>

<br>

<details>
<summary>✅ Good — prefixos is_, has_, can_, should_</summary>
<br>

```python
is_active = user.status == "active"
has_permission = "admin" in user.roles

can_delete = is_active and has_permission
should_retry = attempt < MAX_RETRIES
```

</details>
