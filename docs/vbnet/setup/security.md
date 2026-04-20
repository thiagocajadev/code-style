# Security

> [!NOTE]
> Segurança é sempre prioridade em qualquer projeto. Os exemplos abaixo cobrem .NET Framework 4.8 (Web API 2 / ASP.NET MVC 5 / Windows Forms). Conforme as tecnologias evoluem, alguns detalhes podem ficar desatualizados — o que importa é o princípio por trás de cada prática.

## Nunca hardcode segredos

Segredos (connection strings, API keys, senhas) nunca ficam no código-fonte. Um secret no repositório é um secret comprometido, mesmo que removido depois: o histórico do git preserva tudo.

<details>
<summary>❌ Bad — segredo hardcoded no código</summary>
<br>

```vbnet
Public Module ConnectionFactory
    Public Function Create() As SqlConnection
        ' exposto no repositório
        Return New SqlConnection("Server=prod-db;Database=App;User=sa;Password=Abc123!")
    End Function
End Module
```

</details>

<br>

<details>
<summary>❌ Bad — segredo em Web.config commitado</summary>
<br>

```xml
<!-- Web.config — commitado com credenciais reais -->
<connectionStrings>
  <add name="DefaultConnection"
       connectionString="Server=prod-db;Database=App;User=sa;Password=Abc123!"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

</details>

<br>

<details>
<summary>✅ Good — segredo lido via ConfigurationManager, valor injetado pelo ambiente</summary>
<br>

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

```xml
<!-- Web.config — placeholder sem credencial real -->
<connectionStrings>
  <add name="DefaultConnection"
       connectionString=""
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

</details>

## O que vai em Web.config

`Web.config` é commitado no repositório: só recebe configuração não sensível. Segredos entram via Web.config transforms por ambiente ou variáveis de ambiente injetadas pelo IIS.

| Pode commitar | Nunca commitar |
| --- | --- |
| URLs de serviços (sem credenciais) | Connection strings com senha |
| Nomes de seções e chaves | API keys e tokens |
| Feature flags | Credenciais de terceiros |
| Timeouts e limites | Qualquer valor com `Password`, `Secret`, `Key`, `Token` |

<details>
<summary>✅ Good — Web.config com configuração não sensível</summary>
<br>

```xml
<!-- Web.config -->
<appSettings>
  <add key="Smtp:Host" value="smtp.company.com" />
  <add key="Smtp:Port" value="587" />
  <add key="Auth:Authority" value="https://login.microsoftonline.com/tenant-id" />
  <add key="Queue:MaxRetries" value="3" />
</appSettings>

<connectionStrings>
  <add name="DefaultConnection" connectionString="" providerName="System.Data.SqlClient" />
</connectionStrings>
```

</details>

## Web.config transforms: segredos por ambiente

`Web.Release.config` sobrescreve valores de `Web.config` durante o publish. Use para injetar connection strings e segredos que variam por ambiente — sem commitar o valor real.

<details>
<summary>✅ Good — transform injeta a connection string real no publish</summary>
<br>

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

O token `#{DefaultConnection}#` é substituído pelo pipeline de CI/CD (Azure DevOps, Octopus, etc.) na variável de release — nunca o valor real no repositório.

</details>

## Criptografia de seção no Web.config

Para ambientes onde variáveis de ambiente não são viáveis, `aspnet_regiis` criptografa seções do `Web.config` usando a chave da máquina. O arquivo commitado fica ilegível sem a chave do servidor.

```cmd
rem criptografar a seção connectionStrings no site físico
aspnet_regiis -pef "connectionStrings" "C:\inetpub\wwwroot\MyApp"

rem descriptografar (para manutenção)
aspnet_regiis -pdf "connectionStrings" "C:\inetpub\wwwroot\MyApp"
```

> [!NOTE]
> A seção criptografada é específica da máquina/servidor. Use DPAPI (provider `DataProtectionConfigurationProvider`) para portabilidade entre máquinas do mesmo farm.

## Autorização com atributo

Checar permissões manualmente em cada action duplica lógica e cria brechas quando um handler esquece a verificação. `[Authorize]` declarado na controller ou action garante cobertura uniforme antes de qualquer código executar.

<details>
<summary>❌ Bad — verificação manual de role dentro da action</summary>
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
<summary>✅ Good — [Authorize] declarativo, action sem lógica de autorização</summary>
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

## Cookie de sessão

Cookies sem flags de segurança são vetores para XSS e CSRF. Configure `httpOnlyCookies` e `requireSSL` no `Web.config` — valem para toda a aplicação.

<details>
<summary>❌ Bad — cookies sem flags de segurança</summary>
<br>

```xml
<!-- Web.config — sem httpOnly nem requireSSL -->
<system.web>
  <sessionState timeout="480" />
</system.web>
```

</details>

<br>

<details>
<summary>✅ Good — httpOnly e requireSSL habilitados globalmente</summary>
<br>

```xml
<!-- Web.config -->
<system.web>
  <httpCookies httpOnlyCookies="true" requireSSL="true" sameSite="Strict" />
  <sessionState timeout="480" cookieless="false" />
</system.web>
```

</details>

## .gitignore: linha de defesa local

Mesmo com transforms e variáveis de ambiente, uma linha no `.gitignore` evita acidentes:

```gitignore
# segredos e sobreposições locais
Web.*.config
!Web.Debug.config
!Web.Release.config
*.pfx
*.key
.env
.env.*
secrets.json
```
