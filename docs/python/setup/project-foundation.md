# Base de um projeto Python

> [!NOTE]
> Essa estrutura reflete como costumo iniciar projetos Python. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa são os princípios: ponto de entrada
> como índice, configuração num lugar só, módulos organizados por domínio.

O `pyproject.toml` concentra as dependências e a configuração das ferramentas: o `ruff` para lint, o `mypy` para tipos e o `pytest` para testes. O ponto de entrada carrega a configuração, registra o que a aplicação precisa e a coloca no ar.

As pastas são organizadas por domínio: `orders/` guarda a rota, o serviço e os modelos de pedido, juntos. A alternativa, uma pasta `routers/` com as rotas de tudo e uma `services/` com os serviços de tudo, espalha uma alteração de pedido por quatro pastas.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **pyproject.toml** (manifesto do projeto) | O arquivo único com as dependências, o build e a configuração do ruff, do mypy e do pytest |
| **virtualenv** (ambiente virtual) | A pasta que isola os pacotes deste projeto do Python instalado na máquina |
| **ruff** (lint e formatação) | Confere as regras de estilo e formata o código. É escrito em Rust, e substitui o flake8, o isort e o black |
| **mypy** (verificador de tipos) | Lê as anotações de tipo e acusa a incompatibilidade antes de o programa rodar |
| **pytest** (ferramenta de testes) | O executor padrão de testes do ecossistema |
| **entry point** (ponto de entrada) | O módulo que carrega a configuração e sobe a aplicação |
| **feature module** (módulo de domínio) | O pacote que reúne a rota, o serviço e os modelos de um domínio, num lugar só |

## Estrutura de arquivos

```
my-app/
├── pyproject.toml          ← deps, ruff, mypy, pytest
├── .editorconfig           ← indentação, charset, trailing whitespace
├── .env.example            ← template; nunca commite .env
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
- `ruff`: linting e formatação em um único binário, mais rápido que flake8 + black + isort

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install ruff
```

> [!NOTE]
> `uv` é uma alternativa moderna que substitui `pip` e `venv` em um único binário:
> instalação de pacotes e gerenciamento de ambientes virtuais ordens de magnitude mais rápido.

## pyproject.toml, o arquivo de configuração do projeto

Um arquivo só, no lugar dos cinco que o Python acumulou ao longo dos anos: `setup.py`, `setup.cfg`, `requirements.txt`, `.flake8` e `mypy.ini`. Cada ferramenta lê a sua seção.

<details>
<summary>❌ Ruim: a configuração espalhada por cinco arquivos diferentes</summary>

```
setup.py
setup.cfg
requirements.txt
requirements-dev.txt
.flake8
mypy.ini
```

</details>

<details>
<summary>✅ Bom: o pyproject.toml concentra a configuração num arquivo só</summary>

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

## A configuração lida num lugar só

Os dois arquivos de configuração cuidam de coisas diferentes. O `pyproject.toml` guarda o que é igual para todo mundo (as regras do ruff, a versão do Python) e vai para o git. O `app/config.py` lê o que muda de ambiente para ambiente (o endereço do banco, a chave da API), e o `.env` de onde ele lê nunca vai para o git.

Deixe o `config.py` ser o único lugar do projeto que toca em `os.environ`. Quando o `os.environ["DATABASE_URL"]` aparece em cinco módulos, ninguém sabe quais variáveis o projeto exige sem varrer o código inteiro, e o programa sobe faltando uma.

<details>
<summary>❌ Ruim: cada módulo lê a variável de ambiente por conta própria</summary>

```python
# database/client.py
import os
url = os.environ["DATABASE_URL"]  # leitura direta

# auth/middleware.py
import os
secret = os.environ["JWT_SECRET"]  # leitura direta
```

</details>

<details>
<summary>✅ Bom: uma classe Settings concentra a leitura, e os módulos a recebem</summary>

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

O `main.py` funciona como o índice do projeto. Quem abre o arquivo pela primeira vez lê, em dez linhas, quais domínios existem e o que a aplicação carrega ao subir. Cada linha aponta para o módulo que faz o trabalho.

<details>
<summary>❌ Ruim: o main.py acumula a conexão, a autenticação e todas as rotas</summary>

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

<details>
<summary>✅ Bom: três linhas, e cada uma aponta para o módulo que faz o trabalho</summary>

```python
from app.config import settings
from app.factory import create_app

app = create_app(settings)
```

</details>

## Cada domínio registra a si mesmo

O `orders/module.py` sabe quais rotas e dependências o domínio de pedidos tem, e expõe uma função `register_orders(app)`. A fábrica que monta a aplicação só chama essa função.

Assim, acrescentar uma rota de pedido é uma alteração dentro de `orders/`. A fábrica continua igual, e não vira o arquivo que todo mundo edita ao mesmo tempo.

<details>
<summary>❌ Ruim: a fábrica conhece as rotas e os serviços de cada domínio</summary>

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

<details>
<summary>✅ Bom: cada domínio encapsula o próprio registro</summary>

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


