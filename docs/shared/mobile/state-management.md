# Gerenciamento de estado: onde o dado vive e quem pode alterá-lo

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**State management** (gerenciamento de estado) decide três coisas: onde o estado da aplicação vive, quem pode alterá-lo e como a mudança chega até a interface. Em mobile, essas decisões pesam mais que na web, porque o estado precisa sobreviver a rotações de tela, ao **process death** (o sistema operacional encerra o processo do app para liberar memória) e à volta do background horas depois.

Quando a estratégia de estado fica mal definida, o usuário vê o resultado na tela: o spinner que nunca some, o formulário que se apaga sozinho, a mesma informação com dois valores diferentes em duas telas.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **UI state** (estado da interface) | Estado que controla o que está visível: loading, erro, campo de formulário |
| **Domain state** (estado de negócio) | Dados do domínio: usuário autenticado, lista de pedidos, produto selecionado |
| **Unidirectional data flow** (fluxo de dados unidirecional) | O estado muda por ações e a UI reage à mudança; o caminho de volta não existe |
| **Reactive** (reativo) | A UI atualiza automaticamente quando o estado muda, sem atualização manual |
| **ViewModel** (modelo da tela) | Camada que expõe o estado da tela e processa ações da UI |
| **Single source of truth** (fonte única da verdade) | Cada dado tem um único dono; cópias são derivadas dele |
| **State hoisting** (elevação de estado) | Mover o estado para o ancestral comum mais próximo que precisa dele |
| **Derived state** (estado derivado) | Valor calculado a partir de outro estado, sem armazenamento próprio |

## O estado da tela e o estado do domínio

A separação mais importante em mobile fica entre o estado que controla a tela e o estado que representa o negócio. Aqui, a **UI** (User Interface · Interface do Usuário) é a camada que o usuário vê e toca, e o **domínio** são as regras e os dados de negócio que vivem atrás dela.

O **UI state** pertence à tela e dura o que a tela durar:

- Campo de busca preenchido
- Indicador de carregamento visível
- Mensagem de erro exibida
- Item selecionado em uma lista

O **domain state** pertence ao domínio e continua existindo depois que a tela fecha:

- Usuário autenticado e seus dados
- Lista de produtos carregada
- Carrinho de compras
- Configurações do usuário

O UI state morre junto com a tela. O domain state atravessa a navegação e sobrevive ao process death. Guardar os dois no mesmo lugar produz dois defeitos conhecidos: a tela lê um dado que já foi destruído, ou o app carrega para sempre um estado de interface que deixou de existir.

## Fluxo de dados unidirecional

O padrão mais sólido para mobile faz o dado correr em uma direção só:

```
Usuário dispara ação → ViewModel processa → Estado atualizado → UI reage
```

A UI dispara a ação e espera o estado novo chegar. Ela não escreve no estado por conta própria, e é isso que mantém o caminho previsível.

```
BAD: Tela altera o objeto de pedido diretamente ao clicar em "Confirmar"
GOOD: Tela dispara ação "ConfirmarPedido" → ViewModel processa → estado atualizado → tela reage
```

O ganho é rastreabilidade. Toda mudança passa por um ponto único, e o bug de estado tem um lugar só para ser procurado.

## Reatividade

Em mobile, o padrão reativo é o esperado: a UI observa o estado e se atualiza sozinha quando ele muda. Chamar um refresh na mão é sinal de que a observação está faltando em algum ponto.

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

O mecanismo muda de plataforma para plataforma. A direção do fluxo se mantém: o estado alimenta a UI.

## Onde o estado vive

| Escopo | Onde armazenar | Exemplos |
|---|---|---|
| Componente único | Estado local do componente | Campo de texto, toggle local |
| Tela inteira | ViewModel da tela | Dados da tela, loading, erro |
| Múltiplas telas | Estado compartilhado / store | Usuário autenticado, carrinho |
| Persiste entre sessões | Banco de dados local | Preferências, dados offline |

Vale a regra do escopo mínimo: o estado mora no nível mais baixo da hierarquia que ainda atende todos os consumidores. Elevar além disso obriga camadas intermediárias a carregar um dado que elas nunca usam.

## Estado derivado

O estado derivado é qualquer valor que pode ser calculado a partir de outro. Guardá-lo como um estado à parte cria dois lugares para atualizar, e a sincronização manual entre eles falha em algum caminho de código.

```
BAD: manter totalDoCarrinho como estado separado e atualizar manualmente a cada item adicionado
GOOD: calcular totalDoCarrinho a partir da lista de itens sempre que a lista mudar
```

O total calculado a partir da lista está sempre correto, porque ele não tem uma cópia própria que possa ficar defasada.

## Process death e recuperação de estado

Quando o sistema operacional encerra o processo, todo o UI state em memória vai junto. O usuário, que apenas atendeu uma ligação, espera voltar e encontrar a tela onde deixou.

A estratégia é salvar o mínimo necessário para reconstruir a tela:

```
App vai para background → salvar estado relevante da tela (ex: ID do item selecionado, posição de scroll)
SO encerra processo     → estado volátil perdido
Usuário retorna         → estado restaurado → tela reconstruída a partir do ID salvo
```

O critério é o retorno imperceptível para o usuário. Salvar o ID do item e a posição do scroll basta para reconstruir a tela; copiar a memória inteira para o disco custa tempo de gravação a cada ida para o background.
