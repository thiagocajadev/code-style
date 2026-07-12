# RAG: responder com base nos documentos recuperados

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**RAG** (Retrieval-Augmented Generation · Geração Aumentada por Recuperação) busca o conteúdo relevante em uma base de conhecimento e o cola no prompt antes de o modelo responder. Com isso, a informação chega ao modelo na hora da chamada, e ele deixa de depender do que memorizou no treinamento. A resposta passa a se apoiar em dado atual, e você consegue apontar de qual documento cada afirmação saiu.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Embedding** (representação vetorial) | Vetor numérico de alta dimensão que representa o significado semântico de um texto |
| **Vector store** (banco vetorial) | Banco de dados especializado em armazenar e buscar embeddings por similaridade |
| **Similarity search** (busca por similaridade) | Recuperação dos vetores mais próximos de uma query usando distância cosseno ou produto interno |
| **Chunking** (fragmentação) | Divisão de documentos longos em trechos menores para indexação e recuperação |
| **Re-ranking** (reclassificação) | Etapa que ordena os resultados recuperados por relevância mais precisa antes de injetar no prompt |
| **Hybrid search** (busca híbrida) | Combinação de busca vetorial (semântica) com BM25 (lexical) para maior cobertura |
| **Query rewriting** (reescrita de query) | Técnica que reformula a pergunta do usuário antes da busca para recuperar mais resultados relevantes |
| **HyDE** (Hypothetical Document Embeddings · embeddings de documento hipotético) | Gera um documento hipotético que responderia à query, então usa seu embedding para buscar |

## Como funciona o RAG

O RAG tem duas fases. A **indexação** roda antes, uma vez por documento. A **recuperação com geração** roda a cada pergunta.

**Indexação:**

```
Documentos → Chunking → Embedding → Vector store
```

**Recuperação + Geração:**

```
Query do usuário → Embedding da query → Busca vetorial → Trechos recuperados → Prompt aumentado → LLM → Resposta
```

Quem consulta o vector store é o harness. Ele recupera os trechos, monta o prompt com eles dentro e só então chama o modelo, que recebe tudo como texto comum.

## Embeddings: transformar significado em números

O embedding converte um texto em um vetor de números (o `text-embedding-3-small`, por exemplo, usa 1536 dimensões). O truque é que textos com sentido parecido caem perto uns dos outros nesse espaço, o que permite buscar por significado em vez de buscar por palavra exata:

```
"cão"        → [0.12, -0.87, 0.43, ...]
"cachorro"   → [0.11, -0.85, 0.41, ...]  ← próximos
"refrigerador" → [-0.54, 0.23, -0.71, ...] ← distantes
```

"Cão" e "cachorro" não compartilham uma letra sequer, e mesmo assim seus vetores quase coincidem. É por isso que a busca acha o documento certo mesmo quando o usuário escreve com outras palavras.

Modelos de embedding populares: `text-embedding-3-small` e `text-embedding-3-large` (OpenAI), `voyage-3` (Voyage AI, recomendado pela Anthropic para uso com Claude).

## Vector store: o banco que busca por proximidade

O vector store guarda os embeddings e encontra depressa os vetores mais próximos de uma query. A busca devolve os K vizinhos mais próximos (**K-nearest neighbors**), ou seja, os K trechos com maior chance de responder à pergunta.

| Opção | Perfil |
|---|---|
| **pgvector** | Extensão do PostgreSQL; zero infraestrutura extra; indicado para volumes moderados |
| **Qdrant** | Alta performance; filtros estruturados + semântica; open-source com cloud gerenciado |
| **Chroma** | Leve, embutível; ideal para prototipagem e apps de médio porte |
| **Pinecone** | Totalmente gerenciado; escala automática; uso em produção de alto volume |
| **Weaviate** | Multimodal; busca híbrida nativa; open-source com cloud gerenciado |

Comece pelo **pgvector** se o projeto já tem PostgreSQL. Ele vira uma extensão do banco que você já opera, e a busca vetorial passa a ser mais uma query.

## Chunking: em que tamanho picar o documento

O tamanho do chunk decide a qualidade da recuperação. Chunk grande demais traz parágrafos irrelevantes junto com a resposta e dilui o que interessa. Chunk pequeno demais corta a frase ao meio e entrega um trecho que sozinho não diz nada.

| Estratégia | Como funciona | Indicação |
|---|---|---|
| **Fixed size** (tamanho fixo) | Divide por número fixo de tokens, com overlap | Documentos não estruturados |
| **Semantic** (semântico) | Divide em quebras naturais de parágrafo ou sentença | Artigos, blogs, manuais |
| **Structural** (estrutural) | Divide por marcadores do documento: seções, headers, tabelas | Markdown, HTML, PDFs estruturados |
| **Recursive** (recursivo) | Tenta divisores na ordem (parágrafo → sentença → palavra) até atingir o tamanho alvo | Uso geral; estratégia padrão do LangChain |

O **overlap** é o pedaço de texto que se repete entre um chunk e o seguinte. Ele existe porque o corte pode cair no meio de uma explicação: com 10 a 15% de sobreposição, a frase que ficou partida aparece inteira em pelo menos um dos dois chunks.

## Variações de RAG

| Variação | O que adiciona |
|---|---|
| **Naive RAG** | Fluxo básico: chunk → embed → retrieve → generate |
| **Advanced RAG** | Query rewriting, HyDE, busca híbrida, re-ranking, compressão de contexto |
| **Modular RAG** | Pipeline composto com etapas substituíveis; cada módulo (indexer, retriever, reranker, generator) é independente |
| **Graph RAG** | Constrói grafo de conhecimento a partir dos documentos; recupera subgrafos por relevância; melhor para raciocínio relacional |
| **Agentic RAG** | Agente decide dinamicamente quando buscar, com qual query e quantas iterações são necessárias |

Comece pelo **Naive RAG** e suba para o **Advanced RAG** (busca híbrida mais re-ranking) quando a recuperação começar a trazer trecho irrelevante. Esses dois níveis cobrem a maior parte dos casos, e os pipelines modulares cobram uma complexidade que só se paga em volume.
