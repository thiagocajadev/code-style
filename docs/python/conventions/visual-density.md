# Visual density: Python

**Visual density** (densidade visual) é a quantidade de informação por bloco
visual. Olhos cansam quando linhas se acumulam sem respiro; raciocínio quebra
quando trechos não relacionados ficam colados. A solução é agrupar por intenção
semântica e separar grupos com linha em branco. Cada grupo conta uma
micro-história.

Os mesmos princípios de
[densidade visual](../../shared/standards/visual-density.md) com exemplos em
Python idiomático (PEP 8).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco visual; alvo é baixa por bloco, alta por arquivo |
| **semantic group** (grupo semântico) | Conjunto pequeno de linhas que executa uma micro-tarefa coesa (ex: validar, calcular, persistir) |
| **blank line** (linha em branco) | Separador entre grupos semânticos; substitui comentário de seção |
| **tight pair** (par tight) | Duas linhas com relação direta (declaração + uso, atribuição + return) sem blank entre elas; o respiro vem antes ou depois do par, não no meio |
| **atomic trio** (trio atômico) | Três declarações simples consecutivas e homogêneas (`x = expr`); mantidas juntas sem blank; preferir ao 2+1 que cria órfão |
| **semantic pair** (par semântico encadeado) | Par tight em que a última linha usa **diretamente** o valor declarado na penúltima; nunca separar a dependência direta |
| **single-line orphan** (órfão de 1) | Grupo isolado de uma única linha que parece esquecido; resolve juntando ao vizinho ou quebrando 4 em 2+2 |
| **explaining return** (retorno explicativo) | Caso particular de `tight pair`: `x = expr` single-line + `return x` sem blank entre eles |
| **multi-line block** (bloco multi-linha) | Dict literal, list literal, tuple, list comprehension quebrada ou statement com `\`/parênteses multi-linha; pede blank depois para isolar o bloco |
| **fragments → assembly** (fragmentos → montagem) | Linha final que costura múltiplos fragmentos anteriores; trata-se de fase distinta; blank antes da montagem |
| **boundary** (limite) | Linha que separa camadas (handler ↔ service, service ↔ repository); merece linha em branco antes |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `=` ou `:` verticalmente; antipadrão; frágil a rename, gera diff ruidoso, violação de PEP 8 |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural;
três é permitido quando a divisão criaria órfão de 1; quatro quebra em 2+2.

<details>
<summary>❌ Ruim: denso demais: todos os passos colados</summary>

```python
async def register_user(name: str, email: str, password: str):
    exists = await db.users.find_by_email(email)
    if exists:
        raise ConflictError("Email taken")
    password_hash = await hash_password(password)
    user = await db.users.create(name, email, password_hash)
    token = generate_token(user.user_id)
    await send_welcome_email(email, token)
    return user
```

</details>

<details>
<summary>✅ Bom: fases visíveis, no máximo 2 linhas por grupo</summary>

```python
async def register_user(name: str, email: str, password: str):
    exists = await user_repository.find_by_email(email)
    if exists:
        raise ConflictError("Email taken")

    password_hash = await hash_password(password)
    user = await user_repository.create(name, email, password_hash)

    token = generate_token(user.user_id)
    await send_welcome_email(email, token)

    return user
```

</details>

## Explaining Return: par tight

Uma variável nomeada acima do `return` explica o valor retornado. Sempre que a
linha imediatamente acima for `x = expr` (single-line) e o `return` retornar
exatamente `x`, os dois formam par de 2 linhas sem blank, não importa quantos
passos haja acima. A linha em branco separa o par do que vem antes, não
fragmenta o par.

<details>
<summary>❌ Ruim: blank fragmenta o par</summary>

```python
def map_error_to_status(error) -> int:
    status = ERROR_STATUS_BY_CODE.get(error.code, 500)

    return status
```

</details>

<details>
<summary>✅ Bom: par tight</summary>

```python
def map_error_to_status(error) -> int:
    status = ERROR_STATUS_BY_CODE.get(error.code, 500)
    return status
```

</details>

## Return tight vs return separado

A regra é simples: `return` é **tight** com a linha imediatamente acima
**somente quando essa linha é a atribuição que nomeia o valor retornado**
(Explaining Return), e essa atribuição está em uma única linha.

Em todos os outros casos, vai blank antes do `return`:

- linha acima é **multi-linha** (dict/list/tuple literal, comprehension
  quebrada, statement com `\` ou parênteses multi-linha);
- linha acima é **side effect** (`await`, função sem retorno, `logger.info`)
  que não nomeia o valor;
- valor retornado foi criado **vários passos antes**, sem par direto.

<details>
<summary>❌ Ruim: return fragmentado quando a linha acima é single-line</summary>

```python
def format_order_date(iso_string: str, locale: str = "pt-BR") -> str:
    parsed_date = datetime.fromisoformat(iso_string)
    formatter_options = {
        "day": "2-digit",
        "month": "2-digit",
        "year": "numeric",
        "tz": "America/Sao_Paulo",
    }
    formatted_date = format_date(parsed_date, locale, formatter_options)

    return formatted_date
```

`formatter_options` multi-linha exige blank depois de si, mas o blank foi posto
antes do `return`. `formatted_date` e `return formatted_date` formam Explaining
Return tight: não devem ser separados.

</details>

<details>
<summary>✅ Bom: multi-linha isolada, Explaining Return tight</summary>

```python
def format_order_date(iso_string: str, locale: str = "pt-BR") -> str:
    parsed_date = datetime.fromisoformat(iso_string)
    formatter_options = {
        "day": "2-digit",
        "month": "2-digit",
        "year": "numeric",
        "tz": "America/Sao_Paulo",
    }

    formatted_date = format_date(parsed_date, locale, formatter_options)
    return formatted_date
```

O blank fica **depois** do dict multi-linha. O par `formatted_date` +
`return formatted_date` permanece tight.

</details>

<details>
<summary>✅ Bom: return com blank quando construído a partir de dict multi-linha</summary>

```python
def build_order_response(order, request_id: str) -> dict:
    data = {
        "order_id": order.order_id,
        "total": order.total,
        "items": order.items,
    }

    return {"data": data, "request_id": request_id}
```

`data` é dict multi-linha; o blank antes do `return` isola o bloco grande do
envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único
conteúdo.

```python
def find_pending_orders(user_id: int) -> list:
    return order_repository.find_by_status(user_id, "pending")
```

## Declaração + guarda: critério visual

Uma variável seguida do seu `if` de guarda formam par semântico **quando o
guarda é inline**: `if not x: return`, `if not x: raise ValueError(...)`.
Nesse caso a linha em branco vem **depois** do par, nunca entre eles.

Quando o guarda é escrito em **bloco indentado** (duas ou mais linhas físicas,
mesmo com uma única instrução dentro), o `if` vira fase própria, e o bloco já
ocupa peso visual próprio. Aplica-se a regra de **multi-linha pede respiro**:
linha em branco **antes** do bloco. O critério é visual, não semântico.

<details>
<summary>❌ Ruim: variável solta do seu guarda inline</summary>

```python
order = await fetch_order(order_id)

if not order: return
invoice = build_invoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda inline (uma linha), par tight com a declaração</summary>

```python
order = await fetch_order(order_id)
if not order: return

invoice = build_invoice(order)
```

</details>

<details>
<summary>✅ Bom: guarda em bloco, fase própria com blank antes</summary>

```python
handler = event_handlers.get(event_type)

if not handler:
    log_unhandled_event_type(event_type)
    return

event_payload = event.data
```

</details>

<details>
<summary>✅ Bom: guarda em bloco mesmo com uma única instrução pede respiro antes</summary>

```python
response = await request_fn()

if response.status_code != 429:
    return response

delay_ms = (2 ** attempt) * 1000
```

O bloco ocupa duas linhas físicas: peso visual próprio. Inline ficaria
tight, mas em bloco, blank antes.

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (atribuições homogêneas) formam grupo
coeso. Partir em 2+1 deixa a última linha solitária entre blanks. Mantenha as
três juntas. Só divida em 2+2 a partir de quatro.

<details>
<summary>❌ Ruim: órfão entre blanks</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2

ONE_DAY_SECONDS: Final = 86_400
```

</details>

<details>
<summary>✅ Bom: trio tight</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2
ONE_DAY_SECONDS: Final = 86_400
```

</details>

<details>
<summary>✅ Bom: 4 atomics viram 2+2</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2

ONE_DAY_SECONDS: Final = 86_400
MAX_RETRY_ATTEMPTS: Final = 3
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as
duas formam par. A quebra natural fica antes do par, não entre ele e sua
dependência direta.

<details>
<summary>❌ Ruim: dependência direta partida</summary>

```python
def build_shipping_label(order) -> str:
    full_name = f"{order.customer.first_name} {order.customer.last_name}"
    address_line = f"{order.address.street}, {order.address.number}"

    city_line = f"{order.address.city} - {order.address.state}, {order.address.zip_code}"

    label = f"{full_name}\n{address_line}\n{city_line}\nOrder #{order.order_id}"
    return label
```

</details>

<details>
<summary>✅ Bom: par semântico tight</summary>

```python
def build_shipping_label(order) -> str:
    full_name = f"{order.customer.first_name} {order.customer.last_name}"
    address_line = f"{order.address.street}, {order.address.number}"

    city_line = f"{order.address.city} - {order.address.state}, {order.address.zip_code}"
    label = f"{full_name}\n{address_line}\n{city_line}\nOrder #{order.order_id}"
    return label
```

</details>

## Fragmentos → montagem: blank antes do consumidor

Quando há **dois ou mais fragmentos** preparados e uma linha final que
**consome múltiplos fragmentos** (não depende só do último), trate a montagem
como fase distinta, com blank antes dela. É o caso clássico "preparar partes →
montar resultado", diferente do par semântico encadeado (onde a última depende
**diretamente** da penúltima e por isso fica tight).

Heurística rápida:

- A última linha usa **só o valor recém-declarado** acima? → par semântico
  encadeado, fica tight.
- A última linha **costura múltiplos fragmentos** declarados em linhas
  diferentes? → fragmentos → montagem, blank antes.

<details>
<summary>❌ Ruim: fragmentos e montagem coladas como se fossem trio homogêneo</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"
    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

`delivery_message` consome `full_name` *e* `address` *e* `order.order_id` *e*
`order.delivery_days`. Não é par direto com `address`: é a fase de montagem.
Coladas como trio, as fases ficam invisíveis.

</details>

<details>
<summary>✅ Bom: fragmentos como par, montagem isolada, Explaining Return tight</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"

    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

Duas fases visíveis: "preparar fragmentos" (par) e "montar + entregar"
(Explaining Return tight).

</details>

<details>
<summary>✅ Bom: contraste: par semântico encadeado (última depende só da penúltima)</summary>

```python
def build_order_slug(order) -> str:
    normalized_title = order.title.lower().replace(" ", "-")
    slug = f"{order.order_id}-{normalized_title}"
    return slug
```

`slug` depende **diretamente** de `normalized_title` (penúltima). Par
semântico encadeado: as duas ficam tight, e o `return` ainda tight com o
último.

</details>

## 2+1 dentro de blocos curtos

Em loops e branches curtos, 2+1 ainda é a quebra natural quando as linhas não
são todas atômicas homogêneas.

<details>
<summary>❌ Ruim: 3 linhas heterogêneas coladas</summary>

```python
while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready: break
    attempt += 1
```

</details>

<details>
<summary>✅ Bom: declaração + guarda em par, incremento separado</summary>

```python
while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready: break

    attempt += 1
```

</details>

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem
deixar cada fase visível.

<details>
<summary>❌ Ruim: todas as fases coladas, sem separação visual</summary>

```python
async def create_user_handler(request):
    sanitized = sanitize_create_user(request.body)
    user_input = CreateUserInput(**sanitized)
    await create_user(user_input)
    body = {"user_id": user_input.user_id}
    return JSONResponse(body, status_code=201)
```

</details>

<details>
<summary>✅ Bom: fases explícitas</summary>

```python
async def create_user_handler(request):
    sanitized = sanitize_create_user(request.body)
    user_input = CreateUserInput(**sanitized)

    await create_user(user_input)

    body = {"user_id": user_input.user_id}
    return JSONResponse(body, status_code=201)
```

</details>

## Testes: assert como fase própria

O `assert` é fase distinta. A linha em branco antes dele separa o que está
sendo verificado do como está sendo verificado.

<details>
<summary>❌ Ruim: assert colado ao setup, fases invisíveis</summary>

```python
def test_apply_discount_reduces_order_price():
    order = Order(price=100.0, discount_pct=10)
    actual_order = apply_discount(order)
    expected_price = 90.0
    assert actual_order.price == expected_price
```

</details>

<details>
<summary>✅ Bom: assert separado, assertion como fase própria</summary>

```python
def test_apply_discount_reduces_order_price():
    order = Order(price=100.0, discount_pct=10)
    actual_order = apply_discount(order)
    expected_price = 90.0

    assert actual_order.price == expected_price
```

</details>

## Multi-linha: respiro depois do bloco

Quando um dict literal, list literal, tuple ou statement quebra em várias
linhas, o bloco já ocupa espaço visual próprio. Cole uma linha em branco
**depois** dele para isolar o bloco grande do próximo passo. Sem respiro, o
leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: dict multi-linha colado ao próximo statement</summary>

```python
async def create_session(user):
    claims = {
        "sub": user.user_id,
        "email": user.email,
        "roles": user.roles,
        "issued_at": int(time.time()),
    }
    token = await sign_jwt(claims)
    return token
```

</details>

<details>
<summary>✅ Bom: blank depois do dict isola o bloco</summary>

```python
async def create_session(user):
    claims = {
        "sub": user.user_id,
        "email": user.email,
        "roles": user.roles,
        "issued_at": int(time.time()),
    }

    token = await sign_jwt(claims)
    return token
```

</details>

## Ifs consecutivos: blocos indentados precisam de respiro

Dois `if` consecutivos com **bloco indentado** colados formam muralha: o olho
não distingue onde um bloco termina e o outro começa. Sempre insira blank
entre eles.

**Exceção:** guardas de uma linha (early returns curtos) formam trio
homogêneo e ficam tight, e a regra do trio atômico se aplica.

<details>
<summary>❌ Ruim: dois blocos indentados colados</summary>

```python
def process_order(order):
    if order.status == "pending":
        notify_customer(order)
        schedule_review(order)
    if order.total > 1_000:
        flag_for_audit(order)
        notify_manager(order)
```

</details>

<details>
<summary>✅ Bom: blank entre os blocos</summary>

```python
def process_order(order):
    if order.status == "pending":
        notify_customer(order)
        schedule_review(order)

    if order.total > 1_000:
        flag_for_audit(order)
        notify_manager(order)
```

</details>

<details>
<summary>✅ Bom: guardas de uma linha ficam tight (trio atômico)</summary>

```python
def validate_input(user_input):
    if not user_input: raise ValidationError("Input required")
    if not user_input.email: raise ValidationError("Email required")
    if not user_input.password: raise ValidationError("Password required")

    return user_input
```

</details>

## Sem column alignment

Não alinhe verticalmente `=`, `:` ou valores com múltiplos espaços. Use sempre
**um espaço único**: também é regra do PEP 8. Alinhamento artificial quebra
com qualquer rename, gera diff ruidoso e treina o olho a procurar colunas que
somem na primeira refator.

<details>
<summary>❌ Ruim: espaços extras para alinhar colunas</summary>

```python
user_name     = "alice"
user_email    = "alice@example.com"
user_role     = "admin"
last_login_at = datetime.now(tz=timezone.utc)
```

</details>

<details>
<summary>✅ Bom: espaço único, sem padding</summary>

```python
user_name = "alice"
user_email = "alice@example.com"
user_role = "admin"
last_login_at = datetime.now(tz=timezone.utc)
```

</details>

## Strings longas

Uma f-string longa colada em um `return` esconde as partes que a compõem.
Extraia fragmentos em variáveis nomeadas antes de montar o resultado.

<details>
<summary>❌ Ruim: string imensa inline, sem semântica nas partes</summary>

```python
def build_delivery_message(user, order) -> str:
    return f"Olá {user.first_name} {user.last_name}, seu pedido #{order.order_id} foi confirmado e será entregue no endereço {order.address.street}, {order.address.city} - {order.address.state} em até {order.delivery_days} dias úteis."
```

</details>

<details>
<summary>✅ Bom: fragmentos nomeados, template final limpo</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"

    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

</details>
