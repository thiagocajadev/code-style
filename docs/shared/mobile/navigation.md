# Navegação entre telas

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Navigation** (navegação) é o sistema que move o usuário de uma tela para outra. Em mobile ele funciona como uma pilha: cada tela nova cobre a anterior, o botão voltar remove a do topo, e o usuário espera reencontrar esse histórico quando volta ao app horas depois. O roteamento web, com uma URL trocando o conteúdo da página, funciona por outro modelo.

A estrutura de navegação comunica a hierarquia do produto: o que é principal, o que é secundário e o que é passageiro. Quando ela está confusa, o usuário se perde antes de chegar no conteúdo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Stack** (pilha de telas) | Telas empilhadas; a nova tela cobre a anterior; voltar remove do topo |
| **Tab bar** (barra de abas) | Navegação principal entre seções independentes; sem hierarquia entre elas |
| **Modal** (janela sobreposta) | Tela que interrompe o fluxo atual; exige ação explícita para fechar |
| **Bottom sheet** (painel inferior) | Painel que desliza de baixo; menos intrusivo que um modal completo |
| **Deep link** (link direto) | URL ou intenção que abre o app diretamente em uma tela específica |
| **Back stack** (pilha de retorno) | Histórico de telas navegadas; gerenciado pelo SO e pelo framework |
| **Navigator** (navegador) | Componente responsável por gerenciar a pilha e executar transições |
| **Route** (rota) | Identificador de uma tela; pode carregar parâmetros |

## Padrões de navegação

### Stack: aprofundar o contexto

A pilha é o padrão base. Cada tela empilha sobre a anterior, e voltar remove a do topo e devolve o que estava embaixo.

```
Lista de produtos → Detalhe do produto → Checkout → Confirmação
                         ↑ voltar remove Checkout e restaura Detalhe
```

Serve para fluxos hierárquicos, onde cada toque leva o usuário mais fundo no mesmo assunto. A tela anterior continua em memória, então a volta é imediata.

### Tab bar: seções que convivem lado a lado

A barra de abas organiza as seções independentes do produto. Cada aba guarda a sua própria pilha.

```
[Home] [Busca] [Pedidos] [Perfil]
  ↑ cada aba tem stack independente: mudar de aba não destrói o estado da anterior
```

Ela cabe nas seções principais do produto, em geral até 5 abas. Uma barra com oito abas divide a atenção do usuário e costuma indicar que o produto ainda não escolheu o que é principal.

### Modal: interromper para decidir

O modal para o fluxo atual e pede uma resposta. O usuário fecha de propósito: deslizando para baixo, tocando em cancelar ou concluindo a ação.

```
Fluxo normal → Modal aberto → [Confirma / Cancela] → Fluxo normal retomado
```

Cabe em ação destrutiva (confirmar exclusão), coleta rápida de dados (um formulário curto) e contexto que fica fora da hierarquia principal. Conteúdo que o usuário consulta o tempo todo pertence à pilha ou à barra de abas, onde ele consegue voltar sem fechar nada.

## Deep link

O **deep link** abre o app direto em uma tela específica, a partir de uma **URL** (Uniform Resource Locator · Localizador Uniforme de Recurso) ou de uma intenção vinda de fora. É por ele que chegam as notificações push, os e-mails e os links compartilhados.

```
Notificação push → deep link → app abre na tela de detalhe do pedido
```

Um deep link completo resolve dois cenários:

| Cenário | Comportamento |
|---|---|
| App aberto (warm start) | Navega para a tela destino mantendo o back stack existente |
| App fechado (cold start) | Inicializa o app e reconstrói o back stack até a tela destino |

O segundo cenário concentra os bugs. O usuário chega na tela de detalhe do pedido vindo de uma notificação, toca em voltar e precisa cair na lista de pedidos, com a pilha reconstruída por baixo dele. Sem isso, ele encontra uma tela vazia ou o app fecha na cara dele.

## Passagem de parâmetros

Os parâmetros viajam junto com a rota quando a tela é empilhada. Existem dois padrões:

| Padrão | Quando usar |
|---|---|
| Parâmetros leves na rota (ID, slug) | Tela busca os dados do domínio ao montar |
| Objeto serializado na rota | Quando os dados já estão disponíveis e uma nova busca seria redundante |

O ID na rota resiste melhor ao tempo. A tela destino busca o dado atual no domínio, e o usuário vê o preço de agora em vez do preço que estava na lista quando ele tocou no item.

## Back stack e ciclo de vida

O sistema operacional e o framework cuidam da pilha de retorno. No toque em voltar, a tela do topo é destruída e a anterior volta a rodar.

```
Stack: [Home → Lista → Detalhe]
Voltar: [Home → Lista]  ← Detalhe destruída
```

A tela destruída devolve a memória que ocupava. As telas que continuam na pilha podem ser pausadas pelo sistema quando a memória fica curta. Vale a mesma regra do ciclo de vida: a tela anterior pode ter perdido o que tinha em memória, então restaure o estado dela ao retomar.
