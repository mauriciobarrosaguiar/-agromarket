# Templates de e-mail do AgroMarket no Supabase

Use estes modelos em Supabase > Authentication > Email Templates.

## Configuração obrigatória de URL

Em Authentication > URL Configuration:

- Site URL: `https://agromarket-two.vercel.app`
- Redirect URLs:
  - `https://agromarket-two.vercel.app/**`
  - `https://agromarket.mbalabs.com.br/**` quando o subdomínio estiver ativo
  - `http://localhost:3000/**` somente para desenvolvimento

Quando o domínio oficial entrar, trocar o Site URL para:

`https://agromarket.mbalabs.com.br`

## Confirmation signup

Subject:

```text
Confirme seu cadastro no AgroMarket
```

HTML:

```html
<div style="font-family: Arial, Helvetica, sans-serif; background:#f7f8f4; padding:24px; color:#17220f;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e3e8dc; border-radius:20px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#052e16,#166534); color:#ffffff; padding:24px;">
      <div style="font-size:14px; font-weight:700; opacity:.9;">AgroMarket</div>
      <h1 style="margin:8px 0 0; font-size:28px; line-height:1.1;">Confirme seu e-mail</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:16px; line-height:1.5; color:#42503b;">Olá! Para finalizar seu cadastro no AgroMarket, confirme seu endereço de e-mail clicando no botão abaixo.</p>
      <p style="margin:26px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#166534; color:#ffffff; padding:14px 20px; border-radius:14px; text-decoration:none; font-weight:800;">Confirmar e-mail</a>
      </p>
      <p style="font-size:14px; line-height:1.5; color:#66715d;">Se você não criou uma conta no AgroMarket, ignore este e-mail.</p>
      <hr style="border:0; border-top:1px solid #e3e8dc; margin:24px 0;">
      <p style="font-size:13px; color:#66715d; margin:0;">AgroMarket • Divulgação de produtos agro, animais, serviços rurais, máquinas e oportunidades.</p>
    </div>
  </div>
</div>
```

## Recovery password

Subject:

```text
Redefina sua senha do AgroMarket
```

HTML:

```html
<div style="font-family: Arial, Helvetica, sans-serif; background:#f7f8f4; padding:24px; color:#17220f;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e3e8dc; border-radius:20px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#052e16,#166534); color:#ffffff; padding:24px;">
      <div style="font-size:14px; font-weight:700; opacity:.9;">AgroMarket</div>
      <h1 style="margin:8px 0 0; font-size:28px; line-height:1.1;">Redefinir senha</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:16px; line-height:1.5; color:#42503b;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.</p>
      <p style="margin:26px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#166534; color:#ffffff; padding:14px 20px; border-radius:14px; text-decoration:none; font-weight:800;">Redefinir senha</a>
      </p>
      <p style="font-size:14px; line-height:1.5; color:#66715d;">Se você não solicitou essa alteração, ignore este e-mail.</p>
      <hr style="border:0; border-top:1px solid #e3e8dc; margin:24px 0;">
      <p style="font-size:13px; color:#66715d; margin:0;">AgroMarket • Suporte pelo WhatsApp oficial.</p>
    </div>
  </div>
</div>
```

## Melhor credibilidade do remetente

Para tirar o remetente genérico do Supabase, configure em Authentication > SMTP Settings um provedor SMTP usando um e-mail do domínio, por exemplo:

- Remetente: `suporte@mbalabs.com.br`
- Nome do remetente: `AgroMarket`

Também é necessário configurar SPF/DKIM/DMARC no DNS do domínio conforme o provedor de e-mail escolhido.
