# Permissões do dispositivo

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

As **runtime permissions** (permissões em tempo de execução) são a forma como o sistema operacional protege os recursos sensíveis do aparelho: câmera, localização, microfone, contatos. Na web, o navegador pede a permissão no contexto do uso e a decisão vale para aquela sessão. Em mobile o modelo aperta mais: o usuário pode negar em definitivo, e o sistema guarda essa decisão de uma sessão para a outra.

Uma boa estratégia de permissões trabalha para que o usuário entenda o pedido no momento em que ele aparece. Cada pedido sem contexto gasta um crédito de confiança que não volta.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Runtime permission** (permissão em tempo de execução) | Permissão solicitada enquanto o app está em uso, não na instalação |
| **Granted** (concedida) | Usuário aprovou o acesso ao recurso |
| **Denied** (negada) | Usuário recusou o acesso; app pode pedir novamente |
| **Permanently denied** (negada permanentemente) | Usuário recusou duas vezes ou marcou "não perguntar de novo"; app não pode mais exibir diálogo |
| **Rationale** (justificativa) | Explicação exibida antes do diálogo do SO para contextualizar o pedido |
| **Graceful degradation** (degradação graciosa) | App funciona com funcionalidade reduzida quando a permissão é negada |
| **Dangerous permission** (permissão sensível) | Classe de permissões que dá acesso a dados privados: câmera, localização, contatos, microfone |

## O fluxo de solicitação

O pedido de permissão tem três etapas antes da resposta:

```
Contexto claro → Rationale (se necessário) → Diálogo do SO → Resposta tratada
```

**Contexto claro** significa que o usuário já entendeu o motivo quando o diálogo do sistema aparece. Pedir a câmera no primeiro segundo do app, antes de qualquer tela, é o erro mais comum: o usuário nega porque nada na tela explica para que serve.

O **rationale** entra quando o sistema avisa que o usuário já negou antes. É a chance de explicar o valor com as palavras do app, antes de o diálogo aparecer de novo:

```
Fluxo sem rationale:  App abre → Diálogo do SO aparece → Usuário nega → Fim
Fluxo com rationale:  App abre → [usuário já negou antes] → Explicação do app → Diálogo do SO → Usuário decide com contexto
```

## Quando solicitar

A regra é pedir no instante em que o recurso vai ser usado.

| Prática | Resultado |
|---|---|
| Pedir câmera ao abrir o app | Usuário nega porque não entende o motivo |
| Pedir câmera ao tocar em "Tirar foto" | Usuário entende e aprova; o contexto está claro |
| Pedir localização ao abrir o mapa | Contexto óbvio; alta taxa de aprovação |
| Pedir localização na tela de cadastro | Usuário desconfia; baixa taxa de aprovação |

Juntar todas as permissões no splash screen é o antipadrão clássico. O usuário recebe quatro diálogos seguidos sem ter visto nenhuma tela do app, e a resposta previsível é negar todos.

## Quando a negação é definitiva

Depois que o usuário nega em definitivo, o diálogo do sistema para de aparecer. Chamar a API de permissão nesse estado retorna a negativa sem mostrar nada na tela, e o app fica esperando uma resposta que nunca vem.

O caminho que resta é levar o usuário até as configurações do aparelho:

```
App detecta permanently denied → explica o impacto → botão "Abrir Configurações" → usuário recusou? funcionalidade desativada graciosamente
```

Duas coisas ficam fora: insistir no diálogo depois da negação definitiva e bloquear o app inteiro por causa de uma permissão que só uma funcionalidade usa.

## Funcionar sem a permissão

O app segue de pé quando o usuário nega. A funcionalidade afetada fica desativada de forma visível, com o motivo à mão, e o resto continua funcionando.

| Permissão negada | Comportamento esperado |
|---|---|
| Câmera | Botão de foto desativado com explicação; upload de galeria continua disponível |
| Localização | Mapa exibido sem posição atual; busca manual disponível |
| Microfone | Gravação de voz desativada; input de texto como alternativa |
| Contatos | Importação de contatos desativada; busca manual disponível |
| Notificações | App funciona normalmente; sem lembretes baseados em push |

Para cada permissão, responda: **o que o usuário ainda consegue fazer sem ela?** Quando a resposta for "nada", a permissão é essencial, e o fluxo precisa deixar isso claro no momento do pedido, enquanto o usuário ainda pode decidir com a informação na mão.

## Permissão e confiança

O pedido de permissão é o primeiro teste de confiança entre o app e o usuário. As diretrizes que preservam essa confiança:

- Pedir apenas o que é necessário para a funcionalidade atual
- Nunca pedir permissões que o app não usa imediatamente
- Justificar antes de pedir quando o motivo não for óbvio
- Aceitar a negação sem punir o usuário com popups repetitivos
- Tratar a negação definitiva como decisão tomada, e desativar a funcionalidade com clareza
