# Teoria das Cores

> Escopo: transversal. Aplica-se a qualquer interface, em qualquer linguagem ou stack do projeto.

Cor não é decoração. Cada cor numa interface comunica hierarquia, estado, temperatura emocional e legibilidade. Decisões aleatórias produzem interfaces que cansam o olho, falham em acessibilidade e se descontrolam em escala. Este guia consolida a teoria mínima necessária para decidir cores com intenção: do círculo cromático ao espaço **OKLCH**, das harmonias ao **WCAG**, da hierarquia de superfícies à escala tonal.

Para padrões de espaçamento, tipografia e estados, consulte [ui-ux.md](ui-ux.md). Para densidade visual em código, consulte [visual-density.md](visual-density.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Matiz** (hue, tom da cor) | Posição da cor no círculo cromático, medida em graus de 0° a 360° |
| **Croma** (chroma, intensidade) | Pureza ou saturação da cor: 0 é cinza, valores altos são cores vibrantes |
| **Luminosidade** (lightness, claridade) | Quão clara ou escura a cor é, de 0 (preto) a 1 (branco) |
| **OKLCH** (Lightness, Chroma, Hue, espaço de cor perceptualmente uniforme) | Espaço de cor onde diferenças numéricas iguais correspondem a diferenças visuais iguais |
| **Gamut** (gama de cores reproduzíveis) | Conjunto de cores que um dispositivo ou espaço de cor consegue exibir |
| **Harmonia** (relação geométrica no círculo) | Conjunto de matizes em posições específicas que formam uma paleta coesa |
| **Escala tonal** (tonal scale, gradação por luminosidade) | Sequência de variações da mesma cor com luminosidade crescente, tipicamente 11 paradas (50 a 950) |
| **Parada** (stop, posição na escala tonal) | Cada um dos 11 valores discretos numa escala tonal |
| **WCAG** (Web Content Accessibility Guidelines, Diretrizes de Acessibilidade para Conteúdo Web) | Padrão internacional do W3C que define critérios mensuráveis de acessibilidade |
| **APCA** (Advanced Perceptual Contrast Algorithm, Algoritmo Avançado de Contraste Perceptual) | Método de cálculo de contraste do WCAG 3.0 baseado em luminância perceptual |

## Círculo cromático e OKLCH

O **círculo cromático** organiza os matizes em 360°. **Cores primárias** (vermelho, amarelo, azul) não podem ser obtidas por mistura. **Secundárias** (laranja, verde, violeta) resultam da mistura de duas primárias. **Terciárias** combinam uma primária com uma secundária adjacente.

Sistemas de design tradicionalmente usavam **RGB** (Red, Green, Blue, espaço aditivo de monitor) e **HSL** (Hue, Saturation, Lightness, projeção cilíndrica de RGB). Ambos sofrem do mesmo problema: a "luminosidade" numérica não corresponde à percepção visual. Um amarelo com `hsl(50, 100%, 50%)` parece muito mais brilhante que um azul com `hsl(240, 100%, 50%)`, mesmo com o mesmo valor de L.

**OKLCH** corrige isso. É um espaço perceptualmente uniforme: um passo de `+0.10` em L produz a mesma diferença visual independentemente do matiz. Resultado prático: escalas tonais geradas em OKLCH são previsíveis e visualmente balanceadas, qualidade essencial para temas acessíveis.

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

Cores quentes **avançam** visualmente: parecem mais próximas. Cores frias **recuam**. Esse efeito é útil para criar separação de planos sem depender só de luminosidade.

## Harmonias de cor

Harmonias são relações geométricas no círculo cromático que produzem paletas coesas. Cada harmonia tem uma personalidade distinta e serve a contextos diferentes. As referências abaixo usam **H = 250°** (azul) como base.

| Harmonia | Geometria | Exemplo (base 250°) | Quando usar |
|---|---|---|---|
| **Complementar** | Cor oposta no círculo (180°) | 250° + 70° | Máximo contraste para CTAs e destaques. Use a cor de apoio em 10-20% da composição |
| **Análoga** | Três cores vizinhas (±30°) | 220°, 250°, 280° | Paletas suaves e harmoniosas. Ideal para fundos e superfícies |
| **Triádica** | Três cores equidistantes (120°) | 250°, 10°, 130° | Vibrante e equilibrada. Funciona quando uma cor domina e as outras atuam como acentos |
| **Split-complementar** | Base + duas adjacentes à complementar (150°/210°) | 250°, 40°, 100° | Contraste forte com menos tensão que a complementar pura |
| **Tetrádica** (retangular) | Quatro cores em retângulo (60°/180°/240°) | 250°, 310°, 70°, 130° | Paletas ricas. Exige hierarquia clara: uma dominante, uma de suporte, duas pontuais |
| **Quadrada** | Quatro cores equidistantes (90°) | 250°, 340°, 70°, 160° | Paletas muito variadas. Reduzir croma em 2 ou 3 das 4 cores para não sobrecarregar |
| **Neutros** | Croma mínimo derivado da base | Variações de L com C ≈ 0.01 | Acinzentados sutilmente tonalizados para fundos, bordas e texto secundário |

Neutros não são uma harmonia rotacional: são variações de luminosidade da cor base com croma reduzido. Em vez de cinzas puros (`oklch(L 0 0)`), neutros tonalizados (`oklch(L 0.005 250)`) integram melhor com o resto da paleta e dão acabamento profissional.

## Composição

Decisões de cor não param na escolha da paleta. Como as cores são distribuídas na tela define se a interface respira ou sufoca, se a hierarquia é clara ou plana.

### Regra 60-30-10

Distribua as cores em proporções definidas:

| Proporção | Papel | Tipicamente |
|---|---|---|
| **60%** | Cor dominante | Neutros ou cor primária dessaturada para fundos e superfícies |
| **30%** | Cor de suporte | Texto, bordas, elementos estruturais |
| **10%** | Cor de destaque | Botões primários, badges, alertas |

Essa proporção cria equilíbrio visual e direciona a atenção para os elementos certos. Inverter (cor de destaque ocupando 30 ou 60%) gera interfaces agressivas que cansam rapidamente.

### Hierarquia visual por contraste

Cores com maior contraste atraem o olhar primeiro. Use cores saturadas e de alto contraste em elementos de ação (botões primários, alertas) e cores neutras em elementos de suporte (bordas, fundos de seção, texto secundário). Quando tudo tem o mesmo peso visual, nada parece importante.

### Contraste de luminosidade vs. contraste de temperatura

São dois eixos independentes que separam planos visuais.

| Tipo de contraste | Como funciona | Quando usar |
|---|---|---|
| **Luminosidade** (diferença de L) | Texto escuro sobre fundo claro, ou inverso | Principal fator de legibilidade. Sempre presente |
| **Temperatura** (frio sobre quente, ou inverso) | Fundo frio com elemento quente cria separação mesmo com L próximas | Estados hover, elementos interativos, badges informativos |

Combinar os dois (texto escuro frio sobre fundo claro quente) produz separação muito mais nítida que cada um isolado.

### Espaço em branco como cor

O espaço negativo (branco no tema claro, neutro escuro no tema escuro) é uma cor ativa na composição. Cria respiro, separa grupos e amplifica a percepção das cores adjacentes. Esse princípio se conecta diretamente à densidade visual em código (ver [visual-density.md](visual-density.md)): em UI ou em código, agrupamento por respiro é a estrutura que guia a leitura.

Não tente preencher todos os espaços. Interface sem respiro tem o mesmo problema que código sem linhas em branco entre grupos: o olho não sabe onde uma seção termina e outra começa.

## WCAG e contraste

**WCAG** define critérios mensuráveis de acessibilidade em três níveis: **A** (mínimo), **AA** (padrão da indústria) e **AAA** (excelência). A maioria dos produtos digitais busca AA. AAA é exigido em contextos críticos como saúde e serviços governamentais.

### Critério 1.4.3 — Contraste mínimo de texto

| Nível | Texto normal | Texto grande (≥18pt regular ou ≥14pt bold) |
|---|---|---|
| **AA** | 4.5 : 1 | 3 : 1 |
| **AAA** | 7 : 1 | 4.5 : 1 |

A **proporção de contraste** compara a luminância relativa de duas cores. Branco puro (`#fff`) tem luminância 1.0; preto puro (`#000`) tem luminância 0. A proporção máxima possível é **21 : 1** (branco sobre preto). Uma proporção de **4.5 : 1** significa que a cor mais clara é 4.5 vezes mais luminosa que a mais escura.

### OKLCH e WCAG

O cálculo oficial de contraste do **WCAG 2.x** usa luminância em **sRGB** (Standard RGB, espaço de cor padrão para web), não OKLCH. Mesmo assim, a uniformidade perceptual do OKLCH torna paletas geradas neste espaço previsíveis: paradas afastadas por 4 ou mais posições na escala tonal tendem a satisfazer AA na maioria dos matizes.

O **WCAG 3.0** (em desenvolvimento) deve adotar **APCA**, que usa luminância perceptual próxima ao OKLCH. Paletas projetadas em OKLCH já estão alinhadas com essa direção.

### Outros critérios relevantes para cor

| Critério | Sobre |
|---|---|
| **1.4.6** Contraste avançado | Versão AAA do 1.4.3 (7:1 e 4.5:1) |
| **1.4.11** Contraste de não-texto | Bordas, ícones e estados de foco precisam de 3:1 contra o fundo adjacente |
| **1.4.12** Espaçamento de texto | Texto deve ser legível mesmo quando o usuário aumenta o espaçamento |
| **1.4.13** Conteúdo em hover ou foco | Tooltips e popovers precisam ser persistentes, dispensáveis e hover-stable |

## Hierarquia de superfícies

Interfaces modernas são compostas por **camadas** empilhadas. Cada camada tem uma função semântica e uma cor associada. Entender essa estrutura é essencial para criar temas consistentes.

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

Para que duas superfícies adjacentes sejam percebidas como distintas, a diferença de L em OKLCH deve ser de pelo menos **0.05 a 0.08**, equivalente a 1 ou 2 paradas na escala tonal. Diferenças menores criam névoa visual: o usuário não percebe a separação entre camadas.

### Densidade e cansaço visual

Interfaces com muitas cores saturadas em proximidade causam fadiga. A solução é reduzir o croma das cores de fundo e reservar croma alto para elementos interativos e de destaque. Em OKLCH, manter **croma abaixo de 0.05** em backgrounds garante neutralidade sem perder a tonalidade da paleta.

### Sombras tonalizadas

Sombras pretas puras parecem genéricas e brigam com o tema. Sombras tonalizadas com a cor base da paleta (um azul desaturado para tema frio, um marrom para tema quente) integram melhor e parecem mais naturais. No dark mode, prefira diferença de luminosidade entre superfícies a sombras opacas, que desaparecem em fundo escuro.

## Light e Dark themes

Criar um tema escuro de qualidade não é inverter as cores do tema claro. São estratégias distintas que exigem atenção a como o olho humano percebe luz em cada contexto. Para variáveis semânticas e tokens, ver [ui-ux.md](ui-ux.md).

### Fundos escuros não são pretos

Fundos muito escuros (L abaixo de 0.10 em OKLCH) criam contraste máximo com qualquer conteúdo e cansam os olhos em uso prolongado. Os melhores dark themes usam **L entre 0.12 e 0.18** para o background: escuro o suficiente para parecer dark, com ar suficiente para o conteúdo respirar.

### Nunca use branco puro em dark mode

Texto branco puro (`#fff`) sobre fundo escuro cria contraste de 21:1, muito além do necessário. Isso causa **halação** (glare, brilho ofuscante). Use um off-white com **L entre 0.92 e 0.97** para texto primário e **L entre 0.60 e 0.75** para texto secundário.

### Saturar destaques no escuro

Em fundos escuros, cores de destaque precisam de mais luminosidade e um pouco mais de croma para saltar da superfície. Uma cor de botão primário que funciona com **L = 0.55** no light mode pode precisar de **L = 0.65 a 0.70** no dark mode para manter o mesmo impacto visual.

### Bordas sutis em dark mode

Em tema claro, bordas com opacidade de 15-20% funcionam bem. Em dark mode, bordas opacas escuras se fundem com o fundo. Use bordas claras com opacidade de **8-12%** (`oklch(1 0 0 / 10%)`) para separar cards sem criar peso visual excessivo.

### Teste em condições reais

Dark themes devem ser testados em tela com brilho reduzido, simulando uso noturno. Light themes devem ser testados sob luz ambiente forte. Um contraste que parece adequado no monitor calibrado do desenvolvedor pode falhar para usuários em condições diferentes.

## Escala tonal de 11 paradas

A escala tonal padrão (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) é a principal ferramenta de composição em sistemas de design. Cada parada tem L pré-calculado para produzir contraste previsível.

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

Em OKLCH, a parada 50 tem L aproximado de **0.97** e a parada 900 tem L aproximado de **0.22**. A diferença de 0.75 produz contraste WCAG muito acima de 7:1 (AAA), independentemente do matiz, graças à uniformidade perceptual do espaço.

### Regra de ouro: pular pelo menos 4 paradas

Para garantir WCAG AA (4.5:1) em qualquer matiz, mantenha diferença mínima de **4 paradas** entre fundo e texto (fundo 100 com texto 500, fundo 400 com texto 800). Para AAA, use diferença de **6 ou mais paradas**. Diferenças menores podem passar em alguns matizes e falhar em outros.

### Parada 500 é a mais versátil

A parada 500 fica no centro da escala, geralmente com L aproximado de 0.55, ponto onde croma costuma atingir o pico. É a escolha natural para cor de destaque interativo: tem identidade forte e contrasta bem com paradas altas (claras) e baixas (escuras).

### Cuidado com matizes amarelos e ciano

Amarelo (H ≈ 95°) e ciano (H ≈ 200°) têm luminância sRGB percebida muito alta mesmo com L moderado em OKLCH. Um amarelo com `oklch(0.60 0.20 95)` falha o WCAG AA contra branco, enquanto um azul com `oklch(0.60 0.18 250)` passa confortavelmente, mesmo com a mesma luminosidade OKLCH. Sempre verificar o contraste com ferramenta WCAG ao escolher matizes nessas faixas.

| Matiz exemplo | OKLCH | sRGB luminance | Contraste vs. branco |
|---|---|---|---|
| Azul (250°) | `0.60 0.18 250` | Moderada | Passa AA |
| Amarelo (95°) | `0.60 0.20 95` | Alta | Falha AA |
| Ciano (200°) | `0.60 0.18 200` | Alta | Falha AA |

A regra prática: para amarelos e cianos sobre branco, reduzir L para 0.45 ou menos antes de assumir que passa contraste.
