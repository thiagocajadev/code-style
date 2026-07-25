# Princípios de design: conter o excesso

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

[`principles.md`](./principles.md) reúne os critérios que avaliam uma função escrita. Este documento trata de uma pergunta anterior: quanto desenho o problema merece. Os princípios abaixo existem porque a tendência de quem tem experiência é resolver o problema de amanhã junto com o de hoje, e o desenho antecipado acrescenta estrutura que ninguém consegue avaliar no momento em que a escreve.

Frederick Brooks separou os dois tipos de dificuldade que aparecem num sistema. A **essential complexity** (complexidade essencial) vem do problema: calcular imposto por estado é difícil porque a lei é difícil. A **accidental complexity** (complexidade acidental) vem das escolhas de quem construiu: uma camada a mais, um ponto de extensão sem uso, uma abstração que uniu duas coisas diferentes. Os princípios deste documento tratam da segunda.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **KISS** (Keep It Simple, Stupid · Mantenha Simples) | Preferir a solução direta enquanto ela resolver o problema atual |
| **YAGNI** (You Aren't Gonna Need It · Você Não Vai Precisar Disso) | Não construir para requisito que ainda não existe |
| **DRY** (Don't Repeat Yourself · Não Se Repita) | Cada decisão de negócio tem um único lugar no código |
| **Rule of Three** (regra das três ocorrências) | Extrair a abstração na terceira repetição, não na segunda |
| **SoC** (Separation of Concerns · Separação de Responsabilidades) | Apresentação, domínio e persistência ocupam camadas distintas |
| **Law of Demeter** (Lei de Deméter · princípio do menor conhecimento) | Um objeto conversa com seus vizinhos diretos, sem atravessar a estrutura interna deles |
| **composition** (composição) | Montar comportamento juntando peças, em vez de herdar de uma classe base |
| **essential complexity** (complexidade essencial) | Dificuldade que vem do problema e não pode ser removida |
| **accidental complexity** (complexidade acidental) | Dificuldade que veio das escolhas de construção e pode ser removida |

## Referência rápida

| Princípio | Pergunta que responde | Sinal de violação |
|---|---|---|
| [KISS](#kiss) | Esta solução é mais elaborada que o problema? | Mecanismo genérico servindo dois casos concretos |
| [YAGNI](#yagni) | Alguém pediu isso? | Parâmetro que nenhum chamador passa; ramo que lança "não implementado" |
| [DRY](#dry) | Esta decisão de negócio mora em quantos lugares? | Alíquota, prazo ou limite escrito duas vezes |
| [Separação de responsabilidades](#separation-of-concerns) | Que camadas esta função atravessa? | SQL e HTML na mesma função |
| [Lei de Deméter](#law-of-demeter) | De quantas estruturas alheias esta função depende? | `pedido.cliente.endereco.cep` |
| [Composição sobre herança](#composition-over-inheritance) | As características se combinam? | Classe cujo nome lista três características |
| [Menor surpresa](#least-astonishment) | O nome entrega o que promete? | `getUser` que grava no banco |
| [Regra do escoteiro](#boy-scout-rule) | O arquivo saiu melhor do que entrou? | Refatoração acumulada para "um dia" |

---

<a id="kiss"></a>

## KISS: a solução acompanha o tamanho do problema

Escrever uma solução genérica faz sentido quando existem vários casos para ela resolver. Com dois casos na mão, o mecanismo genérico só acrescenta mais uma camada para o próximo leitor atravessar antes de achar o que procurava.

<details>
<summary>❌ Ruim: um interpretador de regras para validar dois campos</summary>

```js
const validationRules = [
  { field: "email", operator: "matches", value: EMAIL_PATTERN, message: "e-mail inválido" },
  { field: "age", operator: "greaterThan", value: 17, message: "menor de idade" },
];

const operators = {
  matches: (fieldValue, expected) => expected.test(fieldValue),
  greaterThan: (fieldValue, expected) => fieldValue > expected,
  lessThan: (fieldValue, expected) => fieldValue < expected,
  equals: (fieldValue, expected) => fieldValue === expected,
};

function validate(customer) {
  const errors = [];

  for (const rule of validationRules) {
    const check = operators[rule.operator];

    if (!check(customer[rule.field], rule.value)) {
      errors.push(rule.message);
    }
  }

  return errors;
}
```

Dois campos justificaram um interpretador com quatro operadores, dois deles sem nenhum uso. Para descobrir por que um cadastro foi recusado, o leitor cruza a tabela de regras com a tabela de operadores. O `17` também esconde a intenção: a regra de negócio é maioridade aos 18.

</details>

<details>
<summary>✅ Bom: as duas regras escritas como são</summary>

```js
const MINIMUM_AGE = 18;

function validateCustomer(customer) {
  const errors = [];

  if (!EMAIL_PATTERN.test(customer.email)) {
    errors.push("e-mail inválido");
  }

  if (customer.age < MINIMUM_AGE) {
    errors.push("menor de idade");
  }

  return errors;
}
```

Cada condição fica ao lado do motivo da recusa, na ordem em que o negócio as descreve. Quando as regras chegarem a dez e passarem a vir do banco, o interpretador volta à mesa com um problema concreto para resolver.

</details>

**O contraponto**: KISS não autoriza a função de duzentas linhas com seis níveis de `if`. Escrever tudo em linha reta também é uma forma de empurrar a dificuldade para quem lê. O alvo é a solução mais direta que ainda deixa cada decisão visível.

---

<a id="yagni"></a>

## YAGNI: construir para o requisito que existe

Todo desenho antecipado aposta em como o requisito vai chegar. Quando a aposta erra, o sistema fica com uma estrutura que atrapalha e que alguém precisa desmontar antes de resolver o problema real. Quando acerta, o time pagou por meses de manutenção de um código que ficou parado.

<details>
<summary>❌ Ruim: quatro opções de exportação, duas delas sem implementação</summary>

```js
async function exportOrders(orders, options = {}) {
  const format = options.format ?? "csv";
  const compression = options.compression ?? "none";
  const destination = options.destination ?? "download";

  if (format === "xlsx") {
    throw new Error("xlsx export not implemented yet");
  }

  if (format === "pdf") {
    throw new Error("pdf export not implemented yet");
  }

  const content = buildCsv(orders, compression, destination);
  return content;
}
```

A assinatura anuncia três formatos, e o sistema entrega um. Quem lê o código acredita que o XLSX funciona, e a descoberta acontece em produção. `compression` e `destination` atravessam a função inteira carregando o valor padrão que ninguém nunca trocou.

</details>

<details>
<summary>✅ Bom: a função que o produto pediu, com o nome do que ela faz</summary>

```js
function exportOrdersAsCsv(orders) {
  const rows = orders.map(formatOrderAsCsvRow);
  const content = rows.join("\n");
  return content;
}

function formatOrderAsCsvRow(order) {
  const columns = [order.id, order.customerName, order.total];
  const row = columns.join(";");
  return row;
}
```

O nome diz o formato, e nenhum caminho lança "ainda não implementado". Quando o XLSX for pedido, ele entra como `exportOrdersAsXlsx`. É nesse momento que o formato vira parâmetro, com duas implementações reais na mesa para comparar.

</details>

**Onde YAGNI não se aplica**: decisões difíceis de reverter continuam merecendo pensamento antecipado. Escolha de banco, formato de identificador público, modelo de autenticação e o limite entre os módulos são difíceis de trocar depois, e a troca costuma exigir migração de dados. YAGNI vale para o que uma refatoração de uma tarde resolve.

---

<a id="dry"></a>

## DRY: uma decisão de negócio, um lugar

DRY trata de conhecimento repetido, e não de texto repetido. Duas funções com o mesmo formato que respondem a decisões de negócio diferentes não violam DRY, mesmo que o código seja idêntico. Uma alíquota escrita em dois lugares viola, mesmo que os dois trechos não se pareçam.

<details>
<summary>❌ Ruim: a alíquota de imposto escrita em dois lugares</summary>

```js
function calculateInvoiceTotal(items) {
  const subtotal = sumItems(items);
  const tax = subtotal * 0.17;

  const total = subtotal + tax;
  return total;
}

function calculateQuoteTotal(items) {
  const subtotal = sumItems(items);
  const tax = subtotal * 0.17;

  const total = subtotal + tax;
  return total;
}
```

A alíquota é uma decisão de negócio, e ela mora em dois lugares. Quando a lei mudar, alguém atualiza uma função e esquece a outra. A nota fiscal e o orçamento passam a divergir, e nenhum teste acusa, porque cada um confere o próprio número.

</details>

<details>
<summary>✅ Bom: a alíquota tem nome e um lugar só</summary>

```js
const TAX_RATE = 0.17;

function calculateTaxedTotal(items) {
  const subtotal = sumItems(items);
  const tax = subtotal * TAX_RATE;

  const total = subtotal + tax;
  return total;
}
```

A mudança na lei toca uma linha. Nota fiscal e orçamento passam a chamar a mesma função e não têm como divergir.

</details>

### Quando DRY produz acoplamento

O caminho oposto é mais comum e mais difícil de desfazer: dois trechos que se pareciam num dia foram unidos, e cada requisito posterior acrescentou um parâmetro para separar de novo o que nunca foi igual.

<details>
<summary>❌ Ruim: uma validação para produto e usuário, decidindo por quem chamou</summary>

```js
function validateName(name, entityType) {
  const maxLength = entityType === "product" ? 200 : 100;
  const allowsDigits = entityType === "product";
  const errors = [];

  if (name.length > maxLength) {
    errors.push("nome longo demais");
  }

  if (!allowsDigits && /\d/.test(name)) {
    errors.push("nome não aceita números");
  }

  return errors;
}
```

Produto e usuário nunca compartilharam a mesma regra de negócio. Eles compartilharam um formato, no dia da unificação. Agora a função decide o comportamento a partir de quem chamou, e cada requisito novo de produto abre o arquivo que valida usuário.

</details>

<details>
<summary>✅ Bom: cada regra no seu lugar, com a mensagem que o usuário lê</summary>

```js
const PRODUCT_NAME_MAX_LENGTH = 200;
const USER_NAME_MAX_LENGTH = 100;

function validateProductName(name) {
  const errors = [];

  if (name.length > PRODUCT_NAME_MAX_LENGTH) {
    errors.push("nome de produto longo demais");
  }

  return errors;
}

function validateUserName(name) {
  const errors = [];

  if (name.length > USER_NAME_MAX_LENGTH) {
    errors.push("nome de usuário longo demais");
  }

  if (/\d/.test(name)) {
    errors.push("nome de usuário não aceita números");
  }

  return errors;
}
```

As duas evoluem sem se consultar, e a mensagem de erro passa a dizer qual campo falhou. A repetição aqui são duas linhas. O acoplamento obrigava a revisar o código de produto toda vez que a regra de usuário mudava.

</details>

A **Rule of Three** dá o critério: na segunda ocorrência, anote e siga. Na terceira, as partes que variam já ficaram visíveis, e a abstração sai com a forma certa. O mesmo critério aparece em [`methodologies.md`](../process/methodologies.md), no desenvolvimento orgânico.

---

<a id="separation-of-concerns"></a>

## Separação de responsabilidades: uma camada por função

O SRP pergunta quantos motivos existem para reabrir um módulo. A separação de responsabilidades pergunta outra coisa: quantas camadas do sistema uma função atravessa. Buscar dado, decidir regra e montar saída são três camadas, e uma função que faz as três prende a regra de negócio dentro da camada mais volátil.

<details>
<summary>❌ Ruim: consulta, regra de desconto e HTML na mesma função</summary>

```js
async function renderOrderSummary(orderId) {
  const [order] = await connection`SELECT * FROM orders WHERE id = ${orderId}`;
  const discount = order.total > 500 ? order.total * 0.1 : 0;
  const finalTotal = order.total - discount;

  return `<div class="summary">
    <span>Total: R$ ${finalTotal.toFixed(2)}</span>
  </div>`;
}
```

O desconto de 10% acima de R$ 500 é conhecimento de negócio, e agora mora dentro de uma função de apresentação. Quando o aplicativo mobile precisar do mesmo desconto, alguém vai reescrever a regra, e as duas versões vão divergir na primeira mudança de faixa.

</details>

<details>
<summary>✅ Bom: cada camada com sua função</summary>

```js
const VOLUME_DISCOUNT_THRESHOLD = 500;
const VOLUME_DISCOUNT_RATE = 0.1;

async function renderOrderSummary(orderId) {
  const order = await orderRepository.findById(orderId);
  const summary = buildOrderSummary(order);

  const html = renderSummaryTemplate(summary);
  return html;
}

function buildOrderSummary(order) {
  const discount = calculateVolumeDiscount(order.total);
  const finalTotal = order.total - discount;

  const summary = { discount, finalTotal };
  return summary;
}

function calculateVolumeDiscount(total) {
  if (total <= VOLUME_DISCOUNT_THRESHOLD) {
    const noDiscount = 0;
    return noDiscount;
  }

  const discount = total * VOLUME_DISCOUNT_RATE;
  return discount;
}
```

A regra de desconto virou uma função que recebe um número e devolve outro. O aplicativo mobile chama a mesma função, e o teste dela não precisa de banco nem de template.

</details>

---

<a id="law-of-demeter"></a>

## Lei de Deméter: falar com o vizinho, não com o vizinho do vizinho

Uma função que percorre `pedido.cliente.endereco.cep` declara que conhece a estrutura interna de três objetos. Qualquer um dos três pode mudar de forma, e a função quebra por um motivo que não tem nada a ver com o que ela calcula.

A regra prática: dentro de um método, chame apenas o que veio por parâmetro, o que a própria classe guarda, e o que você mesmo criou ali.

<details>
<summary>❌ Ruim: a função de frete conhece a estrutura de três objetos</summary>

```js
function calculateFreight(order) {
  const zipCode = order.customer.address.zipCode;
  const regionCode = zipCode.slice(0, 2);
  const region = shippingTable.regions[regionCode];

  const cost = order.items.length * region.ratePerItem;
  return cost;
}
```

O cálculo de frete depende do formato de `Customer`, de `Address` e do mapa interno da tabela de regiões. Um pedido sem endereço quebra duas propriedades depois do ponto onde o dado faltou, e a mensagem de erro aponta para `zipCode` em vez de apontar para o cadastro incompleto.

</details>

<details>
<summary>✅ Bom: cada objeto responde por si</summary>

```js
function calculateFreight(order) {
  const region = shippingTable.findRegionFor(order.deliveryZipCode);
  const cost = region.calculateCostFor(order.itemCount);
  return cost;
}
```

`Order` entrega o CEP de entrega sem expor o caminho até ele, e a tabela de regiões sabe calcular o próprio custo. O pedido sem endereço passa a ser tratado dentro de `Order`, onde o dado mora e onde a mensagem de erro faz sentido.

</details>

**Onde a lei não se aplica**: estruturas de dados sem comportamento, como a resposta de uma API já validada ou um objeto de configuração, existem para ter os campos lidos. Encapsular uma delas atrás de métodos acrescenta cerimônia sem proteger nada.

---

<a id="composition-over-inheritance"></a>

## Composição sobre herança: características se combinam

Herança encadeia características numa linha. Quando as características são independentes e se combinam livremente, a linha não dá conta: cada combinação nova pede uma classe, e o total cresce como potência do número de características.

<details>
<summary>❌ Ruim: uma classe para cada combinação de características</summary>

```js
class Report {}

class PdfReport extends Report {}

class ScheduledPdfReport extends PdfReport {}

class ScheduledEncryptedPdfReport extends ScheduledPdfReport {}

class ScheduledEncryptedCsvReport extends Report {}
```

Formato, agendamento e criptografia variam sem depender uns dos outros. A árvore precisa de uma classe por combinação, e a última já foi escrita fora da hierarquia porque não havia onde encaixá-la. Com uma quarta característica, a contagem dobra de novo.

</details>

<details>
<summary>✅ Bom: formato e entrega viram peças montadas na composição</summary>

```js
class Report {
  constructor(formatter, deliveries) {
    this.formatter = formatter;
    this.deliveries = deliveries;
  }

  async publish(rows) {
    const document = this.formatter.format(rows);

    for (const delivery of this.deliveries) {
      await delivery.send(document);
    }
  }
}

const monthlyRevenueReport = new Report(new PdfFormatter(), [
  new EncryptedUpload(),
  new ScheduledEmail(),
]);
```

Uma característica nova entra como uma classe, e não como um ramo novo em toda a árvore. As combinações passam a ser decididas na montagem, onde quem lê enxerga o relatório inteiro numa expressão.

</details>

Herança continua correta quando existe uma relação de subtipo de verdade e as variações não se combinam. O critério é o [LSP](solid.md#liskov-substitution): se a subclasse cumpre a promessa da base sem exceção, a herança está no lugar.

---

<a id="least-astonishment"></a>

## Menor surpresa: o nome entrega o que promete

Quem lê uma chamada decide se precisa abrir a função a partir do nome. Um nome que esconde efeito colateral, custo de rede ou possibilidade de ausência transfere para o leitor um trabalho que ele não sabe que tem.

<details>
<summary>❌ Ruim: o nome promete leitura, e a função grava no banco</summary>

```js
function getUserById(userId) {
  const user = database.users.findById(userId);

  if (!user) {
    const guest = database.users.create({ id: userId, role: "guest" });
    return guest;
  }

  return user;
}
```

Um relatório que percorre uma lista de identificadores e chama `getUserById` cria uma conta para cada identificador que não existe. O `get` também sugere leitura barata de memória, e a função vai ao banco duas vezes.

</details>

<details>
<summary>✅ Bom: o nome diz o que acontece</summary>

```js
async function findUserById(userId) {
  const user = await userRepository.findById(userId);
  return user;
}

async function registerGuestUser(userId) {
  const guest = User.asGuest(userId);

  const savedGuest = await userRepository.save(guest);
  return savedGuest;
}
```

`find` avisa que pode não achar, e a ausência deixa de surpreender quem chama. `register` avisa que grava. O `await` na chamada mostra que existe I/O no caminho. É a separação entre consulta e comando de [`principles.md`](./principles.md), aplicada ao nome antes de ser aplicada ao corpo.

</details>

---

<a id="boy-scout-rule"></a>

## Regra do escoteiro: o arquivo sai melhor do que entrou

Cada passagem por um arquivo deixa uma melhoria pequena: um nome mais preciso, uma constante nomeada, um comentário desatualizado removido. A qualidade sobe sem nenhuma tarefa de refatoração no backlog, e nenhuma revisão precisa avaliar uma mudança grande de uma vez.

O limite da regra é o tamanho da limpeza. Uma melhoria que faz o revisor perder o assunto do `pull request` deixa de ser limpeza de passagem.

| Cabe na passagem | Vira tarefa própria |
|---|---|
| Renomear variável para o nome do domínio | Renomear um conceito no sistema inteiro |
| Extrair uma constante nomeada | Extrair um módulo |
| Remover comentário que descreve o óbvio | Reescrever a documentação da camada |
| Quebrar uma função de trinta linhas que você já está editando | Quebrar uma classe que você só leu |
| Corrigir o nome de um teste | Reestruturar a suíte |

A regra funciona quando existem testes cobrindo o comportamento. Sem eles, cada limpeza de passagem é uma aposta, e a revisão não tem como distinguir a melhoria de uma mudança de comportamento acidental.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Os critérios de avaliação de uma função já escrita | [`principles.md`](./principles.md) |
| Os cinco princípios de design orientado a objetos | [`solid.md`](./solid.md) |
| O catálogo de padrões que implementa essas ideias | [`patterns.md`](./patterns.md) |
| Desenvolvimento orgânico e a regra das três ocorrências no processo | [`../process/methodologies.md`](../process/methodologies.md) |
| O limite de tamanho de uma entidade e de um agregado | [`entity-modeling.md`](./entity-modeling.md) |
