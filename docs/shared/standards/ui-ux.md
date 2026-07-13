# Interface e experiência do usuário

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

A interface é o contrato entre o sistema e quem o usa. Cada decisão de espaçamento, cor, hierarquia e estado comunica alguma coisa ao usuário. Quando essas decisões são inconsistentes, ele precisa de mais esforço para entender o que o sistema oferece.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Padding** (preenchimento interno) | Espaço entre o conteúdo e a borda de um container |
| **Token** (valor nomeado do sistema de design) | Variável semântica que representa um valor de design (cor, espaçamento, tipografia) |
| **Viewport** (área visível da tela) | Porção da tela disponível para renderização no momento |
| **WCAG** (Web Content Accessibility Guidelines · Diretrizes de Acessibilidade para Conteúdo Web) | Padrão internacional de acessibilidade para conteúdo web, com níveis A, AA e AAA |
| **ARIA** (Accessible Rich Internet Applications · Aplicações de Internet Ricas Acessíveis) | Atributos HTML que complementam a semântica nativa para padrões complexos de UI |
| **Skeleton** (esqueleto de carregamento) | Placeholder visual que representa o formato do conteúdo enquanto os dados carregam |
| **Toast** (notificação temporária) | Mensagem de feedback exibida brevemente na interface, sem interromper o fluxo do usuário |
| **Surface** (superfície) | Plano visual que sustenta conteúdo: o fundo da página, um painel, um card, um modal |
| **Elevation** (elevação) | Distância aparente entre uma superfície e a que está embaixo dela, sugerida por cor, borda ou sombra |
| **Z-index** (ordem de empilhamento) | Valor que decide qual elemento fica na frente quando dois se sobrepõem |

## Densidade visual e respiro

Quando muitos elementos disputam atenção ao mesmo tempo, o olho cansa e a decisão demora. O respiro (o espaço entre os elementos) organiza a leitura: ele mostra por onde começar e onde cada grupo termina.

A regra é o agrupamento semântico: o que se relaciona fica perto, o que é distinto ganha distância. Antes de ler as palavras, o olho lê a interface como parágrafos.

| Anti-pattern | Efeito | Solução |
|---|---|---|
| Texto colado na borda do container | Sensação de sufocamento | Padding (preenchimento interno) consistente |
| Todos os elementos com o mesmo peso visual | Nenhuma hierarquia clara | Tamanho, cor e espaçamento para criar níveis |
| Espaçamento inconsistente entre seções | Interface parece montada por partes | Sistema de espaçamento em escala fixo |
| Informação densa sem quebra visual | Cansativo de ler | Grupos de no máximo 2-3 linhas com respiro entre eles |

## Sistema de espaçamento

Valores escolhidos caso a caso (`margin: 13px`, `padding: 7px`) se acumulam e produzem uma inconsistência difícil de localizar depois. Um sistema de espaçamento define uma escala de valores fixos que se repetem na interface toda.

Escala típica, com os valores subindo a cada 4px:

| Token | Valor | Uso comum |
|---|---|---|
| `space-1` | 4px | Espaço interno mínimo (ícone + label) |
| `space-2` | 8px | Padding de componentes compactos |
| `space-3` | 12px | Gap entre elementos dentro de um grupo |
| `space-4` | 16px | Padding padrão de cards e seções |
| `space-6` | 24px | Separação entre grupos distintos |
| `space-8` | 32px | Separação entre seções maiores |
| `space-12` | 48px | Separação entre blocos de página |

Usar tokens (valores nomeados do sistema de design) em vez de números soltos tem um ganho concreto: ajustar a escala uma vez propaga o ajuste por toda parte. A interface passa a respirar no mesmo ritmo em qualquer viewport (área visível da tela).

## Hierarquia tipográfica

Texto sem hierarquia não diz por onde começar. O leitor precisa de âncoras visuais para separar num relance o que é título, o que é descrição e o que é detalhe.

Três níveis bastam para quase todo contexto:

| Nível | Papel | Características |
|---|---|---|
| **Primário** | Título da seção ou ação principal | Tamanho maior, peso alto, cor de maior contraste |
| **Secundário** | Subtítulo, rótulo de campo, nome de item | Tamanho médio, peso regular |
| **Terciário** | Metadado, data, hint (dica), legenda | Tamanho menor, cor mais suave |

Passar de três níveis na mesma tela derruba a hierarquia em vez de refiná-la: quando tudo parece especial, nada parece importante.

<a id="surface-hierarchy"></a>

## Hierarquia de superfícies

Uma interface é lida em camadas antes de ser lida em palavras. O olho identifica o que está no fundo, o que está apoiado sobre ele e o que flutua por cima, e usa essa leitura para decidir o que é conteúdo, o que é moldura e o que exige resposta agora. A **superfície** (o plano visual que sustenta o conteúdo) é a peça que carrega essa informação.

A pilha tem cinco níveis, e quase toda tela cabe neles:

| Nível | O que é | Papel na leitura |
|---|---|---|
| **Background** (plano de fundo) | O fundo da página | Define o tom geral e não compete com nada |
| **Surface** (painel) | Sidebar, cabeçalho, painel lateral | Estrutura fixa: mostra onde o usuário está |
| **Card** (container de conteúdo) | Bloco de conteúdo agrupado | Delimita uma unidade que pode ser lida sozinha |
| **Overlay** (camada flutuante) | Dropdown, popover, tooltip | Conteúdo temporário ligado a um gatilho |
| **Modal** (janela bloqueante) | Diálogo, confirmação | Interrompe o fluxo e exige uma decisão |

```
modal      → interrompe: exige decisão do usuário
overlay    → flutua: dropdown, popover, tooltip
card       → agrupa: unidade de conteúdo
surface    → estrutura: sidebar, header
background → base: o plano da página
```

A ordem importa mais que os valores. Uma camada só aparece acima de outra quando o conteúdo dela é mais urgente ou mais temporário. Um card que flutua como se fosse modal, ou um modal que se confunde com o fundo, faz o usuário perder o rastro do que está ativo.

### Elevar com cor, borda ou sombra

Três recursos separam uma camada da que está embaixo, e cada um comunica uma coisa diferente:

| Recurso | O que comunica | Quando escolher |
|---|---|---|
| **Diferença de cor de fundo** | Camadas distintas, ambas fixas | Estrutura permanente: sidebar sobre a página, card sobre o fundo |
| **Borda** | Limite claro, sem sugerir altura | Interfaces densas (tabelas, painéis de dados), dark mode, quando a sombra suja o layout |
| **Sombra** | Altura real: o elemento está acima do plano | Conteúdo temporário: dropdown, popover, modal, elemento arrastado |

O erro comum é acumular os três no mesmo componente. Um card com fundo diferente, borda visível e sombra pesada grita três vezes a mesma informação e ainda assim não fica mais legível. Um recurso resolve a maioria dos casos; dois já é uma decisão que precisa de motivo.

A força do recurso acompanha a altura da camada. Um card em repouso pede uma sombra que mal se nota. Um modal pede uma sombra funda, porque ele precisa parecer descolado de tudo o que está atrás. Quando a sombra do card e a do modal são iguais, o usuário deixa de distinguir o que é conteúdo do que é interrupção.

Para o lado da cor (quanto de luminosidade separa duas camadas em **OKLCH**, quanto de croma cabe num fundo, como tonalizar a sombra), o SSOT é [color-theory.md](color-theory.md#surface-hierarchy).

### Quanto menos camadas, melhor

Cada camada nova disputa a atenção do usuário e ocupa um lugar na pilha do código. Três anti-patterns aparecem quando a pilha cresce sem controle:

| Anti-pattern | Efeito | Solução |
|---|---|---|
| Tudo elevado (card dentro de card dentro de painel) | Nenhuma camada se destaca; a tela vira um relevo confuso | Achatar: usar espaçamento e tipografia para agrupar, guardar a elevação para o que flutua |
| Modal que abre modal | O usuário perde o caminho de volta e o `Esc` fecha o que ele não esperava | Um nível de interrupção por vez; o segundo passo vira uma etapa dentro do mesmo modal |
| `z-index: 9999` espalhado pelo código | Ninguém sabe mais o que fica na frente do quê | Escala nomeada de z-index no sistema de design, com uma parada por nível da pilha |

O `z-index` merece a mesma disciplina do espaçamento: uma escala fixa, com um valor por camada, definida num lugar só.

```
--z-base       → 0     conteúdo da página
--z-sticky     → 10    header e sidebar fixos
--z-dropdown   → 20    menus e popovers
--z-modal      → 30    diálogos
--z-toast      → 40    notificações sobre o modal
```

Com a escala nomeada, quem escreve um componente novo escolhe a camada pelo papel dele. Sem ela, cada desenvolvedor descobre o número que funciona no dia e soma um.

### Superfícies e acessibilidade

O contraste é medido contra a superfície imediata, e não contra o fundo da página. Um texto cinza que passa no **WCAG** sobre o branco da página pode falhar sobre o cinza claro de um card. Cada camada que muda o fundo obriga a reconferir o texto e os ícones que vivem em cima dela.

Elevação sozinha não comunica estado. Um item selecionado que se distingue apenas por uma sombra some para quem enxerga pouco ou usa alto contraste. A sombra entra como reforço, acompanhada de uma borda, uma mudança de cor de fundo ou um ícone.

## Temas claro e escuro

Cada tema pede uma paleta própria, reajustada para o seu contexto. Superfície, sombra, opacidade e contraste se comportam de maneira diferente conforme o fundo, e inverter as cores do tema claro não resolve isso.

Na prática, isso se resolve com variáveis semânticas em vez de valores fixos:

| Abordagem | Problema |
|---|---|
| `color: #1a1a1a` direto no componente | Não muda com o tema |
| `color: var(--text-primary)` com valores por tema | Funciona nos dois modos |

```
--text-primary        → texto de maior hierarquia
--text-secondary      → texto de apoio
--surface-base        → fundo da página
--surface-elevated    → fundo de cards e modais
--border-subtle       → bordas de separação
--interactive-default → cor de botões e links
```

Para o detalhamento de **OKLCH**, harmonias, escala tonal de 11 paradas, cor das superfícies, **WCAG** 1.4.3 e estratégias específicas de light/dark, consulte [color-theory.md](color-theory.md).

## Acessibilidade

Acessibilidade é a garantia de que a interface funciona para todo mundo, incluindo quem usa leitor de tela, navega só pelo teclado ou enxerga pouco.

### Contraste

Texto e elementos interativos precisam se destacar do fundo. Um teste caseiro resolve a maioria dos casos: se você aperta os olhos para ler no mockup (protótipo visual), vai falhar em produção.

### Navegação por teclado

Todo elemento interativo (botão, link, campo, modal) tem que ser alcançável com `Tab` e acionável com `Enter` ou `Space`, e a ordem do foco precisa seguir a ordem visual da página.

Foco visível é obrigatório. Remover o outline (contorno) de foco sem colocar nada equivalente no lugar deixa quem navega por teclado sem saber onde está.

### Semântica HTML

Os elementos **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto) semânticos são o que comunica estrutura ao leitor de tela:

| Evitar | Usar |
|---|---|
| `<div>` com click handler | `<button>` |
| `<div>` para título | `<h1>–<h6>` |
| `<div>` para lista | `<ul>/<ol>/<li>` |
| `<img>` sem alt | `<img alt="descrição">` |

O leitor de tela anuncia o que o HTML declara. Um `<div>` com aparência de botão fica invisível para quem usa tecnologia assistiva, porque o HTML nunca disse que aquilo era um botão.

### ARIA

ARIA completa a semântica nativa nos padrões que o HTML não cobre sozinho: menus, **tooltips** (dicas flutuantes), modais, **comboboxes** (campos de seleção combinados).

ARIA é o último recurso. Tente o elemento HTML semântico primeiro, sempre. ARIA aplicado errado anuncia ao leitor de tela uma estrutura que não corresponde ao comportamento real, e isso confunde mais do que a ausência de ARIA.

### Estados e feedback

Toda ação do usuário precisa de uma resposta que ele consiga ver:

| Estado | Como comunicar |
|---|---|
| Loading | Spinner (ícone giratório de carregamento) ou skeleton (esqueleto de carregamento) com `aria-busy` |
| Erro de formulário | Mensagem inline (integrada ao elemento) associada ao campo via `aria-describedby` |
| Sucesso | Toast (notificação temporária) ou inline com contraste e ícone |
| Campo desabilitado | Combinar visual de desabilitado com atributo `disabled` |

## Estados da interface

Toda tela tem mais estados do que o estado feliz. Desenhar apenas a versão com dados deixa os outros estados para a produção resolver.

| Estado | Quando ocorre |
|---|---|
| **Empty** | Sem dados: primeiro uso ou filtro sem resultado |
| **Loading** | Dados sendo carregados |
| **Error** | Falha na operação, com mensagem e ação de recuperação |
| **Partial** | Dados carregados com erro em parte deles |
| **Success** | Operação concluída, com feedback temporário |

Um estado vazio bem feito aponta a próxima ação. Um estado de erro bem feito diz o que aconteceu e o que fazer agora. Tela em branco e mensagem técnica crua indicam estados que ninguém desenhou.
