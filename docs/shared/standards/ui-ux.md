# UI/UX

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Interface é o contrato entre o sistema e o usuário. Cada decisão de espaçamento, cor, hierarquia e estado comunica algo. Quando essas decisões são inconsistentes, o usuário trabalha mais para entender o que o sistema oferece.

## Densidade Visual e Respiro

Interfaces com excesso de elementos competindo por atenção cansam o olho e aumentam o tempo de decisão. Respiro (o espaço entre elementos) é a estrutura que guia a leitura.

A regra central é agrupamento semântico: elementos relacionados ficam próximos, grupos distintos têm espaço entre eles. O olho lê a interface como parágrafos antes de ler as palavras.

| Anti-pattern | Efeito | Solução |
|---|---|---|
| Texto colado na borda do container | Sensação de sufocamento | Padding interno consistente |
| Todos os elementos com o mesmo peso visual | Nenhuma hierarquia clara | Tamanho, cor e espaçamento para criar níveis |
| Espaçamento inconsistente entre seções | Interface parece montada por partes | Sistema de espaçamento em escala fixo |
| Informação densa sem quebra visual | Cansativo de ler | Grupos de no máximo 2-3 linhas com respiro entre eles |

## Sistema de Espaçamento

Espaçamentos arbitrários (`margin: 13px`, `padding: 7px`) criam inconsistência visual acumulada. Um sistema de espaçamento define uma escala com valores fixos que se repetem de forma consistente em toda a interface.

Escala típica baseada em múltiplos de 4:

| Token | Valor | Uso comum |
|---|---|---|
| `space-1` | 4px | Espaço interno mínimo (ícone + label) |
| `space-2` | 8px | Padding de componentes compactos |
| `space-3` | 12px | Gap entre elementos dentro de um grupo |
| `space-4` | 16px | Padding padrão de cards e seções |
| `space-6` | 24px | Separação entre grupos distintos |
| `space-8` | 32px | Separação entre seções maiores |
| `space-12` | 48px | Separação entre blocos de página |

Usar tokens em vez de valores livres garante que qualquer ajuste de escala se propague de forma consistente. A interface respira no mesmo ritmo em qualquer viewport.

## Hierarquia Tipográfica

Texto sem hierarquia não orienta a leitura. O usuário precisa de âncoras visuais para identificar o que é título, o que é descrição, o que é detalhe.

Três níveis são suficientes para a maioria dos contextos:

| Nível | Papel | Características |
|---|---|---|
| **Primário** | Título da seção ou ação principal | Tamanho maior, peso alto, cor de maior contraste |
| **Secundário** | Subtítulo, rótulo de campo, nome de item | Tamanho médio, peso regular |
| **Terciário** | Metadado, data, hint, legenda | Tamanho menor, cor mais suave |

Evitar mais de três níveis tipográficos na mesma tela: a hierarquia colapsa, tudo parece especial, nada parece importante.

## Temas Claro e Escuro

Temas claro e escuro requerem paletas re-otimizadas para cada contexto. Superfícies, sombras, opacidade e contraste se comportam de forma diferente em cada fundo. Um sistema de cores que funciona bem nos dois temas usa variáveis semânticas em vez de valores fixos.

| Abordagem | Problema |
|---|---|
| `color: #1a1a1a` direto no componente | Não muda com o tema |
| `color: var(--text-primary)` com valores por tema | Funciona nos dois modos |

Variáveis semânticas descrevem o papel, não o valor:

```
--text-primary        → texto de maior hierarquia
--text-secondary      → texto de apoio
--surface-base        → fundo da página
--surface-elevated    → fundo de cards e modais
--border-subtle       → bordas de separação
--interactive-default → cor de botões e links
--interactive-hover   → estado hover
```

No tema claro, `--surface-base` é branco. No escuro, é um cinza muito escuro (preto puro cria contraste excessivo e cansa a leitura prolongada).

**Contraste mínimo**: WCAG 2.1 AA (Web Content Accessibility Guidelines, Diretrizes de Acessibilidade para Conteúdo Web) exige razão de contraste de 4.5:1 para texto normal e 3:1 para texto grande. Verificar os dois temas separadamente, pois um componente acessível no claro pode falhar no escuro.

## Acessibilidade

Acessibilidade garante que a interface funciona para todos os usuários, incluindo quem usa leitores de tela, navega pelo teclado ou tem deficiência visual.

### Contraste

Texto e elementos interativos precisam de contraste suficiente contra o fundo. A regra prática: se precisar apertar os olhos para ler no mockup, vai falhar em produção.

### Navegação por teclado

Todo elemento interativo (botão, link, campo, modal) deve ser acessível via `Tab` e ativável via `Enter` ou `Space`. A ordem de foco deve seguir a ordem visual da página.

Foco visível é obrigatório. Nunca remover o outline de foco sem substituí-lo por algo equivalente ou melhor.

### Semântica HTML

Elementos HTML semânticos comunicam estrutura para leitores de tela:

| Evitar | Usar |
|---|---|
| `<div>` com click handler | `<button>` |
| `<div>` para título | `<h1>–<h6>` |
| `<div>` para lista | `<ul>/<ol>/<li>` |
| `<img>` sem alt | `<img alt="descrição">` |

Leitor de tela lê o que o HTML diz, não o que a tela mostra. Um `<div>` com visual de botão é invisível para quem usa tecnologia assistiva.

### ARIA

ARIA (Accessible Rich Internet Applications, Aplicações de Internet Ricas Acessíveis) complementa a semântica nativa para padrões complexos: menus, tooltips, modais, comboboxes.

A regra de uso é simples: ARIA é o último recurso. Preferir elemento HTML semântico nativo antes de qualquer atributo ARIA. ARIA mal usado é pior que nenhum ARIA.

### Estados e Feedback

Cada ação do usuário precisa de resposta visível:

| Estado | Como comunicar |
|---|---|
| Loading | Spinner ou skeleton com `aria-busy` |
| Erro de formulário | Mensagem inline associada ao campo via `aria-describedby` |
| Sucesso | Toast ou inline com contraste e ícone |
| Campo desabilitado | Combinar visual de desabilitado com atributo `disabled` |

## Estados de Interface

Toda tela tem variações de estado além do estado feliz. Projetar apenas o estado com dados é projetar metade da interface.

| Estado | Quando ocorre |
|---|---|
| **Empty** | Sem dados: primeiro uso ou filtro sem resultado |
| **Loading** | Dados sendo carregados |
| **Error** | Falha na operação, com mensagem e ação de recuperação |
| **Partial** | Dados carregados com erro em parte deles |
| **Success** | Operação concluída, com feedback temporário |

Estado empty bem projetado orienta o usuário para a próxima ação. Estado de erro bem projetado diz o que aconteceu e o que fazer. Tela em branco e mensagem técnica indicam estados sem tratamento.
