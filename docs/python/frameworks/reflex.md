# Reflex

> Escopo: Python. Guia baseado em **Reflex 0.8.28** com **Python 3.10+** (Python 3.14: ver nota de compatibilidade).

Reflex é um framework Python fullstack (completo): o código Python compila para um frontend em **React**
(biblioteca de UI) e um backend em **FastAPI** (framework web assíncrono). Toda a lógica de negócio
permanece no servidor. O browser recebe apenas o HTML e o JavaScript gerados a partir dos componentes
declarados em Python.

Este guia mostra como estruturar State, event handlers, computed vars e componentes seguindo os
princípios de [functions.md](../conventions/functions.md) e
[control-flow.md](../conventions/control-flow.md).

## Conceitos fundamentais

| Conceito                                              | O que é                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **State** (Estado)                                    | Classe que herda de `rx.State`: armazena variáveis reativas e event handlers de uma sessão de usuário      |
| **Var** (Variable, Variável reativa)                  | Atributo tipado do State: qualquer alteração propaga para os componentes que o referenciam                 |
| **Computed Var** (Var computada)                      | Método com `@rx.var`: derivado de outros Vars, somente leitura, sem sincronização manual                   |
| **Event Handler** (Manipulador de evento)             | Método público do State: único mecanismo para alterar Vars; disparado por interações do usuário            |
| **Component** (Componente)                            | Função Python que retorna elementos `rx.*`; declara a UI de forma procedural                               |
| **Page** (Página)                                     | Função de componente registrada em uma rota via `app.add_page()`                                           |
| **Backend Var** (Var de backend)                      | Atributo com prefixo `_`: nunca serializado para o browser                                                 |

## Compatibilidade com Python 3.14

Reflex 0.8.28 tem dois problemas conhecidos com Python 3.14:

- **Pydantic v1**: Reflex usa Pydantic v1 internamente. O Python 3.14 descontinuou `_eval_type()`,
  que o Pydantic v1 usa para resolver tipos em tempo de execução. O build falha.
- **Operador `~`**: Reflex usa `~` para inverter Vars booleanas. O Python 3.14 emite aviso de
  descontinuação para `__invert__` em booleanos.

Restringir a versão no `pyproject.toml` até a migração para Pydantic v2:

```toml
[project]
requires-python = ">=3.10,<3.14"
```

## Arquitetura

Reflex compila Python para React (frontend) e FastAPI (backend). Cada usuário recebe uma instância
isolada do State no servidor, sincronizada via **WebSocket** (protocolo de comunicação bidirecional
persistente).

**Fluxo:** `User Action → Component → Event Handler → State → re-render`

| Camada              | O que faz                                               | Arquivo        |
| ------------------- | ------------------------------------------------------- | -------------- |
| **Page**            | Registra rota, compõe componentes                       | `pages/`       |
| **Component**       | Declara UI, referencia Vars do State                    | `components/`  |
| **Event Handler**   | Valida e altera Vars; única porta de escrita no State   | `state.py`     |
| **State**           | Armazena Vars, propaga alterações aos componentes       | `state.py`     |
| **Computed Var**    | Deriva valores do State sem duplicar lógica             | `state.py`     |

```
app/
├── state.py           → State: vars, event handlers, computed vars
├── pages/
│   ├── index.py       → page: compõe componentes, registra rota /
│   └── orders.py      → page: compõe componentes, registra rota /orders
├── components/
│   ├── order_card.py  → component: recebe props, referencia State
│   └── nav_bar.py     → component: global, sem estado local
└── app.py             → entry point: registra pages, configura app
```

## State

O State concentra todas as Vars e event handlers. Vars com prefixo `_` são de backend: não chegam
ao browser.

<details>
<summary>❌ Bad — Var sem tipo, boolean sem prefixo semântico, intenção de backend var sem prefixo</summary>
<br>

```python
class AppState(rx.State):
    orders = []      # sem tipo: React não infere a forma
    loading = False  # boolean sem prefixo: banido
    filter = ""      # deveria ser backend var, mas falta _
```

</details>

<br>

<details>
<summary>✅ Good — Vars tipadas, boolean com is_, backend var com prefixo _</summary>
<br>

```python
class OrderState(rx.State):
    orders: list[Order] = []
    is_loading: bool = False
    _active_filter: str = ""
```

</details>

## Event Handlers

Métodos públicos do State são event handlers: o frontend pode dispará-los diretamente. Prefixo `_`
torna o método privado (somente uso interno, não exposto ao browser).

<details>
<summary>❌ Bad — verbo handle, validação misturada com persistência, helper sem prefixo</summary>
<br>

```python
class OrderState(rx.State):
    async def handle_submit(self, form_data: dict):
        if not form_data.get("customer_id"):
            self.error = "Required"
            return
        await db.save(form_data)

    def helper(self):
        pass
```

</details>

<br>

<details>
<summary>✅ Good — verbo expressivo, validação em helper privado, persistência delegada ao serviço</summary>
<br>

```python
class OrderState(rx.State):
    error_message: str = ""
    orders: list[Order] = []

    async def submit_order(self, order_data: dict):
        is_valid = self._validate_order(order_data)
        if not is_valid:
            return

        saved_order = await order_service.save(order_data)
        self.orders.append(saved_order)

    def _validate_order(self, order_data: dict) -> bool:
        if not order_data.get("customer_id"):
            self.error_message = "Customer is required."
            return False

        return True
```

</details>

## Vars Computadas

`@rx.var` declara uma Var derivada: somente leitura, recalculada quando as Vars de origem mudam.
Anotação de tipo obrigatória.

<details>
<summary>❌ Bad — Var atualizada manualmente a cada escrita, sem tipo, sem decorator</summary>
<br>

```python
class CartState(rx.State):
    items: list[CartItem] = []
    total = 0

    def add_item(self, item: CartItem):
        self.items.append(item)
        self.total = sum(i.price for i in self.items)
```

</details>

<br>

<details>
<summary>✅ Good — computed var derivada automaticamente, sem sincronização manual</summary>
<br>

```python
class CartState(rx.State):
    items: list[CartItem] = []

    @rx.var
    def cart_total(self) -> float:
        total = sum(item.price for item in self.items)

        return total

    @rx.var
    def is_cart_empty(self) -> bool:
        is_empty = len(self.items) == 0

        return is_empty

    def add_item(self, item: CartItem):
        self.items.append(item)
```

</details>

## Componentes

Componentes são funções Python que retornam elementos `rx.*`. Recebem props como parâmetros e
referenciam Vars do State. Sem I/O nem lógica de negócio inline.

<details>
<summary>❌ Bad — I/O direto no componente, lógica de negócio misturada com apresentação</summary>
<br>

```python
def order_list():
    orders = fetch_orders_from_api()
    return rx.vstack(
        *[rx.text(f"#{o.order_id}: R$ {o.total:.2f}") for o in orders],
    )
```

</details>

<br>

<details>
<summary>✅ Good — componente referencia State, sem I/O, sem lógica de negócio</summary>
<br>

```python
def order_card(order: Order) -> rx.Component:
    label = f"Order #{order.order_id}"
    amount = f"R$ {order.total:.2f}"

    card = rx.vstack(
        rx.heading(label, size="3"),
        rx.text(amount),
        spacing="2",
        padding="4",
    )

    return card

def order_list() -> rx.Component:
    orders_section = rx.vstack(
        rx.cond(
            OrderState.is_loading,
            rx.spinner(),
            rx.foreach(OrderState.orders, order_card),
        ),
    )

    return orders_section
```

</details>
