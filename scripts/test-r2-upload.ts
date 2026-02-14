/**
 * Teste simples de upload para R2
 * Não requer conexão com banco de dados
 */

import { config } from "dotenv";
config({ path: ".env.production" });

import { uploadLogoToR2, getTeamLogoKey } from "../apps/web/src/server/r2";

async function testUpload() {
  console.log("🧪 Testando upload para R2...\n");

  // Verifica variáveis
  const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"];
  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error("❌ Variáveis ausentes:", missing.join(", "));
    process.exit(1);
  }

  console.log("✅ Variáveis configuradas");
  console.log(`   Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${process.env.R2_PUBLIC_URL}\n`);

  // Cria uma imagem PNG simples em base64 (1x1 pixel transparente)
  const base64Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
  const buffer = Buffer.from(base64Png.split(",")[1], "base64");

  try {
    const key = getTeamLogoKey(999, "png");
    console.log(`📤 Fazendo upload para: ${key}`);

    const { publicUrl } = await uploadLogoToR2(key, buffer, "image/png");

    console.log(`\n✅ Upload bem-sucedido!`);
    console.log(`   URL: ${publicUrl}`);
    console.log(`\n📝 Teste a URL no navegador para confirmar.`);
  } catch (error) {
    console.error("\n❌ Erro no upload:", error);
    process.exit(1);
  }
}

testUpload();
