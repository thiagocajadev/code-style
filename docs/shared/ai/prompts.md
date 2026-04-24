# Engenharia de Prompts (Prompt Engineering)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Prompt engineering é a prática de estruturar entradas para modelos de linguagem de forma a obter respostas corretas, consistentes e econômicas. Um prompt bem construído elimina ambiguidade, reduz tokens desperdiçados e diminui a chance de o modelo alucinar ou divergir do objetivo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **System prompt** | Instrução persistente que define papel, comportamento e restrições do modelo para toda a conversa |
| **User prompt** | Mensagem do usuário em cada turno; o pedido concreto |
| **Temperature** (temperatura) | Parâmetro que controla aleatoriedade da saída: 0 = determinístico, 1 = criativo |
| **Few-shot examples** (exemplos de referência) | Exemplos de entrada/saída incluídos no prompt para guiar o formato da resposta |
| **Chain-of-thought** (cadeia de raciocínio) | Instrução para o modelo raciocinar passo a passo antes de responder |
| **Role prompting** (atribuição de papel) | Instrução que define a persona ou especialidade do modelo |
| **Output format** (formato de saída) | Especificação explícita do formato esperado: JSON, tabela, lista, texto livre |
| **Grounding** | Técnica de fornecer fatos concretos no prompt para ancorar a resposta e reduzir alucinações |

## Anatomia de um prompt eficiente

Um prompt tem quatro componentes opcionais, mas a ordem importa:

```
[Papel]       Você é um engenheiro sênior especializado em APIs REST.
[Contexto]    O endpoint POST /orders retorna 500 com o payload abaixo.
[Instrução]   Identifique a causa provável e proponha a correção.
[Formato]     Responda em dois blocos: "Causa" e "Correção". Máximo 3 linhas cada.
```

**Papel** define a perspectiva. **Contexto** fornece os fatos. **Instrução** é o pedido concreto. **Formato** elimina ambiguidade na estrutura da resposta.

## Princípios de eficiência

**Seja específico, não genérico.** Quanto mais específico o pedido, menor a chance de a resposta vagar. Verbos de ação precisos (listar, resumir, corrigir, converter) performam melhor que verbos vagos (analisar, explorar, ver).

**Forneça contexto suficiente, não excessivo.** Contexto relevante melhora a resposta; contexto irrelevante ocupa tokens e pode confundir o modelo. Inclua apenas o que muda a resposta.

**Especifique o formato de saída.** Sem instrução de formato, o modelo escolhe. Com instrução, o output é previsível e parseável.

**Use few-shot examples para tarefas de formatação.** Para saídas com padrão específico (**JSON** (JavaScript Object Notation, Notação de Objetos JavaScript), tabela, convenção de nomes), um exemplo vale mais que dez frases descritivas.

**Instrua raciocínio passo a passo em tarefas complexas.** "Pense passo a passo" ou "raciocine antes de responder" aumenta a precisão em problemas lógicos, matemáticos e de código.

**Coloque o conteúdo mais importante no início ou no fim.** Modelos têm melhor recall das extremidades do contexto (primacy/recency bias). Instruções críticas não devem ficar enterradas no meio de um prompt longo.

## Exemplos BAD/GOOD

### 1. Instrução vaga vs. específica

<details>
<summary>❌ Bad: instrução vaga — modelo escolhe escopo, formato e tamanho</summary>
<br>

```
Faça um resumo.
```

</details>

<br>

<details>
<summary>✅ Good: instrução específica — cada restrição elimina uma classe de resposta errada</summary>
<br>

```
Resuma o artigo abaixo em 3 tópicos de até 1 frase cada. Foque nas implicações para engenheiros de software. Não inclua introdução ou conclusão.
```

</details>

---

### 2. Sem contexto vs. com contexto

<details>
<summary>❌ Bad: sem contexto — modelo só pode especular</summary>
<br>

```
Por que meu código não funciona?
```

</details>

<br>

<details>
<summary>✅ Good: com contexto — resposta direta e aplicável</summary>
<br>

```
Este código TypeScript lança `TypeError: Cannot read properties of undefined` na linha 12 ao chamar `user.profile.name`. A função `loadUser` recebe `user` de uma API que pode retornar `null`. Como corrigir com null-safe access mantendo o tipo inferido?
```

</details>

---

### 3. Sem formato vs. formato especificado

<details>
<summary>❌ Bad: sem formato — modelo decide estrutura e escopo</summary>
<br>

```
Liste boas práticas de API REST.
```

</details>

<br>

<details>
<summary>✅ Good: formato definido — output previsível e parseável</summary>
<br>

```
Liste 5 boas práticas de API REST para endpoints de escrita (POST/PUT/PATCH). Formato: tabela Markdown com colunas "Prática" e "Por quê". Máximo 1 frase por célula. Não inclua boas práticas de leitura.
```

</details>

---

### 4. Sem papel vs. papel atribuído

<details>
<summary>❌ Bad: sem papel — revisão genérica e subjetiva</summary>
<br>

```
Revise esse texto.
```

</details>

<br>

<details>
<summary>✅ Good: papel definido — instruções operacionais e acionáveis</summary>
<br>

```
Você é um tech writer sênior com foco em documentação de APIs. Revise o texto abaixo para o guia público de referência: elimine adjetivos desnecessários, use voz ativa, mantenha termos técnicos em inglês, substitua jargão interno por linguagem acessível a desenvolvedores externos.
```

</details>

---

### 5. Sem raciocínio vs. chain-of-thought

<details>
<summary>❌ Bad: sem instrução de raciocínio — modelo pode errar em cálculos diretos</summary>
<br>

```
Qual o resultado de 17 × 24 + 89 ÷ 7?
```

</details>

<br>

<details>
<summary>✅ Good: chain-of-thought explícito — modelo externaliza raciocínio antes de concluir</summary>
<br>

```
Calcule 17 × 24 + 89 ÷ 7 seguindo a ordem de operações. Mostre cada passo antes de dar o resultado final.
```

</details>

---

### 6. Prompt sem grounding vs. com grounding

<details>
<summary>❌ Bad: sem grounding — modelo pode alucinar valores desatualizados</summary>
<br>

```
Quais são os limites de rate limiting da API do GitHub?
```

</details>

<br>

<details>
<summary>✅ Good: com grounding — resposta ancorada em fatos fornecidos</summary>
<br>

```
Com base na documentação abaixo, quais são os limites de rate limiting da API REST do GitHub para requisições autenticadas?

[colar trecho da documentação aqui]
```

</details>

Para dados que mudam (preços, limites, versões), sempre inclua a fonte no prompt.

---

## Erros comuns

| Erro | Consequência | Correção |
|---|---|---|
| Instrução negativa sem alternativa ("não faça X") | Modelo foca no X proibido | Dizer o que fazer: "faça Y" |
| Pedir múltiplas coisas em uma instrução | Resposta incompleta ou misturada | Separar em pedidos distintos |
| Prompt ambíguo com múltiplas interpretações | Resposta para a interpretação errada | Adicionar contexto ou exemplos |
| System prompt muito longo com regras conflitantes | Comportamento inconsistente | Manter system prompt coeso e conciso |
| Esperar que o modelo memorize entre sessões | Perda de contexto | Reiterar o contexto necessário em cada sessão |
