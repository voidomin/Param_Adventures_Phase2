import "dotenv/config";

// ─── Production Safety Guard ─────────────────────────────
if (process.env.NODE_ENV === "production" && !process.env.FORCE_SEED) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "🚨 CRITICAL ERROR: Seeding is disabled in production environments.",
  );
  console.log("If you absolutely need to seed, set FORCE_SEED=true.");
  process.exit(1);
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

// Reuse existing prisma instance if possible, or create new one
let prisma;

/**
 * Initializes the prisma client for seeding.
 * @param {import('@prisma/client').PrismaClient} [existingPrisma]
 */
export async function initPrisma(existingPrisma) {
  if (existingPrisma) {
    prisma = existingPrisma;
    return prisma;
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  return prisma;
}

// ─── ROLES & PERMISSIONS ──────────────────────────────────

const ROLES = [
  {
    name: "REGISTERED_USER",
    description: "Authenticated customer",
    isSystem: true,
  },
  {
    name: "MEDIA_UPLOADER",
    description: "Creates experience drafts",
    isSystem: true,
  },
  {
    name: "TREK_LEAD",
    description: "Leads assigned trips on the ground",
    isSystem: true,
  },
  {
    name: "TRIP_MANAGER",
    description: "Manages trip operations",
    isSystem: true,
  },
  {
    name: "ADMIN",
    description: "Day-to-day platform management",
    isSystem: true,
  },
  { name: "SUPER_ADMIN", description: "Full system access", isSystem: true },
];

const PERMISSIONS = [
  {
    key: "trip:browse",
    description: "View published experiences",
    category: "trip",
  },
  {
    key: "trip:create",
    description: "Create experience drafts",
    category: "trip",
  },
  {
    key: "trip:edit",
    description: "Edit experience details",
    category: "trip",
  },
  {
    key: "trip:publish",
    description: "Publish or archive experiences",
    category: "trip",
  },
  {
    key: "trip:manage-categories",
    description: "Add, rename, deactivate categories",
    category: "trip",
  },
  {
    key: "booking:create",
    description: "Book an experience",
    category: "booking",
  },
  {
    key: "booking:view-own",
    description: "View own bookings",
    category: "booking",
  },
  {
    key: "booking:view-all",
    description: "View all bookings",
    category: "booking",
  },
  {
    key: "booking:cancel",
    description: "Cancel bookings",
    category: "booking",
  },
  {
    key: "media:upload",
    description: "Upload media to the library",
    category: "media",
  },
  {
    key: "blog:write",
    description: "Write and submit blog posts",
    category: "blog",
  },
  {
    key: "blog:moderate",
    description: "Approve or reject blogs",
    category: "blog",
  },
  {
    key: "user:view-all",
    description: "View all registered users",
    category: "user",
  },
  {
    key: "user:assign-roles",
    description: "Assign operational roles",
    category: "user",
  },
  {
    key: "user:assign-admin",
    description: "Assign Admin and Super Admin roles",
    category: "user",
  },
  {
    key: "user:deactivate",
    description: "Deactivate user accounts",
    category: "user",
  },
  {
    key: "ops:view-assigned-trips",
    description: "View assigned trip details",
    category: "ops",
  },
  {
    key: "ops:view-all-trips",
    description: "View all trip operations",
    category: "ops",
  },
  {
    key: "ops:mark-attendance",
    description: "Mark attendance on assigned trip",
    category: "ops",
  },
  {
    key: "ops:add-notes",
    description: "Add operational notes to trips",
    category: "ops",
  },
  {
    key: "ops:upload-expenses",
    description: "Upload expense documents",
    category: "ops",
  },
  {
    key: "ops:view-expenses",
    description: "View expense documents",
    category: "ops",
  },
  {
    key: "ops:assign-trek-leads",
    description: "Assign Trek Leads to trips",
    category: "ops",
  },
  {
    key: "system:config",
    description: "Access system configuration",
    category: "system",
  },
  {
    key: "system:audit-logs",
    description: "View full audit logs",
    category: "system",
  },
  {
    key: "system:view-payments",
    description: "View full payment details",
    category: "system",
  },
];

const ALL_PERM_KEYS = PERMISSIONS.map((p) => p.key);

const ROLE_PERMISSIONS = {
  REGISTERED_USER: [
    "trip:browse",
    "booking:create",
    "booking:view-own",
    "blog:write",
  ],
  MEDIA_UPLOADER: ["trip:browse", "trip:create", "trip:edit", "media:upload"],
  TREK_LEAD: [
    "trip:browse",
    "media:upload",
    "ops:view-assigned-trips",
    "ops:mark-attendance",
    "ops:add-notes",
    "ops:upload-expenses",
  ],
  TRIP_MANAGER: [
    "trip:browse",
    "ops:view-all-trips",
    "ops:add-notes",
    "ops:view-expenses",
    "ops:assign-trek-leads",
  ],
  ADMIN: [
    "trip:browse",
    "trip:create",
    "trip:edit",
    "trip:publish",
    "trip:manage-categories",
    "booking:view-all",
    "booking:cancel",
    "media:upload",
    "blog:write",
    "blog:moderate",
    "user:view-all",
    "user:assign-roles",
    "user:deactivate",
    "ops:view-all-trips",
    "ops:add-notes",
    "ops:view-expenses",
    "ops:assign-trek-leads",
  ],
  SUPER_ADMIN: ALL_PERM_KEYS,
};

const DEFAULT_SUPER_ADMINS = [
  { email: "paramadventures@zohomail.in", name: "Param Adventures" },
  { email: "booking@paramadventures.in", name: "Param Adventures Bookings" },
  { email: "dev@paramadventures.in", name: "Param Dev" },
  { email: "info@paramadventures.in", name: "Param Info" },
];

function formatNameFromEmail(email) {
  const local = email.split("@")[0] || "Super Admin";
  return local
    .replaceAll(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveSeedAdmins() {
  const singleAdmin = (process.env.ADMIN_EMAIL || "").trim();
  const csvAdmins = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueEmails = [
    ...new Set([...(singleAdmin ? [singleAdmin] : []), ...csvAdmins]),
  ];

  if (uniqueEmails.length > 0) {
    return uniqueEmails.map((email) => ({
      email,
      name: formatNameFromEmail(email),
    }));
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEFAULT_SUPER_ADMINS !== "true"
  ) {
    throw new Error(
      "Production seed requires ADMIN_EMAIL or SUPER_ADMIN_EMAILS. Set ALLOW_DEFAULT_SUPER_ADMINS=true only if you intentionally want default seeded admin emails.",
    );
  }

  return DEFAULT_SUPER_ADMINS;
}

export async function seedRolesAndPermissions() {
  console.log("📌 Seeding roles & permissions...");
  for (const roleData of ROLES) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
      create: roleData,
    });
  }
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: perm,
    });
  }
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (perm)
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
    }
  }
  console.log("   ✓ Done");
}

// ─── CATEGORIES ───────────────────────────────────────────

const CATEGORIES = [
  { name: "Trekking", slug: "trekking", icon: "Mountain" },
  { name: "Camping", slug: "camping", icon: "Tent" },
  { name: "Spiritual", slug: "spiritual", icon: "Sunrise" },
  { name: "City Tours", slug: "city-tours", icon: "Building2" },
  { name: "Corporate", slug: "corporate", icon: "Briefcase" },
  { name: "Water Sports", slug: "water-sports", icon: "Waves" },
];

export async function seedCategories() {
  console.log("📂 Seeding categories...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log("   ✓ Done");
}

// ─── INITIAL ADMIN ────────────────────────────────────────

export async function seedAdmin() {
  const admins = resolveSeedAdmins();
  console.log(`👤 Seeding ${admins.length} super admin(s)...`);

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });
  if (!superAdminRole) {
    console.error("❌ ERROR: SUPER_ADMIN role not found.");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const admin of admins) {
    // Generate a secure reset token for initial setup
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        name: admin.name,
        roleId: superAdminRole.id,
        isVerified: true,
      },
      create: {
        email: admin.email,
        name: admin.name,
        roleId: superAdminRole.id,
        isVerified: true,
        phoneNumber: "+91-0000000000",
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry,
        gender: "Other",
        age: 30,
      },
    });

    const setupLink = `${baseUrl}/reset-password?token=${resetToken}`;
    console.log(`   ✓ Admin: ${admin.email}`);
    console.log(`     Setup Link: ${setupLink}`);

    // Automated Invite Email (if configured)
    if (
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SEND_INVITES === "true"
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.zoho.in",
          port: Number.parseInt(process.env.SMTP_PORT || "465"),
          secure: Number.parseInt(process.env.SMTP_PORT || "465") === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from:
            process.env.SMTP_FROM ||
            `"Param Adventures" <${process.env.SMTP_USER}>`,
          to: admin.email,
          subject: "Welcome to Param Adventures Admin Team! 🚀",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #4F46E5;">Welcome to the Team! 🏔️</h1>
              <p>Hello ${admin.name},</p>
              <p>The Param Adventures platform has been deployed and you've been assigned <strong>Super Admin</strong> access.</p>
              <p>To get started, please click the link below to set your account password:</p>
              <a href="${setupLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Your Password →</a>
              <p style="margin-top: 30px; font-size: 12px; color: #666;">This link is unique to your account and will expire in 7 days.</p>
            </div>
          `,
        });
        console.log(`     ✉️  Invite sent to ${admin.email}`);
      } catch (err) {
        console.error(
          `     ❌ Failed to send invite to ${admin.email}:`,
          err.message,
        );
      }
    }
  }
}

// ─── HERO SLIDES ──────────────────────────────────────────

export async function seedHeroSlides() {
  console.log("🎬 Seeding initial hero slides...");
  const slidesCount = await prisma.heroSlide.count();
  if (slidesCount > 0) {
    console.log("   ✓ Slides already exist, skipping.");
    return;
  }

  const slides = [
    {
      title: "Where Every Summit is a New Beginning",
      subtitle:
        "Join India's most trusted adventure community for treks, rafting, and beyond.",
      videoUrl:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600",
      ctaLink: "/experiences",
      order: 0,
      isActive: true,
    },
  ];
  for (const slide of slides) {
    await prisma.heroSlide.create({ data: slide });
  }
  console.log(`   ✓ Hero slide created`);
}

// ─── PLATFORM & SITE SETTINGS ─────────────────────────────

const PLATFORM_SETTINGS = [
  { key: "email_provider", value: "ZOHO_SMTP", description: "ZOHO_API | ZOHO_SMTP | RESEND" },
  { key: "smtp_host", value: "smtp.zoho.com", description: "SMTP Server Host" },
  { key: "smtp_port", value: "465", description: "SMTP Port (465, 587, 25)" },
  { key: "smtp_user", value: "", description: "SMTP Username" },
  { key: "smtp_pass", value: "", description: "SMTP Password" },
  { key: "smtp_secure", value: "true", description: "Use SSL/TLS (true/false)" },
  { key: "smtp_from", value: "Param Adventures <booking@paramadventures.in>", description: "Email Sender Identity" },
  { key: "zoho_api_key", value: "", description: "Zoho ZeptoMail API Key" },
  { key: "resend_api_key", value: "", description: "Resend.com API Key" },
  { key: "media_provider", value: "CLOUDINARY", description: "CLOUDINARY | AWS_S3" },
  { key: "cloudinary_cloud_name", value: "", description: "Cloudinary Cloud Name" },
  { key: "cloudinary_api_key", value: "", description: "Cloudinary API Key" },
  { key: "cloudinary_api_secret", value: "", description: "Cloudinary API Secret" },
  { key: "s3_bucket", value: "", description: "AWS S3 Bucket Name" },
  { key: "s3_region", value: "ap-south-1", description: "AWS S3 Region" },
  { key: "s3_access_key", value: "", description: "AWS Access Key ID" },
  { key: "s3_secret_key", value: "", description: "AWS Secret Access Key" },
  { key: "maintenance_mode", value: "false", description: "Site-wide kill switch (true/false)" },
  { key: "registration_enabled", value: "true", description: "Allow new user signups" },
  { key: "jwt_expiry", value: "1h", description: "Access token duration" },
  { key: "refresh_token_expiry", value: "7d", description: "Refresh token duration" },
  { key: "google_analytics_id", value: "", description: "G-XXXXXX Tracking ID" },
  { key: "sentry_enabled", value: "true", description: "Master kill-switch for error tracking" },
  { key: "sentry_environment", value: "production", description: "Sentry environment (production | staging)" },
  { key: "razorpay_mode", value: "TEST", description: "TEST | LIVE" },
  { key: "razorpay_key_id", value: "", description: "Razorpay Public Key ID" },
  { key: "razorpay_key_secret", value: "", description: "Razorpay Secret Key" },
  { key: "razorpay_webhook_secret", value: "", description: "Razorpay Webhook Secret" },
  { key: "convenience_fee_percent", value: "2.5", description: "Percentage fee per booking" },
  { key: "app_url", value: "http://localhost:3000", description: "Base domain for sitemaps and SEO" },
];

const SITE_SETTINGS = [
  { key: "site_title", value: "Param Adventures" },
  { key: "site_description", value: "Curated outdoor experiences across India" },
  { key: "site_favicon_url", value: "/favicon.ico" },
  { key: "company_name", value: "Param Adventures Private Limited" },
  { key: "company_address", value: "" },
  { key: "company_gst", value: "" },
  { key: "support_email", value: "info@paramadventures.in" },
  { key: "support_phone", value: "+91-9876543210" },
  { key: "instagram_url", value: "" },
  { key: "youtube_url", value: "" },
];

export async function seedPlatformSettings() {
  console.log("⚙️ Seeding platform settings...");
  for (const setting of PLATFORM_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("   ✓ Done");
}

export async function seedSiteSettings() {
  console.log("🎨 Seeding site settings...");
  for (const setting of SITE_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("   ✓ Done");
}

// ─── MAIN ─────────────────────────────────────────────────

/**
 * Main seeding function that orchestrates all seed steps.
 * @param {import('@prisma/client').PrismaClient} [existingPrisma]
 */
export async function main(existingPrisma) {
  const isInternalPrisma = !existingPrisma;
  try {
    await initPrisma(existingPrisma);
    await seedRolesAndPermissions();
    await seedCategories();
    await seedAdmin();
    await seedHeroSlides();
    await seedPlatformSettings();
    await seedSiteSettings();
    console.log("\n🚀 Seeding completed successfully!");
    return { success: true };
  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
    throw err;
  } finally {
    if (isInternalPrisma && prisma) {
      await prisma.$disconnect();
    }
  }
}

// Support direct execution via CLI
if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.endsWith("seed.mjs")
) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
