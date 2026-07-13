# Controle de fluxo em Python

A escolha da estrutura depende de três perguntas: quantas condições existem, se elas escolhem um valor ou disparam uma ação, e se o fluxo precisa sair antes do fim. Duas condições cabem num `if/else`. Cinco que escolhem um texto cabem num dicionário. Cinco que disparam ações diferentes cabem num `match`.

Esta página percorre essas estruturas na ordem em que a complexidade do código costuma pedir cada uma.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **guard clause** (cláusula de guarda) | O `if` no topo da função que trata o caso inválido e sai. O corpo principal fica sem aninhamento |
| **early return** (retorno antecipado) | Sair da função assim que o resultado é conhecido, sem passar por um `else` |
| **ternary** (expressão condicional) | `a if cond else b`: escolhe entre dois valores numa linha |
| **match statement** (correspondência estrutural) | O `match` do Python 3.10 ou superior: compara a forma do dado e nomeia os pedaços que encontrou |
| **lookup table** (tabela de busca) | Um `dict` no formato `{chave: valor}` que substitui a cadeia de `if/elif` |
| **truthy / falsy** (avalia como verdadeiro / como falso) | O valor que o `if` aceita sem comparação explícita. `0`, `""`, `None` e `[]` avaliam como falso |

<a id="if-and-else"></a>

## If e else

Para dois caminhos, `if/else` resolve. O `else` que vem depois de um `return` sobra: quando o fluxo chega naquela linha, o primeiro caminho já saiu da função, e o `else` só acrescenta um nível de indentação.

<details>
<summary>❌ Ruim: um else que nunca precisou existir</summary>

```python
def get_discount(user) -> float:
    if user.is_premium:
        return 0.2
    else:
        return 0.05
```

</details>

<details>
<summary>✅ Bom: o retorno antecipado dispensa o else</summary>

```python
def get_discount(user) -> float:
    if user.is_premium:
        return 0.2

    return 0.05
```

</details>

## Expressão condicional

Serve para escolher entre dois valores numa atribuição. Com três ou mais alternativas, passe para um dicionário de busca ou um `match/case`.

Uma expressão condicional dentro da outra fica ilegível na primeira leitura. Repare no exemplo ruim abaixo: para saber o valor de `priority`, o leitor precisa descobrir onde cada `if` termina e cada `else` começa, tudo numa linha só.

<details>
<summary>❌ Ruim: quatro linhas de if/else para escolher entre dois textos</summary>

```python
if order.is_settled:
    label = "Settled"
else:
    label = "Pending"
```

</details>

<details>
<summary>✅ Bom: expressão condicional na atribuição</summary>

```python
label = "Settled" if order.is_settled else "Pending"
```

</details>

<details>
<summary>❌ Ruim: uma expressão condicional dentro da outra, com três alternativas</summary>

```python
priority = "Critical" if is_urgent and is_critical else "High" if is_urgent else "Normal"
```

</details>

<details>
<summary>✅ Bom: um dicionário de busca resolve as três alternativas</summary>

```python
PRIORITY_MAP = {
    (True, True):  "Critical",
    (True, False): "High",
}

priority = PRIORITY_MAP.get((is_urgent, is_critical), "Normal")
```

</details>

<a id="nested-conditionals"></a>

## Aninhamento em cascata

Cada `if` que envolve o próximo empurra o trabalho de verdade mais para a direita. Depois de quatro níveis, a linha que interessa fica no fim de uma escada de indentação, e o leitor precisa segurar as quatro condições na cabeça para saber em que circunstância ela roda.

A guarda de entrada desmonta a escada. Cada caso inválido é tratado e sai da função logo no topo, um por vez. O que sobra abaixo é o caminho normal, sem indentação.

<details>
<summary>❌ Ruim: o trabalho fica no quarto nível de indentação</summary>

```python
def process_order(order):
    if order:
        if order.is_active:
            if order.items:
                if order.customer:
                    return process(order)
```

</details>

<details>
<summary>✅ Bom: as guardas saem cedo, e o caminho normal fica sem indentação</summary>

```python
def process_order(order):
    if not order:
        return None

    if not order.is_active:
        return None

    if not order.items:
        return None

    if not order.customer:
        return None

    invoice = process(order)
    return invoice
```

</details>

## Quando a cadeia de if só escolhe um valor

Se cada ramo do `if/elif` termina devolvendo um texto ou um número, aquilo é uma tabela escrita em forma de código. Um dicionário diz a mesma coisa em menos linhas, e acrescentar um status novo vira uma linha nova na tabela.

<details>
<summary>❌ Ruim: cinco ramos de if/elif para associar chave e texto</summary>

```python
def get_status_label(status: str) -> str:
    if status == "pending":
        return "Pending review"
    elif status == "approved":
        return "Approved"
    elif status == "rejected":
        return "Rejected"
    elif status == "cancelled":
        return "Cancelled"
    else:
        return "Unknown"
```

</details>

<details>
<summary>✅ Bom: o dicionário guarda a tabela, e a função só consulta</summary>

```python
STATUS_LABELS: dict[str, str] = {
    "pending": "Pending review",
    "approved": "Approved",
    "rejected": "Rejected",
    "cancelled": "Cancelled",
}

def get_status_label(status: str) -> str:
    label = STATUS_LABELS.get(status, "Unknown")
    return label
```

</details>

## Quando a cadeia de if dispara ações

Aqui o dicionário não serve, porque cada ramo executa um conjunto de passos. O `match/case` (Python 3.10 ou superior) mostra a estrutura da decisão de relance: o valor testado aparece uma vez no topo, e cada caso fica num bloco próprio.

Cada `case` termina onde o próximo começa. O Python não deixa a execução escorregar para o caso seguinte, que é o descuido clássico do `switch` em C.

<details>
<summary>❌ Ruim: if/elif encadeado, com o event_type repetido em cada ramo</summary>

```python
def process_payment_event(event):
    if event.event_type == "payment_success":
        send_receipt(event.order_id)
        update_order_status(event.order_id, "settled")
    elif event.event_type == "payment_failed":
        notify_failure(event.user_id)
        schedule_retry(event.order_id)
    elif event.event_type == "payment_refunded":
        send_refund_confirmation(event.user_id)
        update_order_status(event.order_id, "refunded")
```

</details>

<details>
<summary>✅ Bom: match/case, com o valor testado uma vez só</summary>

```python
def process_payment_event(event):
    match event.event_type:
        case "payment_success":
            send_receipt(event.order_id)
            update_order_status(event.order_id, "settled")

        case "payment_failed":
            notify_failure(event.user_id)
            schedule_retry(event.order_id)

        case "payment_refunded":
            send_refund_confirmation(event.user_id)
            update_order_status(event.order_id, "refunded")
```

</details>

## Comparar a forma do dado, e não só o valor

O `match/case` compara a estrutura inteira do dado e, no mesmo passo, dá nome aos pedaços que encontrou. `case {"type": "order_placed", "order_id": order_id}` faz três coisas de uma vez: confere que o dicionário tem a chave `type` com aquele valor, confere que existe uma chave `order_id`, e coloca o conteúdo dela numa variável chamada `order_id`.

A alternativa escrita à mão precisa de um `isinstance`, um `.get()` para cada chave e um `in` para cada campo obrigatório, antes de chegar na linha que interessa.

<details>
<summary>❌ Ruim: isinstance, get e in encadeados antes de montar a mensagem</summary>

```python
def build_notification_message(event):
    if isinstance(event, dict):
        if event.get("type") == "order_placed" and "order_id" in event and "customer_id" in event:
            return f"Order {event['order_id']} placed by customer {event['customer_id']}"
        elif event.get("type") == "payment_received" and "amount" in event and "currency" in event:
            return f"Payment received: {event['amount']} {event['currency']}"
    return "Unknown event"
```

</details>

<details>
<summary>✅ Bom: o match confere a forma e já nomeia os campos</summary>

```python
def build_notification_message(event: dict) -> str:
    match event:
        case {"type": "order_placed", "order_id": order_id, "customer_id": customer_id}:
            message = f"Order {order_id} placed by customer {customer_id}"

        case {"type": "payment_received", "amount": amount, "currency": currency}:
            message = f"Payment received: {amount} {currency}"

        case _:
            message = "Unknown event"

    return message
```

</details>

## Sair do laço assim que a resposta aparece

Antes de escrever o `for`, veja se `next()`, `any()` ou `all()` já resolvem. As três param na primeira ocorrência que satisfaz a condição e ignoram o resto da coleção.

O laço com variável de controle no exemplo abaixo percorre a lista inteira mesmo depois de achar o produto vencido, porque nada manda ele parar.

<details>
<summary>❌ Ruim: o laço percorre tudo mesmo depois de achar o que procurava</summary>

```python
def find_first_expired_product(products: list):
    expired_product = None

    for product in products:
        if not expired_product and product.is_expired:
            expired_product = product

    return expired_product
```

</details>

<details>
<summary>✅ Bom: next() para no primeiro que satisfaz a condição</summary>

```python
def find_first_expired_product(products: list):
    expired_product = next(
        (product for product in products if product.is_expired),
        None,
    )

    return expired_product
```

</details>

<details>
<summary>✅ Bom: any() para no primeiro verdadeiro, all() no primeiro falso</summary>

```python
has_expired_product = any(product.is_expired for product in products)

all_products_active = all(product.is_active for product in products)
```

</details>

## Quando usar comprehension e quando usar for

A **comprehension** (a sintaxe `[f(x) for x in itens]`, que monta uma coleção nova a partir de outra) serve para transformar dados: entra uma lista, sai outra. Uma linha declara o filtro e o formato do resultado.

O `for` serve quando cada item dispara uma ação e nada é montado: enviar um email, gravar uma linha, publicar um evento. Usar comprehension nesse caso monta uma lista de `None` que ninguém lê, e esconde o efeito dentro de uma sintaxe que o leitor associa a transformação.

<details>
<summary>❌ Ruim: um laço de cinco linhas para filtrar e transformar</summary>

```python
def get_active_user_emails(users: list) -> list[str]:
    emails = []
    for user in users:
        if user.is_active:
            emails.append(user.email)

    return emails
```

</details>

<details>
<summary>✅ Bom: a comprehension declara o filtro e o resultado numa linha</summary>

```python
def get_active_user_emails(users: list) -> list[str]:
    active_emails = [user.email for user in users if user.is_active]
    return active_emails
```

</details>

<details>
<summary>❌ Ruim: comprehension que monta uma lista de None e a descarta</summary>

```python
[notify_customer(order) for order in pending_orders]
```

</details>

<details>
<summary>✅ Bom: o for deixa visível que cada item dispara uma ação</summary>

```python
for order in pending_orders:
    notify_customer(order)
```

</details>

## while

O `while` é a estrutura para quando a parada depende de um estado que só se conhece rodando: a conexão ficou pronta, a fila esvaziou, o servidor respondeu. Não há coleção para percorrer, e o `for` só serviria emprestando um índice que não representa nada.

O Python não tem `do-while`. Quando a primeira execução acontece de qualquer forma, use `while True` com um `break` no fim do corpo.

<details>
<summary>❌ Ruim: um for cujo índice não significa nada</summary>

```python
for attempt in range(max_attempts):
    connection = connect_to_database()
    if connection.is_ready:
        break  # o índice não representa nada aqui
```

</details>

<details>
<summary>✅ Bom: o while para quando a conexão fica pronta</summary>

```python
attempt = 0

while attempt < max_attempts:
    connection = connect_to_database()
    if connection.is_ready:
        break

    attempt += 1
```

</details>

<details>
<summary>✅ Bom: while True com break quando a primeira execução é garantida</summary>

```python
# drena a fila: processa pelo menos um item antes de verificar
while True:
    task = task_queue.dequeue()
    process_task(task)

    if task_queue.is_empty():
        break
```

</details>
