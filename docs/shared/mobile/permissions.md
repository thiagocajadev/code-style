# Permissions (Permissões)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

**Runtime permissions** (permissões em tempo de execução) são a forma como o sistema operacional
mobile protege recursos sensíveis do dispositivo. Diferente de aplicações web, onde o browser pede
permissão em contexto, em mobile o modelo é mais restritivo: o usuário pode negar permanentemente,
e o SO lembra dessa decisão entre sessões.

Uma estratégia de permissões bem projetada não é sobre obter acesso — é sobre merecer confiança.

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

O fluxo correto de permissão tem três etapas:

```
Contexto claro → Rationale (se necessário) → Diálogo do SO → Resposta tratada
```

**Contexto claro** significa que o usuário entende por que está sendo pedido antes de ver o diálogo.
Solicitar câmera ao abrir o app sem contexto algum é o erro mais comum — e o mais eficiente em
destruir confiança.

**Rationale** é necessário quando o SO indica que o usuário já negou anteriormente. É uma chance de
explicar o valor antes de pedir de novo:

```
Fluxo sem rationale:  App abre → Diálogo do SO aparece → Usuário nega → Fim
Fluxo com rationale:  App abre → [usuário já negou antes] → Explicação do app → Diálogo do SO → Usuário decide com contexto
```

## Quando solicitar

A regra é: solicitar no momento em que o recurso é necessário, nunca antes.

| Prática | Resultado |
|---|---|
| Pedir câmera ao abrir o app | Usuário nega porque não entende o motivo |
| Pedir câmera ao tocar em "Tirar foto" | Usuário entende e aprova — o contexto está claro |
| Pedir localização ao abrir o mapa | Contexto óbvio — alta taxa de aprovação |
| Pedir localização na tela de cadastro | Usuário desconfia — baixa taxa de aprovação |

Permissões agrupadas no splash screen são o antipadrão clássico. O usuário não tem contexto para
avaliar nenhum dos pedidos e tende a negar tudo.

## Permanently denied

Quando o usuário nega permanentemente, o diálogo do SO não pode mais ser exibido. Exibir o diálogo
nesse estado não tem efeito — o sistema o ignora.

O único caminho restante é direcionar o usuário para as configurações do dispositivo:

```
App detecta permissão permanentemente negada → Exibe explicação do impacto → Botão "Abrir Configurações"
                                                ↓ usuário não quis ir → funcionalidade desativada graciosamente
```

Nunca: ignorar o estado permanently denied e tentar exibir o diálogo. Nunca: bloquear o app
completamente por falta de uma permissão não essencial.

## Graceful degradation

O app deve funcionar mesmo quando permissões são negadas. A funcionalidade afetada deve ser
desativada de forma clara, não silenciosa.

| Permissão negada | Comportamento esperado |
|---|---|
| Câmera | Botão de foto desativado com explicação; upload de galeria continua disponível |
| Localização | Mapa exibido sem posição atual; busca manual disponível |
| Microfone | Gravação de voz desativada; input de texto como alternativa |
| Contatos | Importação de contatos desativada; busca manual disponível |
| Notificações | App funciona normalmente; sem lembretes baseados em push |

A pergunta a responder para cada permissão: **o que o usuário ainda consegue fazer sem ela?** Se a
resposta for "nada", a permissão é essencial e o fluxo deve deixar isso claro antes de pedir — não
depois de negar.

## Permissões e trust

Permissões são o primeiro teste de confiança entre o app e o usuário. As diretrizes que preservam
essa confiança:

- Pedir apenas o que é necessário para a funcionalidade atual
- Nunca pedir permissões que o app não usa imediatamente
- Justificar antes de pedir quando o motivo não for óbvio
- Aceitar a negação sem punir o usuário com popups repetitivos
- Tratar permanently denied como decisão definitiva, não como obstáculo a contornar
