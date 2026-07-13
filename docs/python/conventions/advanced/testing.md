# Testes em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Um teste descreve o comportamento esperado de um jeito que a máquina consegue conferir. O bom teste falha com uma mensagem que já diz o que quebrou, e quem lê o relatório entende o problema sem abrir o arquivo de código.

Isso depende de duas coisas: o nome do teste dizer a regra que ele protege, e o `assert` apontar o campo exato que saiu errado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | A estrutura do teste: preparar o cenário, executar a operação, conferir o resultado |
| **pytest** (ferramenta de testes) | O executor padrão do Python. O teste é uma função comum, e o `assert` é o da linguagem |
| **fixture** (preparação reutilizável) | A função com `@pytest.fixture` que monta o cenário. O teste declara o nome dela como parâmetro e recebe o resultado pronto |
| **parametrize** (repetição com entradas diferentes) | `@pytest.mark.parametrize` roda o mesmo teste várias vezes, com um conjunto de entradas por vez |
| **mock** (dados fictícios) | O substituto de uma dependência real, para o teste não depender do banco nem da rede |
| **monkeypatch** (troca temporária) | A fixture que substitui um atributo durante o teste e devolve o original no fim |
| **assert** (afirmação) | O comando que reprova o teste quando a expressão é falsa. O pytest mostra os dois valores comparados |

<a id="mixed-phases-aaa"></a>

## As três fases do teste

O teste tem três momentos: preparar o cenário, executar a operação e conferir o resultado. As declarações da preparação e da execução ficam agrupadas, e uma linha em branco isola o `assert`.

Quando tudo cabe numa expressão só, como no exemplo ruim abaixo, o teste que falha só informa que `False` não é `True`. Ninguém descobre se o problema foi o desconto, o total ou o cliente sem abrir o código.

<details>
<summary>❌ Ruim: cenário, execução e verificação numa expressão só</summary>

```python
def test_apply_discount():
    assert apply_discount(Order(total=100, customer=Customer(defaulted=False)), 10)["total"] == 90
```

</details>

<details>
<summary>✅ Bom: as três fases do teste ficam visíveis</summary>

```python
def test_apply_discount_reduces_total():
    customer = Customer(defaulted=False)
    order = Order(total=100.0, customer=customer)
    discounted_order = apply_discount(order, discount=10.0)

    assert discounted_order["total"] == 90.0
```

</details>

## O assert precisa apontar o campo

`assert user` passa com qualquer objeto que não seja vazio, e reprova com a mensagem "assert None". O teste some do relatório sem dizer nada útil.

`assert user.email == "alice@example.com"` reprova mostrando os dois valores lado a lado, e quem lê já sabe o que o código devolveu no lugar do esperado.

<details>
<summary>❌ Ruim: assert que só confere se o objeto existe</summary>

```python
def test_user():
    user = create_user("Alice", "alice@example.com")
    assert user
    assert user.email
```

</details>

<details>
<summary>✅ Bom: o assert compara o campo e a falha mostra os dois valores</summary>

```python
def test_create_user_sets_email():
    user = create_user("Alice", "alice@example.com")
    assert user.email == "alice@example.com"
```

</details>

## Fixtures: o cenário montado uma vez

A fixture é uma função que monta o cenário e devolve pronto. O teste declara o nome dela como parâmetro, e o pytest cuida de chamá-la e passar o resultado.

O ganho aparece quando o cenário muda. Com o mesmo pedido copiado em dez testes, acrescentar um campo obrigatório em `Order` quebra os dez, e a correção é dez edições iguais.

<details>
<summary>❌ Ruim: o mesmo cenário copiado em cada teste</summary>

```python
def test_order_total():
    customer = Customer(name="Alice", defaulted=False)
    order = Order(order_id=1, customer=customer, items=[Item(price=50.0), Item(price=30.0)])

    total = calculate_order_total(order)

    assert total == 80.0

def test_order_with_discount():
    customer = Customer(name="Alice", defaulted=False)
    order = Order(order_id=1, customer=customer, items=[Item(price=50.0), Item(price=30.0)])

    discounted_order = apply_discount(order, discount=10.0)

    assert discounted_order["total"] == 70.0
```

</details>

<details>
<summary>✅ Bom: o cenário é montado num lugar só, e os dois testes pedem por ele</summary>

```python
import pytest

@pytest.fixture
def standard_order():
    customer = Customer(name="Alice", defaulted=False)
    order = Order(order_id=1, customer=customer, items=[Item(price=50.0), Item(price=30.0)])
    return order

def test_order_total(standard_order):
    total = calculate_order_total(standard_order)
    assert total == 80.0

def test_order_with_discount(standard_order):
    discounted_order = apply_discount(standard_order, discount=10.0)
    assert discounted_order["total"] == 70.0
```

</details>

## Testar que a exceção certa foi levantada

`pytest.raises` reprova o teste se a exceção esperada não vier, e confere o tipo dela. Passe também o `match` quando a mensagem carrega a informação que interessa.

O `try/except Exception` do exemplo ruim aceita qualquer falha, inclusive um erro de digitação no seu próprio código. O teste fica verde enquanto o código está quebrado.

<details>
<summary>❌ Ruim: o except aceita qualquer exceção, até um bug seu</summary>

```python
def test_invalid_order():
    try:
        process_order(None)
    except Exception:
        pass  # qualquer exceção passa, até um bug inesperado
```

</details>

<details>
<summary>✅ Bom: pytest.raises confere o tipo e a mensagem da exceção</summary>

```python
import pytest

def test_process_order_raises_when_order_is_missing():
    with pytest.raises(ValidationError, match="Order is required"):
        process_order(None)
```

</details>

## Testar código assíncrono

Instale o `pytest-asyncio` e marque a função com `@pytest.mark.asyncio`, ou ligue `asyncio_mode = "auto"` no `pyproject.toml` para dispensar a marcação em todo teste.

Sem isso, chamar a coroutine sem `await` devolve o objeto da coroutine, e não o resultado. O teste falha com um `AttributeError` confuso, e a função que você queria testar nunca chegou a rodar.

<details>
<summary>❌ Ruim: a coroutine nunca roda, e o erro não diz isso</summary>

```python
def test_fetch_user():
    user = fetch_user(1)  # retorna coroutine, não o resultado

    assert user.name == "Alice"  # AttributeError: user é uma coroutine
```

</details>

<details>
<summary>✅ Bom: a marcação permite o await, e a função roda de verdade</summary>

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_user_returns_correct_name():
    user = await fetch_user(1)
    assert user.name == "Alice"
```

</details>

## O nome do teste

O nome descreve a regra que o teste protege, e lê como uma frase: `test_<o que>_<em que situação>_<qual resultado>`. Quando ele falha na integração contínua, o nome sozinho já conta o que parou de funcionar.

| Evitar | Preferir |
| --- | --- |
| `test_1`, `test_foo` | `test_apply_discount_reduces_total` |
| `test_user_error` | `test_create_user_raises_when_email_is_missing` |
| `test_ok` | `test_process_order_returns_invoice_on_success` |
