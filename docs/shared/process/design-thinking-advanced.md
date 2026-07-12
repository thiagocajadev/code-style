# Design Thinking avançado: descoberta, ideação e validação estruturadas

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.
>
> Avançado em relação a [`design-thinking.md`](./design-thinking.md). Cobre técnicas estruturadas de descoberta, ideação e validação.

Um ciclo curto de Design Thinking cabe em uma conversa e um bloco de post-its. Um ciclo grande, com muita gente e um problema mal delimitado, precisa de ferramentas que organizem o pensamento: frameworks que dizem quando abrir e quando fechar o leque de opções, artefatos que mostram o fluxo inteiro (inclusive a parte que o usuário não vê) e técnicas de ideação que produzem volume antes de o time convergir para a primeira ideia razoável.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Double Diamond** (diamante duplo) | Framework do British Design Council que alterna fases divergentes e convergentes |
| **Service Blueprint** (planta de serviço) | Diagrama que mapeia jornada do usuário junto com operações internas de bastidores |
| **Journey Map** (mapa de jornada) | Visualização detalhada das etapas, emoções e pontos de fricção do usuário |
| **MVP** (Minimum Viable Product · Produto Mínimo Viável) | Versão com o mínimo necessário para validar uma hipótese |
| **MLP** (Minimum Lovable Product · Produto Mínimo Encantador) | MVP com qualidade de experiência suficiente para gerar adesão, não só uso |
| **Usability testing** (teste de usabilidade) | Observação estruturada de usuário real interagindo com a solução |
| **Think-aloud** (pensar em voz alta) | Técnica em que o usuário narra o raciocínio enquanto usa o protótipo |

## Double Diamond: abrir e fechar duas vezes

O framework organiza o trabalho em quatro fases que alternam divergência (gerar opções) e convergência (escolher entre elas):

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

O primeiro diamante responde _"qual problema?"_ e o segundo responde _"qual solução?"_. Times que começam pelo segundo diamante produzem uma solução elegante para um problema que ninguém tem.

## Service Blueprint: a jornada mais os bastidores

O blueprint coloca lado a lado o que o usuário faz e as operações internas que sustentam cada passo. Ele mostra o caminho completo, inclusive a validação manual que alguém faz no escritório entre o clique do usuário e a confirmação na tela.

Estrutura em camadas:

| Camada | O que representa |
|---|---|
| **Customer actions** (ações do usuário) | O que o usuário faz em cada etapa |
| **Frontstage** (palco) | O que o usuário enxerga: tela, atendente, e-mail recebido |
| **Backstage** (bastidores) | Ações internas invisíveis ao usuário: validação manual, processamento |
| **Support processes** (processos de suporte) | Sistemas, integrações, equipes envolvidas |

O blueprint revela onde a experiência do usuário depende de um processo interno frágil. Uma tela impecável que espera três dias por uma aprovação manual parece ótima no wireframe e ruim no blueprint.

## Journey Map detalhado

O Journey Map completo registra mais que a sequência de passos. Para cada etapa, ele responde:

| Dimensão | Pergunta |
|---|---|
| **Ação** | O que o usuário está fazendo? |
| **Objetivo** | O que ele tenta conseguir nessa etapa? |
| **Emoção** | Como ele se sente? (frustrado, ansioso, satisfeito) |
| **Ponto de contato** | Onde a interação acontece? (app, e-mail, loja física) |
| **Fricção** | O que o atrapalha? |
| **Oportunidade** | Que melhoria resolveria a fricção? |

Com o mapa completo, o time enxerga a experiência inteira em vez de telas isoladas. As etapas de maior fricção emocional costumam ser as de maior retorno quando melhoradas.

## Técnicas de ideação que forçam volume

A ideação sem estrutura produz as ideias óbvias nos primeiros minutos e depois estagna. As técnicas abaixo empurram o time para fora dessa zona.

### Crazy 8s

Cada participante desenha oito ideias diferentes em oito minutos, uma por minuto. O relógio apertado deixa pouco espaço para o julgamento interno, que é o que costuma barrar a ideia estranha antes dela ser desenhada.

Regras:

- Uma folha dobrada em oito quadrados
- Oito minutos cronometrados, um por quadrado
- Sem revisão durante a execução
- Compartilhar e discutir depois, e não durante

O padrão do resultado se repete: as três primeiras ideias são as óbvias, as três do meio são versões melhoradas das previsíveis, e as duas últimas costumam trazer o que ninguém tinha considerado.

### SCAMPER

Checklist de transformações aplicadas a uma ideia que já existe:

| Letra | Ação | Pergunta |
|---|---|---|
| **S** | Substitute (substituir) | O que pode ser trocado por outra coisa? |
| **C** | Combine (combinar) | O que pode ser fundido com outra ideia? |
| **A** | Adapt (adaptar) | O que pode ser ajustado para um contexto novo? |
| **M** | Modify (modificar) | O que pode ser aumentado, reduzido ou reformado? |
| **P** | Put to another use (usar de outra forma) | Onde mais essa ideia serviria? |
| **E** | Eliminate (eliminar) | O que pode ser removido sem perda? |
| **R** | Reverse (reverter) | O que aconteceria se a ordem ou o papel invertesse? |

O SCAMPER precisa de uma ideia-base para explorar. Ele serve para gerar variações, e não para partir do zero.

### Lotus Blossom

Uma ideia central gera oito variações, e cada variação gera outras oito, o que produz 64 ideias ligadas ao tema. Serve quando o problema é amplo e o time precisa mapear o espaço todo antes de escolher por onde ir.

### Analogia forçada

O time compara o problema com um domínio sem relação alguma: _"Como um restaurante lidaria com isso? Como um aeroporto faria?"_. A comparação traz soluções já testadas em outro contexto, e algumas se adaptam.

## Estratégia de protótipo: subir a fidelidade conforme a dúvida cai

Cada estágio de protótipo responde uma pergunta diferente. Subir a fidelidade antes da hora gasta trabalho em detalhes visuais que a próxima descoberta vai mudar.

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

Usar o estágio errado para a pergunta em jogo custa tempo e produz confiança sem base: um mockup bonito convence a diretoria de uma ideia que ninguém testou com usuário.

## MVP e MLP: duas versões reduzidas, dois objetivos

Ambos entregam menos que o produto completo. O que muda é a pergunta que cada um responde.

| Conceito | O que entrega | Quando usar |
|---|---|---|
| **MVP** | Validação da hipótese de valor com o mínimo viável | Problema ainda não é claro; quer testar se vale a pena construir |
| **MLP** | Experiência suficientemente boa para gerar adesão emocional | Problema é claro; quer testar se a solução será adotada |

O **MVP** tolera uma **UX** (User Experience · Experiência do Usuário) desagradável, desde que a hipótese seja validada. O **MLP** precisa de qualidade de experiência, porque a pergunta dele é se o usuário volta a usar.

A fase decide: descoberta de problema pede MVP, validação de adoção pede MLP.

## Usability testing: observar o usuário usando

O teste procura os pontos em que a interface falha na mão de um usuário real. Uma sessão desenhada para confirmar que a interface funciona costuma conseguir exatamente isso, e não ensina nada.

### Modalidades

| Modalidade | Como funciona | Quando usar |
|---|---|---|
| **Moderado presencial** | Facilitador observa o usuário ao vivo no ambiente de teste | Exploração profunda, perguntas de acompanhamento |
| **Moderado remoto** | Facilitador conduz por videochamada | Usuários distribuídos, orçamento enxuto |
| **Não-moderado** | Usuário executa tarefas sozinho, ferramenta grava | Volume alto, validação de hipóteses específicas |
| **Guerrilla** | Abordagem rápida em local público (café, coworking) | Validação inicial, orçamento zero |

### Think-aloud

O usuário narra o raciocínio em voz alta enquanto executa a tarefa:

```
Usuário: "Agora eu quero ver meus pedidos anteriores. Vou procurar... estou olhando
o menu... não vejo 'pedidos'... vou clicar em perfil."
```

A narração expõe o que o usuário esperava encontrar. No exemplo, ele procura "pedidos" no menu e acaba em "perfil", o que indica um rótulo que o produto escolheu e o usuário não usa.

### Métricas de usabilidade

| Métrica | O que mede |
|---|---|
| **Task success rate** (taxa de sucesso da tarefa) | Percentual de usuários que completa a tarefa sem ajuda |
| **Time on task** (tempo na tarefa) | Quanto tempo leva para completar |
| **Error rate** (taxa de erro) | Quantos erros ocorrem durante a execução |
| **SUS** (System Usability Scale · Escala de Usabilidade do Sistema) | Questionário de 10 perguntas com escore de 0 a 100 |
| **NPS** (Net Promoter Score · Escore Líquido de Promotor) | Probabilidade de o usuário recomendar a solução |

As métricas mostram a tendência e o tamanho do problema. A observação qualitativa explica a causa por trás do número.

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

Cada item pendente é uma hipótese que ninguém validou. Ela continua existindo depois do deploy, e quem valida passa a ser o usuário em produção.

## Cross-links

| Quando o trabalho exige | Documento |
|---|---|
| Visão conceitual antes de entrar em detalhes | [`design-thinking.md`](./design-thinking.md) |
| Execução visual da solução validada | [`../standards/ui-ux.md`](../standards/ui-ux.md) |
| Metodologia de implementação (DDD, BDD, TDD) | [`methodologies.md`](./methodologies.md) |
| Raciocínio arquitetural da solução | [`../architecture/system-design.md`](../architecture/system-design.md) |
| Governança do ciclo completo | [`governance.md`](./governance.md) |
