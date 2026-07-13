# FastAPI

> Escopo: Python. Guia baseado em **FastAPI 0.136.0** com **Python 3.12+**.

O FastAPI é um framework web assíncrono para construir **API** (Application Programming Interface · Interface de Programação de Aplicações). Ele lê as anotações de tipo que você já escreveu, valida a entrada com o Pydantic a partir delas, e gera a documentação **OpenAPI** (Open API Specification · Especificação de API Aberta) sem configuração.

Este guia mostra como organizar os schemas, as rotas e as dependências seguindo os princípios de [funções](../conventions/functions.md) e [validação](../conventions/advanced/validation.md).

## Conceitos fundamentais

| Conceito                              | O que é                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Router** (roteador)                 | O `APIRouter`, que agrupa as rotas de um domínio. O app o monta com `include_router()`                |
| **Path Operation** (rota)             | A função decorada com `@router.get()` ou `@router.post()`. É por onde a requisição entra             |
| **Schema** (contrato do dado)         | O modelo Pydantic que declara o formato da entrada ou da saída, separado das classes de domínio       |
| **Dependency** (dependência)          | A função injetada com `Depends()`. Resolve autenticação, sessão de banco e paginação num lugar só     |
| **response_model** (modelo de resposta) | O parâmetro do decorador que declara o formato da saída. O FastAPI o valida e o publica na documentação |
| **Lifespan** (ciclo de vida)          | O bloco que abre os recursos quando o app sobe (a conexão com o banco, o cliente HTTP) e os fecha quando ele desce |

## Arquitetura

O FastAPI recebe a requisição, resolve as dependências, chama o handler e serializa a resposta usando o `response_model`. O handler fica com o trabalho de traduzir entre o mundo HTTP e o serviço, e a regra de negócio mora no serviço.

**Fluxo:** `Request → Router → Dependency → Handler → Service → Response`

| Camada                        | O que faz                                              | Arquivo           |
| ----------------------------- | ------------------------------------------------------ | ----------------- |
| **Router**                    | Agrupa as rotas de um domínio                          | `routers/`        |
| **Handler**                   | Recebe os parâmetros, chama o serviço, devolve o schema | `routers/`       |
| **Service**                   | A regra de negócio, trabalhando sobre as classes de domínio | `services/`  |
| **Repository**                | O acesso ao banco: as consultas e as escritas          | `repositories/`   |
| **Schema**                    | O contrato de entrada e de saída, com Pydantic         | `schemas/`        |
| **Dependency**                | A sessão de banco, a autenticação e a paginação, com `Depends()` | `dependencies/` |

```
app/
├── main.py                    → FastAPI(), include_router(), lifespan
├── routers/
│   ├── orders.py              → path operations do domínio orders
│   └── customers.py           → path operations do domínio customers
├── services/
│   └── order_service.py       → lógica de negócio
├── repositories/
│   └── order_repository.py    → acesso ao banco
├── schemas/
│   └── order.py               → OrderInput, OrderResponse
└── dependencies/
    ├── auth.py                → require_auth, get_current_user
    └── database.py            → get_session
```

## Schemas

A entrada e a saída são dois modelos Pydantic diferentes, mesmo quando os campos coincidem hoje. O modelo de saída declara o que o cliente pode ver, e é o que mantém a senha e o token fora da resposta no dia em que alguém acrescentar um campo à classe de domínio.

Receber `data: dict` desliga a validação inteira: qualquer corpo passa, e o erro aparece lá dentro, na hora de gravar.

<details>
<summary>❌ Ruim: recebe um dicionário qualquer e devolve a entidade crua</summary>

```python
@router.post("/orders")
async def create_order(data: dict):
    order = await save_order(data)
    return order
```

</details>

<details>
<summary>✅ Bom: um modelo para a entrada, outro para a saída, e o formato da resposta declarado</summary>

```python
# schemas/order.py
from pydantic import BaseModel

class OrderInput(BaseModel):
    customer_id: int
    items: list[str]

class OrderResponse(BaseModel):
    order_id: int
    customer_id: int
    status: str
    total: float
```

```python
# routers/orders.py
@router.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(
    order_input: OrderInput,
    order_service: OrderService = Depends(get_order_service),
):
    created_order = await order_service.create(order_input)
    return created_order
```

</details>

## As rotas

O handler recebe os parâmetros, chama o serviço e devolve o resultado. Ele não escreve SQL e não calcula desconto.

O motivo é o teste. Um serviço é uma função que você chama direto, com os argumentos que quiser. Um handler com a regra dentro só é testável subindo um servidor e mandando uma requisição, e a mesma regra terá que ser reescrita quando ela precisar rodar num script de linha de comando ou num consumidor de fila.

<details>
<summary>❌ Ruim: o SQL e o cálculo do desconto dentro do handler</summary>

```python
@router.get("/orders/{order_id}")
async def get_order(order_id: int):
    order = await database.fetch_one(
        "SELECT * FROM orders WHERE id = :id", {"id": order_id}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Not found")

    discount = order["total"] * 0.1 if order["is_vip"] else 0
    total = order["total"] - discount

    return {"id": order["id"], "total": total}
```

</details>

<details>
<summary>✅ Bom: o handler só chama o serviço, e o formato da resposta está declarado</summary>

```python
# routers/orders.py
@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    order_service: OrderService = Depends(get_order_service),
):
    order = await order_service.find_by_id(order_id)
    return order
```

```python
# services/order_service.py
async def find_by_id(self, order_id: int) -> Order:
    order = await self.order_repository.find_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return order
```

</details>

## Dependências

O `Depends()` declara o que a rota precisa, e o FastAPI providencia. A autenticação e a sessão de banco são escritas uma vez, e cada rota que precisar delas as recebe como parâmetro.

Sem isso, a decodificação do token vira um bloco copiado no topo de cada handler. No dia em que a regra de autenticação mudar, ela muda em quarenta lugares, e algum vai ficar para trás.

<details>
<summary>❌ Ruim: o token é decodificado à mão dentro do handler</summary>

```python
@router.get("/orders")
async def list_orders(token: str = Header()):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    if not payload:
        raise HTTPException(status_code=401)

    async with AsyncSession(engine) as session:
        result = await session.execute(select(Order))
        orders = result.scalars().all()

    return orders
```

</details>

<details>
<summary>✅ Bom: a rota declara que precisa de autenticação e sessão, e as recebe prontas</summary>

```python
# dependencies/auth.py
async def require_auth(token: str = Header()) -> UserClaims:
    claims = decode_token(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid token.")

    return claims

# dependencies/database.py
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session
```

```python
# routers/orders.py
@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    claims: UserClaims = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
    order_service: OrderService = Depends(get_order_service),
):
    orders = await order_service.fetch_all(claims.user_id, session)
    return orders
```

</details>

## Código assíncrono

Uma chamada síncrona dentro de um handler `async` trava o **event loop** (o laço que reveza as requisições), e com ele todas as outras requisições em andamento. Os culpados de sempre: a biblioteca `requests`, o `time.sleep`, e o **ORM** (Object-Relational Mapping · mapeamento objeto-relacional) que não tem versão assíncrona.

O substituto de cada um existe. Para HTTP, o `httpx` com `AsyncClient`. Para espera, `asyncio.sleep`. Para banco, a versão assíncrona do driver.

<details>
<summary>❌ Ruim: requests e time.sleep travam o servidor inteiro por uma requisição</summary>

```python
import time
import requests

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int):
    time.sleep(1)
    response = requests.get(f"https://payments.example.com/orders/{order_id}")

    return response.json()
```

</details>

<details>
<summary>✅ Bom: httpx assíncrono, e o servidor segue atendendo durante a espera</summary>

```python
# routers/orders.py
@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    http_client: AsyncClient = Depends(get_http_client),
    order_service: OrderService = Depends(get_order_service),
):
    order = await order_service.find_by_id(order_id, http_client)
    return order
```

```python
# services/order_service.py
async def find_by_id(self, order_id: int, http_client: AsyncClient) -> OrderResponse:
    response = await http_client.get(f"/orders/{order_id}")
    response.raise_for_status()

    order_data = response.json()
    order = OrderResponse.model_validate(order_data)
    return order
```

</details>
