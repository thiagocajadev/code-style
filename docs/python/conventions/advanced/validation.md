# Validation

> Escopo: Python. Idiomas específicos deste ecossistema.

Validação acontece na fronteira do sistema — onde dados externos entram. Uma vez validado, o dado
circula com tipos garantidos. Revalidar dados internos é sinal de desconfiança no próprio código.

<details>
<summary>❌ Bad — verificações manuais duplicadas, sem contrato</summary>
<br>

```python
def create_order(data: dict):
    if "customer_id" not in data:
        raise ValueError("customer_id is required")
    if not isinstance(data["customer_id"], int):
        raise ValueError("customer_id must be an integer")
    if "items" not in data or not data["items"]:
        raise ValueError("items is required and cannot be empty")

    order = save_order(data)

    return order
```

</details>

<br>

<details>
<summary>✅ Good — Pydantic valida na fronteira, tipo garantido no domínio</summary>
<br>

```python
from pydantic import BaseModel

class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

def create_order(data: OrderInput):
    order = save_order(data)

    return order
```

</details>

---

O pipeline de validação tem responsabilidades distintas, cada uma no seu lugar:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

Misturar essas camadas cria acoplamento, dificulta testes e abre brechas de segurança.

<details>
<summary>❌ Bad — sanitize, schema, regras de negócio e output misturados na mesma função</summary>
<br>

```python
async def create_order(body: dict):
    if not body.get("customer_id"):
        raise ValueError("customer_id is required")
    if not isinstance(body["customer_id"], int):
        raise ValueError("customer_id must be an integer")
    if not body.get("items"):
        raise ValueError("items is required")

    customer = await customer_repository.find_by_id(body["customer_id"])
    if customer.defaulted:
        raise ValueError("Customer has unpaid debts.")

    order = await order_repository.create(body)

    return order  # retorna entidade completa com campos internos
```

</details>

<br>

<details>
<summary>✅ Good — cada camada no seu lugar</summary>
<br>

```python
async def create_order(body: dict):
    input_data = OrderInput(**body)              # Sanitize + Schema Validate

    await validate_order_rules(input_data)       # Business Rules

    order = await order_repository.create(input_data)
    order_response = to_order_response(order)    # Output Filter

    return order_response
```

</details>

## Sanitize — limpar antes de validar

Antes de validar, limpar: `.strip()` em strings, `.lower()` em emails. Dados sujos entram em
validação suja: um email com espaço passa no schema mas falha na busca no banco.

<details>
<summary>❌ Bad — dados brutos chegam direto na validação</summary>
<br>

```python
async def create_user(body: dict):
    input_data = CreateUserInput(**body)  # " Admin@Email.com " passa no schema

    await user_repository.create(input_data)
```

</details>

<br>

<details>
<summary>✅ Good — sanitize antes de validar</summary>
<br>

```python
from pydantic import BaseModel, field_validator

class CreateUserInput(BaseModel):
    name: str
    email: str

    @field_validator("name", "email", mode="before")
    @classmethod
    def strip_whitespace(cls, value):
        stripped = value.strip() if isinstance(value, str) else value

        return stripped

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        normalized = value.strip().lower() if isinstance(value, str) else value

        return normalized

async def create_user(body: dict):
    input_data = CreateUserInput(**body)

    await user_repository.create(input_data)
```

</details>

## Schema validation com Pydantic

Pydantic valida shape, tipos e constraints — nunca regras de negócio. Centraliza o contrato
técnico e elimina validação manual espalhada pelos handlers.

<details>
<summary>❌ Bad — verificações manuais duplicadas, sem contrato</summary>
<br>

```python
def create_order(data: dict):
    if "customer_id" not in data:
        raise ValueError("customer_id is required")
    if not isinstance(data["customer_id"], int):
        raise ValueError("customer_id must be an integer")
    if "items" not in data or not data["items"]:
        raise ValueError("items is required and cannot be empty")

    order = save_order(data)

    return order
```

</details>

<br>

<details>
<summary>✅ Good — schema centralizado, handler recebe dado tipado e validado</summary>
<br>

```python
from pydantic import BaseModel, field_validator

class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

    @field_validator("items")
    @classmethod
    def items_must_not_be_empty(cls, items):
        if not items:
            raise ValueError("Order must have at least one item.")

        return items

def create_order(data: OrderInput):
    order = save_order(data)

    return order
```

</details>

## Regras de negócio

Schema valida se o dado tem o formato correto. Regras de negócio validam se faz sentido no
domínio — dependem de **I/O** (Input/Output, Entrada/Saída) (banco, serviços externos) e não pertencem ao schema.

<details>
<summary>❌ Bad — I/O dentro do validador mistura camadas</summary>
<br>

```python
class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

    @field_validator("customer_id")
    @classmethod
    def customer_must_not_be_defaulted(cls, customer_id):
        customer = database.get_customer(customer_id)  # I/O dentro de validador
        if customer.defaulted:
            raise ValueError("Customer has unpaid debts.")

        return customer_id
```

</details>

<br>

<details>
<summary>✅ Good — schema valida shape; domínio valida regras após</summary>
<br>

```python
from pydantic import BaseModel

class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

async def create_order(data: OrderInput):
    customer = await customer_repository.find_by_id(data.customer_id)
    if customer.defaulted:
        raise BusinessError("Customer has unpaid debts.")

    order = await order_repository.create(data)

    return order
```

</details>

Regras de negócio falham rápido: valide na entrada da função, não após percorrer o fluxo inteiro.

<details>
<summary>❌ Bad — dado inválido percorre o fluxo antes de falhar</summary>
<br>

```python
async def issue_invoice(order_id: int, discount: float):
    order = await get_order(order_id)
    discounted_order = apply_discount(order, discount)
    invoice = build_invoice(discounted_order)

    await save_invoice(invoice)  # só aqui descobre que discount era negativo

    return invoice
```

</details>

<br>

<details>
<summary>✅ Good — guard clause valida na entrada, falha imediata</summary>
<br>

```python
async def issue_invoice(order_id: int, discount: float):
    if discount < 0:
        raise ValidationError("Discount cannot be negative.")

    order = await get_order(order_id)
    discounted_order = apply_discount(order, discount)
    invoice = build_invoice(discounted_order)

    await save_invoice(invoice)

    return invoice
```

</details>

## Output filter — não retornar dados sensíveis

O modelo de resposta é independente do modelo de domínio. Filtrar campos sensíveis na saída
evita vazamento acidental de dados.

<details>
<summary>❌ Bad — entidade direta vaza campos internos</summary>
<br>

```python
async def get_user_profile(user_id: int):
    user = await user_repository.find_by_id(user_id)

    return user  # inclui password_hash, role, internal_flags...
```

</details>

<br>

<details>
<summary>✅ Good — modelo de resposta declara os campos permitidos</summary>
<br>

```python
from pydantic import BaseModel

class UserProfile(BaseModel):
    user_id: int
    name: str
    email: str

async def get_user_profile(user_id: int) -> UserProfile:
    user = await user_repository.find_by_id(user_id)
    profile = UserProfile(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
    )

    return profile
```

</details>
