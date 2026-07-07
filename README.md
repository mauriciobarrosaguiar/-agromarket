# AgroMarket

Marketplace Agro independente em formato **site + app PWA instalável**, feito com **Next.js + Vercel + Supabase**.

## O que já vem pronto

- Home mobile first
- Listagem de anúncios
- Detalhe do anúncio
- Botão WhatsApp
- Login e cadastro via Supabase Auth
- Criar anúncio
- Upload de fotos no Supabase Storage
- Painel do anunciante
- Painel admin
- Aprovar/recusar anúncios
- Categorias
- PWA instalável no celular

## 1. Instalar

```bash
npm install
npm run dev
```

Abra:

```bash
http://localhost:3000
```

## 2. Criar o projeto no Supabase

1. Crie um projeto no Supabase.
2. Vá em **SQL Editor**.
3. Rode o arquivo:

```bash
supabase/schema.sql
```

4. Vá em **Storage** e confirme se o bucket `agromarket` foi criado.

## 3. Configurar variáveis

Crie `.env.local` copiando `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_SUPORTE=5563999999999
```

## 4. Criar o primeiro admin

Depois de cadastrar seu usuário pelo site, rode no Supabase SQL Editor:

```sql
update usuarios
set tipo_usuario = 'admin'
where email = 'SEU_EMAIL_AQUI';
```

## 5. Publicar na Vercel

1. Suba este projeto para o GitHub.
2. Importe na Vercel.
3. Adicione as variáveis de ambiente.
4. Deploy.

## Rotas principais

- `/` — Home
- `/anuncios` — Buscar anúncios
- `/anuncio/[slug]` — Detalhe do anúncio
- `/anunciar` — Criar anúncio
- `/login` — Login
- `/cadastro` — Cadastro
- `/painel` — Painel do anunciante
- `/admin` — Painel admin

## Observação

Este projeto é um MVP funcional para começar. Pagamentos, planos, push notification e publicação Play Store podem entrar depois.
