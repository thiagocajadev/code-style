# Fluxo de uma operação

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Uma operação (criar um recurso, processar um formulário, buscar dados) segue sempre o mesmo ciclo: recebe input (entrada), transforma, executa, retorna output (saída). O **operation flow** (fluxo da operação) torna esse ciclo explícito: cada passo ganha uma responsabilidade, um tipo de entrada e um tipo de saída.

O resultado é um fluxo legível de ponta a ponta, com caminho explícito para as falhas e com o limite entre lógica pura e **I/O** (Input/Output · Entrada/Saída) visível na própria estrutura.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Input** (entrada) | Dados recebidos por uma operação |
| **Output** (saída) | Dados produzidos por uma operação |
| `Result<T>` | Tipo que representa explicitamente sucesso ou falha de uma operação, tornando os dois caminhos visíveis na assinatura |
| **CQS** (Command-Query Separation · Separação de Comando e Consulta) | Escrita retorna void; leitura retorna dado. A mesma operação não faz os dois |
| **Pipeline** (sequência de processamento) | Conjunto de etapas ordenadas de transformação de dados, cada uma com entrada e saída definidas |
| **Caller** (quem invoca a operação) | Código que chama uma função ou serviço e é responsável por tratar os dois caminhos do resultado |
| **I/O** (Input/Output · entrada/saída) | Operações que leem ou escrevem em sistemas externos: banco, rede, disco |

## Backend

A requisição que chega do cliente atravessa seis passos até virar a resposta que o servidor devolve.

```
Requisição → 1. Higienizar → 2. Validar → 3. Regras de negócio → 4. Gravar → 5. Ler → 6. Filtrar a saída → Resposta
```

| Passo | Nome no código | O que faz | Natureza | Retorna | Falha vira |
|---|---|---|---|---|---|
| 1. Higienizar | `sanitize` | Limpa e normaliza o que chegou: remove espaços, ajusta formato, converte tipo | puro | input normalizado | |
| 2. Validar | `validate` | Confere se o dado normalizado obedece ao contrato de entrada | puro | `Result<T>` | erro de validação |
| 3. Regras de negócio | `businessRules` | Aplica as regras do negócio, consultando o que for preciso | I/O | `Result<bool>` | não encontrado / conflito |
| 4. Gravar | `save` | Grava a alteração | I/O | `void` (CQS) | |
| 5. Ler | `read` | Lê de volta o estado gravado, para montar a resposta | I/O | `Result<T>` | erro de servidor |
| 6. Filtrar a saída | `filterOutput` | Escolhe os campos que saem na resposta e deixa de fora o que é interno | puro | `ResponseDTO` | |

Os passos puros (1, 2, 6) ficam nas bordas, sem dependências externas e testáveis em isolamento. Os passos com I/O (3, 4, 5) ficam no meio. Gravar e Ler aparecem separados por causa do **CQS** (Command-Query Separation · Separação de Comando e Consulta): a escrita não devolve dado e a leitura não persiste nada.

## Frontend

O fluxo começa por uma ação do usuário (um clique, o envio de um formulário) ou pela montagem do componente, que é o momento em que ele aparece na tela pela primeira vez. Daí em diante, quatro passos levam até a rede.

```
Ação do usuário / Montagem → 1. Componente → 2. Gancho de estado → 3. Serviço → 4. Cliente de API → Resposta HTTP
```

| Passo | Nome no código | O que é | Responsabilidade |
|---|---|---|---|
| 1. Componente | `Component` | Pedaço da interface que o usuário vê | Dispara o gancho e renderiza o que ele devolve |
| 2. Gancho de estado | `Hook` | Função que guarda o estado e liga o componente ao resto do fluxo | Gerencia o estado de UI (data, error, isLoading) |
| 3. Serviço | `Service` | Camada pura entre o gancho e a rede | Chama o cliente de API e transforma `Result<T>` em tipo de view |
| 4. Cliente de API | `apiClient` | Único ponto do frontend que fala com a rede | Faz a chamada HTTP e retorna `Result<T>` (I/O) |

O `apiClient` concentra todo o I/O, e tudo acima dele é puro. O `Service` recebe `Result<T>` e entrega um tipo de view que o componente consome direto, sem lógica adicional.

## Princípios compartilhados

**Puro nas bordas, I/O no meio.** Passos sem efeitos colaterais ficam nas extremidades do pipeline (sequência de processamento), onde são mais fáceis de testar e de acompanhar. Passos com I/O ficam agrupados no centro.

**Result<T> como contrato.** Operações que podem falhar por regra de negócio retornam `Result<T>`, o que torna sucesso e falha valores explícitos na assinatura. O caller (quem invoca a operação) trata os dois caminhos. Exceções de infraestrutura, como timeout (tempo limite) e falha de rede, seguem o caminho normal de exceções.

**CQS.** Escrita (`Save`) retorna `void`. Leitura (`Read`) retorna dado. A mesma operação não faz os dois.

---

**Implementações por stack**
- C#: [csharp/setup/vertical-slice.md](../../csharp/setup/vertical-slice.md)

**Veja também**
- [frontend-flow.md](frontend-flow.md): routing, guards, loaders e forms
- [backend-flow.md](backend-flow.md): background jobs, webhooks e event-driven
