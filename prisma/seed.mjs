import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── 6 Roles ─────────────────────────────────────────────

const ROLES = [
  { name: "REGISTERED_USER", description: "Authenticated customer — can book, write blogs", isSystem: true },
  { name: "MEDIA_UPLOADER", description: "Internal — creates experience drafts, uploads media", isSystem: true },
  { name: "TREK_LEAD", description: "Internal — leads assigned trips on the ground", isSystem: true },
  { name: "TRIP_MANAGER", description: "Internal — manages trip operations and Trek Lead assignments", isSystem: true },
  { name: "ADMIN", description: "Internal — day-to-day platform management", isSystem: true },
  { name: "SUPER_ADMIN", description: "System authority — full access including config and audit", isSystem: true },
];

// ─── Permissions grouped by category ─────────────────────

const PERMISSIONS = [
  { key: "trip:browse", description: "View published experiences", category: "trip" },
  { key: "trip:create", description: "Create experience drafts", category: "trip" },
  { key: "trip:edit", description: "Edit experience details", category: "trip" },
  { key: "trip:publish", description: "Publish or archive experiences", category: "trip" },
  { key: "trip:manage-categories", description: "Add, rename, deactivate categories", category: "trip" },
  { key: "booking:create", description: "Book an experience", category: "booking" },
  { key: "booking:view-own", description: "View own bookings", category: "booking" },
  { key: "booking:view-all", description: "View all bookings", category: "booking" },
  { key: "booking:cancel", description: "Cancel bookings and initiate refunds", category: "booking" },
  { key: "media:upload", description: "Upload media to the library", category: "media" },
  { key: "blog:write", description: "Write and submit blog posts", category: "blog" },
  { key: "blog:moderate", description: "Approve or reject blogs", category: "blog" },
  { key: "user:view-all", description: "View all registered users", category: "user" },
  { key: "user:assign-roles", description: "Assign operational roles", category: "user" },
  { key: "user:assign-admin", description: "Assign Admin and Super Admin roles", category: "user" },
  { key: "user:deactivate", description: "Deactivate user accounts", category: "user" },
  { key: "ops:view-assigned-trips", description: "View assigned trip details", category: "ops" },
  { key: "ops:view-all-trips", description: "View all trip operations", category: "ops" },
  { key: "ops:mark-attendance", description: "Mark attendance on assigned trip", category: "ops" },
  { key: "ops:add-notes", description: "Add operational notes to trips", category: "ops" },
  { key: "ops:upload-expenses", description: "Upload expense documents", category: "ops" },
  { key: "ops:view-expenses", description: "View expense documents", category: "ops" },
  { key: "ops:assign-trek-leads", description: "Assign Trek Leads to trips", category: "ops" },
  { key: "system:config", description: "Access system configuration panel", category: "system" },
  { key: "system:audit-logs", description: "View full audit logs", category: "system" },
  { key: "system:view-payments", description: "View full payment details", category: "system" },
];

// ─── Role → Permission mapping ───────────────────────────

const ROLE_PERMISSIONS = {
  REGISTERED_USER: ["trip:browse", "booking:create", "booking:view-own", "blog:write"],
  MEDIA_UPLOADER: ["trip:browse", "trip:create", "trip:edit", "media:upload"],
  TREK_LEAD: [
    "trip:browse", "media:upload", "ops:view-assigned-trips",
    "ops:mark-attendance", "ops:add-notes", "ops:upload-expenses",
  ],
  TRIP_MANAGER: [
    "trip:browse", "ops:view-all-trips", "ops:add-notes",
    "ops:view-expenses", "ops:assign-trek-leads",
  ],
  ADMIN: [
    "trip:browse", "trip:create", "trip:edit", "trip:publish",
    "trip:manage-categories", "booking:view-all", "booking:cancel",
    "media:upload", "blog:write", "blog:moderate", "user:view-all",
    "user:assign-roles", "user:deactivate", "ops:view-all-trips",
    "ops:add-notes", "ops:view-expenses", "ops:assign-trek-leads",
  ],
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key), // All permissions
};

// ─── Default Categories ──────────────────────────────────

const CATEGORIES = [
  { name: "Trekking", slug: "trekking" },
  { name: "Camping", slug: "camping" },
  { name: "Spiritual", slug: "spiritual" },
  { name: "City Tours", slug: "city-tours" },
  { name: "Corporate", slug: "corporate" },
  { name: "Water Sports", slug: "water-sports" },
];

// ─── Seed Function ───────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Categories
  console.log("📂 Creating categories...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    console.log(`   ✓ ${cat.name}`);
  }

  // 2. Roles
  console.log("\n📌 Creating roles...");
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    console.log(`   ✓ ${role.name}`);
  }

  // 3. Permissions
  console.log("\n🔑 Creating permissions...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, category: perm.category },
      create: perm,
    });
    console.log(`   ✓ ${perm.key}`);
  }

  // 4. Link Roles → Permissions
  console.log("\n🔗 Linking role permissions...");
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    // Clear existing links for this role
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) {
        console.log(`   ⚠ Permission not found: ${key}`);
        continue;
      }
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`   ✓ ${roleName} → ${permKeys.length} permissions`);
  }

  // 5. Bootstrap Super Admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    console.log("\n👤 Bootstrapping Super Admin...");
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
    });

    if (superAdminRole) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: { roleId: superAdminRole.id },
        create: {
          email: adminEmail,
          password: hashedPassword,
          name: "System Super Admin",
          roleId: superAdminRole.id,
          isVerified: true,
        },
      });
      console.log(`   ✓ Super Admin created/updated: ${adminEmail}`);
    }
  } else {
    console.log("\n⚠ ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping Super Admin bootstrap.");
  }

  console.log("\n✅ Seed complete!");
}

try {
  await seed();
} catch (e) {
  console.error("❌ Seed failed:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
