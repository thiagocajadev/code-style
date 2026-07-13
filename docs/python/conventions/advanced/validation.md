# Validação em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

A validação acontece no limite do sistema, no ponto em que o dado de fora entra: o corpo da requisição HTTP, o arquivo que alguém subiu, a mensagem que chegou na fila. Depois desse ponto, o dado circula com o tipo já conferido, e as funções lá dentro podem confiar nele.

Isso é o que permite as camadas internas ficarem enxutas. Quando cada função repete a checagem, a mesma regra vive em cinco lugares e muda em quatro deles no dia da alteração.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **boundary** (limite) | O ponto por onde o dado de fora entra na aplicação. É o único lugar que valida |
| **Pydantic** (biblioteca de validação) | Valida e converte o dado a partir das anotações de tipo que você já escreveu |
| **BaseModel** (modelo base do Pydantic) | A classe que vira o contrato: cada campo anotado vira uma regra de validação |
| **schema** (contrato do dado) | A descrição da forma esperada: quais campos existem e de que tipo é cada um |
| **sanitize** (limpeza) | Tirar o espaço sobrando, baixar a caixa do email, normalizar o texto antes de validar |
| **ValidationError** (erro de validação) | A exceção do Pydantic. Ela lista todos os campos inválidos de uma vez, e não só o primeiro |
| **output filter** (filtro de saída) | O modelo que declara quais campos a resposta pode conter, para o resto ficar de fora |

<details>
<summary>❌ Ruim: a checagem escrita à mão, campo por campo</summary>

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

<details>
<summary>✅ Bom: o Pydantic valida no limite, e o domínio recebe o dado pronto</summary>

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

A validação passa por etapas, e cada uma tem um trabalho diferente:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

A limpeza tira o espaço sobrando do texto. O schema confere que os campos existem e são do tipo certo. As regras de negócio consultam o banco para saber se aquilo faz sentido no domínio. O filtro de saída escolhe o que a resposta mostra. Escrever as quatro dentro da mesma função deixa cada uma sem teste próprio, e é como o `password_hash` acaba na resposta.

<details>
<summary>❌ Ruim: limpeza, schema, regra de negócio e resposta na mesma função</summary>

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
        raise ValueError("Customer has unsettled debts.")

    order = await order_repository.create(body)

    return order  # retorna entidade completa com campos internos
```

</details>

<details>
<summary>✅ Bom: cada camada no seu lugar</summary>

```python
async def create_order(body: dict):
    input_data = OrderInput(**body)              # Sanitize + Schema Validate

    await validate_order_rules(input_data)       # Business Rules

    order = await order_repository.create(input_data)
    order_response = to_order_response(order)    # Output Filter
    return order_response
```

</details>

## Limpar antes de validar

O `.strip()` no texto e o `.lower()` no email vêm antes da validação do schema. O motivo é concreto: `" Admin@Email.com "` passa em qualquer regra de formato de email, e depois não encontra ninguém na busca por `admin@email.com` no banco.

O Pydantic faz essa limpeza dentro do próprio modelo. O `mode="before"` do `@field_validator` diz em que momento a função roda: antes de o Pydantic conferir o tipo do campo, e não depois. É o que permite receber o texto ainda cru, com espaço e caixa alta, e devolvê-lo limpo para a checagem.

<details>
<summary>❌ Ruim: o texto chega ao banco com espaço e caixa alta</summary>

```python
async def create_user(body: dict):
    input_data = CreateUserInput(**body)  # " Admin@Email.com " passa no schema

    await user_repository.create(input_data)
```

</details>

<details>
<summary>✅ Bom: o Pydantic limpa o texto antes de conferir o tipo</summary>

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

## O schema com Pydantic

O schema cuida da forma do dado: quais campos existem, de que tipo são, quais limites cada um respeita. As regras que dependem de consultar o banco ficam fora dele, e a próxima seção explica por quê.

Escrever o contrato uma vez, na classe, tira a checagem manual de dentro de todos os handlers que recebem aquele dado.

<details>
<summary>❌ Ruim: a checagem escrita à mão dentro do handler</summary>

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

<details>
<summary>✅ Bom: o contrato mora na classe, e o handler recebe o dado pronto</summary>

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

O schema responde se o dado tem a forma certa. A regra de negócio responde se ele faz sentido: este cliente está inadimplente, este produto ainda tem estoque, esta data já passou. Para responder, ela precisa consultar o banco ou um serviço externo, e é aí que ela sai do schema.

Um validador do Pydantic que vai ao banco cria dois problemas. O modelo passa a depender de uma conexão para ser instanciado, o que quebra qualquer teste que só queria conferir a forma do dado. E a consulta roda dentro de um construtor, num ponto em que ninguém espera uma ida ao banco.

<details>
<summary>❌ Ruim: o validador do schema consulta o banco</summary>

```python
class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

    @field_validator("customer_id")
    @classmethod
    def customer_must_not_be_defaulted(cls, customer_id):
        customer = database.get_customer(customer_id)  # I/O dentro de validador
        if customer.defaulted:
            raise ValueError("Customer has unsettled debts.")

        return customer_id
```

</details>

<details>
<summary>✅ Bom: o schema confere a forma, e a função confere a regra depois</summary>

```python
from pydantic import BaseModel

class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

async def create_order(data: OrderInput):
    customer = await customer_repository.find_by_id(data.customer_id)
    if customer.defaulted:
        raise BusinessError("Customer has unsettled debts.")

    order = await order_repository.create(data)
    return order
```

</details>

A regra de negócio é conferida na entrada da função. No exemplo ruim abaixo, o desconto negativo passa pela busca do pedido, pelo cálculo e pela montagem da nota, e só aparece na hora de gravar. Três operações rodaram para nada, e a mensagem de erro chega associada à gravação, longe do desconto que a causou.

<details>
<summary>❌ Ruim: o desconto negativo atravessa três passos antes de estourar</summary>

```python
async def issue_invoice(order_id: int, discount: float):
    order = await get_order(order_id)
    discounted_order = apply_discount(order, discount)
    invoice = build_invoice(discounted_order)

    await save_invoice(invoice)  # só aqui descobre que discount era negativo

    return invoice
```

</details>

<details>
<summary>✅ Bom: a guarda confere o desconto na primeira linha</summary>

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

## Output filter: não retornar dados sensíveis

O modelo de resposta é independente do modelo de domínio. Filtrar campos sensíveis na saída
evita vazamento acidental de dados.

<details>
<summary>❌ Ruim: entidade direta vaza campos internos</summary>

```python
async def get_user_profile(user_id: int):
    user = await user_repository.find_by_id(user_id)

    return user  # inclui password_hash, role, internal_flags...
```

</details>

<details>
<summary>✅ Bom: modelo de resposta declara os campos permitidos</summary>

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
