# Modelagem de entidades

> Escopo: Python 3.13+. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `NewType` para IDs tipados, `@dataclass(frozen=True, slots=True)` para value objects, `class Entity(Generic[TId])` como base mínima e `Sequence[T]` em retornos públicos.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Python e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem Python 3.13+, `mypy --strict` ou Pyright no modo estrito, e não usam `# type: ignore` em ponto nenhum.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo `__post_init__` ou pelo classmethod factory e pelos métodos que alteram estado |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `UUID` ou `str` cru, para impedir trocas acidentais entre IDs |
| **NewType** (novo tipo) | `typing.NewType('CustomerId', UUID)`: alias de tipo com custo zero em runtime; mypy e Pyright rejeitam trocas entre NewTypes distintos |
| **dataclass** (classe de dados) | Decorator `@dataclass` que gera `__init__`, `__repr__` e `__eq__` automaticamente; `frozen=True` torna o objeto não-alterável |
| **slots** (atributos via slots) | `@dataclass(slots=True)`: troca `__dict__` por `__slots__`, reduz memória e acelera acesso a atributos |
| **`__post_init__`** (pós-inicialização) | Método especial de dataclass chamado depois do `__init__` gerado; local idiomático para validação de invariantes |
| **Pydantic** (biblioteca de validação e serialização) | Biblioteca que valida e serializa dados a partir de type hints; `BaseModel` com `model_config = ConfigDict(frozen=True)` cobre value objects com validação rica de entrada externa |
| **Optional / `T \| None`** (anulável, aceita ausência de valor) | Campo que aceita `None` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **Sequence[T]** (sequência somente leitura) | `collections.abc.Sequence[T]`: interface de coleção sem `append` nem `__setitem__`; usado em retornos públicos de coleções de agregados |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (SQLAlchemy, Django ORM, Tortoise) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deleted_at` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **UUID** (Universally Unique Identifier, identificador único universal) | Valor de 128 bits usado como ID, representado como `uuid.UUID` no Python |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo, e ninguém deveria comprometer-se com um. O sinal que funciona é a coesão: as propriedades mudam juntas, são consultadas juntas, fazem sentido juntas. Quando um subconjunto começa a mudar em outro ritmo, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 10 propriedades**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre é sinal de duas entidades coladas na mesma classe. Quebrar.

Quando o nome da entidade não descreve mais o que ela faz e vira lista (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```python
class Customer:
    def __init__(
        self,
        customer_id: UUID,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        birth_date: date,
        street: str,
        number: str,
        complement: str | None,
        city: str,
        state: str,
        zip_code: str,
        country: str,
        newsletter_opt_in: bool,
        sms_opt_in: bool,
        preferred_language: str,
        tax_id: str | None,
        tax_regime: str | None,
        invoice_email: str | None,
    ) -> None:
        self.customer_id = customer_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.phone = phone
        self.birth_date = birth_date
        self.street = street
        self.number = number
        self.complement = complement
        self.city = city
        self.state = state
        self.zip_code = zip_code
        self.country = country
        self.newsletter_opt_in = newsletter_opt_in
        self.sms_opt_in = sms_opt_in
        self.preferred_language = preferred_language
        self.tax_id = tax_id
        self.tax_regime = tax_regime
        self.invoice_email = invoice_email
```

20 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```python
from __future__ import annotations
from dataclasses import dataclass
from uuid import UUID

@dataclass(frozen=True, slots=True)
class Address:
    street: str
    number: str
    complement: str | None
    city: str
    state: str
    zip_code: str
    country: str

@dataclass(frozen=True, slots=True)
class CustomerPreferences:
    newsletter_opt_in: bool
    sms_opt_in: bool
    preferred_language: str

@dataclass(frozen=True, slots=True)
class TaxInfo:
    tax_id: str
    tax_regime: str
    invoice_email: str

    def __post_init__(self) -> None:
        if not self.tax_id or not self.tax_regime:
            raise ValueError("TaxInfo requires both tax_id and tax_regime.")

class Customer:
    def __init__(
        self,
        customer_id: UUID,
        name: str,
        email: str,
        address: Address,
        preferences: CustomerPreferences,
        tax_info: TaxInfo | None = None,
    ) -> None:
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.address = address
        self.preferences = preferences
        self.tax_info = tax_info
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é opcional inteiro, e quando presente vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `T | None` demais (8 de 20 sempre `None`).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Python, vira `@dataclass(frozen=True, slots=True)` com validação em `__post_init__`.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `TaxInfo | None`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customer_id`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```python
class Customer:
    def __init__(
        self,
        customer_id: UUID,
        name: str,
        email: str,
        # se PJ, esses três aparecem; se PF, ficam None
        tax_id: str | None,
        tax_regime: str | None,
        invoice_email: str | None,
    ) -> None:
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.tax_id = tax_id
        self.tax_regime = tax_regime
        self.invoice_email = invoice_email

    def has_tax_info(self) -> bool:
        is_fiscally_registered = (
            self.tax_id is not None and self.tax_regime is not None
        )
        return is_fiscally_registered
```

A regra "se um campo de imposto existe, todos existem" mora no método `has_tax_info`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O type checker aceita `Customer` com `tax_id` preenchido e `tax_regime` como `None`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, invariante em __post_init__</summary>

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class TaxInfo:
    tax_id: str
    tax_regime: str
    invoice_email: str

    def __post_init__(self) -> None:
        if not self.tax_id or not self.tax_regime:
            raise ValueError("TaxInfo requires both tax_id and tax_regime.")

class Customer:
    def __init__(
        self,
        customer_id: UUID,
        name: str,
        email: str,
        tax_info: TaxInfo | None = None,
    ) -> None:
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.tax_info = tax_info

    def has_tax_info(self) -> bool:
        is_fiscally_registered = self.tax_info is not None
        return is_fiscally_registered
```

A invariante "se imposto existe, é completo" mora em `TaxInfo.__post_init__`. Quem cria um cliente sem imposto passa `None`. Não tem como construir um `TaxInfo` parcial: o `@dataclass(frozen=True)` impede atribuição posterior e o `__post_init__` falha cedo.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `order_id` onde a função esperava `customer_id`, ou inverte a ordem dos argumentos sem perceber. Como todos são `UUID`, o type checker e os testes não enxergam a troca, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa idiomática em Python é `NewType`. Um `CustomerId = NewType('CustomerId', UUID)` tem custo zero em runtime: em execução, `CustomerId` é a própria `UUID`. Em tempo de análise estática, mypy e Pyright tratam `CustomerId` e `OrderId` como tipos distintos e rejeitam atribuição cruzada.

Quando o tipo precisa de método próprio (ex.: `display_value()`, serialização customizada), a alternativa é um `@dataclass(frozen=True)` wrapper. O custo é uma camada de indireção (`order_id.value`), mas ganha-se comportamento encapsulado.

<details>
<summary>❌ Ruim: IDs como UUID crua, fáceis de trocar de lugar</summary>

```python
from uuid import UUID

def transfer_ownership(customer_id: UUID, order_id: UUID) -> None:
    # assinatura: customer_id primeiro, order_id depois
    # se o caller inverter, o bug passa silencioso
    order_repository.update(order_id, customer_id=customer_id)

# uso longe daqui, com nomes locais diferentes:
new_owner_id = order.order_id
target_order_id = customer.customer_id

transfer_ownership(new_owner_id, target_order_id)  # invertido; nada acusa
```

</details>

<details>
<summary>✅ Bom: NewType com custo zero em runtime, verificação estática pelo mypy/Pyright</summary>

```python
from typing import NewType
from uuid import UUID, uuid4

CustomerId = NewType("CustomerId", UUID)
OrderId = NewType("OrderId", UUID)

def new_customer_id() -> CustomerId:
    generated = CustomerId(uuid4())
    return generated

def new_order_id() -> OrderId:
    generated = OrderId(uuid4())
    return generated

def transfer_ownership(customer_id: CustomerId, order_id: OrderId) -> None:
    order_repository.update(order_id, customer_id=customer_id)

new_owner_id = new_customer_id()
target_order_id = new_order_id()

# trocar a ordem: erro estático no mypy/Pyright
transfer_ownership(target_order_id, new_owner_id)
# error: Argument 1 to "transfer_ownership" has incompatible type "OrderId";
#        expected "CustomerId"
```

`NewType` é apagado em runtime: `isinstance(new_owner_id, CustomerId)` não funciona porque `CustomerId` é `UUID`. Para verificação em runtime no boundary (ex.: validação de entrada de API), combinar com `isinstance(value, UUID)` e confiar nos type hints da camada de validação (Pydantic).

</details>

<details>
<summary>✅ Bom: wrapper @dataclass quando o ID precisa de método próprio</summary>

```python
from dataclasses import dataclass
from uuid import UUID, uuid4

@dataclass(frozen=True, slots=True)
class CustomerId:
    value: UUID

    @classmethod
    def generate(cls) -> "CustomerId":
        generated = cls(uuid4())
        return generated

    @classmethod
    def from_string(cls, raw: str) -> "CustomerId":
        parsed = cls(UUID(raw))
        return parsed

    def __str__(self) -> str:
        return str(self.value)

@dataclass(frozen=True, slots=True)
class OrderId:
    value: UUID

    @classmethod
    def generate(cls) -> "OrderId":
        generated = cls(uuid4())
        return generated

    @classmethod
    def from_string(cls, raw: str) -> "OrderId":
        parsed = cls(UUID(raw))
        return parsed
```

O wrapper ganha `isinstance` real em runtime, `__eq__` e `__hash__` nativos do `@dataclass(frozen=True)`, e métodos de fábrica sem boilerplate. O custo é o acesso via `.value` ao UUID subjacente.

</details>

A escolha entre `NewType` e wrapper depende do uso: `NewType` quando o ID circula como `UUID` transparente e só o type checker precisa distingui-lo; wrapper quando o ID expõe métodos ou precisa de `isinstance` real.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenant_id?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`created_at`, `updated_at`, `created_by`, `updated_by`). Vão por composição (campo `audit: AuditFields`) ou por dataclass mixin aplicado onde faz sentido.
- **Caso à parte**: `tenant_id`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

Uma nota importante: nunca use `@dataclass` para a classe `Entity`. O decorator gera `__eq__` por estrutura (compara todos os campos), o que quebra a identidade de entidade. A igualdade de entidade é por ID, não por valor dos campos.

<details>
<summary>❌ Ruim: BaseEntity inchada com @dataclass em Entity, todo mundo herda tudo</summary>

```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

@dataclass  # PERIGO: gera __eq__ por estrutura, quebra identidade de entidade
class BaseEntity:
    entity_id: UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    version: int
    tenant_id: UUID
    created_by: str | None
    updated_by: str | None

@dataclass
class OrderItem(BaseEntity):
    product_id: UUID
    quantity: int
    # OrderItem carrega tenant_id, created_by, version que não usa nem precisa
    # dois OrderItems com mesmo entity_id mas campos distintos seriam "diferentes"
    # por causa do __eq__ estrutural gerado pelo @dataclass
```

</details>

<details>
<summary>✅ Bom: Entity mínima genérica com __eq__ por ID, composição para auditoria</summary>

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Generic, TypeVar
from uuid import UUID

TId = TypeVar("TId")

class Entity(Generic[TId]):
    def __init__(self, entity_id: TId) -> None:
        if not entity_id:
            raise ValueError("Entity requires an id.")
        self._id = entity_id

    @property
    def id(self) -> TId:
        return self._id

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, self.__class__):
            return False
        is_same = self._id == other._id
        return is_same

    def __hash__(self) -> int:
        return hash(self._id)

# auditoria por composição, aplicada onde faz sentido
@dataclass(frozen=True, slots=True)
class AuditFields:
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None
    updated_by: str | None = None

class Customer(Entity[CustomerId]):
    def __init__(
        self,
        customer_id: CustomerId,
        name: str,
        email: str,
        audit: AuditFields,
    ) -> None:
        super().__init__(customer_id)
        self.name = name
        self.email = email
        self.audit = audit  # populado pelo repositório

class OrderItem(Entity[OrderItemId]):
    def __init__(
        self,
        order_item_id: OrderItemId,
        product_id: ProductId,
        quantity: int,
    ) -> None:
        super().__init__(order_item_id)
        self.product_id = product_id
        self.quantity = quantity
        # sem auditoria: faz parte do agregado Order, não vive sozinho
```

`Entity[TId]` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` não expõe auditoria porque faz parte do agregado `Order` e não vive sozinho. O `__eq__` compara por ID, conforme a definição de entidade.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para tipos Python:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `name: str`, `total: Decimal` |
| Zero ou um | Campo `T \| None` | `tax_info: TaxInfo \| None` (só PJ tem) |
| Zero ou mais | `Sequence[T]` público, `list[T]` interno (vazio, nunca None) | `Sequence[OrderItem]` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em Python, listas públicas usam `Sequence[T]` (ou `tuple[T, ...]`) para sinalizar somente leitura. A mutação interna passa por um `list[T]` privado prefixado com `_`, e o método de domínio é a única forma de alterar. O getter retorna uma cópia (`tuple(self._phones)` ou `list(self._phones)`) para evitar que callers alterem a lista interna.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```python
class Customer:
    def __init__(self, customer_id: UUID, name: str) -> None:
        self.customer_id = customer_id
        self.name = name
        self.phone1: str | None = None
        self.phone2: str | None = None
        self.phone3: str | None = None

    def add_phone(self, number: str) -> None:
        if self.phone1 is None:
            self.phone1 = number
            return
        if self.phone2 is None:
            self.phone2 = number
            return
        if self.phone3 is None:
            self.phone3 = number
            return
        raise ValueError("Customer can have at most 3 phones.")
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via Sequence</summary>

```python
from __future__ import annotations
from collections.abc import Sequence
from dataclasses import dataclass
from enum import Enum

class PhoneType(Enum):
    MOBILE = "mobile"
    HOME = "home"
    WORK = "work"

@dataclass(frozen=True, slots=True)
class Phone:
    number: str
    phone_type: PhoneType

class Customer(Entity[CustomerId]):
    def __init__(self, customer_id: CustomerId, name: str) -> None:
        super().__init__(customer_id)
        self.name = name
        self._phones: list[Phone] = []

    @property
    def phones(self) -> Sequence[Phone]:
        snapshot = tuple(self._phones)
        return snapshot

    def add_phone(self, phone: Phone) -> None:
        if len(self._phones) >= 3:
            raise ValueError("Customer can have at most 3 phones.")
        self._phones.append(phone)

    def remove_phone(self, number: str) -> None:
        remaining = [p for p in self._phones if p.number != number]
        self._phones.clear()
        self._phones.extend(remaining)
```

A regra "no máximo 3" mora em `add_phone`, onde dá pra mudar sem mexer no schema. A propriedade `phones` retorna uma cópia como `tuple`: callers iteram à vontade mas não conseguem alterar a lista interna. Lista vazia (`[]`) é o estado neutro: itera sem `if phones is not None`.

</details>

Listas seguem a regra de [`null-safety`](null-safety.md): nunca `None`, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, a root é a única classe exposta do agregado, e o construtor da entidade filha pode ser protegido para que só o root produza instâncias.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza fronteira de agregado, então vai por ID, nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, ciclo bidirecional sem dono</summary>

```python
class Order:
    def __init__(self, order_id: OrderId) -> None:
        self.order_id = order_id
        self.items: list[OrderItem] = []

class OrderItem:
    def __init__(
        self,
        order_item_id: OrderItemId,
        order: Order,  # referência completa ao Order
        product_id: ProductId,
        quantity: int,
    ) -> None:
        self.order_item_id = order_item_id
        self.order = order
        self.product_id = product_id
        self.quantity = quantity

order = Order(order_id=order_identifier)
line = OrderItem(
    order_item_id=item_identifier,
    order=order,
    product_id=product_identifier,
    quantity=2,
)
order.items.append(line)

# quem valida que items não passa do limite?
# quem garante que remove_item limpa line.order?
# a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```python
from __future__ import annotations
from collections.abc import Sequence
from decimal import Decimal

class OrderItem(Entity[OrderItemId]):
    def __init__(
        self,
        order_item_id: OrderItemId,
        product_id: ProductId,
        quantity: int,
        unit_price: Decimal,
    ) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive.")
        super().__init__(order_item_id)
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price

    def subtotal(self) -> Decimal:
        total = self.unit_price * self.quantity
        return total

class Order(Entity[OrderId]):
    def __init__(self, order_id: OrderId, customer_id: CustomerId) -> None:
        super().__init__(order_id)
        self.customer_id = customer_id  # ID, não Customer (outro agregado)
        self._items: list[OrderItem] = []

    @classmethod
    def place(cls, order_id: OrderId, customer_id: CustomerId) -> "Order":
        created = cls(order_id, customer_id)
        return created

    @property
    def line_items(self) -> Sequence[OrderItem]:
        snapshot = tuple(self._items)
        return snapshot

    def add_item(
        self,
        order_item_id: OrderItemId,
        product_id: ProductId,
        quantity: int,
        unit_price: Decimal,
    ) -> None:
        if len(self._items) >= 50:
            raise ValueError("Order can have at most 50 items.")
        item = OrderItem(order_item_id, product_id, quantity, unit_price)
        self._items.append(item)

    def remove_item(self, order_item_id: OrderItemId) -> None:
        remaining = [i for i in self._items if i.id != order_item_id]
        self._items.clear()
        self._items.extend(remaining)

    def total(self) -> Decimal:
        amount = sum((item.subtotal() for item in self._items), Decimal("0"))
        return amount
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `list[OrderItem]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```python
class Student(Entity[StudentId]):
    def __init__(self, student_id: StudentId, name: str) -> None:
        super().__init__(student_id)
        self.name = name
        self._course_ids: list[CourseId] = []
        self._enrollment_dates: list[datetime] = []  # paralelo a _course_ids

    def enrollment_date_of(self, course_id: CourseId) -> datetime | None:
        try:
            position = self._course_ids.index(course_id)
        except ValueError:
            return None
        # se uma lista sair de ordem, os dados ficam inconsistentes
        enrolled_at = self._enrollment_dates[position]
        return enrolled_at
```

Duas listas paralelas: se uma sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais uma lista paralela. O type checker não detecta o desalinhamento.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```python
from __future__ import annotations
from enum import Enum

class EnrollmentStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"

class Enrollment(Entity[EnrollmentId]):
    def __init__(
        self,
        enrollment_id: EnrollmentId,
        student_id: StudentId,
        course_id: CourseId,
        enrolled_at: datetime,
    ) -> None:
        super().__init__(enrollment_id)
        self.student_id = student_id
        self.course_id = course_id
        self.enrolled_at = enrolled_at
        self._status = EnrollmentStatus.ACTIVE
        self._final_grade: float | None = None

    @classmethod
    def open(
        cls,
        enrollment_id: EnrollmentId,
        student_id: StudentId,
        course_id: CourseId,
    ) -> "Enrollment":
        created = cls(enrollment_id, student_id, course_id, datetime.utcnow())
        return created

    @property
    def status(self) -> EnrollmentStatus:
        return self._status

    @property
    def final_grade(self) -> float | None:
        return self._final_grade

    def complete(self, grade: float) -> None:
        if self._status != EnrollmentStatus.ACTIVE:
            raise ValueError("Only active enrollments can be completed.")
        if not (0 <= grade <= 10):
            raise ValueError("Grade must be between 0 and 10.")
        self._status = EnrollmentStatus.COMPLETED
        self._final_grade = grade

class Student(Entity[StudentId]):
    def __init__(self, student_id: StudentId, name: str) -> None:
        super().__init__(student_id)
        self.name = name

class Course(Entity[CourseId]):
    def __init__(self, course_id: CourseId, title: str) -> None:
        super().__init__(course_id)
        self.title = title
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `Sequence[CourseId]` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order._items` é uma lista de `OrderItem`, não uma lista de `OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando a fronteira de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customer_id: CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```python
class Order(Entity[OrderId]):
    def __init__(self, order_id: OrderId, customer: Customer) -> None:
        super().__init__(order_id)
        self.customer = customer  # Customer completo

# para criar Order, preciso buscar Customer inteiro do banco
customer = await customer_repository.find_by_id(customer_id)
if customer is None:
    raise NotFoundError("Customer not found.")

order = Order(order_id=new_order_id, customer=customer)

# para serializar Order para o frontend, vou junto enviar Customer completo
# mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```python
class Order(Entity[OrderId]):
    def __init__(self, order_id: OrderId, customer_id: CustomerId) -> None:
        super().__init__(order_id)
        self.customer_id = customer_id  # ID, não Customer

    @classmethod
    def place(cls, order_id: OrderId, customer_id: CustomerId) -> "Order":
        created = cls(order_id, customer_id)
        return created

order = Order.place(order_id=new_order_id, customer_id=target_customer_id)

# quem precisa do Customer resolve o ID no momento certo
customer = await customer_repository.find_by_id(order.customer_id)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status precisa carregar dados além do nome (data de pagamento, código de rastreio, motivo do cancelamento), vale usar classes separadas com `match` exaustivo em vez de `Enum` simples. O `match` do Python 3.10+ faz narrowing automático com `case`:

<details>
<summary>✅ Bom: classes de estado com match quando o estado carrega dados</summary>

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class Pending:
    pass

@dataclass(frozen=True, slots=True)
class Paid:
    paid_at: datetime

@dataclass(frozen=True, slots=True)
class Shipped:
    paid_at: datetime
    tracking_code: str

@dataclass(frozen=True, slots=True)
class Cancelled:
    cancelled_at: datetime
    reason: str

OrderState = Pending | Paid | Shipped | Cancelled

def summarize(state: OrderState) -> str:
    match state:
        case Paid(paid_at=paid_at):
            summary = f"Paid at {paid_at.isoformat()}"
            return summary
        case Shipped(tracking_code=tracking_code):
            summary = f"Shipped, tracking {tracking_code}"
            return summary
        case Cancelled(reason=reason):
            summary = f"Cancelled: {reason}"
            return summary
        case Pending():
            summary = "Pending"
            return summary
```

Para o estado simples (sem dados associados), `class OrderStatus(Enum): PENDING = 'pending'` em um único campo basta. As classes de estado só ganham tração quando o estado carrega informação própria.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenant_id`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.tenant_id`, `Customer.tenant_id`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenant_id`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenant_id duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```python
class Order(Entity[OrderId]):
    def __init__(
        self,
        order_id: OrderId,
        tenant_id: TenantId,
        customer_id: CustomerId,
    ) -> None:
        super().__init__(order_id)
        self.tenant_id = tenant_id
        self.customer_id = customer_id
        self._items: list[OrderItem] = []

class OrderItem(Entity[OrderItemId]):
    def __init__(
        self,
        order_item_id: OrderItemId,
        tenant_id: TenantId,  # duplica o tenant_id do Order
        product_id: ProductId,
        quantity: int,
    ) -> None:
        super().__init__(order_item_id)
        self.tenant_id = tenant_id
        self.product_id = product_id
        self.quantity = quantity

# e agora cada serviço precisa checar tenant_id em toda operação:
def calculate_order_total(order: Order, current_tenant: TenantId) -> Decimal:
    if order.tenant_id != current_tenant:
        raise PermissionError("Tenant mismatch on order.")
    for line in order.line_items:
        if line.tenant_id != current_tenant:
            raise PermissionError("Tenant mismatch on item.")
    total = order.total()
    return total
```

</details>

<details>
<summary>✅ Bom: tenant_id só no aggregate root, enforcement no repositório</summary>

```python
class Order(Entity[OrderId]):
    def __init__(
        self,
        order_id: OrderId,
        tenant_id: TenantId,  # único campo de tenant no agregado
        customer_id: CustomerId,
    ) -> None:
        super().__init__(order_id)
        self.tenant_id = tenant_id
        self.customer_id = customer_id
        self._items: list[OrderItem] = []

class OrderItem(Entity[OrderItemId]):
    def __init__(
        self,
        order_item_id: OrderItemId,
        product_id: ProductId,
        quantity: int,
    ) -> None:
        super().__init__(order_item_id)
        self.product_id = product_id
        self.quantity = quantity
        # sem tenant_id: herdado implicitamente pelo pai

class OrderRepository:
    def __init__(self, session: AsyncSession, tenant_context: TenantContext) -> None:
        self._session = session
        self._tenant_context = tenant_context

    async def find_by_id(self, order_id: OrderId) -> Order | None:
        active_tenant = self._tenant_context.current()

        row = await self._session.execute(
            select(OrderRow).where(
                OrderRow.id == order_id.value,
                OrderRow.tenant_id == active_tenant.value,
            )
        )
        order_row = row.scalar_one_or_none()
        if order_row is None:
            return None

        order = OrderMapper.to_domain(order_row)
        return order
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Python real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects (`@dataclass(frozen=True)`) ou separar em agregados.

**`@dataclass` em Entity**. Usar `@dataclass` na classe `Entity` gera `__eq__` por estrutura, quebrando a identidade de entidade. Sintoma: dois objetos com o mesmo `id` mas campos diferentes são considerados distintos. Tratamento: classe normal com `__eq__` e `__hash__` explícitos por ID.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenant_id` que nunca usa. Tratamento: deixar só `id` na base; demais campos viram composição (`AuditFields`) ou protocolos.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `None`. Sintoma: caller obrigado a `if field is not None` em cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: `Sequence[Phone]` exposta, lista `_phones: list[Phone]` interna.

**UUID cru como ID**. `customer_id: UUID` em vez de `customer_id: CustomerId`. Sintoma: bug onde `order_id` foi passado no lugar de `customer_id` e o type checker aceitou. Tratamento: `NewType` por ID ou wrapper `@dataclass(frozen=True)` com factory.

**Referência direta cruzando agregado**. `Order.customer: Customer` em vez de `Order.customer_id: CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas via joins. Tratamento: referência por ID tipado; quem precisa do objeto resolve no momento certo.

**Bidirecionalidade automática**. `Order._items` e `OrderItem.order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos; `OrderItem` não conhece `Order`.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático Python

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
