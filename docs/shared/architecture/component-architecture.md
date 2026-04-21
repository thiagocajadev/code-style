# Componentização e Arquitetura de Módulos

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Componentização é a decisão de **onde cortar o sistema**: como dividir responsabilidades, como os
dados fluem entre as partes e onde ficam as fronteiras de reuso.

```
dado externo → container (busca, estado, regras) → presentational (renderiza, emite eventos) → output
```

A divisão certa faz o código crescer sem virar um monolito opaco. A errada espalha acoplamento e
transforma cada nova feature em cirurgia de peito aberto.

Os princípios desta página são **agnósticos de framework**. Aplicam-se a React, Angular, Blazor,
Razor, Vue ou qualquer organização modular de backend. Frameworks específicos ancoram o vocabulário
depois, na documentação da linguagem.

---

## Composição sobre herança

Herança encadeia responsabilidades em hierarquia vertical: a classe filha carrega tudo que a mãe
tem, queira ou não. Adicionar um comportamento novo exige criar mais um nível na árvore ou inflar a
classe existente. Em poucos níveis, a hierarquia vira um grafo rígido onde mudanças no topo quebram
o que está embaixo.

Composição inverte o modelo: pequenos blocos independentes são **combinados** para formar o
comportamento desejado. Cada bloco faz uma coisa e aceita outros como dependência.

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

A mesma lógica vale para componentes de UI (User Interface, Interface do Usuário). Um `Card` que
aceita `children` compõe. Um `ProductCard extends Card` herda. O primeiro é reutilizável por design;
o segundo precisa de uma subclasse nova para cada variação.

**Quando usar herança**: hierarquia genuinamente is-a (relação de "é um"), raramente mais de um nível, em domínios
estáveis (exceções, entidades de framework). Para tudo mais, composição vence: mais testável, mais
flexível, menos frágil a mudanças.

---

## Container vs apresentação

Um componente que busca dados, aplica regras de negócio **e** renderiza tela mistura três
responsabilidades na mesma caixa. Testar a renderização exige simular toda a stack de dados.
Reaproveitar a tela em outro contexto exige reescrever a busca.

A separação clássica divide em dois papéis:

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

O presentational (apresentação) não sabe **de onde** vêm os dados. Isso permite trocar a fonte (API
real, mock em Storybook, fixture de teste pré-definido) sem tocar na UI. O container não sabe **como** a tela é
desenhada. Designers trocam o layout sem medo de quebrar a lógica.

A separação vira anti-padrão quando a aplicação é **pequena o suficiente** para que container e view
coincidam sem atrito. Dividir por disciplina vazia cria indireção sem ganho. A regra é: divide
quando a mesma tela aparece em dois contextos, ou quando a regra de negócio do container fica grande
o bastante para merecer teste isolado.

---

## Estado: onde colocar, por onde passar

Estado é a pergunta mais cara da arquitetura de componentes. Colocar no lugar errado gera prop
drilling, re-renders (re-renderizações) desnecessários, bugs de sincronização e fronteiras de teste confusas.

A decisão segue um caminho progressivo: começa pelo mínimo e sobe conforme a necessidade.

```
estado local → lifting (ancestral comum) → context (transversal: tema, user)
             → store global (partes distantes, operações compostas)
```

### Lifting state (elevar estado)

Quando dois componentes irmãos precisam do mesmo dado, o estado sobe para o **ancestral comum mais
próximo** que consegue coordenar os dois. O pai detém a fonte da verdade; os filhos recebem o valor
e um callback (função de retorno) para mudá-lo.

```
        <Checkout>                    <- detém shippingAddress
         /        \
 <AddressForm>  <OrderSummary>        <- ambos recebem via props
```

Elevar estado demais cria o problema seguinte.

### Prop drilling (cascata de props)

Quando o estado precisa atravessar cinco camadas de componentes até chegar ao filho que o consome,
cada camada intermediária ganha uma prop que só repassa adiante. O código vira cano: muda a forma do
dado, precisa tocar seis arquivos.

Três saídas, em ordem de preferência:

1. **Puxar o consumidor para perto da fonte**: reorganizar a árvore para encurtar o caminho é quase
   sempre a melhor resposta.
2. **Passar objetos de domínio em vez de campos soltos**: `order` em vez de `orderId` +
   `orderStatus` + `orderTotal` reduz a quantidade de props, mesmo que a cascata permaneça.
3. **Context / injection**: compartilha dados transversais (tema, usuário logado, localização) sem
   drill. Usar com parcimônia: toda referência implícita é um acoplamento escondido.

### Context boundaries (fronteiras de contexto)

Contexto global resolve drill, mas transforma qualquer consumidor em dependente invisível do
provider (fornecedor de contexto). Três regras para não vazar:

- **Um contexto por domínio** (tema, autenticação, feature flags), não um grande blob (aglomerado) de estado
  geral.
- **Tipagem explícita** do valor que o contexto entrega, para que o consumidor saiba o contrato sem
  caçar o provider.
- **Valores estáveis**: um contexto que muda a cada render invalida todos os consumidores abaixo e
  anula o ganho.

### Store externo: quando vale

Gerenciadores de estado global (Redux, Zustand, NgRx, Fluxor, Pinia) fazem sentido quando:

- O mesmo estado é lido e escrito por partes distantes da árvore que não compartilham ancestral
  natural.
- Operações compostas como undo/redo (desfazer/refazer), time-travel (replay de estados anteriores) e persistência precisam de um ponto central.
- A equipe já pagou o custo de aprender a abstração e o projeto é grande o suficiente para
  amortizar.

Em projetos pequenos, store global é um martelo grande demais. Estado local + lifting cobrem a
maioria dos casos sem cerimônia.

---

## Memoization (memorização de resultados): quando ajuda, quando prejudica

Memoization armazena o resultado de uma computação cara e devolve o valor em cache nas chamadas
seguintes com os mesmos argumentos. Em componentes, aparece em três formas: cache de valor
computado, cache de função (para manter identidade referencial entre renders) e cache de componente
inteiro (evitar re-render quando props não mudaram).

O ganho depende da razão entre **custo da computação** e **custo da comparação de argumentos**.
Quando os argumentos são objetos complexos, a comparação chega perto do custo da computação e o
cache vira overhead (custo extra).

| Cenário                                                                   | Memoizar?                                   |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| Cálculo pesado (ordenação de milhares de itens, parsing de árvore grande) | Sim, o cache paga pelo custo                |
| Função passada como prop a componente memoizado                           | Sim, para preservar identidade              |
| Cálculo trivial (soma de dois campos, concatenação curta)                 | Não, a comparação custa mais que o trabalho |
| Componente que depende de contexto que muda a cada render                 | Não, o cache nunca acerta                   |

O sinal de memoization mal aplicada é o time gastar tempo debugando **por que o cache não invalida**
ou **por que uma prop muda de identidade a cada render**. Quando o debugging (depuração) do cache domina, a
memoization está no lugar errado.

**Regra prática**: medir antes de memoizar. Otimização sem medição é crença, não engenharia.

---

## Fronteiras de módulo e regras de import

Módulos são as unidades que o sistema empacota, testa e versiona. As fronteiras entre eles
determinam o que pode depender de quê. Sem regras explícitas, o grafo de dependências vira um
emaranhado: mudança em um módulo distante quebra um módulo qualquer sem que o autor saiba.

### Feature-based (por funcionalidade) vs layer-based (por camada)

| Organização       | Agrupa por                                           | Melhor para                                                   |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| **Feature-based** | Domínio de negócio (orders, users, billing)          | Times paralelos, sistemas com muitas features independentes   |
| **Layer-based**   | Camada técnica (controllers, services, repositories) | Aplicações com poucas features mas muita disciplina de camada |

Projetos reais costumam ser **híbridos**: feature-based no nível superior, layer-based dentro de
cada feature. O padrão é consistente com Vertical Slice descrito em
[architecture.md](architecture.md).

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

A direção das dependências dentro de uma feature segue uma regra única: as camadas externas dependem
das internas, nunca o contrário.

```
application → domain ← infrastructure
```

`application` depende de `domain`. `infrastructure` depende de `domain` via interface. `domain` não
depende de nada.

Três regras mantêm o grafo saudável entre features:

- **Features não importam features.** Se `orders` precisa de algo de `billing`, o compartilhado sobe
  para `shared/` ou a dependência acontece por evento (ver Observer em [patterns.md](patterns.md)).
  Import direto vira acoplamento oculto.
- **Camadas respeitam direção.** O import que fere a direção acima é sinal de responsabilidade mal
  colocada.
- **Public API explícita.** Cada módulo tem um `index` ou barrel file (arquivo índice) como único ponto de exportação. Consumidores importam desse contrato, não de arquivos internos. Mudanças internas ficam contidas.

Quando a ferramenta suporta, as regras viram **configuração verificável** (ESLint boundaries, Nx
tags, analyzers .NET, dependency-cruiser). Regras checadas pelo CI (pipeline que automatiza lint,
testes e build a cada commit) não degradam; as confiadas na disciplina humana erodem em dois
sprints.

### Sinais de fronteira errada

- O mesmo domínio aparece em três features diferentes, sempre ligeiramente diferente. Falta um
  módulo compartilhado.
- Uma mudança em uma feature exige tocar arquivos em outras quatro. Fronteira vazando.
- Um módulo `shared/utils` cresce indefinidamente e vira lixeira. Falta naming (nomenclatura) por domínio:
  `shared/formatting`, `shared/validation`, não `shared/utils`.
- O grafo de dependências tem ciclos. Qualquer ciclo é um bug de design; quebrar exige inverter uma
  dependência via interface.

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
- [frontend-flow.md](frontend-flow.md) — routing e forms: rotas impõem a separação container/presentacional naturalmente
