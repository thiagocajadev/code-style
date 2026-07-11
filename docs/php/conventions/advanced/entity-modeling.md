# Modelagem de entidades

> Escopo: PHP 8.4. Visão transversal: [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: **readonly class**, **property promotion**, **backed enum**, **union types** e a estratégia de coleções com arrays PHP.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em PHP e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem `declare(strict_types=1)` em todos os arquivos e seguem PSR-12.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItems` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item, telefone não passa de 11 dígitos) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `string` ou `int` cru, para impedir trocas acidentais entre IDs |
| **readonly class** (classe somente leitura) | `readonly class Foo`: todas as propriedades são implicitamente `readonly`; disponível desde PHP 8.2 |
| **property promotion** (promoção de propriedade) | Declarar e atribuir propriedades diretamente no `__construct` com `public`/`private`/`protected`; disponível desde PHP 8.0 |
| **backed enum** (enum com valor associado) | `enum OrderStatus: string`: cada case carrega um valor `string` ou `int` serializável; disponível desde PHP 8.1 |
| **union type** (tipo união) | `int\|string`: aceita mais de um tipo na mesma assinatura; disponível desde PHP 8.0 |
| **nullable type** (tipo anulável) | `?Type` equivale a `Type\|null`; representa "zero ou um" em cardinalidade |
| **typed property** (propriedade tipada) | Declaração de propriedade com tipo explícito: `private string $name`; desde PHP 7.4 |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Doctrine, Eloquent, Cycle ORM) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |
| **GUID** (Globally Unique Identifier · identificador único global) | String de 128 bits usada como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

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

```php
declare(strict_types=1);

class Customer
{
    public function __construct(
        public readonly string $id,
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly string $email,
        public readonly string $phone,
        public readonly \DateTimeImmutable $birthDate,
        public readonly string $street,
        public readonly string $number,
        public readonly ?string $complement,
        public readonly string $city,
        public readonly string $state,
        public readonly string $zipCode,
        public readonly string $country,
        public readonly bool $newsletterOptIn,
        public readonly bool $smsOptIn,
        public readonly string $preferredLanguage,
        public readonly ?string $taxId,
        public readonly ?string $taxRegime,
        public readonly ?string $invoiceEmail,
    ) {}
}
```

19 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `null` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```php
declare(strict_types=1);

readonly class Address
{
    public function __construct(
        public string $street,
        public string $number,
        public ?string $complement,
        public string $city,
        public string $state,
        public string $zipCode,
        public string $country,
    ) {}
}

readonly class CustomerPreferences
{
    public function __construct(
        public bool $newsletterOptIn,
        public bool $smsOptIn,
        public string $preferredLanguage,
    ) {}
}

readonly class TaxInfo
{
    public function __construct(
        public string $taxId,
        public string $taxRegime,
        public string $invoiceEmail,
    ) {
        if ($this->taxId === '') {
            throw new \InvalidArgumentException('TaxInfo requires taxId.');
        }
        if ($this->taxRegime === '') {
            throw new \InvalidArgumentException('TaxInfo requires taxRegime.');
        }
    }
}

class Customer
{
    public function __construct(
        private readonly CustomerId $id,
        private readonly string $name,
        private readonly string $email,
        private readonly Address $address,
        private readonly CustomerPreferences $preferences,
        private readonly ?TaxInfo $taxInfo = null,
    ) {}
}
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é nullable inteiro, e quando presente vem completo e validado.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`null` em 8 de 20).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em PHP, o `readonly class Address` garante que o objeto não muda após criação, e a substituição é sempre por uma nova instância.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `?TaxInfo`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos no construtor).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```php
declare(strict_types=1);

class Customer
{
    public function __construct(
        private readonly CustomerId $id,
        private readonly string $name,
        private readonly string $email,
        // se PJ, esses três aparecem; se PF, ficam null
        private readonly ?string $taxId,
        private readonly ?string $taxRegime,
        private readonly ?string $invoiceEmail,
    ) {}

    public function hasTaxInfo(): bool
    {
        $isFiscallyRegistered = $this->taxId !== null && $this->taxRegime !== null;
        return $isFiscallyRegistered;
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora em `hasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O PHP aceita `Customer` com `taxId` preenchido e `taxRegime` `null`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional com validação no construtor</summary>

```php
declare(strict_types=1);

readonly class TaxInfo
{
    public function __construct(
        public string $taxId,
        public string $taxRegime,
        public string $invoiceEmail,
    ) {
        if ($this->taxId === '') {
            throw new \InvalidArgumentException('TaxInfo requires taxId.');
        }
        if ($this->taxRegime === '') {
            throw new \InvalidArgumentException('TaxInfo requires taxRegime.');
        }
    }
}

class Customer
{
    public function __construct(
        private readonly CustomerId $id,
        private readonly string $name,
        private readonly string $email,
        private readonly ?TaxInfo $taxInfo = null,
    ) {}

    public function hasTaxInfo(): bool
    {
        $isFiscallyRegistered = $this->taxInfo !== null;
        return $isFiscallyRegistered;
    }
}
```

A invariante "se imposto existe, é completo" mora no construtor de `TaxInfo`. Quem cria um cliente sem imposto passa `null`. Não tem como construir um `TaxInfo` parcial: o construtor falha cedo com `InvalidArgumentException`.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `$orderId` onde a função esperava `$customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `string` ou `int`, o PHP aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em PHP usa `readonly class`: cada ID vira uma classe própria com validação no construtor. Em PHP, a checagem acontece em runtime (o tipo system é nominal, mas não há branded types compile-time como em TypeScript). O `TypeError` do PHP acusa a troca na chamada da função, antes da lógica rodar. Com ferramentas de análise estática como **Psalm** ou **PHPStan**, a checagem sobe para tempo de análise.

<details>
<summary>❌ Ruim: IDs como string crua, fáceis de trocar de lugar</summary>

```php
declare(strict_types=1);

function transferOwnership(string $customerId, string $orderId): void
{
    // assinatura: customerId primeiro, orderId depois
    // se o caller inverter, o bug passa silencioso
    $this->orderRepository->update($orderId, ['customerId' => $customerId]);
}

// uso longe daqui, com nomes locais diferentes:
$targetOrder = $order->getId();
$newOwner = $customer->getId();

// inverte argumentos: nada acusa, tipo de ambos é string
transferOwnership($targetOrder, $newOwner);
```

</details>

<details>
<summary>✅ Bom: ID embrulhado em readonly class com validação</summary>

```php
declare(strict_types=1);

final readonly class CustomerId
{
    public function __construct(public string $value)
    {
        if ($this->value === '') {
            throw new \InvalidArgumentException('CustomerId requires a value.');
        }
    }

    public function equals(self $other): bool
    {
        $isSame = $this->value === $other->value;
        return $isSame;
    }
}

final readonly class OrderId
{
    public function __construct(public string $value)
    {
        if ($this->value === '') {
            throw new \InvalidArgumentException('OrderId requires a value.');
        }
    }

    public function equals(self $other): bool
    {
        $isSame = $this->value === $other->value;
        return $isSame;
    }
}

function transferOwnership(CustomerId $customerId, OrderId $orderId): void
{
    $this->orderRepository->update($orderId, ['customerId' => $customerId]);
}

$targetOrder = new OrderId($order->getId()->value);
$newOwner = new CustomerId($customer->getId()->value);

// trocar a ordem: TypeError em runtime
// Argument #1 ($customerId) must be of type CustomerId, OrderId given
transferOwnership($targetOrder, $newOwner);
```

O `TypeError` do PHP acusa a troca imediatamente, no boundary da função. Com Psalm ou PHPStan configurados, a checagem ocorre antes de rodar o código.

</details>

Em projetos com muitos IDs parecidos (`CustomerId`, `OrderId`, `ProductId`), vale criar uma classe base abstrata para concentrar a validação:

<details>
<summary>✅ Bom: classe base abstrata para reduzir boilerplate</summary>

```php
declare(strict_types=1);

abstract readonly class TypedId
{
    public function __construct(public string $value)
    {
        if ($this->value === '') {
            throw new \InvalidArgumentException(
                static::class . ' requires a non-empty value.'
            );
        }
    }

    public function equals(static $other): bool
    {
        $isSame = $this->value === $other->value;
        return $isSame;
    }
}

final readonly class CustomerId extends TypedId {}
final readonly class OrderId extends TypedId {}
final readonly class ProductId extends TypedId {}
```

Cada ID novo custa uma linha. A validação fica concentrada em `TypedId`, e `equals` usa `static` para comparar apenas IDs do mesmo tipo concreto.

</details>

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`). Vão por composição (campo `$audit: AuditFields`) ou por interface opcional (`Auditable`, aplicada onde faz sentido).
- **Caso à parte**: `tenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

Em PHP, a classe base genérica não tem generics de classe como TypeScript ou C#. O padrão é declarar `getId()` como método abstrato tipado, ou usar um `TypedId` abstrato como tipo do parâmetro do construtor.

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```php
declare(strict_types=1);

abstract class BaseEntity
{
    public function __construct(
        protected readonly string $id,
        protected readonly \DateTimeImmutable $createdAt,
        protected readonly \DateTimeImmutable $updatedAt,
        protected readonly ?\DateTimeImmutable $deletedAt,
        protected readonly int $version,
        protected readonly string $tenantId,
        protected readonly string $createdBy,
        protected readonly string $updatedBy,
    ) {}
}

class OrderItem extends BaseEntity
{
    public function __construct(
        string $id,
        public readonly string $productId,
        public readonly int $quantity,
    ) {
        parent::__construct(
            id: $id,
            createdAt: new \DateTimeImmutable(),
            updatedAt: new \DateTimeImmutable(),
            deletedAt: null,
            version: 1,
            tenantId: '',
            createdBy: '',
            updatedBy: '',
        );
    }
}
```

`OrderItem` carrega `tenantId`, `createdBy`, `version` que não usa nem precisa. O construtor da base aceita oito argumentos para devolver um item de pedido com três. Os valores vazios em `parent::__construct(...)` denunciam o problema.

</details>

<details>
<summary>✅ Bom: Entity mínima + composição para comportamentos extras</summary>

```php
declare(strict_types=1);

abstract class Entity
{
    public function __construct(protected readonly TypedId $id) {}

    public function equals(self $other): bool
    {
        $isSameClass = $other instanceof static;
        $isSameId = $isSameClass && $other->id->equals($this->id);
        return $isSameId;
    }
}

readonly class AuditFields
{
    public function __construct(
        public \DateTimeImmutable $createdAt,
        public \DateTimeImmutable $updatedAt,
        public ?string $createdBy = null,
        public ?string $updatedBy = null,
    ) {}
}

class Customer extends Entity
{
    public function __construct(
        CustomerId $id,
        private readonly string $name,
        private readonly string $email,
        private readonly AuditFields $audit,
    ) {
        parent::__construct($id);
    }
}

class OrderItem extends Entity
{
    public function __construct(
        OrderItemId $id,
        private readonly ProductId $productId,
        private readonly int $quantity,
    ) {
        parent::__construct($id);
        // sem auditoria: faz parte do agregado Order, não vive sozinho
    }
}
```

`Entity` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria porque faz parte do agregado `Order` e não vive sozinho.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para PHP:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `string $name`, `Money $total` |
| Zero ou um | Campo nullable (`?Type`) | `?TaxInfo $taxInfo` (só PJ tem) |
| Zero ou mais | `array` privado, getter público (vazio, nunca null) | `$items`, `$phones` |
| Exatamente N (N fixo) | N campos nomeados | `Address.{street, city, country}` |

Em PHP, arrays são tipos por valor (value types): ao retornar `$this->phones`, o chamador recebe uma cópia. A mutação interna passa por método de domínio, que é a única forma de alterar a lista. Para tipagem forte de coleções, use PHPDoc `/** @return Phone[] */` ou uma classe `Collection` especializada.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```php
declare(strict_types=1);

class Customer extends Entity
{
    public function __construct(
        CustomerId $id,
        private readonly string $name,
        private ?string $phone1,
        private ?string $phone2,
        private ?string $phone3,
    ) {
        parent::__construct($id);
    }

    public function addPhone(string $value): void
    {
        if ($this->phone1 === null) {
            $this->phone1 = $value;
            return;
        }
        if ($this->phone2 === null) {
            $this->phone2 = $value;
            return;
        }
        if ($this->phone3 === null) {
            $this->phone3 = $value;
            return;
        }

        throw new \DomainException('Customer can have at most 3 phones.');
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: lista interna com invariante explícita</summary>

```php
declare(strict_types=1);

enum PhoneType: string
{
    case Mobile = 'mobile';
    case Home = 'home';
    case Work = 'work';
}

readonly class Phone
{
    public function __construct(
        public string $number,
        public PhoneType $type,
    ) {}
}

class Customer extends Entity
{
    /** @var Phone[] */
    private array $phones = [];

    public function __construct(
        CustomerId $id,
        private readonly string $name,
    ) {
        parent::__construct($id);
    }

    /** @return Phone[] */
    public function phones(): array
    {
        $snapshot = $this->phones;
        return $snapshot;
    }

    public function addPhone(Phone $phone): void
    {
        if (count($this->phones) >= 3) {
            throw new \DomainException('Customer can have at most 3 phones.');
        }

        $this->phones[] = $phone;
    }

    public function removePhone(string $number): void
    {
        $remaining = array_values(
            array_filter($this->phones, fn(Phone $p) => $p->number !== $number)
        );

        $this->phones = $remaining;
    }
}
```

A regra "no máximo 3" mora em `addPhone`, onde dá pra mudar sem mexer no schema. O getter retorna uma cópia por valor (comportamento natural dos arrays PHP), então chamadores iteram sem conseguir alterar a lista interna diretamente.

</details>

Listas seguem a mesma regra de [null-safety](null-safety.md): nunca null, sempre `[]`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, a root é a única classe exposta do agregado. O construtor de `OrderItem` pode ser `private`, forçando que apenas o root produza instâncias, ou a criação pode acontecer via static factory protegida.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza o limite de agregado, então vai por ID (`CustomerId`), nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, círculo bidirecional sem dono</summary>

```php
declare(strict_types=1);

class Order extends Entity
{
    /** @var OrderItem[] */
    public array $items = [];

    public function __construct(OrderId $id)
    {
        parent::__construct($id);
    }
}

class OrderItem extends Entity
{
    public function __construct(
        OrderItemId $id,
        public readonly Order $order, // referência completa ao Order
        public readonly ProductId $productId,
        public readonly int $quantity,
    ) {
        parent::__construct($id);
    }
}

$order = new Order($orderId);
$item = new OrderItem($itemId, $order, $productId, 2);
$order->items[] = $item;

// quem valida que items nunca passa do limite?
// quem garante que removeItem limpa item->order?
// a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```php
declare(strict_types=1);

final class OrderItem extends Entity
{
    private function __construct(
        OrderItemId $id,
        private readonly ProductId $productId,
        private readonly int $quantity,
        private readonly Money $unitPrice,
    ) {
        parent::__construct($id);
    }

    public static function create(
        OrderItemId $id,
        ProductId $productId,
        int $quantity,
        Money $unitPrice,
    ): self {
        if ($quantity <= 0) {
            throw new \DomainException('Quantity must be positive.');
        }

        $item = new self($id, $productId, $quantity, $unitPrice);
        return $item;
    }

    public function subtotal(): Money
    {
        $total = $this->unitPrice->multiply($this->quantity);
        return $total;
    }
}

final class Order extends Entity
{
    /** @var OrderItem[] */
    private array $items = [];

    private function __construct(
        OrderId $id,
        private readonly CustomerId $customerId,
    ) {
        parent::__construct($id);
    }

    public static function place(OrderId $id, CustomerId $customerId): self
    {
        $order = new self($id, $customerId);
        return $order;
    }

    /** @return OrderItem[] */
    public function lineItems(): array
    {
        $snapshot = $this->items;
        return $snapshot;
    }

    public function addItem(
        ProductId $productId,
        int $quantity,
        Money $unitPrice,
    ): void {
        if (count($this->items) >= 50) {
            throw new \DomainException('Order can have at most 50 items.');
        }

        $item = OrderItem::create(
            id: OrderItemId::generate(),
            productId: $productId,
            quantity: $quantity,
            unitPrice: $unitPrice,
        );

        $this->items[] = $item;
    }

    public function removeItem(OrderItemId $itemId): void
    {
        $remaining = array_values(
            array_filter($this->items, fn(OrderItem $i) => !$i->getId()->equals($itemId))
        );

        $this->items = $remaining;
    }

    public function total(): Money
    {
        $total = array_reduce(
            $this->items,
            fn(Money $sum, OrderItem $item) => $sum->add($item->subtotal()),
            Money::zero(),
        );

        return $total;
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order::place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em arrays paralelos</summary>

```php
declare(strict_types=1);

class Student extends Entity
{
    /** @var CourseId[] */
    private array $courseIds = [];

    /** @var \DateTimeImmutable[] */
    private array $enrollmentDates = []; // paralelo a courseIds, por índice

    public function __construct(StudentId $id, private readonly string $name)
    {
        parent::__construct($id);
    }

    public function enrollmentDateOf(CourseId $courseId): ?\DateTimeImmutable
    {
        foreach ($this->courseIds as $position => $existingId) {
            if ($existingId->equals($courseId)) {
                $enrolledAt = $this->enrollmentDates[$position] ?? null;
                return $enrolledAt;
            }
        }

        return null;
    }
}
```

Dois arrays paralelos: se um sair de ordem ou perder um elemento, os dados ficam inconsistentes. Adicionar nota final, status, modalidade vira mais um array paralelo.

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```php
declare(strict_types=1);

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Completed = 'completed';
    case Withdrawn = 'withdrawn';
}

final class Enrollment extends Entity
{
    private function __construct(
        EnrollmentId $id,
        private readonly StudentId $studentId,
        private readonly CourseId $courseId,
        private readonly \DateTimeImmutable $enrolledAt,
        private EnrollmentStatus $status,
        private ?float $finalGrade,
    ) {
        parent::__construct($id);
    }

    public static function open(
        EnrollmentId $id,
        StudentId $studentId,
        CourseId $courseId,
    ): self {
        $enrollment = new self(
            id: $id,
            studentId: $studentId,
            courseId: $courseId,
            enrolledAt: new \DateTimeImmutable(),
            status: EnrollmentStatus::Active,
            finalGrade: null,
        );

        return $enrollment;
    }

    public function complete(float $grade): void
    {
        if ($this->status !== EnrollmentStatus::Active) {
            throw new \DomainException('Only active enrollments can be completed.');
        }
        if ($grade < 0 || $grade > 10) {
            throw new \DomainException('Grade must be between 0 and 10.');
        }

        $this->status = EnrollmentStatus::Completed;
        $this->finalGrade = $grade;
    }
}

class Student extends Entity
{
    public function __construct(
        StudentId $id,
        private readonly string $name,
    ) {
        parent::__construct($id);
    }
}

class Course extends Entity
{
    public function __construct(
        CourseId $id,
        private readonly string $title,
    ) {
        parent::__construct($id);
    }
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de array.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `array` de IDs em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.items` é uma lista de `OrderItem`, não uma lista de `OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando o limite de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```php
declare(strict_types=1);

class Order extends Entity
{
    public function __construct(
        OrderId $id,
        private readonly Customer $customer, // Customer completo
        /** @var OrderItem[] */
        private array $items = [],
    ) {
        parent::__construct($id);
    }
}

// para criar Order, preciso buscar Customer inteiro do banco
$customer = $this->customerRepository->findById($customerId);
if ($customer === null) {
    throw new \DomainException('Customer not found.');
}

$order = new Order($orderId, $customer);

// para serializar Order para o frontend, vou junto enviar Customer completo
// mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```php
declare(strict_types=1);

class Order extends Entity
{
    public function __construct(
        OrderId $id,
        private readonly CustomerId $customerId, // ID, não Customer
        /** @var OrderItem[] */
        private array $items = [],
    ) {
        parent::__construct($id);
    }

    public function customerId(): CustomerId
    {
        return $this->customerId;
    }
}

$order = new Order($orderId, $customerId);

// quem precisa do Customer resolve o ID no momento certo
$customer = $this->customerRepository->findById($order->customerId());
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Em PHP, o **backed enum** do PHP 8.1 serve bem para status simples. Quando o status carrega dados além do nome, a abordagem comum é criar classes de estado separadas, já que PHP não tem discriminated unions nativas:

<details>
<summary>✅ Bom: backed enum para status simples</summary>

```php
declare(strict_types=1);

enum OrderStatus: string
{
    case Pending = 'pending';
    case Settled = 'settled';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';

    public function isTerminal(): bool
    {
        $isTerminal = match($this) {
            self::Shipped, self::Cancelled => true,
            default => false,
        };

        return $isTerminal;
    }
}

class Order extends Entity
{
    private OrderStatus $status = OrderStatus::Pending;

    public function pay(): void
    {
        if ($this->status !== OrderStatus::Pending) {
            throw new \DomainException('Only pending orders can be settled.');
        }

        $this->status = OrderStatus::Settled;
    }
}
```

O `match` com `self::` é exaustivo e o IDE/PHPStan apontam caso não tratado. O backed enum serializa para `'settled'` automaticamente, sem lógica adicional.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenantId`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.$tenantId`, `Customer.$tenantId`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenantId`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```php
declare(strict_types=1);

class Order extends Entity
{
    public function __construct(
        OrderId $id,
        private readonly TenantId $tenantId,
        private readonly CustomerId $customerId,
        /** @var OrderItem[] */
        private array $items = [],
    ) {
        parent::__construct($id);
    }
}

class OrderItem extends Entity
{
    public function __construct(
        OrderItemId $id,
        private readonly TenantId $tenantId, // duplica o tenantId do Order
        private readonly ProductId $productId,
        private readonly int $quantity,
    ) {
        parent::__construct($id);
    }
}

function calculateOrderTotal(Order $order, TenantId $currentTenant): Money
{
    if (!$order->tenantId()->equals($currentTenant)) {
        throw new \DomainException('Tenant mismatch on order.');
    }
    foreach ($order->lineItems() as $item) {
        if (!$item->tenantId()->equals($currentTenant)) {
            throw new \DomainException('Tenant mismatch on item.');
        }
    }

    $total = $order->total();
    return $total;
}
```

</details>

<details>
<summary>✅ Bom: tenantId só no aggregate root, enforcement no repositório</summary>

```php
declare(strict_types=1);

class Order extends Entity
{
    public function __construct(
        OrderId $id,
        private readonly TenantId $tenantId, // único campo de tenant no agregado
        private readonly CustomerId $customerId,
        /** @var OrderItem[] */
        private array $items = [],
    ) {
        parent::__construct($id);
    }

    public function tenantId(): TenantId
    {
        return $this->tenantId;
    }
}

class OrderItem extends Entity
{
    public function __construct(
        OrderItemId $id,
        private readonly ProductId $productId,
        private readonly int $quantity,
    ) {
        parent::__construct($id);
        // sem tenantId: pertence ao agregado Order
    }
}

interface TenantContext
{
    public function current(): TenantId;
}

final class OrderRepository
{
    public function __construct(
        private readonly \PDO $connection,
        private readonly TenantContext $tenantContext,
    ) {}

    public function findById(OrderId $orderId): ?Order
    {
        $activeTenant = $this->tenantContext->current();
        $row = $this->connection->prepare(
            'SELECT * FROM orders WHERE id = :id AND tenant_id = :tenantId'
        );

        $row->execute([
            'id' => $orderId->value,
            'tenantId' => $activeTenant->value,
        ]);

        $record = $row->fetch(\PDO::FETCH_ASSOC);
        if ($record === false) {
            return null;
        }

        $order = OrderMapper::toDomain($record);
        return $order;
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL, SQL Server) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro. Detalhes em [`platform/database.md`](../../../shared/platform/database.md).

## Anti-patterns

Os padrões abaixo aparecem com frequência em código PHP real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `tenantId` que nunca usa, e o `parent::__construct` recebe strings vazias para preencher campos inúteis. Tratamento: deixar só `id` na base; demais campos viram composição (`AuditFields`) ou interfaces (`Auditable`).

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `null`. Sintoma: caller obrigado a verificar `null` a cada acesso. Tratamento: extrair os opcionais em value object nullable inteiro, ou separar em entidades distintas se a presença ou ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `$phone1`, `$phone2`, `$phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: array `private` com método `addPhone` que guarda a invariante.

**Mapa mascarado como lista**. Array de pares `['key' => ..., 'value' => ...]` quando o domínio diz "acesso por chave". Sintoma: `foreach` em busca linear toda vez que se quer um valor específico. Tratamento: array associativo ou classe indexada.

**Referência direta cruzando agregado**. `Order.$customer` (objeto completo) em vez de `Order.$customerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Entidade sem identidade**. Classe sem ID consultada como se fosse entidade. Sintoma: comparações por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar nome". Tratamento: dar identidade explícita, ou aceitar que é value object e usar `readonly class`.

**Bidirecionalidade automática**. `Order.$items` e `OrderItem.$order` mantidos sincronizados manualmente. Sintoma: bug onde um lado foi atualizado mas o outro ficou desatualizado. Tratamento: relação unidirecional do aggregate root para os filhos.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): limite transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático PHP

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-and-domain-modeling).
