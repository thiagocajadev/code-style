# Security

> Escopo: VB.NET (setup). Princípios transversais em [shared/platform/security.md](../../shared/platform/security.md).

Esta página cobre apenas o que é específico do .NET Framework 4.8 (Web **API** (Application Programming Interface, Interface de Programação de Aplicações) 2 / ASP.NET **MVC** (Model-View-Controller, Modelo-Visão-Controle) 5 / Windows Forms): onde colocar o quê, quais ferramentas do ecossistema usar. As regras conceituais (segredos fora do repositório, validação no servidor, HttpOnly + Secure + SameSite) vivem em [shared/platform/security.md](../../shared/platform/security.md) e não são repetidas aqui.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Config** (configuração) | Valor não sensível que muda entre ambientes, em `Web.config` ou `App.config` |
| **Secret** (segredo) | Credencial ou chave; fica em seção criptografada via `aspnet_regiis`, nunca commitada |
| **API** (Application Programming Interface, Interface de Programação de Aplicações) | Superfície HTTP (Web API 2) sujeita a autenticação e CORS |
| **MVC** (Model-View-Controller, Modelo-Visão-Controle) | Pipeline ASP.NET MVC 5 com filtros de autorização e antiforgery tokens |
| **CI/CD** (Continuous Integration and Continuous Delivery, Integração e Entrega Contínuas) | Pipeline que aplica transforms de `Web.Release.config` e injeta secrets no deploy |

---

## Onde cada coisa vai

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Config base não sensível (commitado) | `Web.config` | URLs, timeouts, limites, feature flags |
| Override por ambiente | `Web.Release.config` transform | Tokens substituídos no pipeline de release |
| Secrets em máquina específica | Seção criptografada via `aspnet_regiis` | Chave DPAPI da máquina ou do farm |
| Secrets em staging/produção | Variáveis injetadas pelo IIS / pipeline | Connection strings reais |

O `Web.config` commitado nunca contém o valor real de um segredo. Ou fica vazio (token substituído no publish) ou fica criptografado (seção resolvida pela chave da máquina).

---

## Web.config transforms

`Web.Release.config` sobrescreve valores durante o publish. O pipeline de **CI/CD** (Continuous Integration and Continuous Delivery, Integração e Entrega Contínuas) (Azure DevOps, Octopus) substitui tokens pelas variáveis de release sem commitar o valor real.

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

O token `#{DefaultConnection}#` é resolvido no momento do publish pela variável de release correspondente.

---

## Criptografia de seção com aspnet_regiis

Para ambientes onde variáveis de ambiente não são viáveis (hosting gerenciado, deploy manual), `aspnet_regiis` criptografa seções do `Web.config` usando a chave da máquina. O arquivo commitado fica ilegível sem a chave do servidor.

```cmd
rem criptografar
aspnet_regiis -pef "connectionStrings" "C:\inetpub\wwwroot\MyApp"

rem descriptografar (para manutenção)
aspnet_regiis -pdf "connectionStrings" "C:\inetpub\wwwroot\MyApp"
```

> [!NOTE]
> A seção criptografada por DPAPI padrão é específica da máquina. Para portabilidade entre máquinas do mesmo farm, usar o provider `DataProtectionConfigurationProvider` com container compartilhado.

---

## Leitura de configuração

`ConfigurationManager` resolve a configuração consolidada (`Web.config` + transform + seção criptografada decifrada em runtime). O código consome o valor final sem conhecer a origem.

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

## Autorização com atributo

Checar permissões dentro da action duplica lógica. `<Authorize>` declarado na controller ou action garante cobertura uniforme antes de qualquer código executar.

<details>
<summary>❌ Ruim — verificação manual de role no corpo</summary>
<br>

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

<br>

<details>
<summary>✅ Bom — atributo declarativo, action sem lógica de autorização</summary>
<br>

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

## Cookies de sessão

Flags de segurança de cookie no .NET Framework são configuradas globalmente no `Web.config`, valem para toda a aplicação. Ver [shared/platform/security.md](../../shared/platform/security.md) para o racional de cada flag.

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
