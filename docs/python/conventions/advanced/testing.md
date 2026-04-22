# Testing

> Escopo: Python. Idiomas específicos deste ecossistema.

Testes são especificações executáveis. Um teste bem escrito falha com uma mensagem que diz
exatamente o que quebrou — sem precisar abrir o código.

## Fases misturadas — AAA

Arrange → Act → Assert: três fases separadas por uma linha em branco. Misturá-las esconde o que
está sendo testado.

<details>
<summary>❌ Bad — fases misturadas, intenção obscura</summary>
<br>

```python
def test_apply_discount():
    assert apply_discount(Order(total=100, customer=Customer(defaulted=False)), 10)["total"] == 90
```

</details>

<br>

<details>
<summary>✅ Good — AAA: fases explícitas</summary>
<br>

```python
def test_apply_discount_reduces_total():
    customer = Customer(defaulted=False)

    order = Order(total=100.0, customer=customer)
    discounted_order = apply_discount(order, discount=10.0)

    assert discounted_order["total"] == 90.0
```

</details>

## Assert sem mensagem semântica

O nome do teste e o assert precisam dizer o que falhou — sem precisar inspecionar o valor.

<details>
<summary>❌ Bad — assert genérico, mensagem de falha inútil</summary>
<br>

```python
def test_user():
    user = create_user("Alice", "alice@example.com")
    assert user
    assert user.email
```

</details>

<br>

<details>
<summary>✅ Good — assert expressivo com campo específico</summary>
<br>

```python
def test_create_user_sets_email():
    user = create_user("Alice", "alice@example.com")

    assert user.email == "alice@example.com"
```

</details>

## Fixtures — setup reutilizável

Fixtures do pytest evitam duplicação de setup entre testes. Cada fixture declara o que provê —
os testes recebem por injeção de parâmetro.

<details>
<summary>❌ Bad — setup duplicado em cada teste</summary>
<br>

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

<br>

<details>
<summary>✅ Good — fixture compartilhada, sem duplicação</summary>
<br>

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

## Testes de exceção

Use `pytest.raises` como context manager para verificar que uma exceção específica é lançada.
Verificar o tipo não basta — valide a mensagem quando ela carrega a intenção.

<details>
<summary>❌ Bad — captura genérica sem verificação da causa</summary>
<br>

```python
def test_invalid_order():
    try:
        process_order(None)
    except Exception:
        pass  # qualquer exceção passa — até um bug inesperado
```

</details>

<br>

<details>
<summary>✅ Good — pytest.raises com tipo e mensagem verificados</summary>
<br>

```python
import pytest

def test_process_order_raises_when_order_is_missing():
    with pytest.raises(ValidationError, match="Order is required"):
        process_order(None)
```

</details>

## Testes assíncronos

Use `pytest-asyncio` para testar coroutines. Marque a função com `@pytest.mark.asyncio` ou
configure `asyncio_mode = "auto"` no `pyproject.toml`.

<details>
<summary>❌ Bad — coroutine não aguardada, teste passa sem executar</summary>
<br>

```python
def test_fetch_user():
    user = fetch_user(1)  # retorna coroutine, não o resultado

    assert user.name == "Alice"  # AttributeError — user é uma coroutine
```

</details>

<br>

<details>
<summary>✅ Good — pytest.mark.asyncio aguarda a coroutine</summary>
<br>

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_user_returns_correct_name():
    user = await fetch_user(1)

    assert user.name == "Alice"
```

</details>

## Nomenclatura de testes

O nome do teste documenta o comportamento esperado. Leia como frase: `test_<unidade>_<cenário>_<resultado>`.

| Evitar | Preferir |
| --- | --- |
| `test_1`, `test_foo` | `test_apply_discount_reduces_total` |
| `test_user_error` | `test_create_user_raises_when_email_is_missing` |
| `test_ok` | `test_process_order_returns_invoice_on_success` |
