# FastAPI

> Escopo: Python. Guia baseado em **FastAPI 0.136.0** com **Python 3.12+**.

FastAPI é um framework web assíncrono para construção de **APIs** (Application Programming
Interfaces, Interfaces de Programação). Usa type hints para validação automática via Pydantic e
gera documentação **OpenAPI** (Open API Specification, Especificação de API Aberta) sem
configuração extra.

Este guia mostra como organizar schemas, path operations e dependências seguindo os princípios
de [functions.md](../conventions/functions.md) e
[validation.md](../conventions/advanced/validation.md).

## Conceitos fundamentais

| Conceito                              | O que é                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Router** (Roteador)                 | `APIRouter`: agrupa path operations de um domínio; montado no app via `include_router()`             |
| **Path Operation** (Operação de rota) | Função decorada com `@router.get()`, `@router.post()` etc.; ponto de entrada de uma requisição       |
| **Schema** (Esquema)                  | Modelo Pydantic que define o contrato de entrada ou saída; separado da camada de domínio             |
| **Dependency** (Dependência)          | Função injetada via `Depends()`: resolve autenticação, sessão de banco, paginação                    |
| **response_model**                    | Parâmetro do decorator: define e valida o contrato de saída; exposto no OpenAPI                      |
| **Lifespan** (Ciclo de vida)          | Contexto assíncrono que inicializa e encerra recursos (pool de banco, cliente HTTP) no startup/shutdown |

## Arquitetura

FastAPI recebe a requisição, injeta dependências, chama o handler e serializa a resposta via
`response_model`. Toda lógica de negócio fica fora do handler.

**Fluxo:** `Request → Router → Dependency → Handler → Service → Response`

| Camada                        | O que faz                                              | Arquivo           |
| ----------------------------- | ------------------------------------------------------ | ----------------- |
| **Router**                    | Agrupa rotas por domínio                               | `routers/`        |
| **Handler** (Path Operation)  | Recebe parâmetros, chama Service, retorna schema       | `routers/`        |
| **Service**                   | Lógica de negócio; opera sobre domain objects          | `services/`       |
| **Repository**                | Acesso ao banco: queries e mutações                    | `repositories/`   |
| **Schema**                    | Contrato de entrada/saída via Pydantic                 | `schemas/`        |
| **Dependency**                | Sessão de banco, auth, paginação via `Depends()`       | `dependencies/`   |

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

Schemas de entrada e saída são Pydantic models separados. O schema de resposta nunca expõe
campos internos (senhas, tokens, IDs de banco não destinados ao cliente).

<details>
<summary>❌ Bad — dict sem validação, mesmo modelo para entrada e saída, sem response_model</summary>
<br>

```python
@router.post("/orders")
async def create_order(data: dict):
    order = await save_order(data)
    return order
```

</details>

<br>

<details>
<summary>✅ Good — schemas separados, response_model declarado</summary>
<br>

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

## Path Operations

O handler é fino: recebe parâmetros, delega ao serviço e retorna. Sem lógica de negócio inline,
sem acesso direto ao banco.

<details>
<summary>❌ Bad — lógica de negócio no handler, acesso direto ao banco, sem response_model</summary>
<br>

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

<br>

<details>
<summary>✅ Good — handler fino, delega ao serviço, response_model declarado</summary>
<br>

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

`Depends()` injeta recursos reutilizáveis em qualquer handler. Autenticação e sessão de banco
definidas uma vez e compartilhadas entre rotas.

<details>
<summary>❌ Bad — auth repetida em cada handler, sessão de banco acoplada ao handler</summary>
<br>

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

<br>

<details>
<summary>✅ Good — auth e sessão injetadas via Depends, reutilizáveis em qualquer rota</summary>
<br>

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

## Async

Handlers assíncronos não bloqueiam o event loop. Chamadas síncronas de **I/O** (Input/Output, Entrada/Saída) (**ORM** (Object-Relational Mapper, Mapeador Objeto-Relacional) síncrono,
`time.sleep`, biblioteca `requests`) congestionam todas as requisições em andamento.

<details>
<summary>❌ Bad — I/O síncrono dentro de handler assíncrono, bloqueia o event loop</summary>
<br>

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

<br>

<details>
<summary>✅ Good — I/O assíncrono com httpx, sem bloqueio do event loop</summary>
<br>

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
