# Teoria das cores

> Escopo: transversal. Aplica-se a qualquer interface, em qualquer linguagem ou stack do projeto.

Cada cor numa interface comunica hierarquia, estado, temperatura emocional e legibilidade. Escolhas feitas sem critério produzem interfaces que cansam o olho e falham em acessibilidade, e o problema piora conforme a paleta cresce. Esta página reúne a teoria mínima para decidir cor com intenção: o círculo cromático, o espaço **OKLCH** (Lightness, Chroma, Hue · Luminosidade, Croma, Matiz), as harmonias, o **WCAG** (Web Content Accessibility Guidelines · Diretrizes de Acessibilidade para Conteúdo Web), a hierarquia de superfícies e a escala tonal.

Para espaçamento, tipografia e estados, consulte [ui-ux.md](ui-ux.md). Para densidade visual em código, consulte [visual-density.md](visual-density.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Matiz** (hue, tom da cor) | Posição da cor no círculo cromático, medida em graus de 0° a 360° |
| **Croma** (chroma, intensidade) | Pureza ou saturação da cor: 0 é cinza, valores altos são cores vibrantes |
| **Luminosidade** (lightness, claridade) | Quão clara ou escura a cor é, de 0 (preto) a 1 (branco) |
| **OKLCH** (Lightness, Chroma, Hue · Luminosidade, Croma, Matiz) | Espaço de cor onde diferenças numéricas iguais correspondem a diferenças visuais iguais |
| **Gamut** (gama de cores reproduzíveis) | Conjunto de cores que um dispositivo ou espaço de cor consegue exibir |
| **Harmonia** (relação geométrica no círculo) | Conjunto de matizes em posições específicas que formam uma paleta coesa |
| **Escala tonal** (tonal scale, gradação por luminosidade) | Sequência de variações da mesma cor com luminosidade crescente, tipicamente 11 paradas (50 a 950) |
| **Parada** (stop, posição na escala tonal) | Cada um dos 11 valores discretos numa escala tonal |
| **WCAG** (Web Content Accessibility Guidelines · Diretrizes de Acessibilidade para Conteúdo Web) | Padrão internacional do W3C que define critérios mensuráveis de acessibilidade |
| **APCA** (Advanced Perceptual Contrast Algorithm · Algoritmo Avançado de Contraste Perceptual) | Método de cálculo de contraste do WCAG 3.0 baseado em luminância perceptual |

## Círculo cromático e OKLCH

O **círculo cromático** distribui os matizes ao longo de 360°. As **cores primárias** (vermelho, amarelo, azul) não saem de mistura nenhuma. As **secundárias** (laranja, verde, violeta) nascem da mistura de duas primárias. As **terciárias** combinam uma primária com a secundária vizinha.

Durante anos os sistemas de design usaram **RGB** (Red, Green, Blue · Vermelho, Verde, Azul), o espaço aditivo do monitor, e **HSL** (Hue, Saturation, Lightness · Matiz, Saturação, Luminosidade), uma projeção cilíndrica do RGB. Os dois carregam o mesmo defeito: o valor numérico de luminosidade diverge do que o olho percebe. Um amarelo em `hsl(50, 100%, 50%)` parece muito mais brilhante que um azul em `hsl(240, 100%, 50%)`, embora os dois tenham o mesmo L.

**OKLCH** corrige isso por ser perceptualmente uniforme: somar `+0.10` em L produz a mesma diferença visual em qualquer matiz. Na prática, a escala tonal sai previsível e balanceada, que é a base de um tema acessível.

```
oklch(L C H)
       │ │ │
       │ │ └─ Hue (matiz)        : 0° a 360°
       │ └─── Chroma (croma)     : 0 a ~0.4 em sRGB
       └───── Lightness (clara)  : 0 a 1
```

### Quentes, frias e temperatura visual

| Faixa de matiz | Categoria | Sensação |
|---|---|---|
| 0° a 60° | Quentes (vermelhos, laranjas, amarelos) | Energia, ação, urgência |
| 180° a 280° | Frias (azuis, ciano, violetas) | Calma, confiança, distância |
| 60° a 180° | Verdes intermediários | Estabilidade, natureza |
| 280° a 360° | Magentas e rosas | Atenção, criatividade |

Cores quentes **avançam** na percepção, parecem mais perto. Cores frias **recuam**. Dá para usar esse efeito para separar planos sem depender só de luminosidade.

## Harmonias de cor

Uma harmonia é uma relação geométrica no círculo cromático que produz paleta coesa. Cada uma tem personalidade própria e serve a um contexto. Os exemplos abaixo partem de **H = 250°** (azul).

| Harmonia | Geometria | Exemplo (base 250°) | Quando usar |
|---|---|---|---|
| **Complementar** | Cor oposta no círculo (180°) | 250° + 70° | Máximo contraste para CTAs e destaques. Use a cor de apoio em 10-20% da composição |
| **Análoga** | Três cores vizinhas (±30°) | 220°, 250°, 280° | Paletas suaves e harmoniosas. Ideal para fundos e superfícies |
| **Triádica** | Três cores equidistantes (120°) | 250°, 10°, 130° | Vibrante e equilibrada. Funciona quando uma cor domina e as outras atuam como acentos |
| **Split-complementar** | Base + duas adjacentes à complementar (150°/210°) | 250°, 40°, 100° | Contraste forte com menos tensão que a complementar pura |
| **Tetrádica** (retangular) | Quatro cores em retângulo (60°/180°/240°) | 250°, 310°, 70°, 130° | Paletas ricas. Exige hierarquia clara: uma dominante, uma de suporte, duas pontuais |
| **Quadrada** | Quatro cores equidistantes (90°) | 250°, 340°, 70°, 160° | Paletas muito variadas. Reduzir croma em 2 ou 3 das 4 cores para não sobrecarregar |
| **Neutros** | Croma mínimo derivado da base | Variações de L com C ≈ 0.01 | Acinzentados sutilmente tonalizados para fundos, bordas e texto secundário |

Os neutros funcionam de outro jeito: são variações de luminosidade da cor base com o croma quase zerado. Trocar o cinza puro (`oklch(L 0 0)`) por um neutro tonalizado (`oklch(L 0.005 250)`) faz fundos, bordas e texto secundário parecerem da mesma família que o resto da paleta.

## Composição

Depois de escolher a paleta, resta decidir como distribuir essas cores na tela. Essa distribuição determina se a interface respira e se a hierarquia fica visível.

### Regra 60-30-10

Distribua as cores em proporções definidas:

| Proporção | Papel | Tipicamente |
|---|---|---|
| **60%** | Cor dominante | Neutros ou cor primária dessaturada para fundos e superfícies |
| **30%** | Cor de suporte | Texto, bordas, elementos estruturais |
| **10%** | Cor de destaque | Botões primários, badges, alertas |

A proporção equilibra a tela e direciona a atenção para os elementos certos. Inverter a conta, com a cor de destaque ocupando 30 ou 60%, produz uma interface agressiva que cansa rápido.

### Hierarquia visual por contraste

O olho vai primeiro no que tem mais contraste. Reserve as cores saturadas e de alto contraste para o que pede ação (botão primário, alerta) e deixe os neutros no que é apoio (borda, fundo de seção, texto secundário). Quando tudo tem o mesmo peso, nada tem peso nenhum.

### Contraste de luminosidade e contraste de temperatura

São dois eixos independentes, e cada um separa planos à sua maneira.

| Tipo de contraste | Como funciona | Quando usar |
|---|---|---|
| **Luminosidade** (diferença de L) | Texto escuro sobre fundo claro, ou inverso | Principal fator de legibilidade. Sempre presente |
| **Temperatura** (frio sobre quente, ou inverso) | Fundo frio com elemento quente cria separação mesmo com L próximas | Estados hover, elementos interativos, badges informativos |

Usar os dois juntos (texto escuro e frio sobre fundo claro e quente) produz uma separação mais nítida que cada um deles isolado.

### Espaço em branco também é cor

O espaço negativo (branco no tema claro, neutro escuro no tema escuro) participa da composição como cor ativa: cria respiro, separa grupos e realça as cores vizinhas. É o mesmo princípio da densidade visual em código (ver [visual-density.md](visual-density.md)). Em **UI** (User Interface · Interface do Usuário) ou em código, o agrupamento por respiro guia a leitura.

Não tente preencher cada espaço vazio. Uma interface sem respiro tem o mesmo problema do código sem linha em branco entre grupos: o olho não identifica onde uma seção termina e outra começa.

## WCAG e contraste

O **WCAG** define acessibilidade em três níveis mensuráveis: **A** (mínimo), **AA** (o padrão que a indústria adota) e **AAA** (Triple-A, excelência). Quase todo produto digital mira o AA. O AAA é exigência em contexto crítico, como saúde e serviço público.

### Critério 1.4.3: contraste mínimo de texto

| Nível | Texto normal | Texto grande (≥18pt regular ou ≥14pt bold) |
|---|---|---|
| **AA** | 4.5 : 1 | 3 : 1 |
| **AAA** | 7 : 1 | 4.5 : 1 |

A **proporção de contraste** compara a luminância relativa de duas cores. O branco puro (`#fff`) tem luminância 1.0 e o preto puro (`#000`) tem 0, o que põe o teto da escala em **21 : 1**. Uma proporção de **4.5 : 1** quer dizer que a cor mais clara emite 4.5 vezes mais luminância que a mais escura.

### OKLCH e WCAG

O cálculo oficial do **WCAG 2.x** usa luminância em **sRGB** (Standard RGB · RGB Padrão), o espaço de cor padrão da web, em vez de OKLCH. Ainda assim, a uniformidade perceptual do OKLCH deixa a paleta previsível: paradas separadas por 4 ou mais posições na escala tonal costumam passar em AA na maioria dos matizes.

O **WCAG 3.0**, ainda em desenvolvimento, deve adotar o **APCA**, que calcula contraste por luminância perceptual, próxima da lógica do OKLCH. Quem projeta em OKLCH hoje já está andando nessa direção.

### Outros critérios relevantes para cor

| Critério | Sobre |
|---|---|
| **1.4.6** Contraste avançado | Versão AAA do 1.4.3 (7:1 e 4.5:1) |
| **1.4.11** Contraste de não-texto | Bordas, ícones e estados de foco precisam de 3:1 contra o fundo adjacente |
| **1.4.12** Espaçamento de texto | Texto deve ser legível mesmo quando o usuário aumenta o espaçamento |
| **1.4.13** Conteúdo em hover ou foco | Tooltips e popovers precisam ser persistentes, dispensáveis e hover-stable |

<a id="surface-hierarchy"></a>

## Hierarquia de superfícies

A interface moderna é feita de **camadas** empilhadas, e cada camada tem uma função semântica com uma cor associada. Entender essa pilha é o que permite criar temas consistentes. Esta seção trata da cor de cada camada. Para o uso (o que eleva, quanto elevar, a escala de z-index), ver [ui-ux.md](ui-ux.md#surface-hierarchy).

| Nível | Papel | Característica |
|---|---|---|
| **Background** | Plano base da página | Cor mais escura no dark mode, mais clara no light mode |
| **Surface** (sidebar, painel) | Painel sobre o background | Pequena diferença de L para indicar elevação |
| **Card** | Container de conteúdo agrupado | Sombra suave ou diferença de L mais marcada |
| **Popover / Modal** | Flutuante sobre cards | Sombra profunda; a camada mais elevada |
| **Foreground** | Texto e ícones no topo | Maior contraste contra a superfície imediata |

```
foreground  → texto e ícones       (L máximo de contraste)
popover     → modais, dropdowns    (L 1.000 + sombra profunda)
card        → containers           (L 1.000 + sombra suave)
surface     → sidebars, painéis    (L 0.970)
background  → plano base           (L 0.985)
```

### Diferença mínima de luminosidade

Para o olho registrar duas superfícies vizinhas como camadas distintas, a diferença de L em OKLCH precisa ser de pelo menos **0.05 a 0.08**, o equivalente a uma ou duas paradas na escala tonal. Abaixo disso o usuário deixa de perceber a separação entre as camadas.

### Densidade e cansaço visual

Muitas cores saturadas juntas cansam. A saída é baixar o croma dos fundos e guardar o croma alto para o que é interativo ou de destaque. Em OKLCH, manter o **croma abaixo de 0.05** nos backgrounds entrega neutralidade sem que eles percam a tonalidade da paleta.

### Sombras tonalizadas

Sombra preta pura parece genérica e destoa do tema. Tonalizar a sombra com a cor base da paleta (um azul dessaturado num tema frio, um marrom num tema quente) integra melhor e parece mais natural. No dark mode, prefira separar as superfícies por luminosidade, porque a sombra opaca desaparece sobre fundo escuro.

## Temas claro e escuro

Um dark theme de qualidade exige estratégia própria, porque o olho responde à luz de forma diferente em cada contexto. Inverter as cores do light theme produz um resultado pior que o original. Para variáveis semânticas e tokens, ver [ui-ux.md](ui-ux.md).

### O fundo escuro fica entre L 0.12 e 0.18

Fundo escuro demais (L abaixo de 0.10 em OKLCH) cria contraste máximo contra qualquer conteúdo e cansa em uso prolongado. Os melhores dark themes ficam com **L entre 0.12 e 0.18** no background: escuro o bastante para ser dark, com ar suficiente para o conteúdo respirar.

### Nunca use branco puro no dark mode

Texto branco puro (`#fff`) sobre fundo escuro chega a 21:1, muito acima do necessário, e esse excesso causa **halação** (glare, brilho ofuscante). Use um off-white com **L entre 0.92 e 0.97** no texto primário e **L entre 0.60 e 0.75** no secundário.

### Destaque no escuro precisa de mais luz

Sobre fundo escuro, a cor de destaque precisa de mais luminosidade e um pouco mais de croma para saltar da superfície. Um botão primário que resolve com **L = 0.55** no light mode costuma pedir **L = 0.65 a 0.70** no dark para manter o mesmo impacto.

### Bordas sutis no dark mode

No tema claro, borda com 15-20% de opacidade funciona. No escuro, borda opaca e escura se dissolve no fundo. Inverta a lógica: use borda clara com **8-12%** de opacidade (`oklch(1 0 0 / 10%)`) para separar cards sem adicionar peso.

### Teste em condição real

Teste o dark theme com o brilho da tela reduzido, simulando uso noturno, e o light theme sob luz ambiente forte. Um contraste que parece adequado no monitor calibrado do desenvolvedor pode falhar para usuários em outras condições.

## Escala tonal de 11 paradas

A escala padrão (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) é a ferramenta central de composição num sistema de design. Cada parada tem L pré-calculado para que o contraste entre elas seja previsível.

### Combinações testadas

| Fundo | Texto | Uso recomendado |
|---|---|---|
| 50 | 900 | Texto primário em light mode. Contraste máximo, altamente legível |
| 50 | 600-700 | Texto secundário e metadados em light mode. Mantém hierarquia |
| 100 | 800 | Cards sobre fundo 50. Cria elevação sutil sem mudar a cor base |
| 900 | 50 | Texto primário em dark mode. Espelho direto do par light |
| 900 | 300-400 | Texto secundário em dark mode. Mais suave que 50, menos fadiga |
| 800 | 100 | Cards em dark mode sobre fundo 900. Elevação via clareamento |
| 500 | 50 ou 950 | Botão primário. 500 é o ponto de equilíbrio de croma, funciona nos dois temas |
| 200 | 800 | Badges e tags informativas em light mode. Destaque sem agressividade |

### Por que 50 sobre 900 funciona

Em OKLCH, a parada 50 tem L em torno de **0.97** e a 900 fica perto de **0.22**. Essa diferença de 0.75 produz contraste muito acima de 7:1 (AAA) em qualquer matiz, e a uniformidade perceptual do espaço é o que garante esse resultado para todos os matizes.

### Regra de ouro: pule pelo menos 4 paradas

Para garantir WCAG AA (4.5:1) em qualquer matiz, mantenha ao menos **4 paradas** de distância entre fundo e texto (fundo 100 com texto 500, fundo 400 com texto 800). Para AAA, use **6 ou mais**. Distâncias menores passam em alguns matizes e falham em outros, o que torna a falha difícil de detectar.

### A parada 500 é a mais versátil

A 500 fica no meio da escala, com L perto de 0.55, que é onde o croma costuma atingir o pico. Por isso ela é a escolha natural para a cor de destaque interativo: tem identidade forte e contrasta bem tanto com as paradas claras quanto com as escuras.

### Cuidado com amarelo e ciano

Amarelo (H ≈ 95°) e ciano (H ≈ 200°) têm luminância sRGB muito alta mesmo com L moderado em OKLCH. Um amarelo em `oklch(0.60 0.20 95)` reprova no WCAG AA contra branco, enquanto um azul em `oklch(0.60 0.18 250)` passa folgado, com a mesma luminosidade OKLCH. Nessas faixas, confira o contraste com ferramenta antes de confiar no número.

| Matiz exemplo | OKLCH | sRGB luminance | Contraste vs. branco |
|---|---|---|---|
| Azul (250°) | `0.60 0.18 250` | Moderada | Passa AA |
| Amarelo (95°) | `0.60 0.20 95` | Alta | Falha AA |
| Ciano (200°) | `0.60 0.18 200` | Alta | Falha AA |

Na prática: amarelo ou ciano sobre branco, baixe o L para 0.45 ou menos antes de assumir que o contraste passa.
