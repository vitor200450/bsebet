# Opções de Configuração do R2 (Domínio Não-Cloudflare)

Como seu domínio `bsebfantasy.me` não está registrado na Cloudflare, você tem **3 opções**:

---

## Opção 1: URL Pública do R2 (Recomendada - Mais Rápida)

Use a URL pública gratuita que o R2 fornece. **Não precisa configurar DNS!**

### Como funciona:
1. Crie o bucket no R2
2. Ative "Public Access"
3. O R2 gera uma URL: `https://pub-xxx.r2.dev`
4. Use essa URL diretamente

### Vantagens:
- ✅ Rápido (5 minutos)
- ✅ Funciona imediatamente
- ✅ CDN global incluso
- ✅ Zero configuração DNS

### Desvantagens:
- ❌ URL não é personalizada (ex: `pub-abc123.r2.dev`)

### Configuração:
```env
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## Opção 2: Subdomínio no Seu DNS Atual (Recomendada - Profissional)

Configure um subdomínio `logos.bsebfantasy.me` no seu DNS atual apontando para o R2.

### Como funciona:
1. Crie o bucket no R2
2. No painel do seu DNS (Registro.br, GoDaddy, etc), crie um CNAME:
   - Nome: `logos`
   - Valor: `https://<account-id>.r2.cloudflarestorage.com` (ou o pub-xxx.r2.dev)
3. Use: `https://logos.bsebfantasy.me`

### Vantagens:
- ✅ URL personalizada
- ✅ Profissional
- ✅ Mantém sua marca

### Desvantagens:
- ⚠️ Requer acesso ao painel DNS
- ⚠️ Propagação pode levar até 24h

### Configuração:
```env
R2_PUBLIC_URL=https://logos.bsebfantasy.me
```

---

## Opção 3: Transferir Domínio para Cloudflare (Mais Completa)

Transfira o `bsebfantasy.me` para a Cloudflare para gerenciamento completo.

### Como funciona:
1. Crie conta no Cloudflare
2. Adicione seu domínio (importa os DNS automaticamente)
3. Troque os nameservers no Registro.br/GoDaddy
4. Configure o R2 com domínio customizado

### Vantagens:
- ✅ Integração completa
- ✅ DNS mais rápido
- ✅ SSL automático
- ✅ Proteção DDoS

### Desvantagens:
- ⚠️ Requer transferir nameservers
- ⚠️ Pode levar 24-48h para propagar
- ⚠️ Mudança de infraestrutura

---

## Recomendação

Para começar **agora**:

1. **Use a Opção 1** (URL pública do R2)
2. Configure e teste tudo
3. Depois, se quiser, migre para Opção 2 ou 3

Isso permite que você resolva o problema do egress imediatamente!

---

## Passos para Opção 1 (URL Pública)

1. Acesse https://dash.cloudflare.com
2. Crie uma conta (grátis)
3. Vá em **R2 Object Storage**
4. Clique **"Create bucket"**
5. Nome: `bsebet-logos`
6. Depois de criar, vá em **Settings** do bucket
7. Ative **"Public Access"**
8. Copie a URL fornecida (ex: `https://pub-abc123.r2.dev`)
9. Cole no `.env.production`:
   ```env
   R2_PUBLIC_URL=https://pub-abc123.r2.dev
   ```

Pronto! Suas logos estarão acessíveis via CDN global sem custo de egress.
