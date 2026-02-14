# Configuração do Cloudflare R2 para Logos

## Por que R2?

| Recurso | R2 | S3 | Supabase Storage |
|---------|----|----|------------------|
| **Storage Grátis** | 10GB | 5GB | 1GB |
| **Egress Fees** | **$0** | $0.09/GB | $0.09/GB |
| **CDN** | Global (Cloudflare) | CloudFront extra | Global |
| **Integração** | Nativa com Workers | AWS | Supabase |

**R2 é a melhor opção**: Zero egress fees + CDN global gratuito.

---

## Passo 1: Criar Bucket no R2

1. Acesse o [Dashboard do Cloudflare](https://dash.cloudflare.com)
2. Vá em **R2 Object Storage**
3. Clique em **"Create bucket"**
4. Nome: `bsebet-logos`
5. Região: **Automatic (recommended)**
6. Clique **"Create bucket"**

---

## Passo 2: Configurar Acesso Público

### Opção A: Custom Domain (Recomendado)

1. No bucket, vá em **"Settings"**
2. Em **"Public access"**, clique **"Connect domain"**
3. Digite: `logos.bsebet.com`
4. Siga as instruções de DNS
5. Aguarde propagação (até 5 minutos)

### Opção B: Public Access via R2.dev

1. No bucket, vá em **"Settings"**
2. Em **"Public access"**, ative **"Allow public access"**
3. Use a URL fornecida: `https://pub-xxx.r2.dev`

---

## Passo 3: Criar API Token

1. Vá em **Manage R2 API Tokens**
2. Clique **"Create API token"**
3. Configure:
   - **Token name**: `bsebet-logos-upload`
   - **Permissions**: `Object Read & Write`
   - **Bucket**: `bsebet-logos` (específico)
4. Clique **"Create API Token"**
5. **Copie e guarde**:
   - Access Key ID
   - Secret Access Key

---

## Passo 4: Configurar .env.production

Adicione ao seu `.env.production`:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=seu_access_key_aqui
R2_SECRET_ACCESS_KEY=seu_secret_key_aqui
R2_BUCKET_NAME=bsebet-logos
R2_PUBLIC_URL=https://logos.bsebet.com
```

**Onde encontrar o Account ID?**
- No dashboard do Cloudflare, canto inferior direito
- Ou em **Workers & Pages** → **Account details**

---

## Passo 5: Instalar Dependências

```bash
cd apps/web
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Passo 6: Migrar Logos Existentes

```bash
# Configura as variáveis de ambiente
set R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
set R2_ACCESS_KEY_ID=seu_access_key
set R2_SECRET_ACCESS_KEY=seu_secret_key
set R2_BUCKET_NAME=bsebet-logos
set R2_PUBLIC_URL=https://logos.bsebet.com

# Executa a migração
bun run scripts/migrate-logos-to-r2.ts
```

---

## Uso no Código

### Upload de Logo:
```typescript
import { uploadTeamLogo } from "../server/logos";

// Upload com Base64 (converte automaticamente para R2)
const { logoUrl } = await uploadTeamLogo({
  data: {
    teamId: 1,
    logoUrl: "data:image/png;base64,iVBORw0KGgo..."
  }
});
// Retorna: { logoUrl: "https://logos.bsebet.com/teams/1/logo.png" }
```

### Componente React:
```tsx
import { TeamLogo } from "../components/TeamLogo";

<TeamLogo
  teamId={team.id}
  teamName={team.name}
  logoUrl={team.logoUrl} // URL do R2
  size="md"
/>
```

---

## Estrutura de Pastas no R2

```
bsebet-logos/
├── teams/
│   ├── 1/
│   │   └── logo.png
│   ├── 2/
│   │   └── logo.png
│   └── ...
└── tournaments/
    ├── 1/
    │   └── logo.png
    └── ...
```

---

## Troubleshooting

### Erro: "Access denied"
- Verifique se o token tem permissão `Object Read & Write`
- Confirme se o bucket name está correto

### Erro: "Endpoint not found"
- Verifique se o `R2_ENDPOINT` está correto
- Formato: `https://<account-id>.r2.cloudflarestorage.com`

### Logos não aparecem
- Verifique se a URL pública está acessível
- Teste: `curl https://logos.bsebet.com/teams/1/logo.png`

---

## Monitoramento

No dashboard do R2:
- **Metrics**: Acesso e egress
- **Object counts**: Número de logos
- **Storage used**: Espaço utilizado

## Próximo Passo

Após configurar o R2, execute:
```bash
bun run scripts/migrate-logos-to-r2.ts
```

Isso migrará todas as logos Base64 do banco para o R2!
