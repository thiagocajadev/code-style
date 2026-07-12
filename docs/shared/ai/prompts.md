# Engenharia de prompts: escrever a instrução que o modelo entende

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Prompt engineering** (engenharia de prompts) é a prática de montar a entrada do modelo de um jeito que produza a resposta certa, no formato certo e sem gastar tokens à toa. O prompt bem escrito fecha as ambiguidades que o modelo teria de preencher sozinho, e é justamente nesse preenchimento que ele diverge do objetivo ou inventa a resposta.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **system prompt** (prompt de sistema) | Instrução persistente que define papel, comportamento e restrições do modelo para toda a conversa |
| **user prompt** (prompt do usuário) | Mensagem do usuário em cada turno; o pedido concreto |
| **Temperature** (temperatura) | Parâmetro que controla aleatoriedade da saída: 0 = determinístico, 1 = criativo |
| **Few-shot examples** (exemplos de referência) | Exemplos de entrada/saída incluídos no prompt para guiar o formato da resposta |
| **Chain-of-thought** (cadeia de raciocínio) | Instrução para o modelo raciocinar passo a passo antes de responder |
| **Role prompting** (atribuição de papel) | Instrução que define a persona ou especialidade do modelo |
| **Output format** (formato de saída) | Especificação explícita do formato esperado: JSON, tabela, lista, texto livre |
| **grounding** (ancoragem) | Técnica de fornecer fatos concretos no prompt para ancorar a resposta e reduzir alucinações |

## As quatro partes de um prompt

Um prompt eficiente tem quatro componentes. Todos são opcionais, e a ordem entre eles importa:

```
[Papel]       Você é um engenheiro sênior especializado em APIs REST.
[Contexto]    O endpoint POST /orders retorna 500 com o payload abaixo.
[Instrução]   Identifique a causa provável e proponha a correção.
[Formato]     Responda em dois blocos: "Causa" e "Correção". Máximo 3 linhas cada.
```

O **papel** define de que ponto de vista o modelo responde. O **contexto** entrega os fatos que ele não teria como saber. A **instrução** é o pedido em si. O **formato** fecha a estrutura da resposta, para que ela chegue do jeito que o seu código ou o seu olho espera.

## O que faz um prompt funcionar

**Peça com verbo preciso.** Listar, resumir, corrigir e converter dizem ao modelo o que produzir. Analisar, explorar e ver deixam a decisão com ele, e a resposta vagueia.

**Dê o contexto que muda a resposta, e só ele.** Cada trecho irrelevante consome tokens e dilui a atenção do modelo no que interessa. Antes de colar um bloco no prompt, pergunte se a resposta mudaria sem ele.

**Diga o formato da saída.** Sem instrução de formato, o modelo escolhe um, e ele pode escolher outro na próxima chamada. Com o formato declarado, a saída fica previsível e o código consegue consumi-la.

**Use few-shot examples quando o formato é o difícil.** Para saída em **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript), tabela ou convenção de nomes, um exemplo de entrada e saída ensina mais rápido que dez linhas descrevendo o formato.

**Peça o raciocínio passo a passo em tarefa complexa.** "Pense passo a passo" ou "raciocine antes de responder" melhora a precisão em problema lógico, matemático ou de código, porque cada passo escrito entra no contexto do passo seguinte.

**Coloque o que é crítico no começo ou no fim.** O modelo recupera melhor o que está nas pontas do contexto (**primacy/recency bias**, viés de primazia e recência). A instrução mais importante perde força quando fica no meio de um prompt longo.

## Exemplos BAD/GOOD

### 1. Diga o escopo, o tamanho e o recorte

<details>
<summary>❌ Ruim: instrução vaga, modelo escolhe escopo, formato e tamanho</summary>

```
Faça um resumo.
```

</details>

<details>
<summary>✅ Bom: instrução específica, cada restrição elimina uma classe de resposta errada</summary>

```
Resuma o artigo abaixo em 3 tópicos de até 1 frase cada. Foque nas implicações para engenheiros de software. Não inclua introdução ou conclusão.
```

</details>

---

### 2. Entregue os fatos do seu caso

<details>
<summary>❌ Ruim: sem contexto, modelo só pode especular</summary>

```
Por que meu código não funciona?
```

</details>

<details>
<summary>✅ Bom: com contexto, resposta direta e aplicável</summary>

```
Este código TypeScript lança `TypeError: Cannot read properties of undefined` na linha 12 ao chamar `user.profile.name`. A função `loadUser` recebe `user` de uma API que pode retornar `null`. Como corrigir com null-safe access mantendo o tipo inferido?
```

</details>

O prompt bom carrega a mensagem de erro, a linha, a origem do dado e a restrição a respeitar. O modelo responde ao caso concreto porque recebeu o caso concreto.

---

### 3. Declare o formato da saída

<details>
<summary>❌ Ruim: sem formato, modelo decide estrutura e escopo</summary>

```
Liste boas práticas de API REST.
```

</details>

<details>
<summary>✅ Bom: formato definido, output previsível e processável por código</summary>

```
Liste 5 boas práticas de API REST para endpoints de escrita (POST/PUT/PATCH). Formato: tabela Markdown com colunas "Prática" e "Por quê". Máximo 1 frase por célula. Não inclua boas práticas de leitura.
```

</details>

---

### 4. Atribua o papel de quem responde

<details>
<summary>❌ Ruim: sem papel, revisão genérica e subjetiva</summary>

```
Revise esse texto.
```

</details>

<details>
<summary>✅ Bom: papel definido, instruções operacionais e acionáveis</summary>

```
Você é um tech writer sênior com foco em documentação de APIs. Revise o texto abaixo para o guia público de referência: elimine adjetivos desnecessários, use voz ativa, mantenha termos técnicos em inglês, substitua jargão interno por linguagem acessível a desenvolvedores externos.
```

</details>

O papel sozinho ajuda pouco. O que torna o prompt bom é a lista de critérios que vem junto: sem o "elimine adjetivos, use voz ativa", o tech writer sênior devolve uma revisão de gosto pessoal.

---

### 5. Mande mostrar os passos do cálculo

<details>
<summary>❌ Ruim: sem instrução de raciocínio, modelo pode errar em cálculos diretos</summary>

```
Qual o resultado de 17 × 24 + 89 ÷ 7?
```

</details>

<details>
<summary>✅ Bom: chain-of-thought explícito, modelo externaliza raciocínio antes de concluir</summary>

```
Calcule 17 × 24 + 89 ÷ 7 seguindo a ordem de operações. Mostre cada passo antes de dar o resultado final.
```

</details>

---

### 6. Forneça a fonte em vez de confiar na memória do modelo

<details>
<summary>❌ Ruim: sem grounding, modelo pode alucinar valores desatualizados</summary>

```
Quais são os limites de rate limiting da API do GitHub?
```

</details>

<details>
<summary>✅ Bom: com grounding, resposta ancorada em fatos fornecidos</summary>

```
Com base na documentação abaixo, quais são os limites de rate limiting da API REST do GitHub para requisições autenticadas?

[colar trecho da documentação aqui]
```

</details>

Sempre que o dado muda com o tempo (preço, limite, versão), cole a fonte no prompt. O modelo aprendeu o valor que era verdade na época do treinamento, e ele responde com a mesma confiança quando o valor já mudou.

---

## Erros comuns

| Erro | Consequência | Correção |
|---|---|---|
| Instrução negativa sem alternativa ("não faça X") | Modelo foca no X proibido | Dizer o que fazer: "faça Y" |
| Pedir múltiplas coisas em uma instrução | Resposta incompleta ou misturada | Separar em pedidos distintos |
| Prompt ambíguo com múltiplas interpretações | Resposta para a interpretação errada | Adicionar contexto ou exemplos |
| System prompt muito longo com regras conflitantes | Comportamento inconsistente | Manter system prompt coeso e conciso |
| Esperar que o modelo memorize entre sessões | Perda de contexto | Reiterar o contexto necessário em cada sessão |

> Para ataques que exploram a estrutura do prompt (injection, jailbreak, prompt leaking), veja [security.md](security.md).
