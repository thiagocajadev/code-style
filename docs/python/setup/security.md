# Security

> Escopo: Python. Especificidades do ecossistema; princípios em [shared/platform/security.md](../../shared/platform/security.md).

## Secrets em variáveis de ambiente

Nunca hardcode credenciais. Use `.env` para desenvolvimento local e variáveis de ambiente reais
para produção — nunca commite o arquivo `.env`.

<details>
<summary>❌ Bad — credencial no código-fonte</summary>
<br>

```python
DATABASE_URL = "postgresql://admin:s3cr3t@localhost/app"
JWT_SECRET = "my-super-secret-key"
```

</details>

<br>

<details>
<summary>✅ Good — pydantic-settings lê e valida variáveis de ambiente</summary>
<br>

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    api_key: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

```bash
# .env — nunca commite
DATABASE_URL=postgresql://admin:s3cr3t@localhost/app
JWT_SECRET=my-super-secret-key
API_KEY=sk-live-...
```

```
# .gitignore
.env
.env.*
```

</details>

## python-dotenv para projetos sem pydantic-settings

Em scripts ou projetos simples que não usam Pydantic, `python-dotenv` carrega o `.env` na
inicialização. Leia as variáveis via `os.environ` — nunca `os.getenv` sem default em código
de produção: falha rápido se a variável não existir.

<details>
<summary>❌ Bad — os.getenv sem validação de presença</summary>
<br>

```python
import os

db_url = os.getenv("DATABASE_URL")  # None se ausente — bug silencioso
```

</details>

<br>

<details>
<summary>✅ Good — dotenv + os.environ falha se a variável não existir</summary>
<br>

```python
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ["DATABASE_URL"]  # KeyError se ausente — falha explícita
```

</details>

## Cadeia de configuração

A precedência correta evita que valores de desenvolvimento vazem para produção:

```
Variáveis do sistema (CI/CD, Kubernetes)
  → .env.production
    → .env.local
      → .env
        → defaults no código
```

`pydantic-settings` aplica essa cadeia automaticamente quando configurado com múltiplos
`env_file`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str

    class Config:
        env_file = (".env", ".env.local", ".env.production")
        env_file_encoding = "utf-8"
```

## Validação de secrets na inicialização

Falhe na inicialização, não em tempo de requisição. Se uma variável obrigatória não existir,
a aplicação não deve subir.

<details>
<summary>❌ Bad — variável obrigatória com default silencioso</summary>
<br>

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str = "default-secret"  # nunca um default para secrets
    database_url: str = ""              # string vazia passa validação de tipo
```

</details>

<br>

<details>
<summary>✅ Good — sem default para secrets; Pydantic falha na inicialização</summary>
<br>

```python
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str
    database_url: str

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_not_be_empty(cls, secret):
        if not secret or len(secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters.")

        return secret
```

</details>
