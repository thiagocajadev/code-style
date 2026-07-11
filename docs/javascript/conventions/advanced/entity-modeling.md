# Modelagem de entidades

> Escopo: JavaScript. O canônico [`docs/shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md) traz os 12 padrões de modelagem em JavaScript puro e é a fonte de verdade para decisões de domínio. Este arquivo cobre o que o canônico não detalha: os recursos da linguagem, de ES2022 em diante, que você usa na hora de escrever o código. São quatro: privacidade de verdade com `#field`, valor que não muda além do que o `const` garante, coleção exposta por `Symbol.iterator` e verificação de tipo numa linguagem sem tipos estáticos.

Os dois arquivos formam um par. O canônico explica o modelo; este mostra como expressar esse modelo com os recursos modernos da linguagem. Nada aqui repete o que já está lá, como tamanho saudável de entidade, BaseEntity, relacionamentos 1:N e N:N, identidade vs referência ou multitenancy.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **private class field** (`#field`, campo de classe privado) | Campo declarado com prefixo `#`; acessível apenas dentro do corpo da própria classe, sem acesso por herança nem por `Object.keys` |
| **WeakMap** (mapa de chaves fracas) | `Map` cujas chaves são objetos e não impedem o garbage collector de liberá-los; usado para encapsulamento externo à classe antes de ES2022 |
| **Symbol.iterator** (iterador simbólico) | Símbolo embutido que, quando definido em um objeto, o torna iterável com `for...of`; permite que agregados exponham coleções sem vazar a lista interna |
| **Object.freeze** (congelar objeto) | Impede adição, remoção e alteração de propriedades em um objeto; freeze raso não protege propriedades que são objetos aninhados |
| **defineProperty** (definir propriedade) | `Object.defineProperty(obj, key, descriptor)` configura os descritores `enumerable`, `configurable` e `writable` para controle fino de mutabilidade |
| **enumerable / configurable / writable** (descritores de propriedade) | Atributos internos de cada propriedade: `enumerable` controla se aparece em `for...in`, `configurable` controla se pode ser redefinida, `writable` controla se o valor pode ser alterado |
| **instanceof** (operador de verificação de tipo) | Testa se um objeto foi criado por um construtor específico; único mecanismo confiável para verificar strongly-typed IDs como classes em JavaScript puro |
| **prototype** (cadeia de protótipos) | Mecanismo de herança interno do JS; toda classe usa protótipos por baixo dos panos; entender a cadeia é necessário para saber o que `instanceof` verifica de fato |
| **Proxy** (interceptor de operações) | Objeto que envolve outro e intercepta operações (`get`, `set`, `deleteProperty`); útil para criar value objects que rejeitem qualquer alteração |
| **Reflect** (API de reflexão) | Conjunto de métodos estáticos que espelham operações do JS (`Reflect.get`, `Reflect.set`); usado com `Proxy` para delegar comportamentos padrão |

## Onde está o conteúdo principal

O canônico [`docs/shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md) cobre os 12 padrões em JavaScript puro, com Bad/Good completos para cada um. Todos valem sem adaptação neste projeto:

- Tamanho saudável da entidade (heurística 5-10, 10-15, 15+)
- Composição e quando extrair value objects
- Strongly-typed IDs com `instanceof`
- BaseEntity mínima vs inchada
- Propriedade vs lista e cardinalidade
- Relacionamentos 1:N com aggregate root
- Relacionamentos N:N e quando o relacionamento vira entidade
- Identidade vs referência entre agregados
- Multitenancy: `tenantId` só no aggregate root
- Anti-patterns: God Entity, BaseEntity inchada, lista mascarada, bidirecionalidade automática

Não replique esses padrões aqui. Quando um code review precisar discutir um deles, aponte para o canônico.

## Privacidade real: `#field` e WeakMap

O underscore não protege nada. `this._field` é um pedido de licença, e qualquer **caller** (quem chama o código) lê e altera o campo sem encontrar obstáculo, derrubando a invariante que a classe deveria garantir.

JavaScript tem duas formas de encapsular de verdade: o **private class field** (`#field`, campo privado disponível desde ES2022) e um **WeakMap** declarado fora da classe (padrão mais antigo, ainda útil em bibliotecas que rodam em ambientes sem transpiler).

<details>
<summary>❌ Ruim: encapsulamento por convenção não protege o estado</summary>

```js
class CustomerId {
  constructor(value) {
    if (!value) throw new Error("CustomerId requires value");
    this._value = value; // convenção, não privacidade
  }

  toString() {
    return this._value;
  }
}

const id = new CustomerId("cust-1");
id._value = null; // caller altera o estado interno sem restrição
console.log(id.toString()); // null: invariante quebrada
```

</details>

<details>
<summary>✅ Bom: private class field protege o valor após a construção</summary>

```js
class CustomerId {
  #value;

  constructor(value) {
    if (!value) throw new Error("CustomerId requires value");
    this.#value = value;
  }

  equals(other) {
    const isSameType = other instanceof CustomerId;
    const isSameValue = isSameType && other.#value === this.#value;
    return isSameValue;
  }

  toString() {
    return this.#value;
  }
}

const id = new CustomerId("cust-1");
id.#value = null; // SyntaxError em qualquer ambiente ES2022+
```

</details>

Quando o ambiente ainda não suporta `#field` (Node.js < 12, bundlers antigos), a alternativa é um `WeakMap` declarado fora da classe no mesmo módulo:

<details>
<summary>✅ Bom: WeakMap para encapsulamento sem suporte a private fields</summary>

```js
const customerIdValues = new WeakMap();

class CustomerId {
  constructor(value) {
    if (!value) throw new Error("CustomerId requires value");
    customerIdValues.set(this, value);
  }

  equals(other) {
    const isSameType = other instanceof CustomerId;
    const isSameValue = isSameType && customerIdValues.get(other) === customerIdValues.get(this);
    return isSameValue;
  }

  toString() {
    const stored = customerIdValues.get(this);
    return stored;
  }
}
```

O `WeakMap` mantém o valor fora do objeto. Quando a instância for coletada pelo **garbage collector** (coletor de lixo), a entrada some do mapa automaticamente. O caller nunca vê `customerIdValues` porque não é exportado.

</details>

## Valor que não muda: além do `const`

`const` protege menos do que parece. Ele garante que a variável não passe a apontar para outro objeto, mas não impede ninguém de alterar as propriedades do objeto apontado. Para um **value object** (objeto definido pelo valor que carrega, não por identidade própria), isso abre um buraco: o caller altera `address.city` mesmo com `address` declarado como `const`.

<details>
<summary>❌ Ruim: const não protege as propriedades internas</summary>

```js
class Address {
  constructor({ street, city, zipCode }) {
    this.street = street;
    this.city = city;
    this.zipCode = zipCode;
  }
}

const address = new Address({ street: "Av. Paulista", city: "São Paulo", zipCode: "01310-100" });
address.city = "Campinas"; // altera a propriedade sem erro
```

</details>

<details>
<summary>✅ Bom: Object.freeze impede alteração de propriedades primitivas</summary>

```js
class Address {
  constructor({ street, city, zipCode }) {
    this.street = street;
    this.city = city;
    this.zipCode = zipCode;
    Object.freeze(this);
  }

  withCity(newCity) {
    const updated = new Address({ street: this.street, city: newCity, zipCode: this.zipCode });
    return updated;
  }
}

const address = new Address({ street: "Av. Paulista", city: "São Paulo", zipCode: "01310-100" });
address.city = "Campinas"; // silencioso em modo sloppy; TypeError em strict mode
```

`Object.freeze` é raso: congela o objeto diretamente, mas não desce para objetos aninhados. Quando uma propriedade é ela própria um objeto, freeze não a protege.

</details>

<details>
<summary>✅ Bom: freeze profundo para value objects com propriedades aninhadas</summary>

```js
function deepFreeze(target) {
  const ownKeys = Object.getOwnPropertyNames(target);

  for (const key of ownKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    const isObjectValue = descriptor.value && typeof descriptor.value === "object";

    if (isObjectValue) {
      deepFreeze(descriptor.value);
    }
  }

  const frozen = Object.freeze(target);
  return frozen;
}

class Money {
  constructor({ amount, currency }) {
    this.amount = amount;
    this.currency = currency;
    deepFreeze(this);
  }

  add(other) {
    if (!(other instanceof Money)) {
      throw new TypeError("other must be Money");
    }
    if (other.currency !== this.currency) {
      throw new Error("Currency mismatch");
    }

    const result = new Money({ amount: this.amount + other.amount, currency: this.currency });
    return result;
  }
}
```

Para objetos com aninhamento profundo, prefira criar um objeto novo em vez de alterar o existente. `deepFreeze` é a rede de proteção; o caminho principal continua sendo o construtor que devolve um novo value object a cada mudança.

</details>

## Expor coleção sem vazar a lista

Exponha a coleção como iterável, nunca como o array interno. Um **aggregate root** (a entidade que governa o agregado e faz valer as regras dele) que devolve a própria lista deixa qualquer caller dar `push`, trocar elementos e furar as invariantes que a entidade deveria impor. Entregar um iterável mantém a porta fechada.

<details>
<summary>❌ Ruim: lista interna exposta diretamente, caller pode contornar o agregado</summary>

```js
class Order {
  constructor({ id, customerId }) {
    this.id = id;
    this.customerId = customerId;
    this.items = []; // array público
  }

  addItem({ productId, quantity, unitPrice }) {
    if (this.items.length >= 50) {
      throw new Error("Order can have at most 50 items");
    }

    this.items.push({ productId, quantity, unitPrice });
  }
}

const order = new Order({ id: "order-1", customerId: "cust-1" });
order.addItem({ productId: "prod-1", quantity: 1, unitPrice: 100 });

order.items.push({ productId: "bypass-item", quantity: 999, unitPrice: 0 });
// invariante do limite de 50 contornada sem passar por addItem
```

</details>

<details>
<summary>✅ Bom: Symbol.iterator expõe iteração sem vazar a referência da lista</summary>

```js
class Order {
  #items = [];

  constructor({ id, customerId }) {
    this.id = id;
    this.customerId = customerId;
  }

  addItem({ productId, quantity, unitPrice }) {
    if (this.#items.length >= 50) {
      throw new Error("Order can have at most 50 items");
    }

    this.#items.push({ productId, quantity, unitPrice });
  }

  removeItem(productId) {
    const remaining = this.#items.filter((item) => item.productId !== productId);
    this.#items.length = 0;
    this.#items.push(...remaining);
  }

  get itemCount() {
    return this.#items.length;
  }

  [Symbol.iterator]() {
    const snapshot = [...this.#items];
    return snapshot[Symbol.iterator]();
  }
}

const order = new Order({ id: "order-1", customerId: "cust-1" });
order.addItem({ productId: "prod-1", quantity: 2, unitPrice: 50 });

for (const item of order) {
  console.log(item.productId, item.quantity);
}

const items = [...order]; // cria um array novo a partir do iterador
```

O `snapshot = [...this.#items]` dentro do iterador garante que quem guardar o iterador em uma variável não veja as alterações seguintes na lista interna. A lista original continua acessível só pelo agregado.

</details>

Quando for preciso expor um método de leitura da coleção em formato de array, devolva uma cópia:

```js
lineItems() {
  const snapshot = [...this.#items];
  return snapshot;
}
```

Nunca `return this.#items` diretamente, mesmo sendo campo privado: quem recebe a referência pode alterar o array.

## Verificar o tipo no limite da função

Em TypeScript o compilador barra a troca de dois IDs de tipos diferentes antes de o código rodar. Em JavaScript puro não existe esse compilador, e o único mecanismo confiável é o `instanceof` logo na entrada da função.

O **duck-typing** (verificar o objeto pela forma dele, não pelo tipo) não resolve aqui. Dois **strongly-typed IDs** (identificadores com tipo próprio, como `CustomerId` e `OrderId`) têm exatamente a mesma forma: os dois expõem `.value`, os dois expõem `.toString()`. Só o `instanceof` responde qual construtor criou a instância.

<details>
<summary>❌ Ruim: duck-typing aceita qualquer objeto com .value, sem distinção de tipo</summary>

```js
function transferOwnership({ customerId, orderId }) {
  const isValidCustomer = customerId && typeof customerId.value === "string";
  const isValidOrder = orderId && typeof orderId.value === "string";

  if (!isValidCustomer || !isValidOrder) {
    throw new TypeError("Invalid arguments");
  }

  return orderRepository.update(orderId.value, { customerId: customerId.value });
}

const orderId = new OrderId("order-1");

// caller passa OrderId nos dois argumentos: duck-typing não detecta
transferOwnership({ customerId: orderId, orderId: orderId });
```

</details>

<details>
<summary>✅ Bom: instanceof verifica o construtor no boundary da função</summary>

```js
class CustomerId {
  #value;

  constructor(value) {
    if (!value) throw new Error("CustomerId requires value");
    this.#value = value;
  }

  toString() {
    return this.#value;
  }
}

class OrderId {
  #value;

  constructor(value) {
    if (!value) throw new Error("OrderId requires value");
    this.#value = value;
  }

  toString() {
    return this.#value;
  }
}

function transferOwnership({ customerId, orderId }) {
  if (!(customerId instanceof CustomerId)) {
    throw new TypeError("customerId must be CustomerId");
  }
  if (!(orderId instanceof OrderId)) {
    throw new TypeError("orderId must be OrderId");
  }

  return orderRepository.update(orderId.toString(), { customerId: customerId.toString() });
}

const correctCustomerId = new CustomerId("cust-1");
const correctOrderId = new OrderId("order-1");
const wrongId = new OrderId("order-2");

// TypeError: customerId must be CustomerId
transferOwnership({ customerId: wrongId, orderId: correctOrderId });

// funciona
transferOwnership({ customerId: correctCustomerId, orderId: correctOrderId });
```

O `instanceof` falha cedo, antes da lógica tocar o banco. Em ambientes com múltiplos **realms** (contextos de execução isolados: iframes, workers), `instanceof` pode falhar porque o construtor do outro realm é diferente; nesse caso, use um campo sentinel (`static [Symbol.hasInstance]`) ou uma propriedade discriminante explícita.

</details>

## Referências

- [`../../../shared/architecture/entity-modeling.md`](../../../shared/architecture/entity-modeling.md): **CANÔNICO**, os 12 padrões em JavaScript puro
- [`../../../shared/architecture/transactions.md`](../../../shared/architecture/transactions.md): limite transacional, Unit of Work
- [`../../../shared/architecture/domain-events.md`](../../../shared/architecture/domain-events.md): naming, outbox, consistência eventual
- [`null-safety.md`](null-safety.md): null-safety idiomático JS

Bibliografia externa (livros, artigos, especificações): [`REFERENCES.md`](../../../../REFERENCES.md#ddd-and-domain-modeling).
