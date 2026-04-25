# Navigation (Navegação)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Navigation** (navegação) em mobile é o sistema que define como o usuário se move entre telas. A
diferença fundamental em relação ao routing web é o modelo de pilha: telas empilham e desempilham,
o botão voltar tem semântica física, e o usuário espera que o histórico de navegação seja preservado
entre sessões.

A estrutura de navegação comunica a hierarquia do produto: o que é primário, o que é secundário e o
que é contextual. Uma arquitetura de navegação mal definida confunde o usuário antes mesmo de ele
interagir com o conteúdo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Stack** (pilha de telas) | Telas empilhadas — a nova tela cobre a anterior; voltar remove do topo |
| **Tab bar** (barra de abas) | Navegação principal entre seções independentes; sem hierarquia entre elas |
| **Modal** (janela sobreposta) | Tela que interrompe o fluxo atual; exige ação explícita para fechar |
| **Bottom sheet** (painel inferior) | Painel que desliza de baixo; menos intrusivo que um modal completo |
| **Deep link** (link direto) | URL ou intenção que abre o app diretamente em uma tela específica |
| **Back stack** (pilha de retorno) | Histórico de telas navegadas; gerenciado pelo SO e pelo framework |
| **Navigator** (navegador) | Componente responsável por gerenciar a pilha e executar transições |
| **Route** (rota) | Identificador de uma tela; pode carregar parâmetros |

## Padrões de navegação

### Stack

Stack é o padrão base. Cada tela empilha sobre a anterior. Voltar remove a tela do topo e restaura
a anterior.

```
Lista de produtos → Detalhe do produto → Checkout → Confirmação
                         ↑ voltar remove Checkout e restaura Detalhe
```

Stack é indicado para fluxos hierárquicos: o usuário aprofunda o contexto a cada tela. A tela
anterior permanece em memória e pode ser restaurada instantaneamente.

### Tab bar

Tab bar organiza seções independentes da aplicação. Cada aba mantém sua própria pilha de navegação.

```
[Home] [Busca] [Pedidos] [Perfil]
  ↑ cada aba tem stack independente — mudar de aba não destrói o estado da anterior
```

Tab bar é indicado para as seções primárias do produto — geralmente no máximo 5 abas. Abas em
excesso fragmentam a atenção e indicam falta de foco de produto.

### Modal

Modal interrompe o fluxo atual para capturar atenção ou coletar entrada. O usuário deve fechar
explicitamente — deslizando para baixo, tocando em cancelar ou completando a ação.

```
Fluxo normal → Modal aberto → [Confirma / Cancela] → Fluxo normal retomado
```

Modal é indicado para ações destrutivas (confirmar exclusão), coleta de dados simples (formulário
rápido) ou contexto que não pertence à hierarquia principal. Não é indicado para conteúdo que o
usuário vai consultar frequentemente — isso pertence à stack ou à tab bar.

## Deep link

Deep link é a capacidade de navegar diretamente para uma tela específica via URL ou intenção
externa. É o ponto de entrada de notificações push, e-mails e links compartilhados.

```
Notificação push → deep link → app abre na tela de detalhe do pedido
```

Um deep link bem implementado resolve dois cenários:

| Cenário | Comportamento |
|---|---|
| App aberto (warm start) | Navega para a tela destino mantendo o back stack existente |
| App fechado (cold start) | Inicializa o app e reconstrói o back stack até a tela destino |

O segundo cenário é o mais crítico. Se o usuário tocar em voltar a partir de uma tela aberta via
deep link, deve chegar em um estado coerente — não em uma tela em branco.

## Passagem de parâmetros

Parâmetros viajam junto com a rota ao empilhar uma tela. Dois padrões:

| Padrão | Quando usar |
|---|---|
| Parâmetros leves na rota (ID, slug) | Tela busca os dados do domínio ao montar |
| Objeto serializado na rota | Quando os dados já estão disponíveis e uma nova busca seria redundante |

Preferir IDs na rota é mais resiliente: a tela destino busca os dados frescos do domínio, evitando
inconsistências quando o objeto mudou entre a navegação e a exibição.

## Back stack e ciclo de vida

A pilha de retorno é gerenciada pelo SO e pelo framework. Ao pressionar voltar, a tela do topo é
destruída e a anterior é retomada.

```
Stack: [Home → Lista → Detalhe]
Voltar: [Home → Lista]  ← Detalhe destruída
```

Telas destruídas liberam memória. Telas na pilha podem ser pausadas pelo SO se a memória estiver
baixa. A regra é a mesma do lifecycle: nunca assumir que a tela anterior ainda está no mesmo estado
em que foi deixada — sempre restaurar o estado ao retomar.
