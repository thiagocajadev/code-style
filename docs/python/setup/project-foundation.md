# Project Foundation

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Python. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point como índice,
> configuração centralizada, módulos por domínio.

## Estrutura de arquivos

```
my-app/
├── pyproject.toml          ← deps, ruff, mypy, pytest
├── .editorconfig           ← indentação, charset, trailing whitespace
├── .env.example            ← template — nunca commite .env
├── scripts/
│   └── seed.py
├── main.py                 ← entry point
└── app/
    ├── config.py           ← Settings (pydantic-settings)
    ├── factory.py          ← create_app()
    ├── features/
    │   ├── orders/
    │   │   ├── module.py   ← register_orders()
    │   │   ├── router.py
    │   │   └── service.py
    │   └── users/
    │       ├── module.py   ← register_users()
    │       ├── router.py
    │       └── service.py
    └── infra/
        ├── database.py     ← create_engine(settings.database_url)
        └── auth.py         ← verify_token(settings.jwt_secret)
```

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- `ruff`: linting e formatação em um único binário — mais rápido que flake8 + black + isort

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install ruff
```

> [!NOTE] `uv` é uma alternativa moderna que substitui `pip` e `venv` em um único binário:
> instalação de pacotes e gerenciamento de ambientes virtuais ordens de magnitude mais rápido.

## pyproject.toml — configuração central

`pyproject.toml` é o único arquivo de configuração do projeto. Substitui `setup.py`, `setup.cfg`,
`requirements.txt`, `.flake8` e `mypy.ini` em um único lugar.

<details>
<summary>❌ Bad — configuração fragmentada em múltiplos arquivos</summary>
<br>

```
setup.py
setup.cfg
requirements.txt
requirements-dev.txt
.flake8
mypy.ini
```

</details>

<br>

<details>
<summary>✅ Good — pyproject.toml como SSOT (Single Source of Truth, fonte única de verdade)</summary>
<br>

```toml
[project]
name = "my-app"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = [
    "fastapi>=0.115",
    "pydantic>=2.0",
    "asyncpg>=0.30",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "ruff>=0.8",
]

[tool.ruff]
line-length = 100
target-version = "py314"

[tool.ruff.lint]
# E: pycodestyle errors, F: pyflakes, I: isort, UP: pyupgrade
select = ["E", "F", "I", "UP"]

[tool.mypy]
python_version = "3.14"
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

</details>

## Configuração centralizada

`pyproject.toml` configura ferramentas de build (ruff, mypy, pytest) — estático, versionado.
`app/config.py` lê variáveis de ambiente do `.env` em tempo de execução — nunca versionado.

`config.py` é o único ponto de leitura de variáveis de ambiente. Nenhum módulo acessa
`os.environ` diretamente. Use `pydantic-settings` para validação e tipagem automáticas.

<details>
<summary>❌ Bad — os.environ espalhado em todo lugar</summary>
<br>

```python
# database/client.py
import os
url = os.environ["DATABASE_URL"]  # leitura direta

# auth/middleware.py
import os
secret = os.environ["JWT_SECRET"]  # leitura direta
```

</details>

<br>

<details>
<summary>✅ Good — Settings como único ponto de entrada de env vars</summary>
<br>

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# app/features/orders/service.py
class OrderService:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
```

</details>

## Entry point enxuto

`main.py` declara intenção, não implementa. Toda configuração é delegada para módulos.
O arquivo serve como índice do projeto.

<details>
<summary>❌ Bad — main.py como dumping ground de configuração</summary>
<br>

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
import os

engine = create_async_engine(os.environ["DATABASE_URL"])
app = FastAPI()

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    async with AsyncSession(engine) as session:
        order = await session.get(Order, order_id)
        return order

@app.post("/orders")
async def create_order(data: dict):
    if not data.get("customer_id"):
        return {"error": "customer_id required"}
    async with AsyncSession(engine) as session:
        order = Order(**data)
        session.add(order)
        await session.commit()
        return order
```

</details>

<br>

<details>
<summary>✅ Good — main.py como índice, configuração delegada</summary>
<br>

```python
from app.config import settings
from app.factory import create_app

app = create_app(settings)
```

</details>

## Módulos por domínio

Cada domínio registra suas próprias rotas e dependências. O factory não conhece os internos
de cada módulo — apenas monta o app.

<details>
<summary>❌ Bad — factory conhece os internos de cada domínio</summary>
<br>

```python
# app/factory.py
from fastapi import FastAPI
from app.features.orders.router import build_router as build_orders_router
from app.features.orders.service import OrderService
from app.features.users.router import build_router as build_users_router
from app.features.users.service import UserService

def create_app(settings) -> FastAPI:
    app = FastAPI()

    order_service = OrderService(settings.database_url)
    orders_router = build_orders_router(order_service)
    app.include_router(orders_router, prefix="/orders")

    user_service = UserService(settings.database_url)
    users_router = build_users_router(user_service)
    app.include_router(users_router, prefix="/users")

    return app
```

</details>

<br>

<details>
<summary>✅ Good — cada domínio encapsula o próprio registro</summary>
<br>

```python
# app/factory.py
from fastapi import FastAPI
from app.features.orders.module import register_orders
from app.features.users.module import register_users

def create_app(settings) -> FastAPI:
    app = FastAPI()

    register_orders(app, settings)
    register_users(app, settings)

    return app
```

```python
# app/features/orders/module.py
from fastapi import FastAPI
from app.features.orders.router import build_router
from app.features.orders.service import OrderService

def register_orders(app: FastAPI, settings) -> None:
    order_service = OrderService(settings.database_url)
    router = build_router(order_service)

    app.include_router(router, prefix="/orders")
```

```python
# app/features/orders/router.py
from fastapi import APIRouter
from app.features.orders.service import OrderService

def build_router(order_service: OrderService) -> APIRouter:
    router = APIRouter()

    @router.get("/{order_id}")
    async def get_order(order_id: int):
        order = await order_service.find_by_id(order_id)

        return order

    @router.post("/")
    async def create_order(data: dict):
        order = await order_service.create(data)

        return order

    return router
```

</details>


