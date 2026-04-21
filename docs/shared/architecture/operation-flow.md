# Operation Flow

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Uma operação — criar um recurso, processar um formulário, buscar dados — segue sempre o mesmo ciclo: recebe input (entrada), transforma, executa, retorna output (saída). Operation flow é a estrutura que torna esse ciclo explícito: cada passo tem uma responsabilidade, um tipo de entrada e um tipo de saída.

O resultado é um fluxo legível de ponta a ponta, onde falhas têm caminho explícito e a fronteira entre lógica pura e I/O (entrada/saída) é visível na estrutura.

## Backend

```
Request
  ↓
1. Sanitize          → normaliza input                                    (puro)
  ↓
2. Validate          → Result<T>      falha → erro de validação           (puro)
  ↓
3. Business Rules    → Result<bool>   falha → não encontrado / conflito   (I/O)
  ↓
4. Save              → void — CQS                                         (I/O)
  ↓
5. Read              → Result<T>      falha → erro de servidor            (I/O)
  ↓
6. Filter Output     → ResponseDTO                                        (puro)
  ↓
Response
```

Os passos puros (1, 2, 6) ficam nas bordas — sem dependências externas, testáveis em isolamento. Os passos com I/O (3, 4, 5) ficam no meio. Save e Read são separados: **CQS** (Command-Query Separation, Separação de Comando e Consulta) — escrita não retorna dado; leitura não persiste.

## Frontend

```
User Action / Mount
  ↓
Component            → dispara hook
  ↓
Hook                 → gerencia estado UI (data, error, isLoading)
  ↓
Service              → chama apiClient, transforma Result<T> em View type  (puro: só a transformação)
  ↓
apiClient            → único caller de rede, retorna Result<T>             (I/O)
  ↓
HTTP Response
```

O `apiClient` é o único ponto de I/O — tudo acima dele é puro. O `Service` recebe `Result<T>` e entrega um tipo de view que o componente consome diretamente, sem lógica adicional.

## Princípios compartilhados

**Puro nas bordas, I/O no meio.** Passos sem efeitos colaterais ficam nas extremidades do pipeline (sequência de processamento). São os mais fáceis de testar e de raciocinar. Passos com I/O ficam agrupados no centro.

**Result<T> como contrato.** Operações que podem falhar por regra de negócio retornam `Result<T>` — sucesso e falha são valores explícitos na assinatura. O caller (quem invoca a operação) trata os dois caminhos. Exceções de infraestrutura, como timeout (tempo limite) e falha de rede, seguem o caminho normal de exceções.

**CQS.** Escrita (`Save`) retorna `void`. Leitura (`Read`) retorna dado. A mesma operação não faz os dois.

---

**Implementações por stack**
- C#: [csharp/setup/vertical-slice.md](../csharp/setup/vertical-slice.md)

**Veja também**
- [frontend-flow.md](frontend-flow.md) — routing, guards, loaders e forms
- [backend-flow.md](backend-flow.md) — background jobs, webhooks e event-driven
