# Design Thinking (avançado)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
>
> Avançado em relação a [`design-thinking.md`](./design-thinking.md). Cobre técnicas estruturadas de descoberta, ideação e validação.

Ciclos maiores de Design Thinking exigem ferramentas mais formais: frameworks que orientam o pensamento, artefatos que visualizam fluxo completo, técnicas de ideação que produzem volume sem convergência prematura.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Double Diamond** (diamante duplo) | Framework do British Design Council que alterna fases divergentes e convergentes |
| **Service Blueprint** (planta de serviço) | Diagrama que mapeia jornada do usuário junto com operações internas de bastidores |
| **Journey Map** (mapa de jornada) | Visualização detalhada das etapas, emoções e pontos de fricção do usuário |
| **MVP** (Minimum Viable Product, Produto Mínimo Viável) | Versão com o mínimo necessário para validar uma hipótese |
| **MLP** (Minimum Lovable Product, Produto Mínimo Encantador) | MVP com qualidade de experiência suficiente para gerar adesão, não só uso |
| **Usability testing** (teste de usabilidade) | Observação estruturada de usuário real interagindo com a solução |
| **Think-aloud** (pensar em voz alta) | Técnica em que o usuário narra o raciocínio enquanto usa o protótipo |

## Double Diamond

Framework que organiza Design Thinking em quatro fases alternando divergência e convergência:

```
Discover → Define → Develop → Deliver
(diverge)  (converge) (diverge)  (converge)
```

| Fase | Ação | Saída |
|---|---|---|
| **Discover** (descobrir) | Explorar o espaço do problema de forma ampla | Insights de pesquisa, dados brutos |
| **Define** (definir) | Convergir os insights em problema preciso | Problem statement, design brief |
| **Develop** (desenvolver) | Explorar soluções de forma ampla | Ideias, protótipos, variações |
| **Deliver** (entregar) | Convergir em uma solução e validar | Produto testado, pronto para implementação |

O primeiro diamante responde _"qual problema?"_. O segundo responde _"qual solução?"_. Pular o primeiro diamante leva a resolver o problema errado com solução elegante.

## Service Blueprint

Jornada do usuário mais as operações internas que a suportam. Mostra o que o usuário vê e o que acontece nos bastidores para que o fluxo funcione.

Estrutura em camadas:

| Camada | O que representa |
|---|---|
| **Customer actions** (ações do usuário) | O que o usuário faz em cada etapa |
| **Frontstage** (palco) | O que o usuário enxerga: tela, atendente, e-mail recebido |
| **Backstage** (bastidores) | Ações internas invisíveis ao usuário: validação manual, processamento |
| **Support processes** (processos de suporte) | Sistemas, integrações, equipes envolvidas |

Service Blueprint expõe pontos onde a experiência do usuário depende de processos internos frágeis. Gargalo que não aparece em wireframe aparece no blueprint.

## Journey Map detalhado

Journey Map completo vai além da sequência de passos. Para cada etapa, registra:

| Dimensão | Pergunta |
|---|---|
| **Ação** | O que o usuário está fazendo? |
| **Objetivo** | O que ele tenta conseguir nessa etapa? |
| **Emoção** | Como ele se sente? (frustrado, ansioso, satisfeito) |
| **Ponto de contato** | Onde a interação acontece? (app, e-mail, loja física) |
| **Fricção** | O que o atrapalha? |
| **Oportunidade** | Que melhoria resolveria a fricção? |

O mapa permite ver a experiência inteira, não só telas isoladas. Pontos de maior fricção emocional tendem a ser pontos de maior valor de melhoria.

## Técnicas avançadas de ideação

Ideação não estruturada produz as ideias óbvias em poucos minutos e depois estagna. Técnicas forçam saída da zona óbvia.

### Crazy 8s

Cada participante desenha oito ideias diferentes em oito minutos, uma por minuto. A pressão de tempo bloqueia o julgamento interno e força quantidade.

Regras:

- Uma folha dobrada em oito quadrados
- Oito minutos cronometrados, um por quadrado
- Sem revisão durante a execução
- Compartilhar e discutir depois, não durante

O resultado: as três primeiras ideias são óbvias, as três do meio são as previsíveis melhoradas, as duas últimas costumam ser as inesperadas.

### SCAMPER

Checklist de transformações aplicadas a uma ideia existente:

| Letra | Ação | Pergunta |
|---|---|---|
| **S** | Substitute (substituir) | O que pode ser trocado por outra coisa? |
| **C** | Combine (combinar) | O que pode ser fundido com outra ideia? |
| **A** | Adapt (adaptar) | O que pode ser ajustado para um contexto novo? |
| **M** | Modify (modificar) | O que pode ser aumentado, reduzido ou reformado? |
| **P** | Put to another use (usar de outra forma) | Onde mais essa ideia serviria? |
| **E** | Eliminate (eliminar) | O que pode ser removido sem perda? |
| **R** | Reverse (reverter) | O que aconteceria se a ordem ou o papel invertesse? |

SCAMPER funciona quando há uma ideia-base para explorar variações.

### Lotus Blossom

Estrutura expansiva: uma ideia central gera oito variações, cada variação gera outras oito. Produz 64 ideias relacionadas ao tema central.

Útil quando o problema é amplo e o time precisa mapear o espaço antes de convergir.

### Analogia forçada

Comparar o problema com um domínio não-relacionado: _"Como um restaurante lidaria com isso? Como um aeroporto faria?"_. A analogia traz soluções testadas em outro contexto que podem ser adaptadas.

## Estratégia de protótipo

Protótipos crescem em fidelidade conforme a dúvida diminui. Subir a fidelidade cedo desperdiça esforço em detalhes que vão mudar.

```
Esboço em papel → Wireframe → Mockup → Protótipo interativo
(fidelidade baixa)                    (fidelidade alta)
```

| Estágio | Custo | Validação que suporta |
|---|---|---|
| **Esboço em papel** | Minutos | O conceito faz sentido? |
| **Wireframe** (esboço digital) | Horas | A estrutura de navegação funciona? |
| **Mockup estático** (protótipo visual completo) | Dias | A hierarquia visual comunica o que deve? |
| **Protótipo interativo** | Dias a semanas | O fluxo de interação é fluido? |
| **MVP em produção** | Semanas | A solução resolve o problema com usuários reais? |

Cada estágio responde uma pergunta diferente. Usar o estágio errado para a pergunta custa tempo e cria falsa confiança.

## MVP vs MLP

Ambos são versões reduzidas do produto, mas com objetivos distintos:

| Conceito | O que entrega | Quando usar |
|---|---|---|
| **MVP** | Validação da hipótese de valor com o mínimo viável | Problema ainda não é claro; quer testar se vale a pena construir |
| **MLP** | Experiência suficientemente boa para gerar adesão emocional | Problema é claro; quer testar se a solução será adotada |

MVP pode ter **UX** (User Experience, Experiência do Usuário) desagradável desde que valide a hipótese. MLP precisa de qualidade de experiência para gerar retorno real do usuário.

A escolha depende da fase: descoberta de problema usa MVP, validação de adoção usa MLP.

## Usability Testing

Observação estruturada de usuário real usando a solução. O objetivo é encontrar os pontos onde a interface falha, não provar que ela funciona.

### Modalidades

| Modalidade | Como funciona | Quando usar |
|---|---|---|
| **Moderado presencial** | Facilitador observa o usuário ao vivo no ambiente de teste | Exploração profunda, perguntas de acompanhamento |
| **Moderado remoto** | Facilitador conduz por videochamada | Usuários distribuídos, orçamento enxuto |
| **Não-moderado** | Usuário executa tarefas sozinho, ferramenta grava | Volume alto, validação de hipóteses específicas |
| **Guerrilla** | Abordagem rápida em local público (café, coworking) | Validação inicial, orçamento zero |

### Think-aloud

O usuário narra o raciocínio enquanto executa a tarefa:

```
Usuário: "Agora eu quero ver meus pedidos anteriores. Vou procurar... estou olhando
o menu... não vejo 'pedidos'... vou clicar em perfil."
```

A narração revela expectativas implícitas e pontos onde a interface não corresponde ao modelo mental do usuário.

### Métricas de usabilidade

| Métrica | O que mede |
|---|---|
| **Task success rate** (taxa de sucesso da tarefa) | Percentual de usuários que completa a tarefa sem ajuda |
| **Time on task** (tempo na tarefa) | Quanto tempo leva para completar |
| **Error rate** (taxa de erro) | Quantos erros ocorrem durante a execução |
| **SUS** (System Usability Scale, Escala de Usabilidade do Sistema) | Questionário de 10 perguntas com escore de 0 a 100 |
| **NPS** (Net Promoter Score, Escore Líquido de Promotor) | Probabilidade de o usuário recomendar a solução |

Métricas quantitativas orientam tendências. Observação qualitativa explica o porquê por trás dos números.

## Checklist de Design Thinking

Antes de entregar uma solução como pronta para implementação:

- [ ] Usuário real foi entrevistado ou observado, não presumido
- [ ] Problem statement é específico, acionável e centrado em necessidade
- [ ] Persona e jornada existem e foram revisadas com quem conhece o usuário
- [ ] Ideação gerou pelo menos uma ideia fora do óbvio
- [ ] Protótipo começou em fidelidade baixa e subiu conforme a dúvida diminuiu
- [ ] Teste com usuário real identificou ajustes concretos
- [ ] Ajustes foram aplicados antes de considerar a solução pronta
- [ ] Métricas de sucesso em produção estão definidas

Itens pendentes indicam hipóteses não validadas. Construir antes de validar transfere a validação para produção, com custo maior.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Visão conceitual antes de entrar em detalhes | [`design-thinking.md`](./design-thinking.md) |
| Execução visual da solução validada | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |
| Raciocínio arquitetural da solução | [`../architecture/system-design.md`](../architecture/system-design.md) |
| Governança do ciclo completo | [`governance.md`](./governance.md) |
