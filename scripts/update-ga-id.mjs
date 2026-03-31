import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const key = "google_analytics_id";
  const value = "G-BH4J7TH100";
  
  console.log(`📡 Updating ${key} to ${value}...`);
  
  const setting = await prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, description: "G-XXXXXX Tracking ID" }
  });
  
  console.log("✅ Successfully updated database:", setting);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
