# State Management (Gerenciamento de Estado)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**State management** (gerenciamento de estado) é a disciplina de decidir onde o estado da aplicação
vive, quem pode alterá-lo e como as mudanças se propagam para a interface. Em mobile, essa decisão
tem peso extra: o estado precisa sobreviver a rotações de tela, process death e retomadas do
background — situações que aplicações web raramente enfrentam.

A consequência de uma estratégia de estado mal definida é visível: spinners que nunca somem,
formulários que resetam sem motivo, e dados inconsistentes entre telas.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **UI state** (estado da interface) | Estado que controla o que está visível: loading, erro, campo de formulário |
| **Domain state** (estado de negócio) | Dados do domínio: usuário autenticado, lista de pedidos, produto selecionado |
| **Unidirectional data flow** (fluxo de dados unidirecional) | Estado muda por ações → UI reage às mudanças; nunca o contrário |
| **Reactive** (reativo) | A UI atualiza automaticamente quando o estado muda, sem atualização manual |
| **ViewModel** (modelo da tela) | Camada que expõe o estado da tela e processa ações da UI |
| **Single source of truth** (fonte única da verdade) | Cada dado tem um único dono; cópias são derivadas, nunca independentes |
| **State hoisting** (elevação de estado) | Mover o estado para o ancestral comum mais próximo que precisa dele |
| **Derived state** (estado derivado) | Valor calculado a partir de outro estado; nunca armazenado separadamente |

## UI state vs domain state

A distinção mais importante em state management mobile é separar o estado que controla a tela do
estado que representa o domínio.

**UI state** é efêmero e pertence à tela:

- Campo de busca preenchido
- Indicador de carregamento visível
- Mensagem de erro exibida
- Item selecionado em uma lista

**Domain state** é persistente e pertence ao domínio:

- Usuário autenticado e seus dados
- Lista de produtos carregada
- Carrinho de compras
- Configurações do usuário

UI state morre com a tela. Domain state sobrevive à navegação e ao process death. Misturar os dois
no mesmo lugar produz telas que consomem dados que já foram destruídos ou que persistem lixo
desnecessariamente.

## Unidirectional data flow

O padrão mais sólido para state management em mobile é o fluxo unidirecional:

```
Usuário dispara ação → ViewModel processa → Estado atualizado → UI reage
```

Nunca o contrário. A UI não altera o estado diretamente — ela dispara uma ação e aguarda a
atualização.

```
BAD: Tela altera o objeto de pedido diretamente ao clicar em "Confirmar"
GOOD: Tela dispara ação "ConfirmarPedido" → ViewModel processa → estado atualizado → tela reage
```

O benefício é rastreabilidade: toda mudança de estado passa por um ponto único, tornando o fluxo
previsível e testável.

## Reatividade

Em mobile, o padrão reativo é o padrão esperado: a UI observa o estado e atualiza automaticamente
quando ele muda. Não existe "chamar refresh manualmente".

```
Estado muda → observadores notificados → componentes relevantes re-renderizam
```

Cada framework tem seu mecanismo:

| Plataforma | Mecanismo reativo |
|---|---|
| Android (Kotlin) | StateFlow, LiveData |
| iOS (Swift) | Combine, @Published, @Observable |
| Flutter (Dart) | StreamBuilder, Provider, Riverpod, Bloc |
| React Native | useState, useReducer, Zustand |

O mecanismo muda, o princípio não: **estado → UI**, nunca **UI → estado**.

## Onde o estado vive

| Escopo | Onde armazenar | Exemplos |
|---|---|---|
| Componente único | Estado local do componente | Campo de texto, toggle local |
| Tela inteira | ViewModel da tela | Dados da tela, loading, erro |
| Múltiplas telas | Estado compartilhado / store | Usuário autenticado, carrinho |
| Persiste entre sessões | Banco de dados local | Preferências, dados offline |

A regra do escopo mínimo: o estado deve viver no nível mais baixo da hierarquia que ainda atende a
todos os consumidores. Elevar o estado além do necessário polui camadas que não precisam dele.

## Derived state

Estado derivado é qualquer valor que pode ser calculado a partir de outro estado. Nunca armazene
estado derivado separadamente — sincronizá-lo manualmente é uma fonte garantida de inconsistências.

```
BAD: manter totalDoCarrinho como estado separado e atualizar manualmente a cada item adicionado
GOOD: calcular totalDoCarrinho a partir da lista de itens sempre que a lista mudar
```

Derived state computado é sempre consistente porque não tem estado próprio para ficar fora de
sincronia.

## Process death e recuperação de estado

Quando o SO encerra o processo, o UI state volátil é perdido. O usuário espera recuperar o contexto
ao retornar.

A estratégia é salvar o estado mínimo necessário para reconstruir a tela:

```
App vai para background → salvar estado relevante da tela (ex: ID do item selecionado, posição de scroll)
SO encerra processo     → estado volátil perdido
Usuário retorna         → estado restaurado → tela reconstruída a partir do ID salvo
```

O critério é: salvar o suficiente para que o retorno seja imperceptível para o usuário, não o
suficiente para replicar toda a memória em disco.
