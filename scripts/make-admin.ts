import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function run() {
  const cats = await prisma.category.findMany();
  console.log("Categories found:", cats.length);
  if (cats.length > 0) {
    console.log(cats.map((c) => c.name).join(", "));
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (adminRole) {
    const res = await prisma.user.updateMany({
      where: { email: "test@param.dev" },
      data: { roleId: adminRole.id },
    });
    console.log(`Updated ${res.count} users to ADMIN role`);
  } else {
    console.log("No ADMIN role found?");
  }
}

try {
  await run();
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
