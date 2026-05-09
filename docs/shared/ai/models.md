# Modelos de IA (AI Models)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Um modelo de IA é um conjunto de pesos e parâmetros resultado de treinamento em grandes volumes de dados. Para uso em produção, os modelos se dividem em duas categorias: **cloud** (nuvem), acessados via **API** (Application Programming Interface, Interface de Programação de Aplicações) mediante pagamento por token, e **local**, executados diretamente na máquina do desenvolvedor.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Parameters** (parâmetros) | Valores numéricos aprendidos durante o treinamento; "tamanho" do modelo, medido em bilhões (B) |
| **MoE** (Mixture of Experts, Mistura de Especialistas) | Arquitetura que ativa apenas uma fração dos parâmetros por inferência, reduzindo custo computacional |
| **Multimodal** | Modelo que processa mais de um tipo de entrada: texto, imagem, áudio |
| **Open weights** (pesos abertos) | Modelo cujos pesos são públicos, podendo ser rodados localmente |
| **Proprietary** (proprietário) | Modelo cujos pesos não são públicos; acesso via API |
| **Context window** (janela de contexto) | Total de tokens (entrada + saída) processados em uma chamada |
| **Quantização** | Técnica que reduz a precisão dos pesos (ex: de 32 bits para 4 bits) para diminuir uso de memória |
| **GGUF** | Formato binário do llama.cpp para armazenar e executar modelos quantizados localmente |

## Modelos em nuvem (Cloud Models)

Modelos em nuvem são acessados via API **REST** (Representational State Transfer, Transferência de Estado Representacional). O desenvolvedor envia tokens e paga por volume de entrada e saída. Nenhum hardware especializado é necessário no lado do cliente.

### Claude (Anthropic)

Claude é a família de modelos da Anthropic, com foco em segurança, raciocínio e uso agentico.

| Modelo | Perfil de uso | Context window |
|---|---|---|
| **Claude Opus 4.7** | Máxima inteligência; raciocínio `xhigh`; verifica os próprios outputs | 1M tokens |
| **Claude Sonnet 4.6** | Velocidade + inteligência; melhor desempenho agentico; uso geral em produção | 1M tokens |
| **Claude Haiku 4.5** | Modelo leve e rápido; latência mínima; tarefas simples e alto volume | 200K tokens |



### GPT (OpenAI)

Família de modelos da OpenAI. Os modelos `o` são especializados em raciocínio estendido (**chain-of-thought**, cadeia de raciocínio interno).

| Modelo | Perfil de uso |
|---|---|
| **GPT-4.1** | Contexto de 1 milhão de tokens; uso geral em produção |
| **GPT-5** | Topo de linha da família GPT; raciocínio avançado |
| **o3** | Raciocínio profundo; benchmarks STEM e código |
| **o4-mini** | Raciocínio com baixo custo; excelente em matemática e código |

### Gemini (Google)

Família de modelos do Google DeepMind. Todos com suporte nativo a entrada multimodal.

| Modelo | Perfil de uso |
|---|---|
| **Gemini 2.5 Pro** | Contexto de 1 milhão de tokens; Deep Think mode; topo do LMArena |
| **Gemini 2.5 Flash** | Contexto de 1 milhão de tokens; raciocínio dinâmico com orçamento controlável; baixa latência |

### Llama (Meta)

Família open weights da Meta. Llama 4 adota arquitetura **MoE** e processamento multimodal nativo.

| Modelo | Parâmetros | Context window |
|---|---|---|
| **Llama 4 Scout** | 17B ativos / 109B total | 10 milhões de tokens |
| **Llama 4 Maverick** | 17B ativos / 400B total | 1 milhão de tokens |

Por serem open weights, modelos Llama podem ser rodados localmente via Ollama.

### Mistral

Família de modelos da Mistral **AI** (Artificial Intelligence, Inteligência Artificial), com foco em código e eficiência. Distribuídos sob Apache 2.0.

| Modelo | Perfil de uso |
|---|---|
| **Mistral Large 3** | 41B ativos / 675B total; 256K contexto; uso geral |
| **Devstral 2** | 123B; SOTA open-source para code agents (72.2% SWE-bench) |
| **Ministral 3/8B** | Modelos compactos; rodam em laptop |
| **Magistral** | Família de raciocínio da Mistral |

## Modelos locais (Local Models)

Modelos locais rodam diretamente na máquina, sem envio de dados para servidores externos. São indicados para prototipagem, ambientes sem acesso à internet e controle total sobre privacidade.

### Ollama

Ollama permite baixar e executar modelos localmente com um único comando. Modelos são identificados por `nome:tag` (ex: `llama3.1:8b-q4_K_M`). O download funciona em camadas, similar ao Docker.

```bash
# baixar e executar modelo
ollama run llama3.1:8b

# listar modelos disponíveis
ollama list
```

Modelos populares disponíveis no Ollama: `llama4`, `qwen2.5`, `mistral`, `gemma3`, `phi4`, `deepseek-r1`.

### LM Studio

LM Studio é uma interface gráfica para rodar modelos **GGUF** (GPT-Generated Unified Format, Formato Unificado Gerado por GPT) localmente. Inclui um servidor compatível com a API da OpenAI, permitindo integração direta com ferramentas existentes sem alterar código.

## Quantização (Quantization)

Quantização reduz a precisão dos pesos do modelo de ponto flutuante de 32 bits (FP32) para representações menores como Q8 ou Q4. O modelo ocupa menos memória e a inferência é mais rápida, com perda controlada de qualidade.

O formato **GGUF** (do llama.cpp) é o padrão para modelos quantizados locais. Cada arquivo `.gguf` contém os pesos já quantizados e metadados de arquitetura.

### Níveis de quantização

| Nível | Bits | Tamanho relativo | Qualidade | Indicação |
|---|---|---|---|---|
| **FP16** | 16 | 100% (referência) | Máxima | GPU com VRAM suficiente |
| **Q8_0** | 8 | ~50% | Alta (quase FP16) | GPU ou CPU com RAM folgada |
| **Q4_K_M** | 4 | ~25-30% | Boa (~95% de FP16) | Sweet spot: uso geral local |
| **Q3_K_S** | 3 | ~20% | Razoável | Hardware muito limitado |

A notação `K_M` indica **K-quants** com superblocks, que preservam qualidade melhor do que formatos legacy de mesmo nível de bits. Para a maioria dos casos, **Q4_K_M é a escolha padrão** na comunidade.

### Exemplo: modelo 7B em diferentes quantizações

| Quantização | Tamanho do arquivo | RAM necessária |
|---|---|---|
| FP16 | ~14 GB | ~16 GB |
| Q8_0 | ~7 GB | ~8 GB |
| Q4_K_M | ~4.1 GB | ~5 GB |
| Q3_K_S | ~3.0 GB | ~4 GB |
