# Metodologias e estilos arquiteturais

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

A metodologia define como o time organiza o trabalho. O estilo arquitetural define como o código é estruturado e implantado. As duas escolhas produzem efeito cedo: uma metodologia que não cabe no time gera retrabalho, e um estilo arquitetural grande demais para o problema gera complexidade que alguém vai precisar operar.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **DDD** (Domain-Driven Design · Design Orientado ao Domínio) | Organizar o código em torno do modelo de domínio, refletindo a linguagem e as regras de negócio |
| **BDD** (Behavior-Driven Development · Desenvolvimento Orientado ao Comportamento) | Descrever o comportamento esperado em linguagem de negócio antes de implementar |
| **TDD** (Test-Driven Development · Desenvolvimento Orientado a Testes) | Escrever o teste antes do código; o teste guia o design |
| **XP** (eXtreme Programming · Programação Extrema) | Conjunto de práticas ágeis: integração contínua, feedback curto, refactoring constante |
| **XGH** (eXtreme Go Horse · Vai Cavalo Extremo) | Anti-metodologia satírica; útil para nomear o que _não_ fazer |
| **Monolith** (Monolito) | Aplicação inteira em um único processo e deployável |
| **Microservices** (Microsserviços) | Serviços independentes com deploy e escala separados |
| **Modular Monolith** (Monolito Modular) | Módulos com limites de domínio dentro de um único processo |
| **Bounded Context** (Contexto Delimitado) | Limite explícito onde um modelo de domínio é válido e consistente |
| **Ubiquitous Language** (Linguagem Ubíqua) | Vocabulário compartilhado entre engenheiros e especialistas de negócio, refletido no código |

---

## Metodologias de processo

### DDD: design orientado ao domínio

O código se organiza em torno do domínio de negócio. Os termos que o especialista usa na reunião aparecem nos identificadores, nas classes e nos limites do sistema, e formam a **Ubiquitous Language** (Linguagem Ubíqua) que engenheiros e negócio compartilham. Quando o negócio diz "pedido faturado", existe um `Order` com esse estado no código, com esse nome.

Conceitos centrais:

| Conceito | Papel |
|---|---|
| **Entity** (Entidade) | Objeto com identidade única que persiste no tempo (`Order`, `User`) |
| **Value Object** (Objeto de Valor) | Objeto sem identidade, definido pelos seus atributos (`Money`, `Address`) |
| **Aggregate** (Agregado) | Grupo de entidades com uma raiz que garante consistência interna |
| **Bounded Context** | Limite explícito onde um modelo é válido; modelos diferentes coexistem sem conflito |
| **Domain Service** (Serviço de Domínio) | Operação de domínio sem estado natural em uma entidade (`PricingService`) |

**Quando usar**: sistemas com regras de negócio ricas e domínio complexo. Em um CRUD simples, as camadas do DDD custam mais do que devolvem.

### BDD: desenvolvimento orientado ao comportamento

O BDD escreve o comportamento esperado na linguagem do negócio, antes da implementação. O cenário usa o formato **Given / When / Then** (Dado / Quando / Então), que um stakeholder (parte interessada, sem perfil técnico) consegue ler e conferir.

```
Given um pedido com 3 itens
When o cliente aplica um cupom de 10%
Then o total deve refletir o desconto sobre o subtotal
```

O cenário vira o teste, e a implementação existe para satisfazer o cenário.

**Quando usar**: features com critérios de aceite definidos por produto ou negócio; colaboração entre times técnicos e não-técnicos.

### TDD: desenvolvimento orientado a testes

O ciclo tem três fases, **Red → Green → Refactor** (Vermelho → Verde → Refatorar):

```
Red    → escrever o teste que falha (comportamento ainda não existe)
Green  → escrever o mínimo de código para o teste passar
Refactor → limpar o código sem quebrar os testes
```

Escrever o teste primeiro obriga a decidir _como a função vai ser usada_ antes de decidir _como ela funciona por dentro_. O código que sai daí tende a ter dependências explícitas e contratos claros, porque foi consumido antes de existir.

**Quando usar**: qualquer sistema onde mudanças frequentes exigem confiança. O retorno é maior em domínio de negócio com validação e regras de cálculo.

### XP: programação extrema

Um conjunto de práticas de engenharia voltadas a feedback rápido e qualidade contínua:

| Prática | O que faz |
|---|---|
| **Pair Programming** (Programação em Par) | Dois engenheiros no mesmo código ao mesmo tempo; revisão em tempo real |
| **Integração Contínua** | Integrar e validar o código várias vezes ao dia |
| **Refactoring contínuo** | Melhorar o design do código sem adicionar features |
| **Releases pequenos** | Entregar incrementos pequenos e frequentes em vez de grandes lotes |
| **Posse coletiva do código** | Qualquer engenheiro pode melhorar qualquer parte do sistema |

O XP é a base conceitual do que hoje se chama DevOps e **CI/CD** (Continuous Integration and Continuous Delivery · Integração e Entrega Contínuas: **CI** é Integração Contínua; **CD** é Entrega Contínua).

**Quando usar**: times pequenos com entregas frequentes e domínio em evolução.

### Desenvolvimento intuitivo

A decisão vem da experiência acumulada, por padrão reconhecido, sem um processo formal que a sustente.

Tem lugar válido:

- Prototipagem rápida onde velocidade supera estrutura
- Decisões táticas em domínios já bem conhecidos
- Contextos onde o custo de processo supera o valor gerado

O risco está na transferência: uma decisão tomada por intuição é difícil de justificar para o time e difícil de repetir por quem não tem a mesma bagagem. Combina bem com TDD, onde a intuição escolhe a direção e o teste confirma a chegada.

### Desenvolvimento orgânico

A estrutura emerge da necessidade real, sem planejamento _upfront_ (antecipado) extenso. O código cresce na direção que o problema exige.

Isso descreve um adiamento deliberado das abstrações. A abstração entra quando o padrão se repete pela terceira vez (**Rule of Three** · regra das três ocorrências), porque só aí ficam visíveis as partes que variam e as que se mantêm.

O risco é a dívida técnica se acumular sem que ninguém perceba, e o refactoring regular é o que evita isso. Com uma suíte de testes cobrindo o comportamento, refatorar deixa de ser aposta e o desenvolvimento orgânico se sustenta.

### XGH: eXtreme Go Horse

Anti-metodologia satírica, com a premissa "pensar é perda de tempo; commit primeiro".

Ela serve para **nomear o que não fazer**: código sem testes, sem revisão, sem limites entre módulos, com dependências ocultas e deploy feito na base da coragem.

Quando alguém descreve uma decisão técnica e você reconhece o XGH ali dentro, o sinal de alerta já apareceu.

---

## Estilos arquiteturais

### Monolito

Toda a aplicação em um único processo e deployável. O banco de dados, o servidor web e a lógica de negócio vivem juntos.

**Vantagens**: simples de desenvolver, depurar, testar e deployar. Uma única base de código, um único deploy, rastreamento direto de chamadas.

**Quando o problema aparece**: escalar um módulo obriga a escalar tudo. O acoplamento cresce junto com o time quando falta disciplina de limites. Um bug em uma parte pode derrubar o sistema inteiro.

**Quando usar**: início de projeto, times pequenos, domínio ainda sendo descoberto.

### Microsserviços

Serviços independentes, cada um com sua própria base de código, banco de dados e ciclo de deploy. A comunicação entre eles acontece por **API** (Application Programming Interface · Interface de Programação de Aplicações) ou mensageria.

**Vantagens**: cada serviço escala e evolui por conta própria. Times diferentes assumem a responsabilidade por serviços diferentes sem coordenação constante.

**O custo real**:

| Complexidade adicionada | Impacto |
|---|---|
| Latência de rede entre serviços | Falhas parciais e timeouts que não existiam |
| Distributed tracing (rastreamento distribuído) | Necessário para diagnosticar chamadas entre serviços |
| Eventual consistency (consistência eventual) | Transações distribuídas são difíceis |
| Overhead operacional (custo extra de operação) | CI/CD, monitoramento e infraestrutura multiplicados por N serviços |

**Quando usar**: quando a escala do _time_ ou do _domínio_ passa a exigir isolamento real. Começar um projeto aqui paga o custo operacional antes de ter o problema que ele resolve.

### Monolito modular

Módulos com limites de domínio bem definidos dentro de um único processo. Cada módulo tem suas próprias camadas internas, expõe uma interface pública e acessa os outros módulos por essa interface.

```
Monolito Modular
├── módulo: Orders
│   ├── domain/
│   ├── application/
│   └── api/ (interface pública do módulo)
├── módulo: Inventory
│   └── api/ (interface pública do módulo)
└── módulo: Billing
    └── api/ (interface pública do módulo)
```

**Por que é o padrão recomendado em 2026**:

- Deploy simples de monolito, sem overhead operacional de microsserviços
- Limites de domínio claros desde o início, sem acoplamento invisível
- Refactoring para microsserviços se torna cirúrgico quando necessário: o módulo já tem limite definido
- Escala vertical (mais **CPU** (Central Processing Unit · Unidade Central de Processamento)/**RAM** (Random Access Memory · Memória de Acesso Aleatório)) resolve a maioria dos casos antes de precisar distribuir

**Quando extrair um microsserviço**: quando um módulo passa a ter requisito de escala, ciclo de deploy ou equipe muito diferentes dos demais. Enquanto isso não acontece, o limite do módulo já entrega o isolamento que importa.

---

## Referência rápida

**Metodologias**

| Metodologia | Base | Melhor para |
|---|---|---|
| **DDD** | Modelagem de domínio | Regras de negócio complexas |
| **BDD** | Comportamento como especificação | Times mistos técnicos e não-técnicos |
| **TDD** | Teste como design | Qualquer sistema com mudanças frequentes |
| **XP** | Feedback rápido e incremental | Times pequenos, entregas frequentes |
| **Orgânica** | Emergência guiada por necessidade real | Prototipagem, domínio em exploração |
| **XGH** | Antipadrão satírico | Nomear o que não fazer |

**Estilos arquiteturais**

| Estilo | Quando faz sentido | Trade-off principal |
|---|---|---|
| **Monolito** | Início de projeto, time pequeno | Escala acoplada ao crescer |
| **Monolito Modular** | Padrão recomendado; domínio claro, time crescendo | Exige disciplina de limites |
| **Microsserviços** | Escala de time ou domínio impõe isolamento real | Complexidade operacional alta |
