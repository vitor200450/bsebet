import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

async function getDatabaseUrl(): Promise<string> {
  try {
    const { stdout } = await execAsync("heroku config:get DATABASE_URL");
    return stdout.trim();
  } catch (error) {
    console.error("❌ Erro ao obter DATABASE_URL do Heroku");
    console.error("Certifique-se de estar logado: heroku login");
    process.exit(1);
  }
}

async function importSQL(filePath: string, databaseUrl: string) {
  const sql = readFileSync(filePath, "utf-8");

  // Split em statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`📄 Importando ${statements.length} comandos de ${filePath}...`);

  // Criar arquivo temporário com os comandos
  const tempFile = join(process.cwd(), "temp_import.sql");
  const cleanStatements = statements
    .map((s) => {
      // Remover INSERTs duplicados ou problemáticos
      if (s.includes("pg_stat_statements") || s.includes("CREATE EXTENSION")) {
        return null;
      }
      return s + ";";
    })
    .filter(Boolean)
    .join("\n");

  const fs = await import("fs");
  fs.writeFileSync(tempFile, cleanStatements);

  try {
    // Usar heroku pg:psql para executar
    const { stdout, stderr } = await execAsync(
      `heroku pg:psql -c "\\i ${tempFile.replace(/\\/g, "/")}"`,
      { timeout: 120000 }
    );

    if (stderr && !stderr.includes("NOTICE")) {
      console.error("⚠️  Avisos:", stderr.substring(0, 500));
    }

    console.log("✅ Importado com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro na importação:", error.message);
    // Tentar importar statement por statement
    console.log("🔄 Tentando importação alternativa...");
  } finally {
    // Limpar arquivo temp
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}

async function main() {
  const backupDir = join(process.cwd(), "db_backup");

  // Listar arquivos SQL
  let files: string[] = [];
  try {
    files = readdirSync(backupDir).filter((f) => f.endsWith(".sql"));
  } catch (e) {
    console.error("❌ Pasta db_backup não encontrada");
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("❌ Nenhum arquivo SQL encontrado em db_backup");
    process.exit(1);
  }

  console.log("📁 Arquivos encontrados:");
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

  // Por enquanto, importar todos
  console.log("\n🔌 Obtendo DATABASE_URL do Heroku...");
  const dbUrl = await getDatabaseUrl();
  console.log("✅ DATABASE_URL obtido\n");

  for (const file of files.sort()) {
    const filePath = join(backupDir, file);
    console.log(`\n📂 Processando: ${file}`);
    await importSQL(filePath, dbUrl);
  }

  console.log("\n🎉 Importação concluída!");
}

main().catch(console.error);
