# Modelagem de entidades

> Escopo: SQL relacional. Referência canônica (modelagem OO): [`../../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md). As decisões de domínio — quando extrair, como relacionar, onde mora a invariante — são as mesmas; aqui o foco é o idiom relacional: tabelas, colunas, constraints, FKs e tipos nativos do PostgreSQL 18, com notas pontuais para SQL Server e SQLite.

Esta página serve a duas pessoas. A primeira está desenhando o schema inicial do projeto e ainda não sabe quantas colunas é demais em uma tabela. A segunda volta para revisar uma decisão antiga (por exemplo, vale a pena quebrar `customers` agora que ela tem 22 colunas?). As duas saem daqui com critério, não com receita fechada.

O texto cobre as mesmas perguntas do canônico, traduzidas para o vocabulário relacional: quantas colunas uma tabela aguenta antes de fragmentar; quando uma coluna vira tabela filha; como expressar relacionamentos 1:N e N:N; quais colunas toda tabela de agregado deve ter; e como o `tenant_id` e o **RLS** (Row-Level Security, segurança por linha) fecham o isolamento multitenant. As invariantes do domínio viram constraints — `NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY` — e é o banco que as aplica, não só a aplicação.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **aggregate root** (raiz do agregado) | Tabela principal que representa o agregado; carrega `id`, `tenant_id` e as colunas de auditoria; é a única tabela referenciada por FKs externas ao agregado |
| **entity** (entidade) | Tabela com identidade própria via `PRIMARY KEY`; duas linhas com os mesmos valores mas IDs distintos são registros distintos |
| **value object** (objeto de valor) | Conceito sem identidade própria; mapeado como colunas com prefixo na tabela dona (`billing_address_street`) ou tabela satélite 1:1 quando o volume é alto |
| **invariant** (invariante, regra que sempre vale) | Restrição garantida pelo banco via `NOT NULL`, `CHECK`, `UNIQUE` ou `FOREIGN KEY`; ex.: `CHECK (status != 'paid' OR paid_at IS NOT NULL)` |
| **constraint** (restrição) | Declaração de regra no DDL — `NOT NULL`, `CHECK`, `UNIQUE`, `PRIMARY KEY`, `FOREIGN KEY`; nomeadas com prefixo `pk_`, `fk_`, `uq_`, `ck_` |
| **DOMAIN** (domínio de tipo) | Tipo derivado em PostgreSQL via `CREATE DOMAIN`; aplica constraints automaticamente a toda coluna declarada com esse tipo |
| **UUID** (Universally Unique Identifier, identificador único global) | Identificador de 128 bits no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`; no PostgreSQL 18, `uuidv7()` é nativo e sequencial |
| **ENUM type** (tipo enumerado) | Conjunto fixo de valores via `CREATE TYPE ... AS ENUM`; alternativa portável: `VARCHAR` + `CHECK` constraint |
| **FK** (Foreign Key, chave estrangeira) | Constraint que liga uma coluna a `id` de outra tabela; declara a cardinalidade e o comportamento ao deletar (`ON DELETE CASCADE`, `RESTRICT`, `SET NULL`) |
| **RLS** (Row-Level Security, segurança por linha) | Recurso do PostgreSQL que filtra linhas antes que a query chegue à aplicação, com base em variável de sessão (`current_setting`) |
| **soft delete** (remoção lógica) | Coluna `deleted_at TIMESTAMPTZ` preenchida no lugar de `DELETE`; preserva histórico e permite auditoria |
| **multitenancy** (multilocação) | Uma instância serve múltiplos clientes (tenants) com `tenant_id UUID NOT NULL` na aggregate root e RLS no banco como segunda camada de isolamento |
| **satellite table** (tabela satélite) | Tabela 1:1 que estende a principal com colunas raramente acessadas; mantém a tabela principal enxuta para queries frequentes |
| **snake_case** (caixa com sublinhado) | Convenção de nomenclatura do PostgreSQL: letras minúsculas, palavras separadas por `_`; tabelas no plural (`orders`), colunas no singular (`created_at`) |

---

## Tamanho saudável da tabela

A pergunta "quantas colunas é demais" não tem número certo. O sinal que funciona é a coesão: as colunas mudam juntas, são consultadas juntas, descrevem o mesmo conceito. Quando um subconjunto começa a mudar em ritmo diferente, ele já é outra coisa pedindo um nome próprio.

Os números abaixo são heurística, não regra:

- **5 a 12 colunas**: zona confortável. A maior parte das tabelas de agregado cabe aqui.
- **12 a 20**: hora de olhar a coesão. Se todas as colunas descrevem o mesmo conceito (`orders` com cabeçalho, totais e status), tudo bem. Se dá para agrupar (endereço de entrega, dados fiscais, preferências), extrair.
- **20 ou mais**: quase sempre indica dois conceitos colados na mesma tabela. Quebrar.

Quando o nome da tabela não descreve mais o que ela guarda e vira lista (`customer_address_preferences_billing`), o limite já passou.

<details>
<summary>❌ Ruim: customers inchada misturando perfil, endereço, preferências e fiscal</summary>

```sql
CREATE TABLE customers
(
  id UUID NOT NULL DEFAULT uuidv7(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  street VARCHAR(255),
  number VARCHAR(20),
  complement VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  country VARCHAR(50),
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'pt-BR',
  tax_id VARCHAR(20),
  tax_regime VARCHAR(50),
  invoice_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_customers PRIMARY KEY (id)
);
```

20 colunas em quatro conceitos misturados. Mudar preferência de newsletter força reler toda a tabela. Validar endereço significa duplicar a regra em toda query que cria ou atualiza um cliente. `tax_id`, `tax_regime` e `invoice_email` ficam `NULL` para pessoas físicas, carregando ausência como presença.

</details>

<details>
<summary>✅ Bom: customers enxuta com extrações por conceito</summary>

```sql
CREATE TABLE customers
(
  id UUID NOT NULL DEFAULT uuidv7(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL,

  CONSTRAINT pk_customers PRIMARY KEY (id),
  CONSTRAINT uq_customers_email_tenant UNIQUE (email, tenant_id),
  CONSTRAINT fk_customers_tenants FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
);

CREATE TABLE customer_addresses
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  country VARCHAR(50) NOT NULL DEFAULT 'BR',

  CONSTRAINT pk_customer_addresses PRIMARY KEY (id),
  CONSTRAINT fk_customer_addresses_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE
);

CREATE TABLE customer_tax_info
(
  customer_id UUID NOT NULL,
  tax_id VARCHAR(20) NOT NULL,
  tax_regime VARCHAR(50) NOT NULL,
  invoice_email VARCHAR(255) NOT NULL,

  CONSTRAINT pk_customer_tax_info PRIMARY KEY (customer_id),
  CONSTRAINT fk_customer_tax_info_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE
);
```

Cada tabela responde a uma pergunta clara. `customer_addresses` é reusada por `orders` (endereço de entrega) via FK. `customer_tax_info` é uma tabela satélite 1:1 — existindo só quando o cliente é pessoa jurídica, sem poluir a tabela principal com nulos.

</details>

Sinais concretos de que chegou a hora de quebrar:

- Queries de negócio usam apenas metade das colunas na maioria das vezes.
- Validações em conflito (`CHECK` que depende de combinar dois campos de grupos distintos).
- Colunas `NULL` demais (8 de 20 sempre vazias para uma categoria de registro).
- O `EXPLAIN ANALYZE` mostra que queries simples carregam colunas que ninguém pediu.

## Composição: colunas embutidas vs tabela satélite

Quando uma tabela fica grande, há três padrões para extrair partes dela. A escolha depende de como o conceito extraído vai ser usado.

**Value object embutido** (colunas com prefixo na tabela dona): o conceito é pequeno, coeso, e faz parte do estado natural do dono. O endereço de cobrança muda inteiro, nunca por partes. Em SQL, viram colunas com prefixo descritivo: `billing_address_street`, `billing_address_city`, `billing_address_zip_code`. Sem tabela extra, sem JOIN para acessar.

**Value object opcional** (colunas com prefixo + `CHECK` de coerência): o conceito existe apenas em alguns registros. Pessoa jurídica tem dados fiscais; pessoa física não tem. As colunas ficam na tabela principal ou em tabela satélite 1:1, com `CHECK` garantindo que, quando um campo existe, todos os relacionados também existem.

**Tabela satélite** (`customer_profiles` separada): a informação é acessada raramente, tem volume maior, ou segue regras de versionamento próprias. A separação compensa quando 80% das queries ao `customers` não precisam do perfil estendido. A tabela satélite tem uma FK para o pai e `PRIMARY KEY` na própria FK (relação 1:1).

<details>
<summary>❌ Ruim: colunas de endereço de cobrança e de entrega misturadas sem prefixo</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  street VARCHAR(255),
  number VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(2),

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

Qual é o endereço? De cobrança? De entrega? Sem contexto no nome, toda query que lê `orders.street` precisa de comentário explicando do que se trata. Adicionar um segundo tipo de endereço vira um conflito de nomes.

</details>

<details>
<summary>✅ Bom: colunas prefixadas deixando o conceito explícito</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  shipping_address_street VARCHAR(255) NOT NULL,
  shipping_address_number VARCHAR(20) NOT NULL,
  shipping_address_city VARCHAR(100) NOT NULL,
  shipping_address_state VARCHAR(2) NOT NULL,
  shipping_address_zip_code VARCHAR(10) NOT NULL,
  billing_address_street VARCHAR(255) NOT NULL,
  billing_address_number VARCHAR(20) NOT NULL,
  billing_address_city VARCHAR(100) NOT NULL,
  billing_address_state VARCHAR(2) NOT NULL,
  billing_address_zip_code VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id)
);
```

Cada grupo de endereço tem prefixo explícito. Não é preciso JOIN para ler o endereço; está na mesma linha. Quando o endereço de cobrança coincidir com o de entrega, a aplicação copia os valores — redundância intencional para preservar histórico de snapshot.

</details>

## Strongly-typed IDs em SQL

Quando o sistema cresce, IDs viram fonte recorrente de bug de schema: uma FK aponta para a tabela errada, ou um `customer_id` acaba numa coluna que esperava `order_id`. Em SQL, os mecanismos de tipagem nominal são o **DOMAIN** do PostgreSQL e a convenção de sufixo `_id`.

A convenção de sufixo é a defesa mais acessível: toda coluna que é FK termina com `_id` seguido do nome do agregado referenciado (`customer_id`, `order_id`, `product_id`). O tipo `UUID` uniforme para todos os IDs elimina conversões e colisões com `BIGINT`.

O `CREATE DOMAIN` vai além: cria um tipo derivado (`customer_id`) com constraints, e qualquer coluna declarada com esse tipo herda as regras automaticamente.

> **Nota SQL Server**: usa `UNIQUEIDENTIFIER` no lugar de `UUID`. Mesma semântica, DDL diferente. **Nota SQLite**: não tem tipo `UUID` nativo; use `TEXT` com `CHECK (length(id) = 36)` para UUID em texto.

<details>
<summary>❌ Ruim: colunas UUID sem semântica de sufixo</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer UUID NOT NULL,
  assignee UUID NOT NULL,
  reference UUID,

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

`customer`, `assignee`, `reference`: qual tabela cada um referencia? Não há como saber sem ler as constraints. Trocar `customer` por `assignee` na aplicação não gera erro de compilação nem erro de banco — apenas dados errados.

</details>

<details>
<summary>✅ Bom: sufixo _id e DOMAIN no PostgreSQL reforçam a tipagem nominal</summary>

```sql
-- tipos de domínio declarados uma vez; reusados em todo schema
CREATE DOMAIN customer_id AS UUID
  CHECK (VALUE IS NOT NULL);

CREATE DOMAIN order_id AS UUID
  CHECK (VALUE IS NOT NULL);

CREATE TABLE orders
(
  id order_id NOT NULL DEFAULT uuidv7(),
  customer_id customer_id NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id)
);
```

O sufixo `_id` documenta a FK pelo nome. O `DOMAIN customer_id` impede que um `order_id` seja atribuído à coluna — o banco rejeita na inserção se os tipos de domínio diferirem. Em sistemas que não usam DOMAIN, o sufixo e a FK são a proteção mínima.

</details>

## Colunas comuns: id, created_at, updated_at, deleted_at, tenant_id

Toda tabela de **aggregate root** carrega um conjunto fixo de colunas que expressam identidade, auditoria e ciclo de vida. Esse conjunto é o equivalente relacional da `BaseEntity` do modelo OO — mas, aqui, "herança" é uma convenção de DDL repetida, não uma classe pai.

As tabelas filhas do agregado (ex.: `order_items`) não carregam `tenant_id` nem colunas de auditoria: acessadas sempre pelo pai, herdam o contexto da aggregate root.

```sql
-- template de aggregate root
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_tenants FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
);
```

**`updated_at`**: o PostgreSQL não atualiza `updated_at` automaticamente. A abordagem mais confiável é um trigger:

```sql
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$

BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
```

**`deleted_at`**: soft delete. Queries de leitura filtram `WHERE orders.deleted_at IS NULL`; o registro nunca é apagado do banco. Um índice parcial mantém a performance:

```sql
CREATE INDEX ix_orders_active
  ON orders (tenant_id, created_at)
  WHERE orders.deleted_at IS NULL;
```

## Coluna obrigatória vs nullable vs coleção (FK 1:N)

A cardinalidade modela a regra de negócio, não o estado momentâneo. A tabela abaixo traduz cada regra para DDL:

| Regra de negócio | Modelo SQL | Exemplo |
| --- | --- | --- |
| Sempre exatamente um | `NOT NULL` sem default | `orders.customer_id UUID NOT NULL` |
| Zero ou um | coluna nullable (sem `NOT NULL`) | `orders.cancelled_at TIMESTAMPTZ` |
| Zero ou mais | tabela filha com FK | `order_items.order_id REFERENCES orders (id)` |
| Exatamente N fixo | N colunas nomeadas com prefixo | `billing_address_street`, `billing_address_city` |

<details>
<summary>❌ Ruim: três colunas numeradas forçando uma lista mascarada</summary>

```sql
CREATE TABLE customers
(
  id UUID NOT NULL DEFAULT uuidv7(),
  phone1 VARCHAR(20),
  phone2 VARCHAR(20),
  phone3 VARCHAR(20),

  CONSTRAINT pk_customers PRIMARY KEY (id)
);
```

A regra "cliente tem até três telefones" foi codificada no schema, em vez de virar uma constraint de negócio. Adicionar um quarto telefone é mudança de DDL, não de regra. Verificar "quais clientes têm ao menos um telefone" vira `WHERE phone1 IS NOT NULL OR phone2 IS NOT NULL OR phone3 IS NOT NULL`.

</details>

<details>
<summary>✅ Bom: tabela filha customer_phones com constraint de cardinalidade</summary>

```sql
CREATE TABLE customer_phones
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  number VARCHAR(20) NOT NULL,
  type VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_customer_phones PRIMARY KEY (id),
  CONSTRAINT fk_customer_phones_customers FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE,
  CONSTRAINT ck_customer_phones_type CHECK (
    customer_phones.type IN ('mobile', 'home', 'work')
  )
);

-- cardinalidade máxima garantida por constraint
CREATE UNIQUE INDEX uq_customer_phones_limit
  ON customer_phones (customer_id)
  WHERE customer_phones.type IS NOT NULL;
```

A regra "cliente tem até três telefones" se implementa como trigger ou constraint em `customer_phones`. Adicionar um quarto não muda DDL, só a constraint de negócio. Consultas são diretas: `WHERE customer_phones.customer_id = $1`.

</details>

## Relacionamentos 1:N

Um para muitos é o relacionamento mais comum: `orders` tem muitos `order_items`, `authors` tem muitos `books`, `customers` tem muitos `orders`. Antes de modelar, vale responder uma pergunta: **quem é o dono**.

Quando os filhos não fazem sentido fora do pai (`order_items` sem `orders` não existe), a FK vai na tabela filha com `ON DELETE CASCADE`. A **aggregate root** é o único ponto de entrada; filhos são carregados sempre junto com o pai, em uma única transação.

Quando os filhos existem por conta própria (`customers` tem muitos `orders`, mas `orders` faz sentido sem `customers` em memória), cada lado é um agregado separado. A FK existe no banco para integridade referencial, mas a aplicação carrega cada agregado com queries separadas.

<details>
<summary>❌ Ruim: items armazenados como JSONB dentro do pedido</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

Invariantes como "quantidade deve ser positiva" e "limite de 50 itens" ficam na aplicação, sem enforcement no banco. Consultas como "pedidos que contêm o produto X" viram scans em JSONB. Alterar um item único exige reescrever o array inteiro.

</details>

<details>
<summary>✅ Bom: tabela order_items com FK e constraints explícitas</summary>

```sql
CREATE TABLE order_items
(
  id UUID NOT NULL DEFAULT uuidv7(),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_order_items PRIMARY KEY (id),
  CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_products FOREIGN KEY (product_id)
    REFERENCES products (id),
  CONSTRAINT ck_order_items_quantity CHECK (order_items.quantity > 0),
  CONSTRAINT ck_order_items_unit_price CHECK (order_items.unit_price > 0)
);

CREATE INDEX ix_order_items_order_id ON order_items (order_id);
```

`order_items.order_id` é a FK que materializa o 1:N. `ON DELETE CASCADE` mantém o agregado coeso: apagar o pedido remove os itens. As constraints `CHECK` garantem as invariantes no banco, independentemente da aplicação. O índice em `order_id` garante que carregar o agregado (`WHERE order_items.order_id = $1`) seja eficiente.

</details>

A implicação prática: o repositório carrega o agregado inteiro (`orders` + `order_items`) em uma única query com JOIN. Carregar `order_items` sem o pai é sinal de modelo errado. Detalhes em [`../../../shared/platform/database.md`](../../../shared/platform/database.md).

## Relacionamentos N:N

Muitos para muitos sempre cai em uma de duas situações, e identificar qual delas é o caso decide a modelagem:

- **Associação pura**: o aluno está matriculado em cursos, e o domínio não pede nenhuma outra informação sobre essa matrícula. A tabela intermediária tem só as duas FKs e uma `PRIMARY KEY` composta.
- **Associação com atributos próprios**: a matrícula tem data, status, nota final. Esses dados não pertencem nem ao aluno nem ao curso. A tabela intermediária vira entidade com nome próprio (`enrollments`) e `id` próprio.

A regra de decisão é direta: quando o relacionamento carrega informação que não cabe em nenhum dos dois lados, ele é uma entidade e merece um nome.

<details>
<summary>❌ Ruim: N:N pura sem nome semântico, sem índice na FK inversa</summary>

```sql
CREATE TABLE student_course
(
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,

  CONSTRAINT pk_student_course PRIMARY KEY (student_id, course_id)
);
```

Sem índice em `course_id`, consultas do tipo "quais alunos estão matriculados no curso X" viram full scan. Quando o domínio precisar de data de matrícula ou status, esse schema precisa de ALTER TABLE — sinal de que a entidade foi submodelada.

</details>

<details>
<summary>✅ Bom: associação pura com índice na FK inversa</summary>

```sql
CREATE TABLE student_courses
(
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,

  CONSTRAINT pk_student_courses PRIMARY KEY (student_id, course_id),
  CONSTRAINT fk_student_courses_students FOREIGN KEY (student_id)
    REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_courses_courses FOREIGN KEY (course_id)
    REFERENCES courses (id) ON DELETE CASCADE
);

CREATE INDEX ix_student_courses_course_id ON student_courses (course_id);
```

</details>

<details>
<summary>✅ Bom: associação com atributos vira entidade enrollments</summary>

```sql
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn');

CREATE TABLE enrollments
(
  id UUID NOT NULL DEFAULT uuidv7(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status enrollment_status NOT NULL DEFAULT 'active',
  final_grade NUMERIC(4, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT pk_enrollments PRIMARY KEY (id),
  CONSTRAINT uq_enrollments_student_course UNIQUE (student_id, course_id),
  CONSTRAINT fk_enrollments_students FOREIGN KEY (student_id)
    REFERENCES students (id),
  CONSTRAINT fk_enrollments_courses FOREIGN KEY (course_id)
    REFERENCES courses (id),
  CONSTRAINT ck_enrollments_final_grade CHECK (
    enrollments.final_grade IS NULL OR
    (enrollments.final_grade >= 0 AND
     enrollments.final_grade <= 10)
  ),
  CONSTRAINT ck_enrollments_completed_has_grade CHECK (
    enrollments.status != 'completed' OR
    enrollments.final_grade IS NOT NULL
  )
);

CREATE INDEX ix_enrollments_student_id ON enrollments (student_id);
CREATE INDEX ix_enrollments_course_id ON enrollments (course_id);
```

`students` não lista cursos diretamente; `courses` não lista alunos diretamente. O relacionamento mora em `enrollments`, que carrega data, status e nota. O `UNIQUE (student_id, course_id)` impede duplicata. O `CHECK` de coerência garante que nota final só existe quando o status é `completed`.

</details>

## Referência por FK (cross-aggregate via id)

Dentro do mesmo agregado, a FK garante integridade referencial e o JOIN é esperado: `order_items.order_id` liga à aggregate root. A aplicação carrega o agregado inteiro.

Cruzando a fronteira entre agregados, a FK ainda existe no banco para integridade referencial, mas a aplicação não usa JOIN para "carregar o customer dentro do order". Cada agregado é carregado com queries separadas. Se `orders` carregasse `customers` via JOIN em toda query, o cache de `orders` seria invalidado toda vez que o email do cliente mudasse.

<details>
<summary>❌ Ruim: query que faz JOIN cross-aggregate para "completar" o pedido</summary>

```sql
-- carregando Order + Customer em uma única query para "montar o objeto"
SELECT
  orders.id,
  orders.status,
  customers.name AS customer_name,
  customers.email AS customer_email,
  customers.phone AS customer_phone
FROM
  orders
JOIN
  customers ON orders.customer_id = customers.id
WHERE
  orders.id = $1;
```

A query retorna campos de `customers` que o agregado `orders` não precisa para suas invariantes. Se `customers` crescer (endereço, preferências, dados fiscais), a query cresce junto. O cache de `orders` fica acoplado ao ciclo de vida de `customers`.

</details>

<details>
<summary>✅ Bom: queries separadas por agregado, caller resolve o ID</summary>

```sql
-- query 1: carregar o agregado Order
SELECT
  orders.id,
  orders.customer_id,
  orders.status,
  orders.created_at
FROM
  orders
WHERE
  orders.id = $1 AND
  orders.deleted_at IS NULL;

-- query 2: carregar o agregado Customer (quando necessário para exibição)
SELECT
  customers.id,
  customers.name,
  customers.email
FROM
  customers
WHERE
  customers.id = $2 AND
  customers.deleted_at IS NULL;
```

`orders.customer_id` guarda só a referência. Quem precisa exibir o nome do cliente resolve o ID em query separada. Isso mantém os caches independentes e os agregados coesos.

</details>

## Status como ENUM ou CHECK

Quando uma tabela modela estado que pode mudar (`orders.status`, `enrollments.status`), há duas opções no PostgreSQL: **ENUM type** ou `VARCHAR` com `CHECK` constraint.

O **ENUM type** é mais rígido: o banco rejeita qualquer valor fora da lista e a validação é implícita. A desvantagem é a migração: adicionar um valor novo requer `ALTER TYPE ... ADD VALUE`, que não pode ser revertido em uma transação.

A alternativa portável é `VARCHAR` com `CHECK`: mais fácil de migrar (basta ampliar a lista no `CHECK`), funciona igual em SQL Server e SQLite, e permite o mesmo padrão de coerência com constraints adicionais.

<details>
<summary>✅ Bom: ENUM type para status sem dados adicionais por estado</summary>

```sql
CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT pk_orders PRIMARY KEY (id)
);
```

</details>

<details>
<summary>✅ Bom: VARCHAR + CHECK quando o estado carrega dados adicionais</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  customer_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT ck_orders_status CHECK (
    orders.status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')
  ),
  CONSTRAINT ck_orders_paid_has_paid_at CHECK (
    orders.status != 'paid' OR
    orders.paid_at IS NOT NULL
  ),
  CONSTRAINT ck_orders_shipped_has_shipped_at CHECK (
    orders.status != 'shipped' OR
    orders.shipped_at IS NOT NULL
  ),
  CONSTRAINT ck_orders_cancelled_has_reason CHECK (
    orders.status != 'cancelled' OR
    (orders.cancelled_at IS NOT NULL AND
     orders.cancel_reason IS NOT NULL)
  )
);
```

As constraints `CHECK` garantem coerência entre o status e os campos de data. Não é possível ter `status = 'paid'` sem `paid_at` preenchido. Adicionar um novo status é `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` — reversível dentro de uma transação.

</details>

## Multitenancy (tenant_id + RLS)

Em sistema multitenant, cada cliente (o tenant, ou inquilino) ocupa um espaço de dados isolado dentro da mesma instância. A regra crítica é uma: dado de um tenant nunca pode vazar para outro, seja em consulta, log, exportação, cache ou métrica.

A coluna `tenant_id UUID NOT NULL` fica na **aggregate root**. As tabelas filhas do agregado (ex.: `order_items`) não carregam `tenant_id`: são acessadas sempre pelo pai, que já tem o filtro. Tabelas de lookup global (países, moedas) não têm `tenant_id`.

O **RLS** do PostgreSQL é a segunda camada: mesmo que a aplicação esqueça o filtro, o banco aplica a policy automaticamente.

<details>
<summary>❌ Ruim: tenant_id duplicado em toda tabela filha</summary>

```sql
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,

  CONSTRAINT pk_orders PRIMARY KEY (id)
);

CREATE TABLE order_items
(
  id UUID NOT NULL DEFAULT uuidv7(),
  order_id UUID NOT NULL,
  tenant_id UUID NOT NULL, -- duplica o tenant_id de orders
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,

  CONSTRAINT pk_order_items PRIMARY KEY (id)
);
```

`order_items.tenant_id` é redundante: `order_items` é acessado sempre via `order_items.order_id`, que já está dentro do agregado filtrado por `tenant_id`. A duplicação cria risco de inconsistência (tenant diferente no item vs no pedido) e aumenta a superfície de queries que precisam checar o tenant.

</details>

<details>
<summary>✅ Bom: tenant_id só na aggregate root + RLS no PostgreSQL</summary>

```sql
-- tenant_id só em orders (aggregate root)
CREATE TABLE orders
(
  id UUID NOT NULL DEFAULT uuidv7(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_orders PRIMARY KEY (id),
  CONSTRAINT fk_orders_tenants FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
);

-- order_items: sem tenant_id; acesso sempre via order_id
CREATE TABLE order_items
(
  id UUID NOT NULL DEFAULT uuidv7(),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,

  CONSTRAINT pk_order_items PRIMARY KEY (id),
  CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE
);

-- RLS: ativa isolamento por tenant no banco
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_tenant_isolation ON orders
  USING (
    orders.tenant_id = current_setting('app.current_tenant')::UUID
  );
```

Para ativar o contexto na sessão: `SET app.current_tenant = '<uuid>'`. Com RLS ativo, toda query em `orders` recebe o filtro de tenant automaticamente, mesmo quando a aplicação omite o `WHERE`. A policy é a última linha de defesa.

> **Nota SQL Server**: row-level security equivalente via `CREATE SECURITY POLICY` com `WITH (STATE = ON)`.

</details>

## Anti-patterns

Os padrões abaixo aparecem com frequência em schemas reais, e cada um é um sinal de que a modelagem merece uma volta. Quando algum deles surgir na revisão, vale revisitar a tabela antes que o débito cresça e contamine queries e índices vizinhos.

**God Table**. Tabela com 25+ colunas misturando conceitos. Sintoma: o nome da tabela vira lista (`user_account_preferences_billing`). Tratamento: extrair value objects como colunas com prefixo ou tabelas satélite; separar em agregados quando os ciclos de vida divergem.

**Campos nullable por design ruim**. Tabela com 10 dos 20 campos sempre `NULL` para uma categoria de registros. Sintoma: queries precisam de `COALESCE` em todo acesso ou `IS NOT NULL` espalhado. Tratamento: extrair os opcionais em tabela satélite 1:1 (presente quando o conceito existe, ausente quando não).

**Lista mascarada como colunas numeradas**. `phone1`, `phone2`, `phone3` quando o domínio diz "muitos telefones". Sintoma: lógica `CASE WHEN phone1 IS NULL THEN ... WHEN phone2 IS NULL THEN ...`. Tratamento: tabela filha com FK e constraint de cardinalidade.

**JSONB como substituto de schema**. Coluna `data JSONB` contendo campos que deveriam ser colunas tipadas. Sintoma: queries com `->>'field'` em condições de filtro, sem índice. Tratamento: promover campos frequentemente filtrados para colunas — JSONB é para dados semi-estruturados genuinamente variáveis, não para escapar do DDL.

**Referência cruzada via JOIN em carga de agregado**. Query que faz JOIN em `customers` para "completar" o `orders`. Sintoma: cache de `orders` é invalidado quando `customers` muda. Tratamento: queries separadas por agregado; caller resolve o `customer_id`.

**Cross-aggregate sem FK no banco**. Remover FK entre agregados para "flexibilidade". Sintoma: `order_items.product_id` aponta para produtos deletados; inconsistência silenciosa. Tratamento: manter FK para integridade referencial; a FK não significa JOIN, significa contrato de existência.

**tenant_id em tabelas filhas**. Duplicar `tenant_id` em `order_items`, `invoice_lines`, `enrollment_grades`. Sintoma: risco de inconsistência entre tenant do pai e tenant do filho; surface de filtro aumenta. Tratamento: `tenant_id` só na aggregate root; filhos acessados sempre via FK para o pai.

**ENUM type para status com dados adicionais**. `CREATE TYPE order_status AS ENUM (...)` quando cada status precisa de campos extras (`paid_at`, `cancelled_at`). Sintoma: colunas de data sempre nullable sem garantia de preenchimento. Tratamento: `VARCHAR` + `CHECK` de coerência entre status e campos associados.

## Referências

Cross-links dentro do guia:

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): canônico transversal (modelagem OO)
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): boundary transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, eventual consistency
- [`../../../shared/platform/database.md`](../../../shared/platform/database.md): tuning, EXPLAIN, troubleshooting
- [`../sgbd/postgres.md`](../../sgbd/postgres.md): idiom PostgreSQL

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-e-modelagem-de-domínio).
