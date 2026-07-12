# Segurança em VB.NET

> Escopo: VB.NET (setup). Princípios transversais em [shared/platform/security.md](../../shared/platform/security.md).

Esta página cobre o que é específico do .NET Framework 4.8 (Web **API** (Application Programming Interface · Interface de Programação de Aplicações) 2, ASP.NET **MVC** (Model-View-Controller · Modelo-Visão-Controle) 5 e Windows Forms): onde cada valor mora e qual ferramenta do ecossistema resolve cada caso. O motivo de cada regra (segredo fora do repositório, validação no servidor, cookie com HttpOnly, Secure e SameSite) está em [shared/platform/security.md](../../shared/platform/security.md), e não se repete aqui.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **config** (configuração) | Valor sem sigilo que muda entre ambientes: URL, timeout, limite |
| **secret** (segredo) | Credencial, senha ou chave; nunca vai para o repositório com o valor real |
| **transform** (transformação de config) | Regra do `Web.Release.config` que troca valores durante a publicação |
| **placeholder token** (marcador de substituição) | Texto como `#{DefaultConnection}#` que o pipeline troca pelo valor real no deploy |
| **aspnet_regiis** (ferramenta de criptografia de seção) | Utilitário que criptografa uma seção do `Web.config` com a chave da máquina |
| **DPAPI** (Data Protection API · API de Proteção de Dados) | Mecanismo do Windows que guarda a chave de criptografia amarrada à máquina |
| **CI/CD** (Continuous Integration and Continuous Delivery · Integração e Entrega Contínuas) | Pipeline que aplica os transforms e injeta os segredos no momento do deploy |

---

## Onde cada coisa vai

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Config base não sensível (commitado) | `Web.config` | URLs, timeouts, limites, feature flags |
| Override por ambiente | `Web.Release.config` transform | Tokens substituídos no pipeline de release |
| Secrets em máquina específica | Seção criptografada via `aspnet_regiis` | Chave DPAPI da máquina ou do farm |
| Secrets em staging/produção | Variáveis injetadas pelo IIS / pipeline | Connection strings reais |

O `Web.config` que vai para o repositório nunca carrega o valor real de um segredo. Ele guarda um token, que o pipeline troca na publicação, ou guarda a seção já criptografada, que só o servidor com a chave consegue ler.

---

<a id="config-transforms"></a>

## O transform troca o valor na hora de publicar

O `Web.Release.config` diz o que muda quando o projeto é publicado. No lugar da connection string real, o arquivo versionado guarda um token como `#{DefaultConnection}#`, e o pipeline de **CI/CD** (Azure DevOps, Octopus) o substitui pela variável daquele ambiente. O valor real fica no cofre do pipeline, e o repositório nunca o vê.

```xml
<!-- Web.Release.config -->
<configuration xmlns:xdt="http://schemas.microsoft.com/XML-Document-Transform">
  <connectionStrings>
    <add name="DefaultConnection"
         connectionString="#{DefaultConnection}#"
         providerName="System.Data.SqlClient"
         xdt:Transform="SetAttributes"
         xdt:Locator="Match(name)" />
  </connectionStrings>
</configuration>
```

---

<a id="section-encryption"></a>

## aspnet_regiis criptografa a seção no servidor

Em hospedagem gerenciada ou deploy manual, onde não há pipeline para injetar variáveis, o `aspnet_regiis` criptografa a seção `connectionStrings` direto no `Web.config` do servidor. A chave usada é a da máquina, então o arquivo copiado para outro computador não abre. O ASP.NET decifra a seção sozinho em execução, e o código continua lendo a configuração da mesma forma.

```cmd
rem criptografar
aspnet_regiis -pef "connectionStrings" "C:\inetpub\wwwroot\MyApp"

rem descriptografar (para manutenção)
aspnet_regiis -pdf "connectionStrings" "C:\inetpub\wwwroot\MyApp"
```

> [!NOTE]
> A seção criptografada por DPAPI padrão é específica da máquina. Para portabilidade entre máquinas do mesmo farm, usar o provider `DataProtectionConfigurationProvider` com container compartilhado.

---

<a id="reading-config"></a>

## O código lê o valor final, sem saber de onde ele veio

O `ConfigurationManager` entrega a configuração já resolvida: o `Web.config` base, com o transform aplicado e a seção criptografada decifrada. O `ConnectionFactory` pede a connection string e recebe o valor pronto, e trocar o mecanismo de segredo não mexe em uma linha do código.

```vbnet
' Infrastructure/ConnectionFactory.vb
Public Module ConnectionFactory
    Public Function Create() As SqlConnection
        Dim connectionString = ConfigurationManager.ConnectionStrings("DefaultConnection").ConnectionString
        Dim connection = New SqlConnection(connectionString)
        Return connection
    End Function
End Module
```

---

<a id="authorize-attribute"></a>

## A autorização é declarada no atributo

Verificar a permissão dentro do corpo da action espalha a mesma sequência de `If` por todo controller, e a action onde alguém esquecer de escrevê-la fica aberta sem que nada acuse. O `<Authorize>` roda antes do corpo da action, e a permissão fica visível na assinatura, onde a revisão do código a enxerga.

<details>
<summary>❌ Ruim: verificação manual de role no corpo</summary>

```vbnet
Public Class OrdersController
    Inherits ApiController

    Public Function DeleteOrder(id As Guid) As IHttpActionResult
        If Not User.IsInRole("admin") AndAlso Not User.IsInRole("manager") Then
            Return StatusCode(HttpStatusCode.Forbidden)
        End If

        _orderService.Delete(id)
        Return StatusCode(HttpStatusCode.NoContent)
    End Function
End Class
```

</details>

<details>
<summary>✅ Bom: atributo declarativo, action sem lógica de autorização</summary>

```vbnet
Public Class OrdersController
    Inherits ApiController

    <Authorize(Roles:="admin,manager")>
    Public Function DeleteOrder(id As Guid) As IHttpActionResult
        _orderService.Delete(id)

        Dim response = StatusCode(HttpStatusCode.NoContent)
        Return response
    End Function
End Class
```

</details>

---

<a id="session-cookies"></a>

## As flags do cookie ficam no Web.config

No .NET Framework, as proteções do cookie de sessão são declaradas uma vez no `Web.config` e valem para a aplicação inteira, sem depender de cada ponto do código lembrar de aplicá-las. O que cada flag protege está em [shared/platform/security.md](../../shared/platform/security.md).

```xml
<!-- Web.config -->
<system.web>
  <httpCookies httpOnlyCookies="true" requireSSL="true" sameSite="Strict" />
  <sessionState timeout="480" cookieless="false" />
</system.web>
```

---

## .gitignore

```gitignore
Web.*.config
!Web.Debug.config
!Web.Release.config
*.pfx
*.key
.env
.env.*
secrets.json
```
