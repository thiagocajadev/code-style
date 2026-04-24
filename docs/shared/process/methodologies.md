# Metodologias e Estilos Arquiteturais

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Metodologias definem _como_ um time organiza o trabalho. Estilos arquiteturais definem _como_ o código é estruturado e implantado. A escolha errada de qualquer um dos dois cobra seu preço cedo: retrabalho, rigidez ou complexidade desnecessária.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **DDD** (Domain-Driven Design, Design Orientado ao Domínio) | Organizar o código em torno do modelo de domínio, refletindo a linguagem e as regras de negócio |
| **BDD** (Behavior-Driven Development, Desenvolvimento Orientado ao Comportamento) | Descrever o comportamento esperado em linguagem de negócio antes de implementar |
| **TDD** (Test-Driven Development, Desenvolvimento Orientado a Testes) | Escrever o teste antes do código; o teste guia o design |
| **XP** (eXtreme Programming, Programação Extrema) | Conjunto de práticas ágeis: integração contínua, feedback curto, refactoring constante |
| **XGH** (eXtreme Go Horse, Vai Cavalo Extremo) | Anti-metodologia satírica; útil para nomear o que _não_ fazer |
| **Monolith** (Monolito) | Aplicação inteira em um único processo e deployável |
| **Microservices** (Microsserviços) | Serviços independentes com deploy e escala separados |
| **Modular Monolith** (Monolito Modular) | Módulos com fronteiras de domínio dentro de um único processo |
| **Bounded Context** (Contexto Delimitado) | Limite explícito onde um modelo de domínio é válido e consistente |
| **Ubiquitous Language** (Linguagem Ubíqua) | Vocabulário compartilhado entre engenheiros e especialistas de negócio, refletido no código |

---

## Metodologias de Processo

### DDD: Domain-Driven Design (Design Orientado ao Domínio)

O código organiza-se em torno do domínio de negócio, não da infraestrutura. Os termos do negócio aparecem nos identificadores, nas classes e nas fronteiras do sistema, formando a **Ubiquitous Language** (Linguagem Ubíqua) entre engenheiros e especialistas de domínio.

Conceitos centrais:

| Conceito | Papel |
|---|---|
| **Entity** (Entidade) | Objeto com identidade única que persiste no tempo (`Order`, `User`) |
| **Value Object** (Objeto de Valor) | Objeto sem identidade, definido pelos seus atributos (`Money`, `Address`) |
| **Aggregate** (Agregado) | Grupo de entidades com uma raiz que garante consistência interna |
| **Bounded Context** | Fronteira explícita onde um modelo é válido; modelos diferentes coexistem sem conflito |
| **Domain Service** (Serviço de Domínio) | Operação de domínio sem estado natural em uma entidade (`PricingService`) |

**Quando usar**: sistemas com regras de negócio ricas e domínio complexo. Em CRUDs simples, o overhead de DDD supera o benefício.

### BDD: Behavior-Driven Development (Desenvolvimento Orientado ao Comportamento)

Extensão do TDD com foco na linguagem de negócio. Cenários são escritos em formato **Given / When / Then** (Dado / Quando / Então), legível para stakeholders não-técnicos (partes interessadas sem perfil técnico).

```
Given um pedido com 3 itens
When o cliente aplica um cupom de 10%
Then o total deve refletir o desconto sobre o subtotal
```

O cenário vira o teste. A implementação serve o cenário.

**Quando usar**: features com critérios de aceite definidos por produto ou negócio; colaboração entre times técnicos e não-técnicos.

### TDD: Test-Driven Development (Desenvolvimento Orientado a Testes)

Ciclo de três fases: **Red → Green → Refactor** (Vermelho → Verde → Refatorar).

```
Red    → escrever o teste que falha (comportamento ainda não existe)
Green  → escrever o mínimo de código para o teste passar
Refactor → limpar o código sem quebrar os testes
```

O teste força o design por interface: você pensa em _como vai usar_ antes de _como vai implementar_. O resultado é código com dependências explícitas e contratos claros.

**Quando usar**: qualquer sistema onde mudanças frequentes exigem confiança. Especialmente valioso em domínio de negócio com lógica de validação e regras de cálculo.

### XP: eXtreme Programming (Programação Extrema)

Conjunto de práticas de engenharia voltadas a feedback rápido e qualidade contínua:

| Prática | O que faz |
|---|---|
| **Pair Programming** (Programação em Par) | Dois engenheiros no mesmo código ao mesmo tempo; revisão em tempo real |
| **Integração Contínua** | Integrar e validar o código várias vezes ao dia |
| **Refactoring contínuo** | Melhorar o design do código sem adicionar features |
| **Releases pequenos** | Entregar incrementos pequenos e frequentes em vez de grandes lotes |
| **Posse coletiva do código** | Qualquer engenheiro pode melhorar qualquer parte do sistema |

XP é a base conceitual de práticas que hoje chamamos de DevOps e **CI/CD** (Continuous Integration and Continuous Delivery, Integração e Entrega Contínuas — **CI**, Integração Contínua; **CD**, Entrega Contínua).

**Quando usar**: times pequenos com entregas frequentes e domínio em evolução.

### Desenvolvimento Intuitivo (Intuição e Heurística)

Tomada de decisão baseada em experiência acumulada, sem framework formal. O engenheiro escolhe por padrão reconhecido, não por processo definido.

Tem lugar válido:

- Prototipagem rápida onde velocidade supera estrutura
- Decisões táticas em domínios já bem conhecidos
- Contextos onde o custo de processo supera o valor gerado

Risco: difícil de justificar, transferir ou escalar para outras pessoas. Funciona bem como complemento a TDD: a intuição define a direção, o teste valida a chegada.

### Desenvolvimento Orgânico

A estrutura emerge da necessidade real, sem planejamento _upfront_ (antecipado) extenso. O código cresce na direção que o problema exige.

Não é ausência de disciplina: é adiamento deliberado de abstrações prematuras. A abstração aparece quando o padrão se repete três vezes (Rule of Three).

Risco: sem refactoring regular, dívida técnica se acumula silenciosamente. TDD como rede de segurança torna o desenvolvimento orgânico sustentável.

### XGH: eXtreme Go Horse

Anti-metodologia satírica. Premissa: "pensar é perda de tempo; commit primeiro".

Não é uma abordagem séria. É útil para **nomear o que não fazer**: código sem testes, sem revisão, sem fronteiras, com dependências ocultas e deploy por coragem.

Quando alguém descreve uma decisão técnica e você reconhece XGH, é um sinal de alerta.

---

## Estilos Arquiteturais

### Monolito (Monolith)

Toda a aplicação em um único processo e deployável. O banco de dados, o servidor web e a lógica de negócio vivem juntos.

**Vantagens**: simples de desenvolver, depurar, testar e deployar. Uma única base de código, um único deploy, rastreamento direto de chamadas.

**Quando o problema aparece**: escalar um módulo obriga a escalar tudo. Acoplamento cresce com o time se não houver disciplina de fronteiras. Um bug pode derrubar o sistema inteiro.

**Quando usar**: início de projeto, times pequenos, domínio ainda sendo descoberto.

### Microsserviços (Microservices)

Serviços independentes, cada um com sua própria base de código, banco de dados e ciclo de deploy. Comunicam-se via **API** (Application Programming Interface, Interface de Programação de Aplicações) ou mensageria.

**Vantagens**: escala e evolui cada serviço de forma independente. Times diferentes ownam (são responsáveis por) serviços diferentes sem coordenação constante.

**O custo real**:

| Complexidade adicionada | Impacto |
|---|---|
| Latência de rede entre serviços | Falhas parciais e timeouts que não existiam |
| Distributed tracing (rastreamento distribuído) | Necessário para diagnosticar chamadas entre serviços |
| Eventual consistency (consistência eventual) | Transações distribuídas são difíceis |
| Overhead operacional | CI/CD, monitoramento e infraestrutura multiplicados por N serviços |

**Quando usar**: quando escala de _time_ ou de _domínio_ impõe isolamento real. Não como ponto de partida.

### Monolito Modular (Modular Monolith)

Módulos com fronteiras de domínio bem definidas dentro de um único processo. Cada módulo tem suas próprias camadas internas, expõe uma interface pública e não acessa diretamente os internos de outro módulo.

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
- Fronteiras de domínio claras desde o início, sem acoplamento invisível
- Refactoring para microsserviços se torna cirúrgico quando necessário: o módulo já tem fronteira definida
- Escala vertical (mais **CPU** (Central Processing Unit, Unidade Central de Processamento)/**RAM** (Random Access Memory, Memória de Acesso Aleatório)) resolve a maioria dos casos antes de precisar distribuir

**Quando extrair um microsserviço**: quando um módulo tem requisito de escala, ciclo de deploy ou equipe radicalmente diferentes dos demais. Não antes.

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
| **Monolito Modular** | Padrão recomendado; domínio claro, time crescendo | Exige disciplina de fronteiras |
| **Microsserviços** | Escala de time ou domínio impõe isolamento real | Complexidade operacional alta |
