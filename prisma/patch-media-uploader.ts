import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const roleName = "MEDIA_UPLOADER";
const permKey = "blog:moderate";

const role = await prisma.role.findUnique({ where: { name: roleName } });
if (!role) throw new Error(`Role ${roleName} not found`);

const perm = await prisma.permission.findUnique({ where: { key: permKey } });
if (!perm) throw new Error(`Permission ${permKey} not found`);

const existing = await prisma.rolePermission.findFirst({
  where: { roleId: role.id, permissionId: perm.id },
});

if (existing) {
  console.log(`✓ ${roleName} already has ${permKey} — nothing to do.`);
} else {
  await prisma.rolePermission.create({
    data: { roleId: role.id, permissionId: perm.id },
  });
  console.log(`✅ Added ${permKey} to ${roleName}`);
}

await prisma.$disconnect();
await pool.end();
