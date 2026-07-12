# Offline-first: o app funciona a partir do banco local

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Offline-first** é a estratégia em que o app lê e escreve no banco local, e usa a rede para sincronizar esse banco em segundo plano. A premissa é a conectividade intermitente do celular: metrô, túnel, elevador, roaming, sinal fraco no fundo do galpão. Um app que trava sem rede empurra para o usuário um problema que o produto deveria resolver.

A diferença em relação a um cache simples está em quem manda na tela. No offline-first, o banco local é a fonte de verdade da **UI** (User Interface · Interface do Usuário). A rede atualiza o banco, e o banco atualiza a UI.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Cache** (armazenamento em cache) | Cópia local de dados remotos para acesso sem rede |
| **Sync** (sincronização) | Processo de reconciliar dados locais com o servidor |
| **Conflict resolution** (resolução de conflito) | Estratégia para decidir qual versão vence quando local e remoto divergem |
| **Optimistic update** (atualização otimista) | Aplicar a mudança localmente antes da confirmação do servidor |
| **Stale-while-revalidate** (cache imediato com revalidação ao fundo) | Exibir dado em cache enquanto busca versão atualizada em background |
| **Queue** (fila de operações) | Lista de ações locais pendentes de sincronização com o servidor |
| **idempotency** (operação repetível sem efeito adicional) | Operação que produz o mesmo resultado independente de quantas vezes é executada |
| **Tombstone** (marcador de deleção) | Registro de deleção local que o servidor ainda não confirmou |

## O modelo offline-first

O fluxo padrão tira a rede do caminho da leitura:

```
UI lê do banco local → banco local é atualizado pela rede (em background)
```

Comparado ao modelo tradicional:

```
Tradicional:   UI → rede → exibe resultado
Offline-first: UI → banco local → rede atualiza banco → UI reage
```

No modelo tradicional, cada leitura depende de uma resposta da rede, e a tela fica em espera enquanto ela não chega. No offline-first, a rede trabalha no caminho de atualização do banco, e a tela exibe o que já tem.

## Estratégias de cache

A estratégia de cache decide quando buscar dado fresco e quando servir o que já está no aparelho:

| Estratégia | Comportamento | Quando usar |
|---|---|---|
| **Cache-first** | Serve do local; busca rede em background | Dados que mudam pouco (catálogo, perfil) |
| **Network-first** | Tenta rede; fallback para local se falhar | Dados que mudam frequentemente (feed, preços) |
| **Stale-while-revalidate** | Serve local imediatamente; atualiza em background | Melhor UX percebida; sempre rápido |
| **Network-only** | Sempre da rede; sem fallback | Dados em tempo real (saldo, disponibilidade) |

A maior parte dos casos se resolve bem com **stale-while-revalidate**: o dado aparece na hora e a atualização chega depois, sem spinner no meio.

## Atualização otimista

A **optimistic update** aplica a mudança na tela antes de o servidor confirmar. A aposta é que a operação vai dar certo, e é daí que vem o nome.

```
Usuário curte post → UI mostra curtida imediatamente → requisição em background → falha? reverte curtida na UI + notifica
```

Regras para usar com segurança:

- A operação precisa ser reversível se o servidor rejeitar
- O usuário precisa ser avisado quando a reversão acontecer
- Operação destrutiva sem confirmação fica de fora (exclusão de conta, transferência financeira)

## Fila de operações e sincronização

Quando o usuário age sem rede, a operação entra em uma fila e espera a conexão voltar:

```
Offline: Usuário cria pedido → pedido salvo localmente com status "pendente"
Online:  Fila processada → pedido enviado ao servidor → status atualizado para "confirmado"
```

A fila precisa ser persistente, gravada em disco. Se o app for encerrado com operações pendentes, elas continuam lá no próximo cold start e são processadas quando a rede voltar.

Cada operação na fila precisa ser **idempotente**. A nova tentativa depois de uma falha de rede pode enviar o mesmo pedido duas vezes, e o resultado no servidor precisa ser o mesmo de um envio só. A forma mais comum é o cliente gerar um ID único por operação, que o servidor usa para reconhecer a repetição.

## Resolução de conflito

O conflito aparece quando as duas pontas mudam o mesmo registro: o usuário editou offline enquanto outra pessoa editava no servidor.

| Estratégia | Comportamento | Trade-off |
|---|---|---|
| **Last write wins** | Quem salvou por último vence | Simples; pode perder dados |
| **Server wins** | Versão do servidor sempre prevalece | Previsível; descarta mudanças locais |
| **Client wins** | Versão local sempre prevalece | Favorece o usuário; pode criar inconsistências |
| **Merge** | Tentativa de combinar as duas versões | Melhor resultado; complexo de implementar |
| **Manual** | Apresenta o conflito ao usuário para resolver | Correto; intrusivo |

O domínio decide. Em notas pessoais, o **merge** preserva o trabalho das duas edições. Em transação financeira, o **server wins** evita que uma edição offline sobrescreva um saldo já processado. A escolha exige saber quanto custa cada tipo de conflito para o usuário daquele app.

## Comunicar o estado da rede

O estado da conexão precisa ficar visível, sem transformar cada oscilação de sinal em alarme:

| Estado | Comportamento esperado |
|---|---|
| Conectado | Fluxo normal; sem indicadores desnecessários |
| Desconectado | Banner discreto informando modo offline; funcionalidades disponíveis claras |
| Reconectado | Sincronização automática em background; notificação apenas se relevante |
| Operação pendente | Indicador de "aguardando sincronização" na entidade afetada |
| Sincronização falhou | Mensagem clara com opção de nova tentativa; nunca perder a operação silenciosamente |

O erro mais comum é mostrar tela de erro onde havia dado em cache para exibir. Se o dado está no banco local, ele vai para a tela. A ausência de rede é uma condição de operação normal do celular, e o app segue funcionando com o que tem.
