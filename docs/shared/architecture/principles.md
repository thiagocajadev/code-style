# Princípios

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
>
> **SSOT** (Single Source of Truth, fonte centralizada da verdade): documentações por linguagem aplicam estes princípios ao idioma, não os redefinem. Em caso de conflito, este documento prevalece.

Princípios são **critérios de avaliação**, não regras de formatação. Eles respondem a pergunta _"esse código está bem escrito?"_ antes de qualquer ferramenta automática entrar em cena.

Organizados como checklist de revisão, do mais impactante ao mais granular:

- **Forma:** a estrutura da função avaliada de fora para dentro
- **Legibilidade:** fluxo, espaçamento e nomes lidos linha a linha
- **Controle de qualidade:** as garantias de robustez: estado, erros, **I/O** (Input/Output, Entrada/Saída) e testes

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **SSOT** (Single Source of Truth, fonte centralizada da verdade) | Uma única fonte autoritativa de informação; documentações por linguagem aplicam, não redefinem |
| **SLA** (Single Level of Abstraction, Único Nível de Abstração) | Cada função opera em apenas um nível de detalhe: ou coordena ou implementa |
| **CQS** (Command-Query Separation, Separação de Comando e Consulta) | Funções que retornam valor não produzem efeitos colaterais; as que produzem efeitos retornam void |
| **Caller** (quem chama a função) | Código que invoca uma função e é responsável por garantir o contrato de entrada |
| **Guard clause** (cláusula de guarda) | Verificação antecipada no topo da função que elimina casos inválidos antes da lógica principal |
| **AAA** (Arrange, Act, Assert — Preparar, Executar, Verificar) | Estrutura de três fases para testes: contexto, execução e verificação |
| **I/O** (Input/Output, entrada/saída) | Operações que leem ou escrevem em sistemas externos: banco, rede, disco |

---

## Forma

A forma de uma função é o que você avalia **antes de ler o corpo**. Se a estrutura é clara, o restante tende a ser também.

### Escrita em inglês

Código escrito em inglês é **universal**: funciona em qualquer equipe, repositório ou ferramenta. Nomes em português criam fricção ao buscar, ler documentação técnica ou integrar com código externo. A regra é simples: **identificadores em inglês**, comentários e documentação no idioma da equipe.

### Código narrativo

Um bom código **conta uma história**. Você lê a função de cima pra baixo e entende o que acontece sem precisar de comentários para guiar a leitura. Quando um comentário é necessário para explicar o que o código faz, é sinal de que o código pode ser melhor **nomeado** ou **decomposto**.

### Ponto de entrada limpo

O caller (quem chama a função) expressa **o quê, não o como**. Uma chamada de uma linha com um argumento claro é o ideal: toda a construção de contexto e montagem de parâmetros acontece **dentro da função**, não antes dela.

### Estilo vertical

Até **3 parâmetros** podem ficar na mesma linha. Com 4 ou mais, use um **objeto**: cada campo ganha nome na chamada e a intenção fica explícita sem precisar consultar a assinatura da função.

### Orquestrador no topo

A função que coordena o fluxo fica **visível antes** das que implementam os detalhes. Você lê a intenção no topo (_buscar, transformar, persistir_) e os detalhes ficam abaixo como funções auxiliares. Essa ordem é chamada de **top-down** (de cima pra baixo).

### Detalhes abaixo

Funções auxiliares ficam **abaixo do orquestrador**, nunca acima. Essa é a **step-down rule** (regra de descida): você lê o nível mais alto primeiro e desce apenas quando quiser entender a implementação. A leitura linear nunca é interrompida.

### Sem lógica no retorno

O `return` **nomeia o resultado**, não o computa. Uma variável expressiva antes do retorno deixa claro o que a função produz, simetricamente ao que ela recebeu. Lógica inline no `return` esconde a intenção e dificulta inspecionar o valor antes de retornar.

---

## Legibilidade

Legibilidade é o que você avalia ao ler o corpo da função linha a linha: como o fluxo se move, como o espaço está distribuído e se os nomes carregam significado.

### Retorno antecipado

**Guard clauses** (cláusulas de guarda) no topo da função eliminam os casos inválidos antes de qualquer lógica de negócio. O fluxo principal fica livre de aninhamento. A leitura fica linear: **casos especiais saem cedo**, o caminho feliz segue em frente.

### Fluxo linear

Condicionais aninhadas em cascata, o chamado **arrow antipattern** (antipadrão de seta), criam profundidade desnecessária. Guard clauses transformam `if (valido) { ... }` em `if (invalido) return` e mantêm o fluxo reto, **sem indentar o caminho principal**.

### Baixa densidade visual

Linhas relacionadas ficam **juntas**. Grupos distintos são separados por **exatamente uma linha em branco**. Nunca duas: espaço em excesso é ruído tanto quanto espaço ausente. O olho identifica os parágrafos do código sem precisar ler cada linha.

### Nomes expressivos

Um **bom nome dispensa explicação**. `activeUsers` diz mais que `list`. `invoiceTotal` diz mais que `value`. O nome carrega o tipo, a intenção e o contexto: quanto mais preciso, menos o leitor precisa rastrear de onde o valor veio.

### Código como documentação

**Nomes substituem comentários.** Um comentário que explica _o quê_ o código faz é sinal de que o código pode ser renomeado ou decomposto. Comentários que explicam _por quê_ uma decisão foi tomada são válidos. Os que descrevem o óbvio envelhecem mal e **mentem** quando o código muda sem o comentário mudar junto.

### Sem valores mágicos

Números e strings literais espalhados pelo código não dizem nada sobre a intenção. `0.1` pode ser uma taxa, um limiar ou um fallback: só o contexto sabe. **Constantes nomeadas** transformam valores opacos em intenção explícita e centralizam a manutenção em um único lugar.

---

## Controle de qualidade

Controle de qualidade é o que você avalia nas **propriedades de robustez** do código: como ele lida com estado, falhas, operações assíncronas e verificação de comportamento.

### Funções pequenas

Uma função **faz uma coisa**. Esse é o **SLA** (Single Level of Abstraction, Único Nível de Abstração): o orquestrador coordena, a implementação executa, nunca os dois na mesma função. Funções pequenas são fáceis de **nomear**, **testar** e **reutilizar**.

### Cálculo vs formatação

Computar dados e formatar a saída são **responsabilidades distintas**. Uma função que calcula totais não deveria também montar a string de exibição. Separar as duas torna cada parte **testável de forma independente** e reutilizável em contextos diferentes.

### Valor fixo por padrão

Variáveis declaradas como constantes (`const`, `readonly`) comunicam que **o valor não muda**: qualquer alteração posterior é uma exceção explícita, não um efeito colateral silencioso. Immutable (valor fixo) por padrão **reduz surpresas** e torna o fluxo de dados rastreável.

### CQS: Command Query Separation (Separação de Comando e Consulta)

Uma função ou **retorna um valor** (query, consulta) ou **produz um efeito colateral** (command, comando), nunca os dois ao mesmo tempo. Funções que mudam estado _e_ retornam dados acoplam leitura e escrita de forma implícita, dificultando rastreamento e teste.

### Dependências explícitas

Dependências **recebidas como parâmetros** são visíveis, substituíveis e testáveis. Dependências buscadas dentro da função via estado global, singleton (instância única global) ou service locator (localizador de serviços) são ocultas e acopladas. **Injetar via parâmetros** é a forma mais simples de tornar o comportamento previsível.

### Falhar rápido

**Validar entradas no início** da função e interromper o fluxo imediatamente quando algo está errado evita que dados inválidos se propaguem. Quanto mais cedo a falha aparece, mais fácil de diagnosticar e menor o efeito colateral gerado.

### Retorno explícito

**Exceções existem para erros inesperados**: falhas de infraestrutura, estados impossíveis, bugs. Usá-las para controlar o fluxo de negócio mistura as duas responsabilidades e torna o fluxo opaco para quem lê. **Retornos explícitos** com tipos de resultado deixam os caminhos possíveis visíveis na assinatura.

### Contratos consistentes

Toda resposta da função segue **o mesmo formato**, sucesso e erro incluídos. Um contrato previsível elimina verificações defensivas em cada chamada e permite que o caller trate os casos de forma **uniforme, sem surpresas de formato**.

### Tratamento centralizado de erros

Erros são capturados **nas fronteiras do sistema**, nas camadas de entrada da aplicação, não espalhados em cada função de negócio. Centralizar o tratamento evita duplicação, garante **formato consistente** nas respostas e mantém o código de domínio livre de preocupações de infraestrutura.

### I/O assíncrono: Input/Output (Entrada/Saída) assíncrono

Operações de I/O (_leitura de banco, chamadas de rede, acesso a disco_) bloqueiam o processamento se feitas de forma síncrona. `async/await` (assíncrono/aguardar) torna essas operações **não-bloqueantes**: a execução continua enquanto aguarda a resposta, sem travar o processo inteiro.

### Testes estruturados

O padrão **AAA** (Arrange, Act, Assert: Preparar, Executar, Verificar) divide cada teste em **três fases explícitas**. A fase de preparação monta o contexto. A execução chama o comportamento. A verificação confirma o resultado com **variáveis nomeadas**, sem expressões inline no assert. Testes estruturados são legíveis como especificações do comportamento esperado.
