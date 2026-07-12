# Tool use e MCP: dar ao modelo acesso ao mundo externo

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Sozinho, um modelo de linguagem só produz texto. **Tool use** (uso de ferramentas) é o mecanismo que dá a ele a opção de chamar funções externas: consultar uma **API** (Application Programming Interface · Interface de Programação de Aplicações), ler um arquivo, executar código. O **MCP** (Model Context Protocol · Protocolo de Contexto de Modelo) resolve o problema seguinte: em vez de cada aplicação inventar seu jeito de expor ferramentas ao modelo, todas falam o mesmo protocolo aberto.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Tool** (ferramenta) | Função com schema definido que o modelo pode invocar durante a geração |
| **Function calling** (chamada de função) | Termo usado pela OpenAI para o mesmo mecanismo de tool use |
| **Tool schema** (schema da ferramenta) | Definição JSON da ferramenta: nome, descrição, parâmetros e tipos |
| **Tool result** (resultado da ferramenta) | Resposta da função devolvida ao modelo para continuar o raciocínio |
| **Parallel tool calls** (chamadas paralelas) | Capacidade do modelo de invocar múltiplas ferramentas simultaneamente |
| **MCP** (Model Context Protocol · Protocolo de Contexto de Modelo) | Protocolo cliente/servidor para expor ferramentas, recursos e prompts a modelos de IA |
| **MCP Server** (servidor MCP) | Processo que expõe ferramentas e recursos seguindo o protocolo MCP |
| **MCP Client** (cliente MCP) | Componente do harness que conecta ao MCP Server e traduz chamadas para o modelo |
| **Host** (hospedeiro) | Aplicação que instancia o MCP Client e gerencia a conversa (ex: Claude Code, Cursor) |
| **Transport** (transporte) | Canal de comunicação entre cliente e servidor: `stdio` (local) ou Streamable HTTP (remoto) |

## Tool use: o modelo pede, o harness executa

Quem executa a ferramenta é o seu código. O modelo só escreve um pedido de chamada, e o **harness** (o programa que hospeda o modelo) cumpre esse pedido e devolve o resultado:

```
Modelo decide → Retorna tool_call com argumentos → Harness executa a função → Devolve tool_result → Modelo continua gerando
```

Junto com o prompt, o modelo recebe o schema de cada ferramenta disponível. Com isso em mãos, ele decide se chama alguma e com quais argumentos.

**Exemplo de schema em JSON** (JavaScript Object Notation · Notação de Objetos JavaScript):

```json
{
  "name": "fetch_product_price",
  "description": "Retorna o preço atual de um produto pelo SKU.",
  "input_schema": {
    "type": "object",
    "properties": {
      "product_id": {
        "type": "string",
        "description": "SKU do produto"
      }
    },
    "required": ["product_id"]
  }
}
```

**Boas práticas no design de ferramentas:**

- Nomes descritivos em snake_case; o modelo usa o nome para decidir quando invocar
- Descrição precisa: o modelo escolhe a ferramenta lendo a descrição, e o corpo da função fica invisível para ele
- Parâmetros com nomes de domínio (não tipos técnicos)
- Uma responsabilidade por ferramenta (princípio da responsabilidade única)

**Parallel tool calls** deixa o modelo pedir várias ferramentas no mesmo turno, quando uma chamada não depende do resultado da outra. As três chamadas abaixo rodam ao mesmo tempo, e o modelo espera uma volta só em vez de três:

```
Modelo → [fetch_weather("SP") | fetch_weather("RJ") | fetch_weather("BH")] → 3 resultados → Gera resposta
```

## MCP: um protocolo único para expor ferramentas

O MCP foi criado pela Anthropic e publicado como padrão aberto em novembro de 2024 (spec atual: 2025-11-25). Ele padroniza a conversa entre o modelo e o ambiente externo, do mesmo jeito que o **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) padronizou a conversa entre navegador e servidor. Um servidor MCP escrito uma vez serve qualquer host que fale o protocolo.

### Arquitetura

```
Host (Claude Code, Cursor, VS Code) → MCP Client → [transport] → MCP Server → Ferramentas / Recursos / Prompts
```

O **MCP Server** expõe três tipos de capacidades:

| Tipo | O que oferece |
|---|---|
| **Tools** | Funções invocáveis pelo modelo (ex: executar query SQL, ler arquivo, chamar API) |
| **Resources** | Dados que o harness pode injetar no contexto (ex: conteúdo de arquivo, resultado de query) |
| **Prompts** | Templates de prompt reutilizáveis expostos pelo servidor |

### Transportes

| Transport | Canal | Indicação |
|---|---|---|
| **stdio** | stdin/stdout do processo filho | MCP Server local (mesmo host) |
| **Streamable HTTP** | HTTP com streaming; substituiu SSE em março de 2025 | MCP Server remoto (cloud, serviço separado) |

O `stdio` roda o servidor como processo filho do host e conversa pela entrada e saída padrão, sem rede no meio. O Streamable HTTP atende o servidor que vive em outra máquina.

### Exemplo de configuração (Claude Code)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

Cada entrada de `mcpServers` é um processo que o host sobe com o comando declarado. O argumento final passa o escopo: a pasta que o servidor de filesystem pode ler, a URL do banco que o servidor de postgres pode consultar.

### Adoção

O MCP é suportado por Claude Code, Cursor, VS Code Copilot, Zed, Windsurf e centenas de servidores públicos no registro oficial. Servidores populares cobrem: filesystem, banco de dados (PostgreSQL, SQLite), Git, GitHub, Slack, Notion, Browserbase e Docker.

### Quando usar MCP e quando bastam ferramentas próprias

| Aspecto | Tool use direto | MCP |
|---|---|---|
| Padronização | Por provedor / SDK | Protocolo único e universal |
| Reuso | Reimplementar por aplicação | Um servidor, múltiplos clientes |
| Descoberta | Manual | Servidores autodescrevem capacidades |
| Indicação | Ferramentas simples e específicas de um app | Ferramentas reutilizáveis entre múltiplos hosts |

A pergunta que decide é quantos lugares vão usar a ferramenta. Uma função que só faz sentido dentro de um app se resolve com tool use direto. Uma ferramenta que vários hosts vão querer chamar compensa o servidor MCP.
