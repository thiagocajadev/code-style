# Tool Use e MCP (Uso de Ferramentas e Protocolo de Contexto de Modelo)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Modelos de linguagem, por si só, só produzem texto. **Tool use** é o mecanismo que permite ao modelo invocar funções externas, como buscar dados em uma API, ler um arquivo ou executar código. O **MCP** (Model Context Protocol, Protocolo de Contexto de Modelo) é o padrão aberto que padroniza como ferramentas e recursos são expostos a modelos de IA.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Tool** (ferramenta) | Função com schema definido que o modelo pode invocar durante a geração |
| **Function calling** (chamada de função) | Termo usado pela OpenAI para o mesmo mecanismo de tool use |
| **Tool schema** (schema da ferramenta) | Definição JSON da ferramenta: nome, descrição, parâmetros e tipos |
| **Tool result** (resultado da ferramenta) | Resposta da função devolvida ao modelo para continuar o raciocínio |
| **Parallel tool calls** (chamadas paralelas) | Capacidade do modelo de invocar múltiplas ferramentas simultaneamente |
| **MCP** (Model Context Protocol, Protocolo de Contexto de Modelo) | Protocolo cliente/servidor para expor ferramentas, recursos e prompts a modelos de IA |
| **MCP Server** (servidor MCP) | Processo que expõe ferramentas e recursos seguindo o protocolo MCP |
| **MCP Client** (cliente MCP) | Componente do harness que conecta ao MCP Server e traduz chamadas para o modelo |
| **Host** | Aplicação que instancia o MCP Client e gerencia a conversa (ex: Claude Code, Cursor) |
| **Transport** (transporte) | Canal de comunicação entre cliente e servidor: `stdio` (local) ou Streamable HTTP (remoto) |

## Tool Use (Uso de ferramentas)

O modelo não executa ferramentas diretamente. O ciclo é:

```
Modelo decide → Retorna tool_call com argumentos → Harness executa a função → Devolve tool_result → Modelo continua gerando
```

O modelo recebe o schema das ferramentas disponíveis junto com o prompt. A partir daí, decide se e quando invocá-las com base no objetivo.

**Exemplo de schema em JSON:**

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
- Descrições precisas: o modelo não lê código, só a descrição
- Parâmetros com nomes de domínio (não tipos técnicos)
- Uma responsabilidade por ferramenta (princípio da responsabilidade única)

**Parallel tool calls** permite que o modelo invoque múltiplas ferramentas no mesmo turno quando as chamadas são independentes. Reduz o número de roundtrips e a latência total.

```
Modelo → [fetch_weather("SP") | fetch_weather("RJ") | fetch_weather("BH")] → 3 resultados → Gera resposta
```

## MCP (Model Context Protocol)

O MCP foi criado pela Anthropic e publicado como padrão aberto em novembro de 2024 (spec atual: 2025-11-25). O objetivo é padronizar a integração entre modelos de IA e o ambiente externo, da mesma forma que o protocolo HTTP padroniza a comunicação web.

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

### Adoção

O MCP é suportado por Claude Code, Cursor, VS Code Copilot, Zed, Windsurf e centenas de servidores públicos no registry oficial. Servidores populares cobrem: filesystem, banco de dados (PostgreSQL, SQLite), Git, GitHub, Slack, Notion, Browserbase e Docker.

### MCP vs tool use direto

| Aspecto | Tool use direto | MCP |
|---|---|---|
| Padronização | Por provedor / SDK | Protocolo único e universal |
| Reuso | Reimplementar por aplicação | Um servidor, múltiplos clientes |
| Descoberta | Manual | Servidores autodescrevem capacidades |
| Indicação | Ferramentas simples e específicas de um app | Ferramentas reutilizáveis entre múltiplos hosts |
