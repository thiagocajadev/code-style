# RAG (Retrieval-Augmented Generation, Geração com Recuperação Aumentada)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**RAG** (Retrieval-Augmented Generation, Geração Aumentada por Recuperação) é a técnica de enriquecer o prompt de um modelo com conteúdo recuperado de uma base de conhecimento externa antes da geração. O modelo não precisa ter memorizado a informação no treinamento: ela chega via contexto, no momento da chamada. O resultado é respostas mais precisas, com base em dados atualizados e auditáveis.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Embedding** (representação vetorial) | Vetor numérico de alta dimensão que representa o significado semântico de um texto |
| **Vector store** (banco vetorial) | Banco de dados especializado em armazenar e buscar embeddings por similaridade |
| **Similarity search** (busca por similaridade) | Recuperação dos vetores mais próximos de uma query usando distância cosseno ou produto interno |
| **Chunking** (fragmentação) | Divisão de documentos longos em trechos menores para indexação e recuperação |
| **Re-ranking** (reclassificação) | Etapa que ordena os resultados recuperados por relevância mais precisa antes de injetar no prompt |
| **Hybrid search** (busca híbrida) | Combinação de busca vetorial (semântica) com BM25 (lexical) para maior cobertura |
| **Query rewriting** (reescrita de query) | Técnica que reformula a pergunta do usuário antes da busca para melhorar recall |
| **HyDE** (Hypothetical Document Embeddings) | Gera um documento hipotético que responderia a query, então usa seu embedding para buscar |

## Como funciona o RAG

O fluxo básico de RAG tem duas fases: **indexação** (offline) e **recuperação + geração** (online).

**Indexação:**

```
Documentos → Chunking → Embedding → Vector store
```

**Recuperação + Geração:**

```
Query do usuário → Embedding da query → Busca vetorial → Trechos recuperados → Prompt aumentado → LLM → Resposta
```

O modelo nunca acessa o vector store diretamente. O harness recupera os trechos e os insere no prompt antes de chamar o modelo.

## Embeddings (Representações vetoriais)

Um embedding transforma texto em um vetor de números (ex: 1536 dimensões para `text-embedding-3-small`). Textos semanticamente similares produzem vetores próximos no espaço vetorial.

```
"cão"        → [0.12, -0.87, 0.43, ...]
"cachorro"   → [0.11, -0.85, 0.41, ...]  ← próximos
"refrigerador" → [-0.54, 0.23, -0.71, ...] ← distantes
```

Modelos de embedding populares: `text-embedding-3-small` e `text-embedding-3-large` (OpenAI), `voyage-3` (Voyage **AI** (Artificial Intelligence, Inteligência Artificial), recomendado pela Anthropic para uso com Claude).

## Vector store (Banco vetorial)

O vector store armazena embeddings e executa busca por similaridade em alta velocidade. A busca retorna os K vetores mais próximos de uma query (K-nearest neighbors).

| Opção | Perfil |
|---|---|
| **pgvector** | Extensão do PostgreSQL; zero infraestrutura extra; indicado para volumes moderados |
| **Qdrant** | Alta performance; filtros estruturados + semântica; open-source com cloud gerenciado |
| **Chroma** | Leve, embutível; ideal para prototipagem e apps de médio porte |
| **Pinecone** | Totalmente gerenciado; escala automática; uso em produção de alto volume |
| **Weaviate** | Multimodal; busca híbrida nativa; open-source com cloud gerenciado |

Para a maioria dos projetos, **pgvector** é o ponto de partida: reutiliza o banco PostgreSQL existente e evita infraestrutura adicional.

## Chunking (Fragmentação de documentos)

O tamanho dos chunks impacta diretamente a qualidade da recuperação. Chunks muito grandes trazem ruído; chunks muito pequenos perdem contexto.

| Estratégia | Como funciona | Indicação |
|---|---|---|
| **Fixed size** (tamanho fixo) | Divide por número fixo de tokens, com overlap | Documentos não estruturados |
| **Semantic** (semântico) | Divide em quebras naturais de parágrafo ou sentença | Artigos, blogs, manuais |
| **Structural** (estrutural) | Divide por marcadores do documento: seções, headers, tabelas | Markdown, HTML, PDFs estruturados |
| **Recursive** (recursivo) | Tenta divisores na ordem (parágrafo → sentença → palavra) até atingir o tamanho alvo | Uso geral; estratégia padrão do LangChain |

**Overlap** é a sobreposição de tokens entre chunks adjacentes. Um overlap de 10-15% do tamanho do chunk preserva continuidade e evita perda de contexto nas bordas.

## Variações de RAG

| Variação | O que adiciona |
|---|---|
| **Naive RAG** | Fluxo básico: chunk → embed → retrieve → generate |
| **Advanced RAG** | Query rewriting, HyDE, busca híbrida, re-ranking, compressão de contexto |
| **Modular RAG** | Pipeline composto com etapas substituíveis; cada módulo (indexer, retriever, reranker, generator) é independente |
| **Graph RAG** | Constrói grafo de conhecimento a partir dos documentos; recupera subgrafos por relevância; melhor para raciocínio relacional |
| **Agentic RAG** | Agente decide dinamicamente quando buscar, com qual query e quantas iterações são necessárias |

Para a maioria dos projetos, começar com **Naive RAG** (RAG básico) e evoluir para **Advanced RAG** (busca híbrida + re-ranking) resolve 80% dos casos sem a complexidade de pipelines modulares.
