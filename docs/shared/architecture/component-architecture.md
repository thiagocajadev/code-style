# Componentização e arquitetura de módulos

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Componentizar é decidir **onde cortar o sistema**: quem cuida de quê, por onde os dados passam de uma
parte para outra e o que pode ser reaproveitado.

```
dado externo → container (busca, estado, regras) → presentational (renderiza, emite eventos) → output
```

Com os cortes no lugar certo, o sistema cresce e continua legível: cada pedaço tem um dono e uma
fronteira clara. Com os cortes no lugar errado, tudo depende de tudo, e uma feature nova exige mexer
em cinco arquivos que ninguém lembra por que existem.

Os princípios desta página valem para **qualquer framework**. Servem a React, Angular, Blazor, Razor,
Vue e também à organização de módulos no backend. O vocabulário específico de cada framework aparece
depois, na documentação da linguagem.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Container** (componente inteligente) | Componente que busca dados, coordena estado e aplica regras de aplicação |
| **Presentational** (componente de apresentação) | Componente que recebe props, renderiza e emite eventos, sem lógica de dados |
| **Props** (propriedades) | Dados passados de um componente pai para filho |
| **Lifting state** (elevar estado) | Mover estado para o ancestral comum mais próximo quando dois componentes irmãos precisam do mesmo dado |
| **Prop drilling** (cascata de props) | Passar props por camadas intermediárias que não as utilizam |
| **Memoization** (memorização de resultados) | Cache do resultado de uma computação cara para evitar reprocessamento com os mesmos argumentos |
| **Cache** (armazenamento temporário) | Resultado armazenado de uma computação ou busca para evitar recalcular com os mesmos argumentos |
| **Barrel file** (arquivo índice) | Arquivo que exporta a API pública de um módulo, escondendo os arquivos internos |

---

## Combinar blocos em vez de estender classes

Herança empilha responsabilidades numa cadeia vertical: a classe filha recebe tudo o que a mãe tem,
precise ou não. Um comportamento novo pede mais um nível na árvore ou engorda a classe que já existe.
Com poucos níveis a árvore endurece, e uma mudança lá em cima chega quebrando quem está embaixo.

Composição monta o comportamento de outro jeito: blocos pequenos e independentes são **combinados**
até formar o que se quer. Cada bloco faz uma coisa e recebe os outros como dependência.

```
// herança: responsabilidades amarradas na cadeia
class AdminUser extends ModeratorUser extends RegisteredUser extends User

// composição: capacidades combinadas por interface
class User {
  permissions: PermissionSet
  audit: AuditTrail
  session: SessionContext
}
```

O mesmo vale para componentes de **UI** (User Interface · Interface do Usuário). Um `Card` que aceita
`children` compõe: qualquer conteúdo entra nele. Um `ProductCard extends Card` herda, e cada variação
nova pede outra subclasse.

**Quando herança serve**: relação is-a (relação de "é um") legítima, com raramente mais de um nível, em
domínios estáveis como exceções e entidades de framework. Fora daí, composição sai na frente: mais
fácil de testar, mais fácil de recombinar e menos sensível a mudanças.

---

## O componente que busca dados e o que desenha a tela

Um componente que busca dados, aplica regra de negócio **e** desenha a tela guarda três
responsabilidades na mesma caixa. Testar só a renderização obriga a simular a stack de dados inteira.
Reaproveitar a tela em outro contexto obriga a reescrever a busca.

A separação clássica cria dois papéis:

| Papel                     | Responsabilidade                                         | Testa com                                 |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| **Container** (smart)     | Busca dados, coordena estado, aplica regras de aplicação | Mocks de serviços, verificações de estado |
| **Presentational** (dumb) | Recebe dados via props (propriedades), emite eventos, renderiza | Snapshot (captura do estado renderizado) + interação, sem rede |

```
OrderDetailsContainer
  ├── fetch order by id
  ├── subscribe to status updates
  └── render <OrderDetailsView order={...} onCancel={...} />

OrderDetailsView (pure)
  ├── recebe props
  ├── renderiza campos
  └── emite eventos ao clicar
```

O presentational (componente de apresentação) ignora **de onde** o dado veio. Isso deixa trocar a
fonte sem tocar na tela: a **API** (Application Programming Interface · Interface de Programação de
Aplicações) real hoje, um mock (dados fictícios) no Storybook amanhã, uma fixture (dado fixo escrito
para o teste) na suíte. O container ignora **como** a tela é desenhada, então o layout muda sem risco
para a lógica.

Em aplicação pequena, container e view coincidem sem atrito, e dividir só por disciplina cria uma
camada a mais para atravessar sem nada em troca. Vale dividir quando a mesma tela aparece em dois
contextos, ou quando a regra do container fica grande o bastante para merecer teste próprio.

---

## Estado: onde colocar, por onde passar

Estado é a decisão mais cara da arquitetura de componentes. No lugar errado, ele gera cascata de
props, re-renderizações à toa, telas que discordam entre si e testes difíceis de montar.

A escolha sobe um degrau de cada vez, começando pelo mínimo:

```
estado local → lifting (ancestral comum) → context (transversal: tema, user)
             → store global (partes distantes, operações compostas)
```

### Elevar o estado até o ancestral comum

Quando dois componentes irmãos precisam do mesmo dado, o estado sobe para o **ancestral comum mais
próximo**, o primeiro componente acima dos dois que consegue coordená-los. Esse pai passa a ser a
fonte da verdade, e cada filho recebe o valor e um **callback** (função de retorno) para pedir a
alteração.

```
        <Checkout>                    <- detém shippingAddress
         /        \
 <AddressForm>  <OrderSummary>        <- ambos recebem via props
```

Subir estado além do necessário cria o problema seguinte.

### Cascata de props (prop drilling)

Quando o dado precisa descer cinco camadas até chegar em quem o usa, cada camada do meio ganha uma
prop que ela só repassa. O caminho vira encanamento: mudar o formato do dado obriga a editar seis
arquivos que não fazem nada com ele.

Três saídas, em ordem de preferência:

1. **Puxar o consumidor para perto da fonte**: reorganizar a árvore para encurtar o caminho é quase
   sempre a melhor resposta.
2. **Passar objetos de domínio em vez de campos soltos**: `order` no lugar de `orderId` +
   `orderStatus` + `orderTotal` reduz o número de props, mesmo que a cascata continue existindo.
3. **Context / injection**: entrega dados transversais (tema, usuário logado, idioma) sem descer
   props. Usar com parcimônia, porque toda referência implícita é um acoplamento que não aparece na
   assinatura do componente.

### Os limites de um context

Context resolve a cascata e cobra um preço: todo componente que o consome passa a depender de um
provider (componente que fornece o valor do contexto) que ninguém vê na chamada. Três regras seguram
o vazamento:

- **Um contexto por domínio** (tema, autenticação, feature flags). Um contexto único com o estado
  geral do app junta assuntos que não têm relação e obriga todo mundo a escutar tudo.
- **Tipagem explícita** do valor entregue, para o consumidor conhecer o contrato sem ir caçar o
  provider.
- **Valores estáveis**: um contexto que muda de identidade a cada render invalida todos os
  consumidores abaixo e devolve o custo que ele deveria economizar.

### Store global: quando vale o custo

Gerenciadores de estado global (Redux, Zustand, NgRx, Fluxor, Pinia) valem quando:

- O mesmo estado é lido e escrito por partes distantes da árvore, que não têm um ancestral comum
  natural.
- Operações compostas como undo/redo (desfazer/refazer), time-travel (navegar pelos estados
  anteriores) e persistência precisam de um ponto central.
- O time já pagou o custo de aprender a abstração e o projeto é grande o bastante para amortizá-lo.

Em projeto pequeno, o store global cobra cerimônia (actions, reducers, seletores) para resolver o que
estado local e lifting já resolvem.

---

## Memoization: quando o cache ajuda e quando atrapalha

Memoization guarda o resultado de uma computação cara e devolve o valor guardado quando os argumentos
se repetem. Em componentes ela aparece de três formas: cache de valor calculado, cache de função
(para a referência continuar a mesma entre renders) e cache do componente inteiro (para evitar
re-render quando as props não mudaram).

O ganho depende da relação entre o **custo de calcular** e o **custo de comparar os argumentos**. Com
argumentos que são objetos grandes, comparar chega perto de calcular, e o cache passa a cobrar quase
tudo o que economiza.

| Cenário                                                                   | Memoizar?                                   |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| Cálculo pesado (ordenação de milhares de itens, parsing de árvore grande) | Sim, o cache paga pelo custo                |
| Função passada como prop a componente memoizado                           | Sim, para preservar identidade              |
| Cálculo trivial (soma de dois campos, concatenação curta)                 | Não, a comparação custa mais que o trabalho |
| Componente que depende de contexto que muda a cada render                 | Não, o cache nunca acerta                   |

O sinal de memoization mal aplicada aparece no dia a dia do time: horas investigando **por que o cache
não invalida** ou **por que esta prop muda de identidade a cada render**. Quando depurar o cache toma
mais tempo do que o cache economiza, ele está no lugar errado.

**Regra prática**: medir antes de memoizar. Sem medição, a otimização é palpite, e o palpite costuma
custar mais do que rende.

---

## Limites de módulo e regras de import

Módulos são as unidades que o sistema empacota, testa e versiona. Os limites entre eles dizem quem
pode depender de quem. Sem regra explícita, o grafo de dependências vira um emaranhado, e uma mudança
num módulo distante quebra outro sem que o autor perceba.

### Agrupar por funcionalidade ou por camada

| Organização       | Agrupa por                                           | Melhor para                                                   |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| **Feature-based** | Domínio de negócio (orders, users, billing)          | Times paralelos, sistemas com muitas features independentes   |
| **Layer-based**   | Camada técnica (controllers, services, repositories) | Aplicações com poucas features mas muita disciplina de camada |

Projeto real costuma ser **híbrido**: feature-based no nível de cima, layer-based dentro de cada
feature. O arranjo é o mesmo do Vertical Slice descrito em [architecture.md](architecture.md).

```
features/
  orders/
    application/    <- casos de uso
    domain/         <- regras
    infrastructure/ <- persistência
  billing/
    application/
    domain/
    infrastructure/
shared/
  auth/
  logging/
```

### Regras de import

Dentro de uma feature, a dependência tem direção única: as camadas de fora dependem das de dentro.

```
application → domain ← infrastructure
```

`application` depende de `domain`. `infrastructure` depende de `domain` por meio de uma interface.
`domain` não depende de ninguém, e é isso que permite testá-lo sem banco, sem rede e sem framework.

Três regras mantêm o grafo saudável entre features:

- **Feature não importa feature.** Se `orders` precisa de algo de `billing`, esse algo sobe para
  `shared/` ou a conversa acontece por evento (ver Observer em [patterns.md](patterns.md)). O import
  direto amarra as duas em silêncio.
- **Camada respeita a direção.** Um import contra a seta acima indica responsabilidade no lugar
  errado.
- **API pública explícita.** Cada módulo expõe um `index` ou barrel file (arquivo índice) como única
  porta de saída. Quem consome importa desse contrato, e o resto do módulo fica livre para mudar.

Quando a ferramenta permite, essas regras viram **configuração verificável** (ESLint boundaries, Nx
tags, analyzers .NET, dependency-cruiser). Regra checada pelo **CI** (Continuous Integration ·
Integração Contínua, pipeline que roda lint, testes e build a cada commit) continua valendo daqui a um
ano. Regra que depende só da disciplina de quem revisa se dissolve em dois sprints.

### Sinais de limite errado

- O mesmo domínio aparece em três features, sempre com uma pequena diferença. Falta um módulo
  compartilhado.
- Uma mudança em uma feature obriga a tocar arquivos de outras quatro. O limite está vazando.
- Um `shared/utils` cresce sem fim e vira depósito. Faltam nomes por domínio: `shared/formatting`,
  `shared/validation`.
- O grafo de dependências tem ciclo. Todo ciclo é um erro de design, e quebrá-lo exige inverter uma
  das dependências por meio de uma interface.

---

## Referência rápida

| Decisão                          | Regra                                                                   |
| -------------------------------- | ----------------------------------------------------------------------- |
| Combinar comportamento           | Composição sobre herança                                                |
| Dados e renderização juntos      | Separar container / presentational quando houver reuso ou teste isolado |
| Estado compartilhado por irmãos  | Elevar ao ancestral comum mais próximo                                  |
| Estado transversal (tema, user)  | Context com valor estável e tipado                                      |
| Estado global de projeto pequeno | Evitar; lifting cobre                                                   |
| Memoization                      | Medir antes; cache só onde a comparação é barata e o trabalho é caro    |
| Organização de alto nível        | Feature-based, com layer-based dentro de cada feature                   |
| Direção de dependência           | `application → domain ← infrastructure`                                 |
| Import entre features            | Proibir; compartilhar via `shared/` ou eventos                          |
| Public API do módulo             | Exportar via barrel; esconder internals (implementação interna)         |

**Veja também**
- [frontend-flow.md](frontend-flow.md): routing e forms: rotas impõem a separação container/presentacional naturalmente
