# Formatos e Integrações

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Sistemas reais raramente consomem apenas **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) sobre **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto). Configuração de ferramentas, APIs de parceiros, integração fiscal e hardware periférico exigem conhecer outros formatos e protocolos. Este guia cobre os padrões mais comuns — dos modernos aos legados.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **GraphQL** | Linguagem de consulta para APIs; o cliente define exatamente quais campos quer — não é banco de dados |
| **TOML** (Tom's Obvious, Minimal Language) | Formato de configuração legível com semântica clara e tipos nativos; comum em Rust, Python e Go |
| **YAML** (YAML Ain't Markup Language, YAML Não é uma Linguagem de Marcação) | Formato hierárquico baseado em indentação; dominante em CI/CD, Kubernetes e automação |
| **SOAP** (Simple Object Access Protocol, Protocolo Simples de Acesso a Objetos) | Protocolo de comunicação baseado em XML; padrão em WebServices legados e sistemas fiscais brasileiros |
| **WSDL** (Web Services Description Language, Linguagem de Descrição de WebServices) | Documento XML que descreve métodos, tipos e endereços de um WebService SOAP |
| **XSD** (XML Schema Definition, Definição de Esquema XML) | Define a estrutura válida de um documento XML; usado para validar NF-e, CT-e e outros documentos fiscais |
| **Namespace XML** | Prefixo URI que distingue elementos de schemas diferentes no mesmo documento XML |
| **CSV** (Comma-Separated Values, valores separados por vírgula) | Formato tabular em texto plano; separador pode ser vírgula, ponto-e-vírgula ou pipe |
| **Fixed-width** (largura fixa) | Formato de arquivo texto onde cada campo ocupa posições fixas na linha; comum em CNAB e SINTEGRA |
| **CNAB** (Centro Nacional de Automação Bancária, Centro Nacional de Automação Bancária) | Padrão de arquivo texto para remessa e retorno bancário (cobranças, pagamentos); linhas de 240 ou 400 caracteres |
| **SPED** (Sistema Público de Escrituração Digital, Sistema Público de Escrituração Digital) | Obrigação fiscal digital brasileira; arquivos pipe-delimited com registros tipados (SPED Fiscal, SPED Contábil) |
| **NF-e** (Nota Fiscal eletrônica) | Documento fiscal digital brasileiro emitido como XML assinado e transmitido à SEFAZ |
| **CT-e** (Conhecimento de Transporte eletrônico) | Documento fiscal para transporte de cargas; mesmo modelo XML/SEFAZ da NF-e |
| **ZPL** (Zebra Programming Language, Linguagem de Programação Zebra) | Linguagem de comandos para impressoras térmicas Zebra; usada para etiquetas, códigos de barras e romaneios |
| **RS-232** (Recommended Standard 232) | Padrão de comunicação via porta serial; base da integração com balanças, impressoras antigas e equipamentos industriais |
| **SSE** (Server-Sent Events, Eventos Enviados pelo Servidor) | Protocolo HTTP de streaming unidirecional; padrão de entrega incremental de respostas em APIs de LLM |
| **LLM API** | API REST de modelo de linguagem; cobra por token, entrega resposta via streaming SSE e impõe rate limits por minuto |

---

## GraphQL

**GraphQL** é uma linguagem de consulta para APIs — não um banco de dados. O cliente define exatamente quais campos quer; o servidor responde apenas com esses campos, eliminando **over-fetching** (busca excessiva) e **under-fetching** (busca insuficiente).

```graphql
query {
  order(id: "123") {
    id
    status
    customer {
      name
      email
    }
  }
}
```

**Quando considerar GraphQL:**

- Múltiplos clientes (mobile, web, parceiros) com necessidades de dados muito diferentes
- Over-fetching recorrente em APIs **REST** (Representational State Transfer, Transferência de Estado Representacional) existentes que não podem ser quebradas
- Produto com queries de alto dinamismo que mudam com frequência

**Quando não usar:**

- APIs internas simples com poucos consumidores; REST é mais simples de cachear e monitorar
- Quando o time não tem familiaridade; a curva de aprendizado de schema, resolvers e N+1 interno é real

---

## TOML

**TOML** é preferível a **YAML** quando a configuração tem tipagem explícita ou estruturas planas. Erros de indentação não quebram o arquivo — a sintaxe usa `=` e `[seção]`, não espaços como delimitadores.

```toml
# config.toml
[database]
host = "localhost"
port = 5432
name = "app_db"

[server]
port = 8080
timeout = 30

[features]
maintenance_mode = false
```

Comum em: `Cargo.toml` (Rust), `pyproject.toml` (Python), configurações de ferramentas CLI.

---

## YAML

**YAML** domina configuração de infraestrutura: pipelines de **CI/CD** (Continuous Integration and Continuous Delivery, Integração e Entrega Contínuas — **CI**, Integração Contínua; **CD**, Entrega Contínua), Kubernetes, Docker Compose e ferramentas de automação. A hierarquia via indentação é expressiva, mas um tab no lugar de espaço quebra silenciosamente o parse.

```yaml
# docker-compose.yml
services:
  api:
    image: app:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://localhost/app_db
```

**Armadilhas comuns:**

- Valores `yes`, `no`, `on`, `off`, `true`, `false` são interpretados como boolean sem aspas — usar aspas se o valor for string
- Chaves duplicadas no mesmo nível são aceitas pelo parser; a última sobrescreve sem erro
- Tabs não são aceitos como indentação; usar sempre espaços

---

## Legado

Protocolos e formatos de sistemas anteriores ao JSON/REST. Presentes em integração fiscal, bancária, industrial e de hardware periférico.

### XML e WebServices SOAP

WebServices **SOAP** são o padrão de integração em sistemas fiscais brasileiros (**NF-e**, **CT-e**, **NFS-e**) e em sistemas legados corporativos. A comunicação ocorre via **SOAP Envelope** (envelope SOAP) — um **XML** (eXtensible Markup Language, Linguagem de Marcação Extensível) com estrutura fixa — e o contrato do serviço é descrito em um arquivo **WSDL**.

O erro mais comum é navegar o XML sem levar em conta os namespaces. Um documento NF-e tem namespace `http://www.portalfiscal.inf.br/nfe`; ignorá-lo faz toda navegação retornar nulo silenciosamente. Em Node.js, a biblioteca `@xmldom/xmldom` fornece `DOMParser` com suporte a namespaces.

<details>
<summary>❌ Bad: getElementsByTagName ignora namespace — retorna null sem erro</summary>
<br>

```js
import { DOMParser } from '@xmldom/xmldom';

const doc = new DOMParser().parseFromString(xml, 'text/xml');

// sem namespace: não encontra o nó em documento fiscal com prefixo nfe:
const invoiceNumber = doc.getElementsByTagName('nNF')[0].textContent;
```

</details>

<br>

<details>
<summary>✅ Good: getElementsByTagNameNS com namespace explícito e navegação segura</summary>
<br>

```js
import { DOMParser } from '@xmldom/xmldom';

const NS = 'http://www.portalfiscal.inf.br/nfe';

function extractInvoiceNumber(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const ide = doc.getElementsByTagNameNS(NS, 'ide')[0];
  const invoiceNumber = ide?.getElementsByTagNameNS(NS, 'nNF')[0]?.textContent ?? null;

  const hasInvoiceNumber = invoiceNumber !== null;
  if (!hasInvoiceNumber) throw new ValidationError({ message: 'Invoice number not found in XML.' });

  return invoiceNumber;
}
```

</details>

<br>

**Boas práticas ao consumir WebServices SOAP:**

- Validar o XML recebido contra o **XSD** antes de processar; sistemas fiscais têm schemas públicos disponibilizados pela SEFAZ
- Nunca concatenar strings para montar o envelope SOAP; usar cliente gerado a partir do **WSDL** ou biblioteca dedicada
- Guardar o XML bruto recebido para auditoria antes de fazer parse; documentos fiscais têm valor legal
- O retorno da SEFAZ inclui código de status no campo `cStat`; tratar os códigos conhecidos (100 = autorizado, 204 = sem registros) antes de lançar erro genérico

---

### Arquivos de Texto — TXT, CSV, Fixed-width

Integrações bancárias (**CNAB**), obrigações fiscais (**SPED**), exportações de ERP e transferências entre sistemas legados frequentemente usam arquivos texto com layout fixo ou delimitado. O maior risco é espalhar posições e índices mágicos pelo código — quando o layout muda, a quebra é silenciosa.

#### CSV e pipe-delimited

Arquivos **SPED** usam pipe como separador. Cada linha começa com o tipo de registro (`|0000|`, `|C100|`).

<details>
<summary>❌ Bad: índices mágicos espalhados — quebra silenciosamente se o layout mudar</summary>
<br>

```js
const fields = line.replace(/^\||\|$/g, '').split('|');

const companyRegistrationNumber = fields[6]; // CNPJ
const companyName = fields[5];
const periodStart = fields[3];
```

</details>

<br>

<details>
<summary>✅ Good: parser dedicado com campos nomeados</summary>
<br>

```js
function parseRecord0000(line) {
  const fields = line.replace(/^\||\|$/g, '').split('|');

  const record = {
    periodStart: fields[3],
    periodEnd: fields[4],
    companyName: fields[5],
    companyRegistrationNumber: fields[6], // CNPJ
  };

  return record;
}
```

</details>

#### Fixed-width — CNAB

Arquivos **CNAB** (240 ou 400 caracteres por linha) definem cada campo por posição e comprimento. Números sem nome espalhados pelo código tornam qualquer manutenção de layout um risco.

<details>
<summary>❌ Bad: posições hardcoded inline — impossível auditar contra o manual do banco</summary>
<br>

```js
const bankCode = line.slice(0, 3);
const serviceBatch = line.slice(3, 7);
const recordType = line.slice(7, 8);
const companyRegistrationNumber = line.slice(18, 32); // CNPJ
```

</details>

<br>

<details>
<summary>✅ Good: layout como objeto, helper nomeado — posição e comprimento declarados juntos</summary>
<br>

```js
const CNAB240_HEADER = {
  bankCode:     { pos: 0,  len: 3  },
  serviceBatch: { pos: 3,  len: 4  },
  recordType:   { pos: 7,  len: 1  },
  companyRegistrationNumber: { pos: 18, len: 14 }, // CNPJ
};

function extractField(line, { pos, len }) {
  const field = line.slice(pos, pos + len);
  return field;
}
```

```js
const bankCode = extractField(line, CNAB240_HEADER.bankCode);
const companyRegistrationNumber = extractField(line, CNAB240_HEADER.companyRegistrationNumber); // CNPJ
```

</details>

<br>

**Boas práticas para arquivos texto:**

- Validar encoding antes de processar; arquivos legados brasileiros frequentemente usam **ISO** (International Organization for Standardization, Organização Internacional de Normalização)-8859-1 (Latin-1) — em Node.js, usar `{ encoding: 'latin1' }` no `fs.readFile`
- Verificar total de linhas e somatório de valores contra os registros de trailer antes de importar
- Nunca processar arquivo parcialmente — ler tudo, validar estrutura, só então persistir
- Guardar o arquivo original para reprocessamento; falhas de layout são comuns em integrações bancárias e fiscais

---

### Impressoras Térmicas — ZPL

Impressoras Zebra usam **ZPL** como protocolo nativo. Cada etiqueta é um programa ZPL enviado como texto puro via porta serial, TCP/IP (porta 9100) ou USB. Para envio TCP, basta abrir um socket para `ip:9100` e escrever a string — nenhum driver especial necessário.

Estrutura mínima de uma etiqueta ZPL:

```
^XA              ; início do label
^FO50,50         ; posição de origem (x, y em pontos)
^A0N,30,30       ; fonte, altura, largura
^FDTexto^FS      ; conteúdo do campo
^XZ              ; fim do label
```

<details>
<summary>❌ Bad: ZPL montado por concatenação — posições e campos difíceis de manter</summary>
<br>

```js
const zpl = '^XA^FO50,50^A0N,30,30^FD' + product.name + '^FS'
          + '^FO50,100^BCN,80,Y,N,N^FD' + product.barcode + '^FS'
          + '^FO50,200^A0N,20,20^FDLote: ' + product.lot + '^FS^XZ';

port.write(zpl);
```

</details>

<br>

<details>
<summary>✅ Good: template dedicado, campos via destructuring</summary>
<br>

```js
function buildProductLabel({ name: productName, barcode, lot: lotNumber }) {
  const label = [
    '^XA',
    `^FO50,50^A0N,30,30^FD${productName}^FS`,
    `^FO50,100^BCN,80,Y,N,N^FD${barcode}^FS`,
    `^FO50,200^A0N,20,20^FDLote: ${lotNumber}^FS`,
    '^XZ',
  ].join('\n');

  return label;
}
```

```js
const label = buildProductLabel(product);
port.write(label);
```

</details>

<br>

**Principais comandos ZPL:**

| Comando | Função |
|---|---|
| `^XA` / `^XZ` | Início e fim do label |
| `^FO x,y` | Posição de origem do próximo campo |
| `^A0N,h,w` | Fonte escalável — altura e largura em pontos |
| `^FD…^FS` | Conteúdo do campo (Field Data / Field Separator) |
| `^BCN,h,Y,N,N` | Código de barras Code 128 |
| `^BQN,2,10` | QR Code |
| `^PQ n` | Quantidade de cópias |

---

### Porta Serial — RS-232

Balanças, catracas, leitores de código de barras antigos e equipamentos industriais frequentemente se comunicam via porta serial **RS-232**. Em Node.js, o pacote `serialport` expõe a leitura via stream de eventos — sem timeout configurado, o processo aguarda indefinidamente se o equipamento não responder.

<details>
<summary>❌ Bad: sem timeout — aguarda indefinidamente, sem tratamento de erro</summary>
<br>

```js
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (rawLine) => {
  const weight = parseWeight(rawLine);
});
```

</details>

<br>

<details>
<summary>✅ Good: timeout explícito, porta fechada em todos os caminhos</summary>
<br>

```js
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

function readWeight(path = 'COM3') {
  const weightReading = new Promise((resolve, reject) => {
    const port = new SerialPort({ path, baudRate: 9600 });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    const responseTimeout = setTimeout(() => {
      port.close();
      reject(new Error('Balança não respondeu no tempo esperado.'));
    }, 2000);

    parser.once('data', (rawLine) => {
      clearTimeout(responseTimeout);
      port.close();

      const weight = parseWeight(rawLine);
      resolve(weight);
    });

    port.on('error', (serialError) => {
      clearTimeout(responseTimeout);
      reject(serialError);
    });
  });

  return weightReading;
}
```

</details>

<br>

**Parâmetros comuns de configuração serial:**

| Parâmetro | Valor mais comum | Detalhe |
|---|---|---|
| Baud rate (taxa de transmissão) | 9600 | Verificar manual do equipamento; balanças Toledo usam 9600 |
| Data bits | 8 | Número de bits por caractere no frame serial; 7 era comum em sistemas ASCII antigos |
| Stop bits | 1 | Marca o fim do frame; 2 stop bits eram usados em equipamentos lentos que precisavam de mais tempo para processar |
| Parity (paridade) | None | Bit de detecção de erro por frame; `Even` (par) / `Odd` (ímpar) somam os bits para checar integridade, mas a maioria dos equipamentos modernos usa `None` e delega a verificação ao protocolo |
| Handshake | None ou RTS/CTS | Impressoras antigas frequentemente requerem RTS/CTS |

**RTS** (Ready to Send, Pronto para Enviar) e **CTS** (Clear to Send, Livre para Enviar) são sinais de controle de fluxo por hardware. O dispositivo ativa a linha RTS para indicar que quer transmitir; o receptor responde com CTS para indicar que está pronto para receber. Sem esse handshake, equipamentos lentos podem perder bytes durante a transmissão.

**Boas práticas:**

- Fechar a porta (`port.close()`) em todos os caminhos de saída — resolve, reject e erro; porta não fechada bloqueia reconexão
- Tratar leitura parcial: alguns equipamentos enviam a leitura em múltiplos pacotes; acumular em buffer até encontrar o delimitador esperado (normalmente `\r\n`)
- Nunca abrir a mesma porta em duas instâncias ao mesmo tempo; resulta em erro `Access denied` ou `Port is already open`
- Registrar cleanup no encerramento do processo: `process.on('exit', () => port.close())`

---

## APIs de Modelos de IA (LLM APIs)

APIs de modelos de linguagem seguem REST/JSON, mas têm características próprias: cobrança por token, respostas incrementais via streaming e rate limits por minuto. Ignorar essas três dimensões gera custo desnecessário, **UX** (User Experience, Experiência do Usuário) ruim e falhas em produção.

### Autenticação

A **API** (Application Programming Interface, Interface de Programação de Aplicações) key nunca entra no código. Ela é resolvida via variável de ambiente na inicialização da aplicação.

```bad
const client = new Anthropic({ apiKey: "sk-ant-..." });
```

```good
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

Ver [security.md](security.md) para gestão de segredos.

### Streaming

LLMs geram tokens incrementalmente. Sem streaming, o cliente espera o response completo antes de renderizar — latência percebida alta para respostas longas. Com streaming, o primeiro token chega em milissegundos.

```bad
const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});

console.log(message.content[0].text);
```

```good
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});

for await (const chunk of stream) {
  if (chunk.type === "content_block_delta") {
    process.stdout.write(chunk.delta.text);
  }
}
```

### Rate limits e retries

APIs de **LLM** (Large Language Model, Modelo de Linguagem de Grande Escala) impõem rate limits por minuto (RPM) e por token (TPM). Erros `429 Too Many Requests` são esperados em produção e devem ser tratados com **exponential backoff** (recuo exponencial).

```bad
const response = await fetch(apiUrl, options);

if (!response.ok) {
  throw new Error("API error");
}
```

```good
async function callWithRetry(requestFn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await requestFn();

    if (response.status !== 429) {
      return response;
    }

    const delayMs = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Rate limit exceeded after retries");
}
```

### Boas práticas

- **Abstrair o provider**: encapsular a chamada atrás de uma função de domínio. Trocar de provedor não deve tocar em lógica de negócio.
- **Estimar tokens antes de enviar**: prompts muito grandes retornam erro `400`. Truncar contexto ou usar chunking antes da chamada.
- **Logar input/output tokens**: custo é proporcional ao volume de tokens. Sem log, não há visibilidade de gasto por feature ou por usuário.
- **Timeout explícito**: respostas de LLM podem demorar dezenas de segundos. Definir timeout protege contra hanging requests.

---

## Referência rápida

| Formato / Protocolo | Contexto comum | Cuidado principal |
|---|---|---|
| **GraphQL** | APIs com múltiplos clientes heterogêneos | N+1 interno real; REST mais simples para APIs privadas |
| **TOML** | Config de ferramentas, `Cargo.toml`, `pyproject.toml` | Mais seguro que YAML para config tipada; sem armadilha de indentação |
| **YAML** | CI/CD, Kubernetes, Docker Compose | Tab vs espaço; `yes`/`no` viram boolean sem aspas |
| **SOAP / XML** | NF-e, CT-e, NFS-e, sistemas legados | `getElementsByTagNameNS` obrigatório; guardar XML bruto para auditoria |
| **CSV / pipe-delimited** | SPED fiscal e contábil, exportações de ERP | Parser dedicado com campos nomeados; validar encoding (`latin1` vs UTF-8) |
| **Fixed-width** | CNAB 240/400, SINTEGRA | Layout como objeto com `pos` e `len`; nunca `slice` com números soltos |
| **ZPL** | Impressoras Zebra (etiquetas, romaneios) | Template isolado; enviar via TCP porta 9100 ou porta serial |
| **RS-232** | Balanças, leitores, equipamentos industriais | Timeout obrigatório; fechar porta em todos os caminhos |
| **LLM API** | Geração de texto, código e decisões com modelos de IA | API key via env var; streaming para UX; retry com backoff em 429 |
