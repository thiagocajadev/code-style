# Modelagem de entidades

> Escopo: Rust (edição 2024). Visão transversal: [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: **newtype** structs tipadas, **ownership** como garantia de invariante, `Option<T>` para ausência semântica, `Result<T, E>` para falhas, traits como contrato sem herança.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em Rust e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido usar uma trait `Entity` como base. Os exemplos assumem Rust edição 2024, `thiserror` para erros tipados e `uuid::Uuid` para identificadores.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Struct de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelos campos |
| **value object** (objeto de valor) | Struct sem identidade, definida pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, campo a campo |
| **aggregate** (agregado) | Cluster de structs e value objects tratado como uma unidade transacional (`Order` + `Vec<OrderItem>` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única struct pública do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo factory e pelos métodos `&mut self` que alteram estado |
| **boundary** (limite) | Ponto onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **newtype** (tipo embrulho de um único campo) | Padrão Rust para identificadores tipados: `pub struct CustomerId(Uuid)`; o compilador rejeita trocas entre tipos distintos |
| **derive** (derivação automática de traits) | Macro `#[derive(...)]` que gera implementações padrão de traits como `Debug`, `Clone`, `PartialEq`, `Hash` |
| **ownership** (posse, controle exclusivo de um valor) | Mecanismo central do Rust: cada valor tem um dono; transferir ou emprestar segue regras do borrow checker |
| **borrow** (empréstimo, referência temporária) | Referência `&T` (somente leitura) ou `&mut T` (escrita); o borrow checker impede dois mutadores simultâneos |
| **lifetime** (tempo de vida, duração da referência) | Anotação `'a` que garante que uma referência não sobrevive ao valor que referencia |
| **trait** (conjunto de comportamentos) | Contrato que um tipo pode implementar; equivalente a interface, sem herança de estado |
| **Option\<T\>** (tipo opcional, valor pode existir ou não) | `Some(T)` ou `None`; representa ausência semântica do domínio sem ponteiro nulo |
| **Result\<T, E\>** (resultado com sucesso ou erro) | `Ok(T)` ou `Err(E)`; operação que pode falhar com erro tipado |
| **Vec\<T\>** (vetor, lista dinâmica) | Coleção interna mutável; a API pública retorna `&[T]` ou `impl Iterator<Item = &T>` para leitura |
| **strongly-typed id** (identificador tipado) | ID embrulhado em newtype própria (`CustomerId`), em vez de `Uuid` cru, para impedir trocas acidentais entre IDs |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **nullable** (anulável, aceita ausência de valor) | `Option<T>` quando o conceito não está presente; representa "zero ou um" em cardinalidade |
| **cohesion** (coesão) | Medida de quanto os campos e operações de uma struct pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, struct que sabe demais) | Antipadrão de struct que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`deleted_at` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **row-level security** (segurança por linha, RLS) | Recurso do banco que filtra linhas pelo contexto da requisição antes da query chegar ao app |

---

## Tamanho saudável da entidade

A pergunta "quantas propriedades é demais" não tem número certo, e ninguém deveria comprometer-se com um. O sinal que funciona é a coesão: os campos mudam juntos, são consultados juntos, fazem sentido juntos. Quando um subconjunto começa a mudar em outro ritmo, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 10 campos**: zona confortável. A maior parte das entidades de domínio cabe aqui.
- **10 a 15**: hora de olhar a coesão. Se todos os campos descrevem o mesmo conceito (`Order` com cabeçalho, totais e status), tudo bem. Se já dá para agrupar (endereço, preferências, dados fiscais), extrair.
- **15 ou mais**: quase sempre é sinal de dois conceitos colados na mesma struct. Quebrar.

Quando o nome da struct não descreve mais o que ela faz e vira lista (`CustomerWithAddressAndPreferencesAndAccount`), o limite já passou.

<details>
<summary>❌ Ruim: Customer inchada misturando perfil, endereço, preferências e fiscal</summary>

```rust
#[derive(Debug, Clone)]
pub struct Customer {
    pub id: Uuid,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub phone: String,
    pub birth_date: NaiveDate,
    pub street: String,
    pub number: String,
    pub complement: Option<String>,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    pub country: String,
    pub newsletter_opt_in: bool,
    pub sms_opt_in: bool,
    pub preferred_language: String,
    pub tax_id: Option<String>,
    pub tax_regime: Option<String>,
    pub invoice_email: Option<String>,
}
```

19 campos em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a struct. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente. Metade dos campos é `Option<String>` para clientes pessoa física.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Customer {
    pub id: CustomerId,
    pub name: String,
    pub email: String,
    pub address: Address,
    pub preferences: CustomerPreferences,
    pub tax_info: Option<TaxInfo>, // None para pessoa física
}

#[derive(Debug, Clone, PartialEq)]
pub struct Address {
    pub street: String,
    pub number: String,
    pub complement: Option<String>,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    pub country: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CustomerPreferences {
    pub newsletter_opt_in: bool,
    pub sms_opt_in: bool,
    pub preferred_language: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TaxInfo {
    pub tax_id: String,
    pub tax_regime: String,
    pub invoice_email: String,
}
```

Cada struct responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar. `TaxInfo` é `Option<TaxInfo>` inteiro, e quando presente vem completo.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da struct usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Campos `Option<T>` demais (8 de 20 sempre `None`).
- Persistência precisa de duas tabelas no banco para uma única struct no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em Rust, vira struct com factory `pub fn new(...) -> Result<Self, AddressError>`, e a imutabilidade é natural: campos sem `mut` no consumer não podem ser alterados.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `Option<TaxInfo>`; quando presente, traz o conceito completo (todos os campos juntos, validados juntos pelo factory).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. O satélite é uma struct própria, com ID, e referencia o `Customer` por `customer_id: CustomerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```rust
#[derive(Debug, Clone)]
pub struct Customer {
    pub id: CustomerId,
    pub name: String,
    pub email: String,
    // se pessoa jurídica, os três existem; se pessoa física, são None
    pub tax_id: Option<String>,
    pub tax_regime: Option<String>,
    pub invoice_email: Option<String>,
}

impl Customer {
    pub fn has_tax_info(&self) -> bool {
        let is_registered = self.tax_id.is_some() && self.tax_regime.is_some();
        is_registered
    }
}
```

A regra "se um campo de imposto existe, todos existem" mora no método `has_tax_info`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `tax_id` preenchido e `tax_regime` como `None`, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional, criado via factory</summary>

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct TaxInfo {
    tax_id: String,
    tax_regime: String,
    invoice_email: String,
}

#[derive(Debug, thiserror::Error)]
pub enum TaxInfoError {
    #[error("tax_id is required")]
    MissingTaxId,
    #[error("tax_regime is required")]
    MissingTaxRegime,
}

impl TaxInfo {
    pub fn new(
        tax_id: String,
        tax_regime: String,
        invoice_email: String,
    ) -> Result<Self, TaxInfoError> {
        if tax_id.is_empty() {
            return Err(TaxInfoError::MissingTaxId);
        }
        if tax_regime.is_empty() {
            return Err(TaxInfoError::MissingTaxRegime);
        }

        let tax_info = Self { tax_id, tax_regime, invoice_email };
        Ok(tax_info)
    }
}

#[derive(Debug, Clone)]
pub struct Customer {
    pub id: CustomerId,
    pub name: String,
    pub email: String,
    pub tax_info: Option<TaxInfo>,
}

impl Customer {
    pub fn has_tax_info(&self) -> bool {
        let is_registered = self.tax_info.is_some();
        is_registered
    }
}
```

A invariante "se imposto existe, é completo" mora no factory `TaxInfo::new`. Quem cria um cliente sem imposto passa `None`. Não tem como construir um `TaxInfo` parcial: o factory falha cedo, e os campos internos são privados.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `order_id` onde a função esperava `customer_id`, ou inverte a ordem dos argumentos sem perceber. Como todos são `Uuid`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em Rust é o **newtype**: `pub struct CustomerId(Uuid)` é, em runtime, um `Uuid` sem custo adicional; em compile time, é um tipo distinto que o compilador rejeita em posições erradas. O derive `#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]` entrega comparação, cópia e uso em chaves de mapa sem esforço.

<details>
<summary>❌ Ruim: IDs como Uuid cru, fáceis de trocar de lugar</summary>

```rust
fn transfer_ownership(customer_id: Uuid, order_id: Uuid) {
    order_repository::update(order_id, customer_id);
}

let target_order = order.id;
let new_owner = customer.id;

// inverte argumentos: nada acusa, tipo de ambos é Uuid
transfer_ownership(target_order, new_owner);
```

</details>

<details>
<summary>✅ Bom: newtype impede inversão silenciosa em compile time</summary>

```rust
#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]
pub struct CustomerId(Uuid);

#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]
pub struct OrderId(Uuid);

impl CustomerId {
    pub fn new(value: Uuid) -> Self {
        Self(value)
    }

    pub fn try_from(raw: &str) -> Result<Self, uuid::Error> {
        let parsed = Uuid::parse_str(raw)?;
        Ok(Self(parsed))
    }

    pub fn value(&self) -> Uuid {
        self.0
    }
}

impl OrderId {
    pub fn new(value: Uuid) -> Self {
        Self(value)
    }

    pub fn value(&self) -> Uuid {
        self.0
    }
}

fn transfer_ownership(customer_id: CustomerId, order_id: OrderId) {
    order_repository::update(order_id, customer_id);
}

let target_order = OrderId::new(order.id.value());
let new_owner = CustomerId::new(customer.id.value());

// trocar a ordem: erro de compilação
// transfer_ownership(target_order, new_owner);
// ^^^^^^^^^^^^^ expected `CustomerId`, found `OrderId`
```

O compilador rejeita a troca na assinatura da função. Em runtime não há overhead: o newtype é zero-cost abstraction no Rust, e `Copy` elimina moves desnecessários para tipos pequenos como `Uuid`.

</details>

Quando há vários IDs no projeto, o padrão se repete de forma mecânica. Cada ID novo custa um bloco `struct` + `impl` e ganha rejeição de troca no compilador. A macro `uuid::uuid!` cria `Uuid` constantes em compile time para uso em testes e seed data.

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em um contrato reutilizado faz sentido. Rust não tem herança de structs: a solução é uma **trait** `Entity` com associated type ou composição via campo. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não `version` e `tenant_id`?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa.

A regra que funciona é mínima:

- **Entra na base**: `id`. Campo que toda entidade precisa, motivo claro, sem ambiguidade. Em Rust: trait `Entity` com `fn id(&self) -> &Self::Id`.
- **Sai da base**: campos de auditoria (`created_at`, `updated_at`, `created_by`, `updated_by`). Vão por composição (campo `audit: AuditFields`) ou trait separada `Auditable`.
- **Caso à parte**: `tenant_id`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: struct base inchada com tudo, filhos herdam por composição forçada</summary>

```rust
#[derive(Debug, Clone)]
pub struct BaseEntity {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub version: u32,
    pub tenant_id: Uuid,
    pub created_by: String,
    pub updated_by: String,
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    pub base: BaseEntity, // carrega tenant_id, version, created_by que não usa
    pub product_id: Uuid,
    pub quantity: u32,
}
```

`OrderItem` carrega `tenant_id`, `created_by`, `version` que não usa nem precisa. Cada nova feature que entra em `BaseEntity` afeta toda entidade do sistema. Acessar o `id` vira `item.base.id`.

</details>

<details>
<summary>✅ Bom: trait Entity mínima + composição para comportamentos extras</summary>

```rust
pub trait Entity {
    type Id: Eq + std::fmt::Debug;

    fn id(&self) -> &Self::Id;

    fn equals(&self, other: &Self) -> bool
    where
        Self: Sized,
    {
        self.id() == other.id()
    }
}

#[derive(Debug, Clone)]
pub struct AuditFields {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Customer {
    id: CustomerId,
    pub name: String,
    pub email: String,
    pub audit: AuditFields, // composição: só onde faz sentido
}

impl Entity for Customer {
    type Id = CustomerId;

    fn id(&self) -> &Self::Id {
        &self.id
    }
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    id: OrderItemId,
    pub product_id: ProductId,
    pub quantity: u32,
    // sem audit: faz parte do agregado Order, não vive sozinho
}

impl Entity for OrderItem {
    type Id = OrderItemId;

    fn id(&self) -> &Self::Id {
        &self.id
    }
}
```

`Entity` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não existe de forma independente. O associated type `Id` preserva o tipo exato sem boxing.

</details>

Rust não tem herança de implementação. Quando parece que "precisamos de herança", o padrão correto é separar comportamento (trait) de estado (composição de campo). A trait `Entity` acima define o contrato; cada struct decide por conta própria o que compõe no corpo.

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para Rust:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Campo obrigatório | `name: String`, `total: Money` |
| Zero ou um | `Option<T>` | `tax_info: Option<TaxInfo>` |
| Zero ou mais | `Vec<T>` interno, `&[T]` exposto | `items: Vec<OrderItem>` |
| Exatamente N (N fixo) | N campos nomeados | `Address { street, city, country }` |

Em Rust, listas internas usam `Vec<T>` privado. Os métodos públicos expõem `&[T]` (slice borrow) ou `impl Iterator<Item = &T>` para leitura, impedindo que callers façam `push` direto. A mutação passa obrigatoriamente pelo método de domínio.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```rust
#[derive(Debug, Clone)]
pub struct Customer {
    pub id: CustomerId,
    pub name: String,
    pub phone1: Option<String>,
    pub phone2: Option<String>,
    pub phone3: Option<String>,
}

impl Customer {
    pub fn add_phone(&mut self, value: String) -> Result<(), CustomerError> {
        if self.phone1.is_none() {
            self.phone1 = Some(value);
            return Ok(());
        }
        if self.phone2.is_none() {
            self.phone2 = Some(value);
            return Ok(());
        }
        if self.phone3.is_none() {
            self.phone3 = Some(value);
            return Ok(());
        }

        Err(CustomerError::MaxPhonesReached)
    }
}
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: Vec interno, slice exposto, invariante no método</summary>

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum PhoneType {
    Mobile,
    Home,
    Work,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Phone {
    pub number: String,
    pub phone_type: PhoneType,
}

#[derive(Debug, Clone)]
pub struct Customer {
    id: CustomerId,
    pub name: String,
    phones: Vec<Phone>, // privado: mutação só por método
}

impl Customer {
    pub fn phones(&self) -> &[Phone] {
        &self.phones
    }

    pub fn add_phone(&mut self, phone: Phone) -> Result<(), CustomerError> {
        if self.phones.len() >= 3 {
            return Err(CustomerError::MaxPhonesReached);
        }

        self.phones.push(phone);
        Ok(())
    }

    pub fn remove_phone(&mut self, number: &str) {
        self.phones.retain(|p| p.number != number);
    }
}
```

A regra "no máximo 3" mora em `add_phone`, onde dá pra mudar sem mexer no schema. O slice `&[Phone]` exposto permite iteração sem que o caller consiga `push` direto. Lista vazia é o estado neutro: itera sem `Option` extra.

</details>

Listas seguem a regra de [`null-safety`](null-safety.md): nunca `None`, sempre `Vec::new()`. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em Rust, o campo `items: Vec<OrderItem>` é privado; callers recebem `&[OrderItem]` para leitura, e toda mutação passa por `&mut self` na root.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza limite de agregado, então vai por ID (`customer_id: CustomerId`), nunca pelo objeto completo. O **ownership** do Rust reforça isso naturalmente: carregar `Customer` completo dentro de `Order` exigiria `Arc<Customer>` ou cópia, sinais de que o modelo está errado.

<details>
<summary>❌ Ruim: filho carrega referência ao pai, ciclo bidirecional sem dono</summary>

```rust
#[derive(Debug, Clone)]
pub struct Order {
    pub id: OrderId,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    pub id: OrderItemId,
    pub order_id: OrderId, // referência ao pai duplicada no filho
    pub product_id: ProductId,
    pub quantity: u32,
}

// quem valida que items.len() não passa do limite?
// quem garante que remove_item limpa order_id?
// a regra fica diluída entre as duas structs.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```rust
#[derive(Debug, Clone, thiserror::Error)]
pub enum OrderError {
    #[error("quantity must be positive")]
    NonPositiveQuantity,
    #[error("order can have at most 50 items")]
    ItemLimitReached,
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    id: OrderItemId,
    pub product_id: ProductId,
    pub quantity: u32,
    pub unit_price: Money,
}

impl OrderItem {
    pub fn new(
        id: OrderItemId,
        product_id: ProductId,
        quantity: u32,
        unit_price: Money,
    ) -> Result<Self, OrderError> {
        if quantity == 0 {
            return Err(OrderError::NonPositiveQuantity);
        }

        let item = Self { id, product_id, quantity, unit_price };
        Ok(item)
    }

    pub fn subtotal(&self) -> Money {
        let total = self.unit_price.multiply(self.quantity);
        total
    }
}

#[derive(Debug, Clone)]
pub struct Order {
    id: OrderId,
    pub customer_id: CustomerId, // ID, não Customer (outro agregado)
    items: Vec<OrderItem>,
}

impl Order {
    pub fn place(id: OrderId, customer_id: CustomerId) -> Self {
        Self { id, customer_id, items: Vec::new() }
    }

    pub fn items(&self) -> &[OrderItem] {
        &self.items
    }

    pub fn add_item(
        &mut self,
        product_id: ProductId,
        quantity: u32,
        unit_price: Money,
    ) -> Result<(), OrderError> {
        if self.items.len() >= 50 {
            return Err(OrderError::ItemLimitReached);
        }

        let item = OrderItem::new(
            OrderItemId::new(Uuid::new_v4()),
            product_id,
            quantity,
            unit_price,
        )?;
        self.items.push(item);
        Ok(())
    }

    pub fn remove_item(&mut self, item_id: &OrderItemId) {
        self.items.retain(|item| &item.id != item_id);
    }

    pub fn total(&self) -> Money {
        let total = self.items.iter().fold(Money::zero(), |acc, item| {
            acc.add(item.subtotal())
        });
        total
    }
}
```

`Order` é o aggregate root: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. O borrow checker garante que não há dois `&mut Order` simultâneos, reforçando a consistência do agregado.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `Vec<OrderItem>`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado.

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados (ou nos dois, se o acesso é simétrico).
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em Vecs paralelos</summary>

```rust
#[derive(Debug, Clone)]
pub struct Student {
    pub id: StudentId,
    pub name: String,
    pub course_ids: Vec<CourseId>,
    pub enrollment_dates: Vec<DateTime<Utc>>, // paralelo a course_ids, por índice
}

// como saber a data de matrícula do curso 'COURSE-42'?
// achar o índice de COURSE-42 em course_ids, usar esse índice em enrollment_dates
// se um Vec sair de ordem ou perder um elemento, dados ficam inconsistentes.
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum EnrollmentStatus {
    Active,
    Completed { final_grade: f32 },
    Withdrawn,
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum EnrollmentError {
    #[error("only active enrollments can be completed")]
    NotActive,
    #[error("grade must be between 0 and 10")]
    InvalidGrade,
}

#[derive(Debug, Clone)]
pub struct Enrollment {
    id: EnrollmentId,
    pub student_id: StudentId,
    pub course_id: CourseId,
    pub enrolled_at: DateTime<Utc>,
    status: EnrollmentStatus,
}

impl Enrollment {
    pub fn open(
        id: EnrollmentId,
        student_id: StudentId,
        course_id: CourseId,
        enrolled_at: DateTime<Utc>,
    ) -> Self {
        Self {
            id,
            student_id,
            course_id,
            enrolled_at,
            status: EnrollmentStatus::Active,
        }
    }

    pub fn complete(&mut self, grade: f32) -> Result<(), EnrollmentError> {
        if self.status != EnrollmentStatus::Active {
            return Err(EnrollmentError::NotActive);
        }
        if !(0.0..=10.0).contains(&grade) {
            return Err(EnrollmentError::InvalidGrade);
        }

        self.status = EnrollmentStatus::Completed { final_grade: grade };
        Ok(())
    }

    pub fn status(&self) -> &EnrollmentStatus {
        &self.status
    }
}

#[derive(Debug, Clone)]
pub struct Student {
    pub id: StudentId,
    pub name: String,
    // sem lista de cursos: consultar via Enrollment
}

#[derive(Debug, Clone)]
pub struct Course {
    pub id: CourseId,
    pub title: String,
    // sem lista de alunos: consultar via Enrollment
}
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. O enum `EnrollmentStatus::Completed { final_grade }` carrega os dados do estado concluído de forma tipada: o compilador exige o campo `final_grade` ao criar a variante. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de Vec.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo pode expor `Vec<CourseId>` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.items` é `Vec<OrderItem>`, não `Vec<OrderItemId>`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando a fronteira de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `customer_id: CustomerId`, nunca pelo objeto `Customer` completo. O ownership do Rust torna esse padrão explícito: carregar `Customer` completo dentro de `Order` exigiria `Arc<Customer>` (referência contada) ou cópia total via `Clone`. Ambos os caminhos são sinais de modelo errado.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por valor completo</summary>

```rust
#[derive(Debug, Clone)]
pub struct Order {
    pub id: OrderId,
    pub customer: Customer, // Customer completo por valor: Clone caro + modelo errado
    pub items: Vec<OrderItem>,
}

// para criar Order, preciso buscar Customer inteiro do banco
let customer = customer_repository.find_by_id(customer_id).await?
    .ok_or(OrderError::CustomerNotFound)?;
let order = Order { id: new_id, customer, items: vec![] };

// serializar Order para o frontend vai junto serializar Customer completo
// mudanças em Customer (email, telefone) não chegam ao Order em cache
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```rust
#[derive(Debug, Clone)]
pub struct Order {
    id: OrderId,
    pub customer_id: CustomerId, // ID, não Customer
    items: Vec<OrderItem>,
}

impl Order {
    pub fn place(id: OrderId, customer_id: CustomerId) -> Self {
        Self { id, customer_id, items: Vec::new() }
    }

    pub fn customer_id(&self) -> &CustomerId {
        &self.customer_id
    }
}

let order = Order::place(new_id, customer_id);

// quem precisa do Customer resolve o ID no momento certo
let customer = customer_repository.find_by_id(order.customer_id()).await?;
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

Quando o status carrega dados além do nome, vale usar **enum com dados por variante** em vez de campo extra solto. O compilador torna o match exaustivo, obrigando quem acessa o estado a tratar todas as variantes:

<details>
<summary>✅ Bom: enum com dados por variante quando o estado carrega informação</summary>

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum OrderState {
    Pending,
    Settled { settled_at: DateTime<Utc> },
    Shipped { settled_at: DateTime<Utc>, tracking_code: String },
    Cancelled { cancelled_at: DateTime<Utc>, reason: String },
}

fn summarize(state: &OrderState) -> String {
    match state {
        OrderState::Pending => {
            let summary = String::from("Aguardando pagamento");
            summary
        }
        OrderState::Settled { settled_at } => {
            let summary = format!("Pago em {}", settled_at.format("%d/%m/%Y"));
            summary
        }
        OrderState::Shipped { tracking_code, .. } => {
            let summary = format!("Enviado, rastreio {tracking_code}");
            summary
        }
        OrderState::Cancelled { reason, .. } => {
            let summary = format!("Cancelado: {reason}");
            summary
        }
    }
}
```

O match exaustivo garante que toda nova variante adicionada ao enum quebre os pontos de acesso não atualizados, em compile time. Para estados sem dados associados, `pub enum OrderStatus { Pending, Settled, Shipped, Cancelled }` em um campo separado basta.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `tenant_id`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.tenant_id`, `Customer.tenant_id`. É o que permite ao repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `tenant_id`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security**. A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: tenant_id duplicado em toda entidade filha</summary>

```rust
#[derive(Debug, Clone)]
pub struct Order {
    pub id: OrderId,
    pub tenant_id: TenantId,
    pub customer_id: CustomerId,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    pub id: OrderItemId,
    pub tenant_id: TenantId, // duplica o tenant_id do Order
    pub product_id: ProductId,
    pub quantity: u32,
}

fn calculate_total(order: &Order, current_tenant: &TenantId) -> Result<Money, OrderError> {
    if &order.tenant_id != current_tenant {
        return Err(OrderError::TenantMismatch);
    }
    for item in &order.items {
        if &item.tenant_id != current_tenant {
            return Err(OrderError::TenantMismatch);
        }
    }

    let total = order.total();
    Ok(total)
}
```

</details>

<details>
<summary>✅ Bom: tenant_id só na aggregate root, enforcement no repositório</summary>

```rust
#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]
pub struct TenantId(Uuid);

#[derive(Debug, Clone)]
pub struct Order {
    id: OrderId,
    pub tenant_id: TenantId, // único campo de tenant no agregado
    pub customer_id: CustomerId,
    items: Vec<OrderItem>,
}

#[derive(Debug, Clone)]
pub struct OrderItem {
    id: OrderItemId,
    pub product_id: ProductId,
    pub quantity: u32,
    // sem tenant_id: faz parte do agregado Order
}

pub trait TenantContext {
    fn current(&self) -> TenantId;
}

pub struct OrderRepository<C: TenantContext> {
    connection: DatabaseConnection,
    tenant_context: C,
}

impl<C: TenantContext> OrderRepository<C> {
    pub async fn find_by_id(&self, order_id: &OrderId) -> Result<Option<Order>, DbError> {
        let active_tenant = self.tenant_context.current();
        let row = self.connection.query_one(
            "SELECT * FROM orders WHERE id = $1 AND tenant_id = $2",
            &[order_id.value(), active_tenant.0],
        ).await?;

        let order = row.map(OrderMapper::to_domain);
        Ok(order)
    }
}
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro via `TenantContext`. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado. A trait `TenantContext` permite injeção em testes sem banco real.

</details>

Para reforço extra, ativar **row-level security** no banco (PostgreSQL) garante o isolamento mesmo quando a aplicação falha em aplicar o filtro.

## Anti-patterns

Os padrões abaixo aparecem com frequência em código Rust real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a struct antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Struct com 20+ campos misturando conceitos. Sintoma: o nome da struct vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**Campos `pub` em excesso**. Todos os campos marcados `pub` sem critério, permitindo alteração direta de fora do módulo. Sintoma: invariantes da entidade são checadas no caller, espalhadas pelo codebase. Tratamento: manter campos privados; expor somente via métodos `&self` (leitura) e `&mut self` (mutação validada).

**`unwrap` em código de produção**. `self.tax_id.unwrap()` em vez de propagar com `?` ou tratar com `match`. Sintoma: pânico em runtime quando o campo é `None`. Tratamento: `Option::map`, `ok_or`, `?` com `From` implementado no erro.

**Uuid cru como ID**. `customer_id: Uuid` em vez de `customer_id: CustomerId`. Sintoma: bug onde `order_id` foi passado no lugar de `customer_id` e o compilador aceitou. Tratamento: newtype por ID, com derive `Eq + Hash` para uso em mapas.

**Campos opcionais por design ruim**. Struct com 8 dos 20 campos sempre `None`. Sintoma: caller obrigado a `if let Some(...)` em cada acesso. Tratamento: extrair os opcionais em value object `Option<T>` inteiro, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `phone1: Option<String>`, `phone2: Option<String>`, `phone3: Option<String>` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio". Tratamento: `Vec<Phone>` interno, `&[Phone]` exposto.

**Referência direta cruzando agregado**. `pub customer: Customer` dentro de `Order`. Sintoma: para criar um `Order`, precisa clonar `Customer` inteiro; serializar `Order` serializa `Customer` junto. Tratamento: referência por `CustomerId`; quem precisa do `Customer` resolve no momento certo.

**Bidirecionalidade manual**. `Order.items` e `OrderItem.order_id` mantidos sincronizados pelo caller. Sintoma: bug onde o lado `Order.items` foi atualizado mas algum `order_id` ficou desatualizado; o borrow checker não protege contra inconsistência de lógica. Tratamento: relação unidirecional da aggregate root para os filhos; `OrderItem` não referencia `Order`.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): limite transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../null-safety.md`](null-safety.md): null-safety idiomático Rust

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
