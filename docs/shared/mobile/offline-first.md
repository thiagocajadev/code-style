# Offline-first

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Offline-first** é a estratégia de design em que o app funciona a partir de dados locais e usa a
rede para sincronizar — não o contrário. A premissa é que conectividade é intermitente: metrô,
túnel, roaming, sinal fraco. Um app que falha silenciosamente sem rede transfere ao usuário um
problema que é responsabilidade do produto.

A diferença em relação a um app com cache simples: no offline-first, o banco local é a fonte de
verdade da UI. A rede atualiza o banco; o banco atualiza a UI.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Cache** (armazenamento em cache) | Cópia local de dados remotos para acesso sem rede |
| **Sync** (sincronia) | Processo de reconciliar dados locais com o servidor |
| **Conflict resolution** (resolução de conflito) | Estratégia para decidir qual versão vence quando local e remoto divergem |
| **Optimistic update** (atualização otimista) | Aplicar a mudança localmente antes da confirmação do servidor |
| **Stale-while-revalidate** (cache imediato com revalidação ao fundo) | Exibir dado em cache enquanto busca versão atualizada em background |
| **Queue** (fila de operações) | Lista de ações locais pendentes de sincronização com o servidor |
| **Idempotência** | Operação que produz o mesmo resultado independente de quantas vezes é executada |
| **Tombstone** (marcador de deleção) | Registro de deleção local que o servidor ainda não confirmou |

## O modelo offline-first

O fluxo padrão inverte a dependência da rede:

```
UI lê do banco local → banco local é atualizado pela rede (em background)
```

Comparado ao modelo tradicional:

```
Tradicional:   UI → rede → exibe resultado
Offline-first: UI → banco local → rede atualiza banco → UI reage
```

No modelo tradicional, a rede está no caminho crítico de toda leitura. No offline-first, a rede
está no caminho de atualização — a UI nunca espera por ela para exibir dados.

## Cache strategy

A estratégia de cache define quando buscar dados frescos e quando servir do local:

| Estratégia | Comportamento | Quando usar |
|---|---|---|
| **Cache-first** | Serve do local; busca rede em background | Dados que mudam pouco (catálogo, perfil) |
| **Network-first** | Tenta rede; fallback para local se falhar | Dados que mudam frequentemente (feed, preços) |
| **Stale-while-revalidate** | Serve local imediatamente; atualiza em background | Melhor UX percebida — sempre rápido |
| **Network-only** | Sempre da rede; sem fallback | Dados em tempo real (saldo, disponibilidade) |

A maioria dos casos se beneficia de **stale-while-revalidate**: o usuário vê dados imediatamente e a
atualização chega sem spinner.

## Optimistic update

Optimistic update aplica a mudança na UI antes de o servidor confirmar. A hipótese é que a operação
vai ter sucesso — daí o otimismo.

```
Usuário curte post → UI mostra curtida imediatamente → requisição vai ao servidor em background
                                                       ↓ falha → reverte curtida na UI + notifica
```

Regras para usar optimistic update com segurança:

- A operação deve ser reversível se o servidor rejeitar
- O usuário deve ser informado se a reversão acontecer
- Não usar em operações destrutivas sem confirmação (exclusão de conta, transferência financeira)

## Fila de operações e sincronização

Quando o usuário age sem rede, as operações precisam ser enfileiradas para sincronização posterior:

```
Offline: Usuário cria pedido → pedido salvo localmente com status "pendente"
Online:  Fila processada → pedido enviado ao servidor → status atualizado para "confirmado"
```

A fila deve ser persistente — se o app for encerrado com operações pendentes, elas devem sobreviver
ao cold start e ser processadas quando a rede voltar.

Cada operação na fila deve ser **idempotente**: se enviada duas vezes (por nova tentativa após falha de
rede), o resultado deve ser o mesmo. A estratégia mais comum é incluir um ID único gerado pelo
cliente em cada operação.

## Conflict resolution

Conflito ocorre quando local e remoto divergem: o usuário editou um registro offline enquanto outro
usuário o editou no servidor.

| Estratégia | Comportamento | Trade-off |
|---|---|---|
| **Last write wins** | Quem salvou por último vence | Simples; pode perder dados |
| **Server wins** | Versão do servidor sempre prevalece | Previsível; descarta mudanças locais |
| **Client wins** | Versão local sempre prevalece | Favorece o usuário; pode criar inconsistências |
| **Merge** | Tentativa de combinar as duas versões | Melhor resultado; complexo de implementar |
| **Manual** | Apresenta o conflito ao usuário para resolver | Correto; intrusivo |

A estratégia depende do domínio. Para notas pessoais, **merge** é o ideal. Para transações
financeiras, **server wins** é o mais seguro. Nunca escolher a estratégia sem entender o custo de
cada tipo de conflito para o usuário.

## Network-aware UX

O estado da rede deve ser visível e comunicado sem alarmar:

| Estado | Comportamento esperado |
|---|---|
| Conectado | Fluxo normal — sem indicadores desnecessários |
| Desconectado | Banner discreto informando modo offline; funcionalidades disponíveis claras |
| Reconectado | Sincronia automática em background; notificação apenas se relevante |
| Operação pendente | Indicador de "aguardando sincronia" na entidade afetada |
| Sincronia falhou | Mensagem clara com opção de nova tentativa; nunca perder a operação silenciosamente |

O erro mais comum é mostrar uma tela de erro onde deveria aparecer dado em cache. Se o dado existe
localmente, exibi-lo — a rede é um detalhe de implementação, não um estado de erro do produto.
