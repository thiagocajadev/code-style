# Modelagem de entidades

> Escopo: VB.NET. Visão transversal: [shared/architecture/entity-modeling.md](../../../shared/architecture/entity-modeling.md). As decisões de domínio (quando extrair, como relacionar, onde mora a invariante) são as mesmas; aqui o foco é o idiom: `Structure` como **strongly-typed ID** imutável, `NotInheritable Class` como **value object**, `MustInherit Class` como base genérica, `IReadOnlyList(Of T)` em coleções públicas e `Nullable(Of T)` para ausência em tipos de valor.

Esta página serve a duas pessoas. A primeira está modelando a entidade inicial do projeto em VB.NET e ainda não sabe quantas propriedades é demais. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `Customer` agora que ela tem 18 campos?). As duas saem daqui com critério, não com receita fechada.

O texto cobre quatro perguntas que aparecem cedo em todo projeto que cresce: quantas propriedades uma entidade aguenta antes de fragmentar; quando uma propriedade vira lista; como expressar relacionamentos um para muitos e muitos para muitos; quando faz sentido herdar de uma `Entity` base. Os exemplos assumem `Option Strict On` e `Option Infer On` em todo o projeto.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **entity** (entidade) | Objeto de domínio com identidade própria (`Customer`, `Order`); a igualdade é definida pelo ID, não pelas propriedades |
| **value object** (objeto de valor) | Conceito sem identidade, definido pelos próprios valores (`Address`, `Money`); a igualdade é estrutural, valor a valor |
| **aggregate** (agregado) | Cluster de entidades e value objects tratado como uma unidade transacional (`Order` + `OrderItem` formam um agregado) |
| **aggregate root** (raiz do agregado) | Única entidade externa do agregado; protege as invariantes e é o único ponto de entrada para o cluster |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo construtor e pelos métodos que alteram estado (ex.: pedido sempre tem ao menos um item) |
| **boundary** (limite) | Fronteira entre dois contextos onde os dados são validados ao atravessar (entrada da função, limite do agregado, limite do sistema) |
| **strongly-typed id** (identificador tipado) | ID embrulhado em um tipo próprio (`CustomerId`), em vez de `Guid` cru, para impedir trocas acidentais entre IDs |
| **Structure** (tipo de valor VB.NET) | Tipo alocado em pilha, passa por cópia; idiom preferido para IDs tipados e value objects pequenos em VB.NET |
| **NotInheritable** (selada) | Modificador VB.NET que impede herança; usado em toda classe concreta de domínio como padrão |
| **MustInherit** (abstrata) | Modificador VB.NET equivalente ao `abstract` do C#; usado na classe base `Entity(Of TId)` |
| **IReadOnlyList(Of T)** (lista somente leitura) | Interface que expõe itens sem permitir `Add` ou `Remove`; usada em propriedades públicas de coleções |
| **Nullable(Of T)** (tipo de valor anulável) | Wrapper para tipos de valor (`Integer?`, `Guid?`, `Date?`); representa ausência sem sentinela mágica |
| **cardinality** (cardinalidade, quantidade da relação) | Quantos elementos a relação aceita entre dois conceitos: 0..1, 1, 0..N, 1..N, N..N |
| **cohesion** (coesão) | Medida de quanto as propriedades e operações de uma entidade pertencem ao mesmo conceito de negócio |
| **God Object** (objeto-deus, classe que sabe demais) | Antipadrão de classe que acumula responsabilidades demais e vira ponto de mudança para tudo |
| **repository** (repositório) | Componente que encapsula a persistência de uma entidade ou agregado, escondendo SQL e ORM do domínio |
| **ORM** (Object-Relational Mapping, mapeamento objeto-relacional) | Camada que traduz objetos do código para tabelas do banco e de volta (Entity Framework, Dapper, NHibernate) |
| **soft delete** (remoção lógica) | Marcar o registro como excluído (`DeletedAt` preenchido) sem apagar fisicamente, preservando histórico |
| **multitenancy** (multilocação) | Uma instância da aplicação serve múltiplos clientes (tenants) com isolamento de dados entre eles |
| **GUID** (Globally Unique Identifier, identificador único global) | Valor de 128 bits usado como ID, no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`; `Guid` em .NET |

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

```vb
Public NotInheritable Class Customer

    Public ReadOnly Property Id As Guid
    Public ReadOnly Property FirstName As String
    Public ReadOnly Property LastName As String
    Public ReadOnly Property Email As String
    Public ReadOnly Property Phone As String
    Public ReadOnly Property BirthDate As Date
    Public ReadOnly Property Street As String
    Public ReadOnly Property Number As String
    Public ReadOnly Property Complement As String
    Public ReadOnly Property City As String
    Public ReadOnly Property State As String
    Public ReadOnly Property ZipCode As String
    Public ReadOnly Property Country As String
    Public ReadOnly Property NewsletterOptIn As Boolean
    Public ReadOnly Property SmsOptIn As Boolean
    Public ReadOnly Property PreferredLanguage As String
    Public ReadOnly Property TaxId As String
    Public ReadOnly Property TaxRegime As String
    Public ReadOnly Property InvoiceEmail As String

    Public Sub New(
        id As Guid,
        firstName As String,
        lastName As String,
        email As String,
        phone As String,
        birthDate As Date,
        street As String,
        number As String,
        complement As String,
        city As String,
        state As String,
        zipCode As String,
        country As String,
        newsletterOptIn As Boolean,
        smsOptIn As Boolean,
        preferredLanguage As String,
        taxId As String,
        taxRegime As String,
        invoiceEmail As String)

        Me.Id = id
        Me.FirstName = firstName
        Me.LastName = lastName
        Me.Email = email
        Me.Phone = phone
        Me.BirthDate = birthDate
        Me.Street = street
        Me.Number = number
        Me.Complement = complement
        Me.City = city
        Me.State = state
        Me.ZipCode = zipCode
        Me.Country = country
        Me.NewsletterOptIn = newsletterOptIn
        Me.SmsOptIn = smsOptIn
        Me.PreferredLanguage = preferredLanguage
        Me.TaxId = taxId
        Me.TaxRegime = taxRegime
        Me.InvoiceEmail = invoiceEmail
    End Sub
End Class
```

19 propriedades em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a classe. Validar endereço significa duplicar a regra em todo método que cria ou atualiza um cliente.

</details>

<details>
<summary>✅ Bom: Customer com extrações por conceito</summary>

```vb
Public NotInheritable Class Customer

    Public ReadOnly Property Id As CustomerId
    Public ReadOnly Property Name As String
    Public ReadOnly Property Email As String
    Public ReadOnly Property Address As Address
    Public ReadOnly Property Preferences As CustomerPreferences
    Public ReadOnly Property TaxInfo As TaxInfo ' Nothing quando pessoa física

    Public Sub New(
        id As CustomerId,
        name As String,
        email As String,
        address As Address,
        preferences As CustomerPreferences,
        taxInfo As TaxInfo)

        Me.Id = id
        Me.Name = name
        Me.Email = email
        Me.Address = address
        Me.Preferences = preferences
        Me.TaxInfo = taxInfo
    End Sub
End Class

Public NotInheritable Class Address

    Public ReadOnly Property Street As String
    Public ReadOnly Property Number As String
    Public ReadOnly Property Complement As String
    Public ReadOnly Property City As String
    Public ReadOnly Property State As String
    Public ReadOnly Property ZipCode As String
    Public ReadOnly Property Country As String

    Public Sub New(street As String, number As String, complement As String,
                   city As String, state As String, zipCode As String, country As String)
        Me.Street = street
        Me.Number = number
        Me.Complement = complement
        Me.City = city
        Me.State = state
        Me.ZipCode = zipCode
        Me.Country = country
    End Sub
End Class

Public NotInheritable Class CustomerPreferences

    Public ReadOnly Property NewsletterOptIn As Boolean
    Public ReadOnly Property SmsOptIn As Boolean
    Public ReadOnly Property PreferredLanguage As String

    Public Sub New(newsletterOptIn As Boolean, smsOptIn As Boolean, preferredLanguage As String)
        Me.NewsletterOptIn = newsletterOptIn
        Me.SmsOptIn = smsOptIn
        Me.PreferredLanguage = preferredLanguage
    End Sub
End Class
```

Cada classe responde a uma pergunta clara. `Address` é reusada por `Customer`, `Order` (endereço de entrega) e qualquer outro contexto que precise de endereço, sem reinventar.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Métodos da entidade usam apenas metade dos campos.
- Validações em conflito (o que vale para um campo invalida o outro).
- Propriedades opcionais demais (`Nothing` em 8 de 20).
- Persistência precisa de duas tabelas no banco para uma única entidade no código.

## Composição: quando extrair

Quando uma entidade fica grande, há três padrões clássicos para extrair partes dela. Cada um responde a um cenário diferente, e a escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (`Address` dentro de `Customer`): o conceito é pequeno, não tem identidade própria, e faz parte do estado natural do dono. O endereço muda inteiro, nunca por partes. Em VB.NET, vira `NotInheritable Class` com todos os campos `ReadOnly`, construtor que valida e `Equals` por valor.

**Value object opcional** (`TaxInfo` dentro de `Customer`): o conceito existe apenas em alguns casos. Cliente pessoa física não tem; cliente pessoa jurídica tem. O campo é `Nothing` quando ausente; quando presente, traz o conceito completo (todos os campos juntos, validados juntos).

**Entidade satélite** (`CustomerProfile` separada): a informação é acessada raramente, tem volume maior, ou segue regras próprias de versionamento. A separação compensa quando 80% das consultas ao `Customer` não precisam do `Profile`. Aqui o satélite é uma entidade própria, com ID, e referencia o `Customer` por `customerId`.

<details>
<summary>❌ Ruim: campos opcionais espalhados no lugar de extrair value object</summary>

```vb
Public NotInheritable Class Customer

    Public ReadOnly Property Id As CustomerId
    Public ReadOnly Property Name As String
    Public ReadOnly Property Email As String
    ' se PJ, esses três aparecem; se PF, ficam Nothing
    Public ReadOnly Property TaxId As String
    Public ReadOnly Property TaxRegime As String
    Public ReadOnly Property InvoiceEmail As String

    Public Function HasTaxInfo() As Boolean
        Dim isRegistered = TaxId IsNot Nothing AndAlso TaxRegime IsNot Nothing
        Return isRegistered
    End Function
End Class
```

A regra "se um campo de imposto existe, todos existem" mora em `HasTaxInfo`. Cada nova feature de imposto vai precisar reler e replicar essa checagem. O compilador aceita `Customer` com `TaxId` preenchido e `TaxRegime` vazio, criando estado inválido.

</details>

<details>
<summary>✅ Bom: TaxInfo como value object opcional</summary>

```vb
Public NotInheritable Class TaxInfo

    Public ReadOnly Property TaxId As String
    Public ReadOnly Property TaxRegime As String
    Public ReadOnly Property InvoiceEmail As String

    Public Sub New(taxId As String, taxRegime As String, invoiceEmail As String)
        If String.IsNullOrWhiteSpace(taxId) OrElse String.IsNullOrWhiteSpace(taxRegime) Then
            Throw New ArgumentException("TaxInfo requires both TaxId and TaxRegime.")
        End If

        Me.TaxId = taxId
        Me.TaxRegime = taxRegime
        Me.InvoiceEmail = invoiceEmail
    End Sub
End Class

Public NotInheritable Class Customer

    Public ReadOnly Property Id As CustomerId
    Public ReadOnly Property Name As String
    Public ReadOnly Property Email As String
    Public ReadOnly Property TaxInfo As TaxInfo ' Nothing quando pessoa física

    Public Sub New(id As CustomerId, name As String, email As String, taxInfo As TaxInfo)
        Me.Id = id
        Me.Name = name
        Me.Email = email
        Me.TaxInfo = taxInfo
    End Sub

    Public Function HasTaxInfo() As Boolean
        Dim isRegistered = TaxInfo IsNot Nothing
        Return isRegistered
    End Function
End Class
```

A invariante "se imposto existe, é completo" mora no construtor de `TaxInfo`. Quem cria um cliente sem imposto passa `Nothing`. Não tem como construir um `TaxInfo` parcial.

</details>

## Strongly-typed IDs

Quando o sistema cresce, IDs viram fonte recorrente de bug: alguém passa `orderId` onde a função esperava `customerId`, ou inverte a ordem dos argumentos sem perceber. Como todos são `Guid`, o compilador aceita a troca silenciosamente, e o erro só aparece quando um cliente é cobrado pelo pedido errado em produção.

A defesa em VB.NET é uma `Structure` que implementa `IEquatable(Of T)` e sobrescreve os operadores `=` e `<>`. VB.NET no .NET Framework 4.8 não suporta records nativos; a `Structure` imutável é o substituto direto. Em runtime, o compilador rejeita a atribuição de `OrderId` onde se espera `CustomerId`, mesmo que ambos embrulhem um `Guid`.

<details>
<summary>❌ Ruim: IDs como Guid cru, fáceis de trocar de lugar</summary>

```vb
Public Function TransferOwnership(customerId As Guid, orderId As Guid) As Boolean
    ' assinatura: customerId primeiro, orderId depois
    ' se o caller inverter, o bug passa silencioso
    Dim wasUpdated = _orderRepository.Update(orderId, customerId)
    Return wasUpdated
End Function

' uso longe daqui, com nomes locais diferentes:
Dim targetOrder = order.Id
Dim newOwner = customer.Id

' inverte argumentos: nada acusa, tipo de ambos é Guid
TransferOwnership(targetOrder, newOwner)
```

</details>

<details>
<summary>✅ Bom: ID embrulhado em Structure própria com IEquatable</summary>

```vb
Public Structure CustomerId
    Implements IEquatable(Of CustomerId)

    Public ReadOnly Value As Guid

    Public Sub New(value As Guid)
        If value = Guid.Empty Then
            Throw New ArgumentException("CustomerId requires a non-empty Guid.")
        End If

        Me.Value = value
    End Sub

    Public Overloads Function Equals(other As CustomerId) As Boolean _
        Implements IEquatable(Of CustomerId).Equals
        Dim isSame = Me.Value = other.Value
        Return isSame
    End Function

    Public Overrides Function Equals(obj As Object) As Boolean
        If TypeOf obj Is CustomerId Then
            Dim other = DirectCast(obj, CustomerId)
            Dim isSame = Me.Value = other.Value
            Return isSame
        End If

        Return False
    End Function

    Public Overrides Function GetHashCode() As Integer
        Dim hash = Value.GetHashCode()
        Return hash
    End Function

    Public Shared Operator =(left As CustomerId, right As CustomerId) As Boolean
        Dim areEqual = left.Value = right.Value
        Return areEqual
    End Operator

    Public Shared Operator <>(left As CustomerId, right As CustomerId) As Boolean
        Dim areNotEqual = left.Value <> right.Value
        Return areNotEqual
    End Operator

    Public Overrides Function ToString() As String
        Dim text = Value.ToString()
        Return text
    End Function
End Structure

Public Structure OrderId
    Implements IEquatable(Of OrderId)

    Public ReadOnly Value As Guid

    Public Sub New(value As Guid)
        If value = Guid.Empty Then
            Throw New ArgumentException("OrderId requires a non-empty Guid.")
        End If

        Me.Value = value
    End Sub

    Public Overloads Function Equals(other As OrderId) As Boolean _
        Implements IEquatable(Of OrderId).Equals
        Dim isSame = Me.Value = other.Value
        Return isSame
    End Function

    Public Overrides Function Equals(obj As Object) As Boolean
        If TypeOf obj Is OrderId Then
            Dim other = DirectCast(obj, OrderId)
            Dim isSame = Me.Value = other.Value
            Return isSame
        End If

        Return False
    End Function

    Public Overrides Function GetHashCode() As Integer
        Dim hash = Value.GetHashCode()
        Return hash
    End Function

    Public Shared Operator =(left As OrderId, right As OrderId) As Boolean
        Dim areEqual = left.Value = right.Value
        Return areEqual
    End Operator

    Public Shared Operator <>(left As OrderId, right As OrderId) As Boolean
        Dim areNotEqual = left.Value <> right.Value
        Return areNotEqual
    End Operator

    Public Overrides Function ToString() As String
        Dim text = Value.ToString()
        Return text
    End Function
End Structure

Public Function TransferOwnership(customerId As CustomerId, orderId As OrderId) As Boolean
    Dim wasUpdated = _orderRepository.Update(orderId, customerId)
    Return wasUpdated
End Function

' troca acidental de argumentos: erro de compilação
Dim targetOrder = New OrderId(order.IdValue)
Dim newOwner = New CustomerId(customer.IdValue)

TransferOwnership(targetOrder, newOwner)
' ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
' Argument not convertible from 'OrderId' to 'CustomerId'. BC30512
```

O compilador rejeita a troca em tempo de compilação. `CustomerId` e `OrderId` são tipos distintos mesmo que ambos guardem um `Guid`.

</details>

## BaseEntity: o que entra, o que sai

Toda entidade tem identidade, e concentrar essa identidade em uma classe base reutilizada faz sentido. O risco aparece logo a seguir, em uma sequência tentadora: "já que tem base, por que não colocar também os campos de auditoria?"; depois "já que tem auditoria, por que não soft delete?"; depois "já que tem soft delete, por que não version e tenantId?". A base vai engordando, e cada entidade do sistema passa a carregar campos que não usa. Esse é o caminho típico para o **God Object**.

A regra que funciona é mínima:

- **Entra na base**: `Id`. Único campo que toda entidade precisa, motivo claro, sem ambiguidade.
- **Sai da base**: campos de auditoria (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`). Vão por composição (campo `Audit As AuditFields`) em quem precisa.
- **Caso à parte**: `TenantId`. Só faz sentido na **aggregate root**, nunca em entidade filha do agregado. Detalhes em [Multitenancy](#multitenancy).

<details>
<summary>❌ Ruim: BaseEntity inchada, todo mundo herda tudo</summary>

```vb
Public MustInherit Class BaseEntity

    Public ReadOnly Property Id As Guid
    Public ReadOnly Property CreatedAt As Date
    Public ReadOnly Property UpdatedAt As Date
    Public ReadOnly Property DeletedAt As Date?
    Public ReadOnly Property Version As Integer
    Public ReadOnly Property TenantId As Guid
    Public ReadOnly Property CreatedBy As String
    Public ReadOnly Property UpdatedBy As String

    Protected Sub New(id As Guid, createdAt As Date, updatedAt As Date,
                      deletedAt As Date?, version As Integer,
                      tenantId As Guid, createdBy As String, updatedBy As String)
        Me.Id = id
        Me.CreatedAt = createdAt
        Me.UpdatedAt = updatedAt
        Me.DeletedAt = deletedAt
        Me.Version = version
        Me.TenantId = tenantId
        Me.CreatedBy = createdBy
        Me.UpdatedBy = updatedBy
    End Sub
End Class

Public NotInheritable Class OrderItem
    Inherits BaseEntity

    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer

    Public Sub New(id As Guid, productId As ProductId, quantity As Integer)
        ' passa valores vazios/padrão para campos que OrderItem não usa
        MyBase.New(id, Date.Now, Date.Now, Nothing, 1, Guid.Empty, String.Empty, String.Empty)
        Me.ProductId = productId
        Me.Quantity = quantity
    End Sub
End Class
```

`OrderItem` carrega `TenantId`, `CreatedBy`, `Version` que não usa nem precisa. Os valores vazios no `MyBase.New` denunciam o problema. Cada nova feature que entra na base afeta toda entidade do sistema.

</details>

<details>
<summary>✅ Bom: Entity mínima genérica, comportamentos extras por composição</summary>

```vb
Public MustInherit Class Entity(Of TId)

    Public ReadOnly Property Id As TId

    Protected Sub New(id As TId)
        Me.Id = id
    End Sub

    Public Overrides Function Equals(obj As Object) As Boolean
        If obj Is Nothing OrElse obj.GetType() <> Me.GetType() Then Return False

        Dim other = DirectCast(obj, Entity(Of TId))
        Dim isSameId = Object.Equals(Me.Id, other.Id)
        Return isSameId
    End Function

    Public Overrides Function GetHashCode() As Integer
        Dim hash = If(Id IsNot Nothing, Id.GetHashCode(), 0)
        Return hash
    End Function
End Class

' auditoria mora em composição, aplicada onde faz sentido
Public NotInheritable Class AuditFields

    Public ReadOnly Property CreatedAt As Date
    Public ReadOnly Property UpdatedAt As Date
    Public ReadOnly Property CreatedBy As String
    Public ReadOnly Property UpdatedBy As String

    Public Sub New(createdAt As Date, updatedAt As Date, createdBy As String, updatedBy As String)
        Me.CreatedAt = createdAt
        Me.UpdatedAt = updatedAt
        Me.CreatedBy = createdBy
        Me.UpdatedBy = updatedBy
    End Sub
End Class

Public NotInheritable Class Customer
    Inherits Entity(Of CustomerId)

    Public ReadOnly Property Name As String
    Public ReadOnly Property Email As String
    Public ReadOnly Property Audit As AuditFields

    Public Sub New(id As CustomerId, name As String, email As String, audit As AuditFields)
        MyBase.New(id)
        Me.Name = name
        Me.Email = email
        Me.Audit = audit
    End Sub
End Class

Public NotInheritable Class OrderItem
    Inherits Entity(Of OrderItemId)

    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer

    Public Sub New(id As OrderItemId, productId As ProductId, quantity As Integer)
        MyBase.New(id)
        Me.ProductId = productId
        Me.Quantity = quantity
        ' sem auditoria: faz parte do agregado Order, não vive sozinho
    End Sub
End Class
```

`Entity(Of TId)` carrega só o que toda entidade precisa. Quem quer auditoria compõe com `AuditFields`. `OrderItem` nem expõe auditoria, porque faz parte do agregado `Order` e não vive sozinho.

</details>

## Propriedade vs lista

A cardinalidade modela a regra de negócio, não o estado momentâneo. Se o domínio diz "cliente tem um endereço principal", o campo é único, mesmo que o banco eventualmente guarde o histórico de todos os endereços já usados. Se o domínio diz "cliente pode ter vários telefones", a propriedade é lista, mesmo quando 90% dos clientes cadastram apenas um.

A tabela abaixo é a tradução direta de cada regra de cardinalidade para VB.NET:

| Regra de negócio | Modelo | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | Propriedade obrigatória | `Customer.Name`, `Order.Total` |
| Zero ou um | Propriedade `As T` que aceita `Nothing` | `Customer.TaxInfo` (só PJ tem) |
| Zero ou um (value type) | `Nullable(Of T)` | `Order.ShippedDate As Date?` |
| Zero ou mais | `IReadOnlyList(Of T)` pública, `List(Of T)` privada | `Order.LineItems` |
| Exatamente N (N fixo) | N propriedades nomeadas | `Address.{Street, City, Country}` |

Em VB.NET, listas públicas usam `IReadOnlyList(Of T)` para impedir que callers façam `Add` direto. A mutação interna passa por um campo `Private _items As List(Of T)`, e o método de domínio é a única forma de alterar.

<details>
<summary>❌ Ruim: três campos numerados forçando uma lista mascarada</summary>

```vb
Public NotInheritable Class Customer

    Public ReadOnly Property Id As CustomerId
    Public ReadOnly Property Name As String
    Public Property Phone1 As String
    Public Property Phone2 As String
    Public Property Phone3 As String

    Public Sub AddPhone(value As String)
        If Phone1 Is Nothing Then
            Phone1 = value
            Return
        End If

        If Phone2 Is Nothing Then
            Phone2 = value
            Return
        End If

        If Phone3 Is Nothing Then
            Phone3 = value
            Return
        End If

        Throw New InvalidOperationException("Customer can have at most 3 phones.")
    End Sub
End Class
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma invariante no método. Adicionar um quarto telefone é mudança de schema, não de regra.

</details>

<details>
<summary>✅ Bom: lista interna mutável, exposição via IReadOnlyList</summary>

```vb
Public Enum PhoneType
    Mobile
    Home
    Work
End Enum

Public NotInheritable Class Phone

    Public ReadOnly Property Number As String
    Public ReadOnly Property Type As PhoneType

    Public Sub New(number As String, phoneType As PhoneType)
        Me.Number = number
        Me.Type = phoneType
    End Sub
End Class

Public NotInheritable Class Customer
    Inherits Entity(Of CustomerId)

    Private ReadOnly _phones As New List(Of Phone)

    Public ReadOnly Property Name As String

    Public ReadOnly Property PhoneList As IReadOnlyList(Of Phone)
        Get
            Return _phones.AsReadOnly()
        End Get
    End Property

    Public Sub New(id As CustomerId, name As String)
        MyBase.New(id)
        Me.Name = name
    End Sub

    Public Sub AddPhone(phone As Phone)
        If _phones.Count >= 3 Then
            Throw New InvalidOperationException("Customer can have at most 3 phones.")
        End If

        _phones.Add(phone)
    End Sub

    Public Sub RemovePhone(number As String)
        Dim remaining = _phones.Where(Function(p) p.Number <> number).ToList()
        _phones.Clear()
        _phones.AddRange(remaining)
    End Sub
End Class
```

A regra "no máximo 3" mora em `AddPhone`, onde dá pra mudar sem mexer no schema. A lista exposta é `IReadOnlyList(Of Phone)`: callers iteram à vontade mas não conseguem `Add` direto. Lista vazia é o estado neutro: itera sem checagem de `Nothing`.

</details>

Listas seguem a regra de [null-safety](null-safety.md): nunca `Nothing`, sempre vazia. Ausência e vazio são equivalentes para quem itera.

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum em todo domínio: `Order` tem muitos `OrderItem`, `Author` tem muitos `Book`, `Customer` tem muitos `Order`. Antes de modelar, vale responder uma pergunta só: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`OrderItem` sem `Order` não existe), eles vivem dentro do mesmo agregado. A **aggregate root** orquestra a vida dos filhos: cria, valida, remove. O acesso a um filho específico passa pelo root, nunca direto. Em código, a root é a única classe exposta do agregado.

Quando os filhos existem por conta própria (`Customer` tem muitos `Order`, mas `Order` faz sentido sem `Customer` em memória), cada lado é um agregado separado. A referência entre eles cruza a fronteira de agregado, então vai por ID, nunca por objeto completo.

<details>
<summary>❌ Ruim: filho carrega referência completa ao pai, ciclo bidirecional sem dono</summary>

```vb
Public NotInheritable Class Order

    Public ReadOnly Property Id As OrderId
    Public ReadOnly Property Items As New List(Of OrderItem)

    Public Sub New(id As OrderId)
        Me.Id = id
    End Sub
End Class

Public NotInheritable Class OrderItem

    Public ReadOnly Property Id As OrderItemId
    Public ReadOnly Property Order As Order ' referência completa ao Order
    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer

    Public Sub New(id As OrderItemId, order As Order, productId As ProductId, quantity As Integer)
        Me.Id = id
        Me.Order = order
        Me.ProductId = productId
        Me.Quantity = quantity
    End Sub
End Class

' quem valida que Items.Count não passa do limite?
' quem garante que RemoveItem limpa item.Order?
' a regra fica diluída entre as duas classes.
```

</details>

<details>
<summary>✅ Bom: aggregate root protege as invariantes, filhos sem referência circular</summary>

```vb
Public NotInheritable Class OrderItem
    Inherits Entity(Of OrderItemId)

    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer
    Public ReadOnly Property UnitPrice As Decimal

    Public Sub New(id As OrderItemId, productId As ProductId, quantity As Integer, unitPrice As Decimal)
        If quantity <= 0 Then
            Throw New ArgumentException("Quantity must be positive.")
        End If

        MyBase.New(id)
        Me.ProductId = productId
        Me.Quantity = quantity
        Me.UnitPrice = unitPrice
    End Sub

    Public Function Subtotal() As Decimal
        Dim total = UnitPrice * Quantity
        Return total
    End Function
End Class

Public NotInheritable Class Order
    Inherits Entity(Of OrderId)

    Private ReadOnly _items As New List(Of OrderItem)

    Public ReadOnly Property CustomerId As CustomerId ' ID, não Customer (outro agregado)

    Public ReadOnly Property LineItems As IReadOnlyList(Of OrderItem)
        Get
            Return _items.AsReadOnly()
        End Get
    End Property

    Private Sub New(id As OrderId, customerId As CustomerId)
        MyBase.New(id)
        Me.CustomerId = customerId
    End Sub

    Public Shared Function Place(id As OrderId, customerId As CustomerId) As Order
        Dim order = New Order(id, customerId)
        Return order
    End Function

    Public Sub AddItem(productId As ProductId, quantity As Integer, unitPrice As Decimal)
        If _items.Count >= 50 Then
            Throw New InvalidOperationException("Order can have at most 50 items.")
        End If

        Dim item = New OrderItem(New OrderItemId(Guid.NewGuid()), productId, quantity, unitPrice)
        _items.Add(item)
    End Sub

    Public Sub RemoveItem(itemId As OrderItemId)
        Dim remaining = _items.Where(Function(i) i.Id <> itemId).ToList()
        _items.Clear()
        _items.AddRange(remaining)
    End Sub

    Public Function Total() As Decimal
        Dim total = _items.Sum(Function(i) i.Subtotal())
        Return total
    End Function
End Class
```

`Order` é o **aggregate root**: protege o limite de itens, calcula o total, encapsula a criação dos filhos. `OrderItem` não conhece `Order`. A relação é unidirecional, do dono para os dependentes. `Order.Place` é o único ponto de entrada para construir um pedido novo.

</details>

Implicação prática para persistência: o repositório carrega o agregado inteiro (`Order` + `OrderItem[]`) em uma única transação. Carregar `OrderItem` solto, sem o pai, é sinal de modelo errado.

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações distintas, e identificar qual delas é o seu caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. Modelar com lista de IDs em um dos lados.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final, modalidade. Esses dados não pertencem nem ao aluno nem ao curso. Aqui o relacionamento vira entidade com nome próprio (`Enrollment`, matrícula).

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade, e merece um nome.

<details>
<summary>❌ Ruim: N:N com atributos espalhados em listas paralelas</summary>

```vb
Public NotInheritable Class Student

    Public ReadOnly Property Id As StudentId
    Public ReadOnly Property Name As String
    Public ReadOnly Property CourseIds As New List(Of CourseId)
    Public ReadOnly Property EnrollmentDates As New List(Of Date) ' paralelo a CourseIds, por índice

    ' como saber a data de matrícula do curso 'COURSE-42'?
    ' procurar o índice de COURSE-42 em CourseIds, usar esse índice em EnrollmentDates
    ' se um deles sair de ordem ou perder um elemento, dados ficam inconsistentes.
End Class
```

</details>

<details>
<summary>✅ Bom: Enrollment como entidade que carrega os atributos do relacionamento</summary>

```vb
Public Enum EnrollmentStatus
    Active
    Completed
    Withdrawn
End Enum

Public NotInheritable Class Enrollment
    Inherits Entity(Of EnrollmentId)

    Public ReadOnly Property StudentId As StudentId
    Public ReadOnly Property CourseId As CourseId
    Public ReadOnly Property EnrolledAt As Date
    Public ReadOnly Property FinalGrade As Decimal?

    Private _status As EnrollmentStatus

    Public ReadOnly Property Status As EnrollmentStatus
        Get
            Return _status
        End Get
    End Property

    Private Sub New(id As EnrollmentId, studentId As StudentId, courseId As CourseId, enrolledAt As Date)
        MyBase.New(id)
        Me.StudentId = studentId
        Me.CourseId = courseId
        Me.EnrolledAt = enrolledAt
        _status = EnrollmentStatus.Active
    End Sub

    Public Shared Function Open(id As EnrollmentId, studentId As StudentId, courseId As CourseId) As Enrollment
        Dim enrollment = New Enrollment(id, studentId, courseId, Date.UtcNow)
        Return enrollment
    End Function

    Public Sub Complete(grade As Decimal)
        If _status <> EnrollmentStatus.Active Then
            Throw New InvalidOperationException("Only active enrollments can be completed.")
        End If

        If grade < 0 OrElse grade > 10 Then
            Throw New ArgumentException("Grade must be between 0 and 10.")
        End If

        _status = EnrollmentStatus.Completed
        FinalGrade = grade
    End Sub
End Class

Public NotInheritable Class Student
    Inherits Entity(Of StudentId)

    Public ReadOnly Property Name As String

    Public Sub New(id As StudentId, name As String)
        MyBase.New(id)
        Me.Name = name
    End Sub
End Class

Public NotInheritable Class Course
    Inherits Entity(Of CourseId)

    Public ReadOnly Property Title As String

    Public Sub New(id As CourseId, title As String)
        MyBase.New(id)
        Me.Title = title
    End Sub
End Class
```

`Student` não lista cursos diretamente; `Course` não lista alunos diretamente. O relacionamento mora em `Enrollment`, que carrega data, status e nota. Consultas como "cursos do aluno X" viram queries sobre `Enrollment`, não navegação de lista.

</details>

Quando o N:N é pura associação (sem atributos), uma tabela intermediária só de IDs basta no banco, e o modelo de domínio pode expor `IReadOnlyList(Of CourseId)` em qualquer um dos lados. A regra continua: sem inventar entidade quando não há informação para ela carregar.

## Identidade vs referência

Dentro do mesmo agregado, referência direta é o caminho natural: `Order.LineItems` é uma lista de `OrderItem`, não uma lista de `OrderItemId`. O agregado é uma unidade transacional, carregada inteira do banco e mantida coerente como bloco único.

Cruzando a fronteira de outro agregado, a referência muda de forma: vai por ID. `Order` referencia `Customer` por `CustomerId`, nunca pelo objeto `Customer` completo. Se carregasse o `Customer` inteiro, o agregado `Order` teria que se preocupar em manter o `Customer` consistente, e isso é responsabilidade do agregado `Customer`. Dois donos para a mesma invariante é receita certa de bug.

<details>
<summary>❌ Ruim: agregado puxa outro agregado por referência direta</summary>

```vb
Public NotInheritable Class Order

    Public ReadOnly Property Id As OrderId
    Public ReadOnly Property Customer As Customer ' Customer completo
    Public ReadOnly Property Items As New List(Of OrderItem)

    Public Sub New(id As OrderId, customer As Customer)
        Me.Id = id
        Me.Customer = customer
    End Sub
End Class

' para criar Order, preciso buscar Customer inteiro do banco
Dim customer = Await _customerRepository.FindByIdAsync(customerId)
Dim order = New Order(orderId, customer)

' para serializar Order para o frontend, envio junto o Customer completo
' mudanças em Customer (email, telefone) podem invalidar o cache de Order
```

</details>

<details>
<summary>✅ Bom: agregado referencia outro agregado por ID</summary>

```vb
Public NotInheritable Class Order
    Inherits Entity(Of OrderId)

    Public ReadOnly Property CustomerId As CustomerId ' ID, não Customer

    Private Sub New(id As OrderId, customerId As CustomerId)
        MyBase.New(id)
        Me.CustomerId = customerId
    End Sub

    Public Shared Function Place(id As OrderId, customerId As CustomerId) As Order
        Dim order = New Order(id, customerId)
        Return order
    End Function
End Class

Dim order = Order.Place(orderId, customerId)

' quem precisa do Customer resolve o ID no momento certo
Dim customer = Await _customerRepository.FindByIdAsync(order.CustomerId)
```

`Order` carrega só a referência. Quem precisa do `Customer` resolve o ID no momento certo. Isso evita carregar o universo inteiro toda vez que alguém pede um pedido.

</details>

## Multitenancy

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma aplicação. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A pergunta operacional é onde colocar o `TenantId`. A resposta varia conforme o papel do objeto:

- **Na aggregate root**: sim. `Order.TenantId`, `Customer.TenantId`. É o que permite o repositório aplicar o filtro automaticamente.
- **Em entidade filha do agregado**: não. `OrderItem` não precisa carregar `TenantId`, porque o pai (`Order`) já carrega, e a consulta passa sempre pelo pai.
- **Em value object**: não. `Address`, `Money` não pertencem a nenhum tenant em particular; são valores reutilizáveis.

O isolamento mora fora da entidade: no repositório, em middleware, ou na própria camada do banco com **row-level security** (segurança por linha, RLS). A entidade só guarda o campo; quem aplica o filtro é a infraestrutura.

<details>
<summary>❌ Ruim: TenantId duplicado em toda entidade filha, esperando que o domínio aplique o filtro</summary>

```vb
Public NotInheritable Class Order

    Public ReadOnly Property Id As OrderId
    Public ReadOnly Property TenantId As Guid
    Public ReadOnly Property CustomerId As CustomerId
    Public ReadOnly Property Items As New List(Of OrderItem)
End Class

Public NotInheritable Class OrderItem

    Public ReadOnly Property Id As OrderItemId
    Public ReadOnly Property TenantId As Guid ' duplica o TenantId do Order
    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer
End Class

' e agora cada serviço precisa checar TenantId em toda operação:
Public Function CalculateOrderTotal(order As Order, currentTenantId As Guid) As Decimal
    If order.TenantId <> currentTenantId Then
        Throw New UnauthorizedAccessException("Tenant mismatch on order.")
    End If

    For Each item In order.Items
        If item.TenantId <> currentTenantId Then
            Throw New UnauthorizedAccessException("Tenant mismatch on item.")
        End If
    Next

    Dim total = order.Items.Sum(Function(i) i.Quantity)
    Return total
End Function
```

</details>

<details>
<summary>✅ Bom: TenantId só no aggregate root, enforcement no repositório</summary>

```vb
Public NotInheritable Class Order
    Inherits Entity(Of OrderId)

    Public ReadOnly Property TenantId As TenantId ' único campo de tenant no agregado
    Public ReadOnly Property CustomerId As CustomerId

    Private Sub New(id As OrderId, tenantId As TenantId, customerId As CustomerId)
        MyBase.New(id)
        Me.TenantId = tenantId
        Me.CustomerId = customerId
    End Sub

    Public Shared Function Place(id As OrderId, tenantId As TenantId, customerId As CustomerId) As Order
        Dim order = New Order(id, tenantId, customerId)
        Return order
    End Function
End Class

Public NotInheritable Class OrderItem
    Inherits Entity(Of OrderItemId)

    Public ReadOnly Property ProductId As ProductId
    Public ReadOnly Property Quantity As Integer

    Public Sub New(id As OrderItemId, productId As ProductId, quantity As Integer)
        MyBase.New(id)
        Me.ProductId = productId
        Me.Quantity = quantity
    End Sub
End Class

' repositório aplica o filtro automaticamente, baseado no contexto da requisição
Public NotInheritable Class OrderRepository
    Implements IOrderRepository

    Private ReadOnly _context As AppDbContext
    Private ReadOnly _tenantContext As ITenantContext

    Public Sub New(context As AppDbContext, tenantContext As ITenantContext)
        _context = context
        _tenantContext = tenantContext
    End Sub

    Public Async Function FindByIdAsync(orderId As OrderId) As Task(Of Order) _
        Implements IOrderRepository.FindByIdAsync

        Dim activeTenant = _tenantContext.Current()
        Dim order = Await _context.Orders _
            .Where(Function(o) o.Id = orderId AndAlso o.TenantId = activeTenant) _
            .FirstOrDefaultAsync()

        Return order
    End Function
End Class
```

A entidade não conhece o conceito de tenant ativo. O repositório injeta o filtro. Se alguém esquecer um filtro, o erro fica concentrado no repositório, não espalhado.

</details>

## Anti-patterns

Os padrões abaixo aparecem com frequência em código VB.NET real, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a entidade antes que o débito cresça e contamine os módulos vizinhos.

**God Entity**. Entidade com 20+ propriedades misturando conceitos. Sintoma: o nome da classe vira lista (`UserAccountWithPreferencesAndBilling`). Tratamento: extrair value objects ou separar em agregados.

**BaseEntity inchada**. Classe base carregando audit + soft delete + multitenancy + versionamento, forçando filhos a herdar tudo. Sintoma: `OrderItem` carrega `TenantId` que nunca usa, e o `MyBase.New` recebe valores `Guid.Empty` ou `String.Empty` para preencher campos sem sentido. Tratamento: deixar só `Id` na base; demais campos viram composição.

**Campos opcionais por design ruim**. Entidade com 8 dos 20 campos sempre `Nothing`. Sintoma: caller precisa checar `Is Nothing` a cada acesso. Tratamento: extrair os opcionais em value object opcional, ou separar em entidades distintas se a presença/ausência indica conceitos diferentes.

**Lista mascarada como N campos**. `Phone1`, `Phone2`, `Phone3` quando o domínio diz "muitos telefones". Sintoma: lógica para "pegar o próximo slot vazio" e campos sem `ReadOnly`. Tratamento: `IReadOnlyList(Of Phone)` exposta, `List(Of Phone)` privada interna.

**Mapa mascarado como lista**. Lista de pares `{ Key, Value }` quando o domínio diz "acesso por chave". Sintoma: `Find` em loop linear toda vez que se quer um valor específico. Tratamento: `Dictionary(Of TKey, TValue)`.

**Referência direta cruzando agregado**. `Order.Customer As Customer` em vez de `Order.CustomerId As CustomerId`. Sintoma: para carregar um pedido, o ORM puxa cinco tabelas. Tratamento: referência por ID; quem precisa do objeto resolve no momento certo.

**Entidade sem identidade**. Classe sem `Id` consultada como se fosse entidade. Sintoma: comparações por igualdade estrutural quando a regra diz "é o mesmo objeto, mesmo após mudar nome". Tratamento: dar identidade explícita com `Structure CustomerId`, ou aceitar que é value object e usar igualdade estrutural.

**Bidirecionalidade automática**. `Order.Items` e `OrderItem.Order` mantidos sincronizados manualmente. Sintoma: bug onde lado A foi atualizado mas lado B ficou desatualizado. Tratamento: relação unidirecional do **aggregate root** para os filhos.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../advanced/null-safety.md`](null-safety.md): null-safety idiomático VB.NET

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
