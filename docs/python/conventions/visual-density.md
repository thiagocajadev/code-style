# Densidade visual em Python

Densidade visual é a quantidade de informação que você empilha em cada bloco de código. Quando muitas linhas se acumulam sem espaço, o olho cansa e você perde o fio do raciocínio. Quando linhas sem relação ficam grudadas, o leitor não sabe onde uma ideia termina e a outra começa. A saída é direta: junte as linhas que contam a mesma pequena história e separe cada história da próxima com uma linha em branco.

Este guia mostra como aplicar isso em Python, sempre com um exemplo ruim e um bom lado a lado. Os princípios gerais estão em [densidade visual](../../shared/standards/visual-density.md), e aqui eles aparecem adaptados ao PEP 8.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quantidade de informação por bloco de código; o alvo é pouca por bloco e muita por arquivo |
| **semantic group** (grupo semântico) | Poucas linhas que executam uma etapa coesa, por exemplo validar, calcular ou gravar |
| **blank line** (linha em branco) | Separa dois grupos; faz o papel que antes cabia a um comentário de seção |
| **boundary** (limite) | Linha que separa camadas, por exemplo do handler para o serviço; pede uma linha em branco antes |
| **multi-line block** (bloco de várias linhas) | Dicionário, lista, tupla ou comando quebrado em várias linhas; pede um respiro depois de si |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar `=` ou `:` na vertical; antipadrão, quebra a cada renomeação e contraria o PEP 8 |
| **PEP 8** (Python Enhancement Proposal 8 · Proposta de Melhoria 8) | Guia oficial de estilo da linguagem; o espaço único em volta do `=` sai de lá |

<a id="core-rule"></a>

## A regra central

A regra que resolve quase tudo: **agrupe poucas linhas por vez e separe cada grupo com uma linha em branco.** O tamanho natural de um grupo é duas linhas. Três valem quando dividir em duas mais uma deixaria a última linha sozinha. Com quatro ou mais, quebre em dois grupos de duas.

<details>
<summary>❌ Ruim: tudo grudado, sem um respiro entre os passos</summary>

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
<summary>✅ Bom: cada fase visível, no máximo duas linhas por grupo</summary>

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

## O `return` fica junto da linha que nomeia o valor

Quando a linha logo acima do `return` é a atribuição que dá nome ao valor devolvido, as duas formam uma dupla e ficam juntas, sem linha em branco entre elas. Não importa quantos passos venham antes. A linha em branco separa essa dupla do que veio antes; ela nunca entra no meio da dupla.

<details>
<summary>❌ Ruim: a linha em branco parte a dupla no meio</summary>

```python
def map_error_to_status(error) -> int:
    status = ERROR_STATUS_BY_CODE.get(error.code, 500)

    return status
```

</details>

<details>
<summary>✅ Bom: a atribuição e o `return` juntos</summary>

```python
def map_error_to_status(error) -> int:
    status = ERROR_STATUS_BY_CODE.get(error.code, 500)
    return status
```

</details>

## Quando o `return` cola na linha acima e quando ganha um respiro

O `return` só cola na linha imediatamente acima quando essa linha é a atribuição, de uma única linha, que nomeia o valor devolvido. Em todos os outros casos, deixe uma linha em branco antes do `return`:

- a linha acima ocupa várias linhas (um dicionário, uma lista ou um comando quebrado em vários pedaços);
- a linha acima só produz um efeito (um `await`, um `logger.info`, uma função que não devolve valor) e não dá nome ao resultado;
- o valor devolvido foi criado vários passos antes, sem formar dupla com a linha de cima.

<details>
<summary>❌ Ruim: a linha em branco separou a atribuição do `return` que a devolve</summary>

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

O `formatter_options` ocupa várias linhas e pede um respiro depois de si, mas aqui a linha em branco foi parar antes do `return`. `formatted_date` e `return formatted_date` são a dupla que nomeia e devolve o valor: não devem ser separados.

</details>

<details>
<summary>✅ Bom: o bloco de várias linhas isolado, a atribuição e o `return` juntos</summary>

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

A linha em branco fica **depois** do dicionário, que ocupa várias linhas. A dupla `formatted_date` mais `return formatted_date` continua junta.

</details>

<details>
<summary>✅ Bom: return com respiro quando é montado a partir de um dicionário de várias linhas</summary>

```python
def build_order_response(order, request_id: str) -> dict:
    data = {
        "order_id": order.order_id,
        "total": order.total,
        "items": order.items,
    }

    return {"data": data, "request_id": request_id}
```

`data` é um dicionário de várias linhas; a linha em branco antes do `return` separa esse bloco grande do envelope final.

</details>

**Exceção:** funções de uma linha ficam compactas. O `return` é o único conteúdo.

```python
def find_pending_orders(user_id: int) -> list:
    return order_repository.find_by_status(user_id, "pending")
```

## A variável e o `if` que a valida ficam juntos

Uma variável e o `if` que a valida logo abaixo formam uma dupla **quando o `if` cabe em uma linha só** (`if not x: return`, `if not x: raise ValueError(...)`). Nesse caso, a linha em branco vem **depois** da dupla, nunca entre a variável e o seu `if`.

Quando o `if` abre um bloco indentado (duas ou mais linhas, mesmo com uma única instrução dentro), ele vira uma fase à parte: o bloco já tem peso visual próprio. Aí vale a regra de que todo bloco de várias linhas pede um respiro antes de si. O critério aqui é o peso visual do bloco na tela.

<details>
<summary>❌ Ruim: a variável foi separada do `if` que a valida</summary>

```python
order = await fetch_order(order_id)

if not order: return
invoice = build_invoice(order)
```

</details>

<details>
<summary>✅ Bom: `if` de uma linha, junto da variável</summary>

```python
order = await fetch_order(order_id)
if not order: return

invoice = build_invoice(order)
```

</details>

<details>
<summary>✅ Bom: `if` com bloco indentado, fase à parte com um respiro antes</summary>

```python
handler = event_handlers.get(event_type)

if not handler:
    log_unhandled_event_type(event_type)
    return

event_payload = event.data
```

</details>

<details>
<summary>✅ Bom: o bloco indentado pede respiro antes mesmo com uma só instrução</summary>

```python
response = await request_fn()

if response.status_code != 429:
    return response

delay_ms = (2 ** attempt) * 1000
```

O bloco ocupa duas linhas e tem peso visual próprio. Em uma linha só, ficaria junto da variável; com bloco indentado, pede uma linha em branco antes.

</details>

## Não deixe uma linha sozinha entre espaços

Três atribuições simples seguidas formam um grupo coeso. Se você quebrar em duas mais uma, a última fica sozinha entre duas linhas em branco, parecendo esquecida. Mantenha as três juntas. Com quatro ou mais, divida em dois pares.

<details>
<summary>❌ Ruim: a última linha sozinha entre espaços</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2

ONE_DAY_SECONDS: Final = 86_400
```

</details>

<details>
<summary>✅ Bom: as três juntas</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2
ONE_DAY_SECONDS: Final = 86_400
```

</details>

<details>
<summary>✅ Bom: quatro viram dois pares</summary>

```python
MINIMUM_DRIVING_AGE: Final = 18
ORDER_STATUS_APPROVED: Final = 2

ONE_DAY_SECONDS: Final = 86_400
MAX_RETRY_ATTEMPTS: Final = 3
```

</details>

## Duas linhas onde a segunda usa o valor da primeira

Quando a última linha **usa o valor recém-criado** na linha de cima, as duas formam uma dupla. O respiro natural fica antes da dupla, nunca entre uma linha e o valor de que ela depende.

<details>
<summary>❌ Ruim: a linha foi separada do valor de que depende</summary>

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
<summary>✅ Bom: as duas linhas dependentes juntas</summary>

```python
def build_shipping_label(order) -> str:
    full_name = f"{order.customer.first_name} {order.customer.last_name}"
    address_line = f"{order.address.street}, {order.address.number}"

    city_line = f"{order.address.city} - {order.address.state}, {order.address.zip_code}"
    label = f"{full_name}\n{address_line}\n{city_line}\nOrder #{order.order_id}"
    return label
```

</details>

## Prepare as partes, depois monte o resultado

Quando você prepara **dois ou mais pedaços** e depois tem uma linha que **junta vários deles** (não só o último), trate essa montagem como uma fase à parte, com uma linha em branco antes. É o padrão "preparar as partes, depois montar o resultado". Ele é diferente do caso anterior, em que a última linha depende **só** da linha logo acima e por isso fica junto dela.

Como decidir rápido:

- A última linha usa **só o valor recém-criado** acima? É uma dupla dependente: fica junto.
- A última linha **costura vários pedaços** declarados em linhas diferentes? É a fase de montagem: linha em branco antes.

<details>
<summary>❌ Ruim: preparação e montagem grudadas como se fossem linhas iguais</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"
    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

`delivery_message` usa `full_name`, `address`, `order.order_id` e `order.delivery_days` ao mesmo tempo. Ela é a fase de montagem, e não uma dupla com `address`. Grudada como se as três linhas fossem iguais, as fases somem.

</details>

<details>
<summary>✅ Bom: pedaços em uma dupla, montagem à parte, `return` junto do valor</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"

    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

Duas fases ficam visíveis: preparar os pedaços, depois montar e devolver.

</details>

<details>
<summary>✅ Bom: contraste, a última linha depende só da anterior</summary>

```python
def build_order_slug(order) -> str:
    normalized_title = order.title.lower().replace(" ", "-")
    slug = f"{order.order_id}-{normalized_title}"
    return slug
```

`slug` depende **só** de `normalized_title`, a linha logo acima. As duas ficam juntas, e o `return` continua junto de `slug`.

</details>

## Dentro de laços e condições curtas

Em laços (`while`, `for`) e condições curtas, duas linhas mais uma continua sendo a divisão natural quando as linhas não são todas do mesmo tipo.

<details>
<summary>❌ Ruim: três linhas de tipos diferentes grudadas</summary>

```python
while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready: break
    attempt += 1
```

</details>

<details>
<summary>✅ Bom: variável e `if` juntos, o incremento separado</summary>

```python
while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready: break

    attempt += 1
```

</details>

## Deixe cada fase da função visível

Funções com vários passos (buscar, transformar, gravar, responder) devem deixar cada passo visível. Uma linha em branco entre eles marca onde um termina e o outro começa, ainda mais quando os passos cruzam um limite entre camadas, por exemplo do handler para o serviço.

<details>
<summary>❌ Ruim: todos os passos grudados, sem separação visual</summary>

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
<summary>✅ Bom: cada passo visível</summary>

```python
async def create_user_handler(request):
    sanitized = sanitize_create_user(request.body)
    user_input = CreateUserInput(**sanitized)

    await create_user(user_input)

    body = {"user_id": user_input.user_id}
    return JSONResponse(body, status_code=201)
```

</details>

## No teste, a verificação é uma fase separada

No teste, a linha que verifica o resultado (`assert`) é uma fase própria. A linha em branco antes dela separa **o que** está sendo verificado de **como** você preparou o cenário.

<details>
<summary>❌ Ruim: `assert` grudado na preparação, as fases somem</summary>

```python
def test_apply_discount_reduces_order_price():
    order = Order(price=100.0, discount_pct=10)
    actual_order = apply_discount(order)
    expected_price = 90.0
    assert actual_order.price == expected_price
```

</details>

<details>
<summary>✅ Bom: `assert` separado, a verificação como fase própria</summary>

```python
def test_apply_discount_reduces_order_price():
    order = Order(price=100.0, discount_pct=10)
    actual_order = apply_discount(order)
    expected_price = 90.0

    assert actual_order.price == expected_price
```

</details>

## Depois de um bloco de várias linhas, deixe um respiro

Quando um dicionário, uma lista, uma tupla ou um comando quebra em várias linhas, esse bloco já ocupa um espaço visual próprio. Deixe uma linha em branco **depois** dele para separá-lo do próximo passo. Sem esse respiro, o leitor não vê onde o bloco termina e o próximo começa.

<details>
<summary>❌ Ruim: dicionário de várias linhas grudado no próximo comando</summary>

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
<summary>✅ Bom: linha em branco depois do dicionário separa o bloco</summary>

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

## Dois `if` seguidos com bloco indentado pedem uma linha entre eles

Dois `if` seguidos, cada um abrindo um bloco de várias linhas, formam uma parede: o olho não distingue onde um bloco termina e o outro começa. Sempre coloque uma linha em branco entre eles.

**Exceção:** os `if` de saída rápida, com uma linha só (`if not user_input: raise ...`), são do mesmo tipo e ficam juntos, como qualquer grupo de linhas iguais.

<details>
<summary>❌ Ruim: dois blocos indentados grudados</summary>

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
<summary>✅ Bom: linha em branco entre os blocos</summary>

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
<summary>✅ Bom: saídas rápidas de uma linha ficam juntas</summary>

```python
def validate_input(user_input):
    if not user_input: raise ValidationError("Input required")
    if not user_input.email: raise ValidationError("Email required")
    if not user_input.password: raise ValidationError("Password required")

    return user_input
```

</details>

## Não alinhe o código em colunas

Não use espaços extras para alinhar `=`, `:` ou valores na vertical. Use sempre um espaço só, que também é o que o PEP 8 manda. O alinhamento artificial quebra assim que você renomeia qualquer coisa, gera um diff cheio de ruído (mudanças que não importam) e treina o olho a procurar colunas que somem na primeira refatoração.

<details>
<summary>❌ Ruim: espaços extras alinhando colunas</summary>

```python
user_name     = "alice"
user_email    = "alice@example.com"
user_role     = "admin"
last_login_at = datetime.now(tz=timezone.utc)
```

</details>

<details>
<summary>✅ Bom: um espaço só, sem preenchimento</summary>

```python
user_name = "alice"
user_email = "alice@example.com"
user_role = "admin"
last_login_at = datetime.now(tz=timezone.utc)
```

</details>

## Textos longos montados em uma linha

Um texto longo grudado dentro de um `return` esconde os pedaços que o compõem. Separe cada pedaço em uma variável com nome antes de montar o resultado. Em Python esse texto costuma ser uma **f-string** (o texto com `f` na frente, que aceita valores no meio com `{...}`).

<details>
<summary>❌ Ruim: texto enorme em uma linha, sem nome nos pedaços</summary>

```python
def build_delivery_message(user, order) -> str:
    return f"Olá {user.first_name} {user.last_name}, seu pedido #{order.order_id} foi confirmado e será entregue no endereço {order.address.street}, {order.address.city} - {order.address.state} em até {order.delivery_days} dias úteis."
```

</details>

<details>
<summary>✅ Bom: pedaços com nome, texto final limpo</summary>

```python
def build_delivery_message(user, order) -> str:
    full_name = f"{user.first_name} {user.last_name}"
    address = f"{order.address.street}, {order.address.city} - {order.address.state}"

    delivery_message = f"Olá {full_name}, seu pedido #{order.order_id} foi confirmado e será entregue em {address} em até {order.delivery_days} dias úteis."
    return delivery_message
```

</details>
