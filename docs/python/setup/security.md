# Segurança em Python

> Escopo: Python. Especificidades do ecossistema; princípios em [shared/platform/security.md](../../shared/platform/security.md).

Três frentes cobrem a maior parte do risco num projeto Python: os segredos ficam em variáveis de ambiente e fora do código, a entrada externa é validada no limite do sistema com Pydantic, e as versões das dependências são fixadas e auditadas.

Os princípios gerais estão no guia transversal. Esta página trata das ferramentas do ecossistema.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **secret** (segredo) | A credencial, o token ou a chave que nunca aparece no código-fonte |
| **boundary** (limite) | O ponto por onde o dado de fora entra. É o único lugar que valida |
| **pinning** (fixação de versão) | Travar a versão exata de cada dependência, para o build de hoje ser igual ao de amanhã |
| **JWT** (JSON Web Token · Token Web JSON) | O token assinado que carrega quem é o usuário, e dispensa o servidor de guardar a sessão |
| **CSRF** (Cross-Site Request Forgery · Falsificação de Requisição entre Sites) | O ataque em que outro site faz o navegador do usuário logado executar uma ação no seu |
| **bcrypt** (algoritmo de hash de senha) | Guarda a senha de um jeito que não permite voltar ao original, e é lento de propósito para dificultar a tentativa em massa |
| **pip-audit** (auditor de dependências) | A ferramenta que confere se algum pacote instalado tem falha de segurança conhecida |

## Segredos em variáveis de ambiente

A credencial escrita no código vai para o histórico do git, e continua lá depois de removida do arquivo. Quem clona o repositório um ano depois recupera a senha do commit antigo.

Use um `.env` no desenvolvimento local, e as variáveis de ambiente reais em produção. O `.env` entra no `.gitignore` antes do primeiro commit.

<details>
<summary>❌ Ruim: a senha do banco escrita no arquivo, e no histórico do git para sempre</summary>

```python
DATABASE_URL = "postgresql://admin:s3cr3t@localhost/app"
JWT_SECRET = "my-super-secret-key"
```

</details>

<details>
<summary>✅ Bom: o pydantic-settings lê as variáveis de ambiente e confere se estão lá</summary>

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
# .env: nunca commite
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

## python-dotenv, quando não há Pydantic no projeto

Num script ou num projeto pequeno, o `python-dotenv` carrega o `.env` na partida. Leia as variáveis com `os.environ["NOME"]`, que levanta `KeyError` quando a variável não existe.

O `os.getenv("NOME")` devolve `None` no mesmo caso, e o programa segue. A conexão com o banco recebe `None` como endereço, e o erro que aparece dez linhas adiante fala de um problema de conexão, sem mencionar a variável que faltou.

<details>
<summary>❌ Ruim: a variável ausente vira None, e o erro aparece longe da causa</summary>

```python
import os

db_url = os.getenv("DATABASE_URL")  # None se ausente: bug silencioso
```

</details>

<details>
<summary>✅ Bom: o os.environ levanta erro na hora se a variável não existir</summary>

```python
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ["DATABASE_URL"]  # KeyError se ausente: falha explícita
```

</details>

## A ordem em que as configurações se sobrepõem

O que vem de cima ganha do que vem de baixo. É essa ordem que impede um valor de desenvolvimento, deixado num `.env` esquecido dentro da imagem, de sobrescrever a variável real que o Kubernetes injetou:

```
Variáveis do sistema (CI/CD, Kubernetes)
  → .env.production
    → .env.local
      → .env
        → defaults no código
```

O `pydantic-settings` aplica essa ordem sozinho quando recebe vários arquivos em `env_file`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str

    class Config:
        env_file = (".env", ".env.local", ".env.production")
        env_file_encoding = "utf-8"
```

## Conferir os segredos quando a aplicação sobe

A aplicação que sobe sem a `JWT_SECRET` fica no ar, aceita requisições, e falha na primeira que precisar assinar um token. Se o segredo tiver um valor padrão no código, é pior: ela assina os tokens com uma chave que está publicada no repositório, e ninguém percebe.

Deixe a partida quebrar. Um segredo sem valor padrão faz o Pydantic reclamar antes de a primeira requisição entrar, e o deploy falha no lugar certo.

<details>
<summary>❌ Ruim: um valor padrão para o segredo, publicado no repositório</summary>

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str = "default-secret"  # nunca um default para secrets
    database_url: str = ""              # string vazia passa validação de tipo
```

</details>

<details>
<summary>✅ Bom: sem valor padrão, e o Pydantic reprova a partida se o segredo faltar</summary>

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
