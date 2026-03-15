import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Shared password (all demo users) ────────────────────
const DEMO_PASSWORD = "Demo@1234";

// ─── Fixed UUIDs for cross-table references ───────────────
const IDS = {
  // Roles
  roleRegistered: "role-registered-user",
  roleMediaUploader: "role-media-uploader",
  roleTrekLead: "role-trek-lead",
  roleTripManager: "role-trip-manager",
  roleAdmin: "role-admin",
  roleSuperAdmin: "role-super-admin",

  // Users
  userSuperAdmin: "user-super-admin",
  userAdmin: "user-admin",
  userManager: "user-manager",
  userTrekLead1: "user-trek-lead-1",
  userTrekLead2: "user-trek-lead-2",
  userCustomer1: "user-customer-1",
  userCustomer2: "user-customer-2",
  userCustomer3: "user-customer-3",
  userCustomer4: "user-customer-4",
  userCustomer5: "user-customer-5",

  // Categories
  catTrekking: "cat-trekking",
  catCamping: "cat-camping",
  catSpiritual: "cat-spiritual",
  catCityTours: "cat-city-tours",
  catCorporate: "cat-corporate",
  catWaterSports: "cat-water-sports",

  // Experiences
  expValleyOfFlowers: "exp-valley-of-flowers",
  expRishikeshRafting: "exp-rishikesh-rafting",
  expKedarnath: "exp-kedarnath",
  expGoadiDunes: "exp-gadi-dunes",
  expCoorgCamping: "exp-coorg-camping",

  // Slots — Valley of Flowers
  slotVofPast: "slot-vof-past",
  slotVofCompleted: "slot-vof-completed",
  slotVofActive: "slot-vof-active",
  slotVofUpcoming: "slot-vof-upcoming",

  // Slots — Rishikesh Rafting
  slotRaftPast: "slot-raft-past",
  slotRaftUpcoming: "slot-raft-upcoming",

  // Slots — Kedarnath
  slotKedUpcoming: "slot-ked-upcoming",

  // Slots — Coorg
  slotCoorgUpcoming: "slot-coorg-upcoming",

  // Slots — Gadi Sagar
  slotGadiUpcoming: "slot-gadi-upcoming",
};

// ─── ROLES SECTION ────────────────────────────────────────

const ROLES = [
  { id: IDS.roleRegistered,    name: "REGISTERED_USER",  description: "Authenticated customer",              isSystem: true },
  { id: IDS.roleMediaUploader, name: "MEDIA_UPLOADER",   description: "Creates experience drafts",           isSystem: true },
  { id: IDS.roleTrekLead,      name: "TREK_LEAD",        description: "Leads assigned trips on the ground",  isSystem: true },
  { id: IDS.roleTripManager,   name: "TRIP_MANAGER",     description: "Manages trip operations",             isSystem: true },
  { id: IDS.roleAdmin,         name: "ADMIN",            description: "Day-to-day platform management",      isSystem: true },
  { id: IDS.roleSuperAdmin,    name: "SUPER_ADMIN",      description: "Full system access",                  isSystem: true },
];

const PERMISSIONS = [
  { key: "trip:browse",            description: "View published experiences",           category: "trip" },
  { key: "trip:create",            description: "Create experience drafts",             category: "trip" },
  { key: "trip:edit",              description: "Edit experience details",              category: "trip" },
  { key: "trip:publish",           description: "Publish or archive experiences",       category: "trip" },
  { key: "trip:manage-categories", description: "Add, rename, deactivate categories",  category: "trip" },
  { key: "booking:create",         description: "Book an experience",                  category: "booking" },
  { key: "booking:view-own",       description: "View own bookings",                   category: "booking" },
  { key: "booking:view-all",       description: "View all bookings",                   category: "booking" },
  { key: "booking:cancel",         description: "Cancel bookings",                     category: "booking" },
  { key: "media:upload",           description: "Upload media to the library",         category: "media" },
  { key: "blog:write",             description: "Write and submit blog posts",         category: "blog" },
  { key: "blog:moderate",          description: "Approve or reject blogs",             category: "blog" },
  { key: "user:view-all",          description: "View all registered users",           category: "user" },
  { key: "user:assign-roles",      description: "Assign operational roles",            category: "user" },
  { key: "user:assign-admin",      description: "Assign Admin and Super Admin roles",  category: "user" },
  { key: "user:deactivate",        description: "Deactivate user accounts",            category: "user" },
  { key: "ops:view-assigned-trips",description: "View assigned trip details",          category: "ops" },
  { key: "ops:view-all-trips",     description: "View all trip operations",            category: "ops" },
  { key: "ops:mark-attendance",    description: "Mark attendance on assigned trip",    category: "ops" },
  { key: "ops:add-notes",          description: "Add operational notes to trips",      category: "ops" },
  { key: "ops:upload-expenses",    description: "Upload expense documents",            category: "ops" },
  { key: "ops:view-expenses",      description: "View expense documents",              category: "ops" },
  { key: "ops:assign-trek-leads",  description: "Assign Trek Leads to trips",         category: "ops" },
  { key: "system:config",          description: "Access system configuration",        category: "system" },
  { key: "system:audit-logs",      description: "View full audit logs",               category: "system" },
  { key: "system:view-payments",   description: "View full payment details",          category: "system" },
];

const ALL_PERM_KEYS = PERMISSIONS.map((p) => p.key);

const ROLE_PERMISSIONS = {
  REGISTERED_USER: ["trip:browse", "booking:create", "booking:view-own", "blog:write"],
  MEDIA_UPLOADER:  ["trip:browse", "trip:create", "trip:edit", "media:upload"],
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
  SUPER_ADMIN: ALL_PERM_KEYS,
};

// ─── CATEGORIES ───────────────────────────────────────────

const CATEGORIES = [
  { id: IDS.catTrekking,    name: "Trekking",     slug: "trekking",     icon: "Mountain" },
  { id: IDS.catCamping,     name: "Camping",      slug: "camping",      icon: "Tent" },
  { id: IDS.catSpiritual,   name: "Spiritual",    slug: "spiritual",    icon: "Sunrise" },
  { id: IDS.catCityTours,   name: "City Tours",   slug: "city-tours",   icon: "Building2" },
  { id: IDS.catCorporate,   name: "Corporate",    slug: "corporate",    icon: "Briefcase" },
  { id: IDS.catWaterSports, name: "Water Sports", slug: "water-sports", icon: "Waves" },
];

async function seedRolesAndPermissions() {
  console.log("📌 Seeding roles & permissions...");
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { name: role.name }, update: role, create: role });
  }
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: perm.key }, update: perm, create: perm });
  }
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (perm) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }
  console.log("   ✓ Done");
}

async function seedCategories() {
  console.log("📂 Seeding categories...");
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat });
  }
  console.log("   ✓ Done");
}

// ─── USERS ────────────────────────────────────────────────

async function seedUsers() {
  console.log("👤 Seeding users...");
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [
    {
      id: IDS.userSuperAdmin,
      email: process.env.ADMIN_EMAIL || "superadmin@paramadventures.in",
      password: hash,
      name: "Param Founder",
      roleId: IDS.roleSuperAdmin,
      isVerified: true,
      phoneNumber: "+91-9800000001",
      gender: "Male",
      age: 35,
    },
    {
      id: IDS.userAdmin,
      email: "admin@paramadventures.in",
      password: hash,
      name: "Riya Sharma",
      roleId: IDS.roleAdmin,
      isVerified: true,
      phoneNumber: "+91-9800000002",
      gender: "Female",
      age: 28,
    },
    {
      id: IDS.userManager,
      email: "manager@paramadventures.in",
      password: hash,
      name: "Arjun Mehta",
      roleId: IDS.roleTripManager,
      isVerified: true,
      phoneNumber: "+91-9800000003",
      gender: "Male",
      age: 32,
    },
    {
      id: IDS.userTrekLead1,
      email: "treklead1@paramadventures.in",
      password: hash,
      name: "Karan Rawat",
      roleId: IDS.roleTrekLead,
      isVerified: true,
      phoneNumber: "+91-9800000004",
      gender: "Male",
      age: 26,
    },
    {
      id: IDS.userTrekLead2,
      email: "treklead2@paramadventures.in",
      password: hash,
      name: "Priya Negi",
      roleId: IDS.roleTrekLead,
      isVerified: true,
      phoneNumber: "+91-9800000005",
      gender: "Female",
      age: 24,
    },
    {
      id: IDS.userCustomer1,
      email: "rahul.verma@gmail.com",
      password: hash,
      name: "Rahul Verma",
      roleId: IDS.roleRegistered,
      isVerified: true,
      phoneNumber: "+91-9712345001",
      gender: "Male",
      age: 29,
      bloodGroup: "B+",
      emergencyContactName: "Sunita Verma",
      emergencyContactNumber: "+91-9712345002",
      emergencyRelationship: "Mother",
    },
    {
      id: IDS.userCustomer2,
      email: "sneha.kapoor@gmail.com",
      password: hash,
      name: "Sneha Kapoor",
      roleId: IDS.roleRegistered,
      isVerified: true,
      phoneNumber: "+91-9712345003",
      gender: "Female",
      age: 25,
      bloodGroup: "O+",
      emergencyContactName: "Vikram Kapoor",
      emergencyContactNumber: "+91-9712345004",
      emergencyRelationship: "Brother",
    },
    {
      id: IDS.userCustomer3,
      email: "amit.singh@gmail.com",
      password: hash,
      name: "Amit Singh",
      roleId: IDS.roleRegistered,
      isVerified: true,
      phoneNumber: "+91-9712345005",
      gender: "Male",
      age: 34,
      bloodGroup: "A+",
      emergencyContactName: "Pooja Singh",
      emergencyContactNumber: "+91-9712345006",
      emergencyRelationship: "Wife",
    },
    {
      id: IDS.userCustomer4,
      email: "divya.patel@gmail.com",
      password: hash,
      name: "Divya Patel",
      roleId: IDS.roleRegistered,
      isVerified: true,
      phoneNumber: "+91-9712345007",
      gender: "Female",
      age: 22,
      bloodGroup: "AB+",
    },
    {
      id: IDS.userCustomer5,
      email: "rohan.joshi@gmail.com",
      password: hash,
      name: "Rohan Joshi",
      roleId: IDS.roleRegistered,
      isVerified: true,
      phoneNumber: "+91-9712345008",
      gender: "Male",
      age: 31,
      bloodGroup: "O-",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, roleId: user.roleId },
      create: user,
    });
  }
  console.log(`   ✓ ${users.length} users created`);
}

// ─── HERO SLIDES ──────────────────────────────────────────

async function seedHeroSlides() {
  console.log("🎬 Seeding hero slides...");
  await prisma.heroSlide.deleteMany({});
  const slides = [
    {
      title: "Where Every Summit is a New Beginning",
      subtitle: "Join India's most trusted adventure community for treks, rafting, and beyond.",
      videoUrl: "https://cdn.pixabay.com/video/2020/01/22/31310-387148937_large.mp4",
      ctaLink: "/experiences",
      order: 0,
      isActive: true,
    },
    {
      title: "Find Your Wild",
      subtitle: "Carefully curated trails, certified guides, and memories that last a lifetime.",
      videoUrl: "https://cdn.pixabay.com/video/2022/07/01/122561-726156598_large.mp4",
      ctaLink: "/our-story",
      order: 1,
      isActive: true,
    },
    {
      title: "Spiritual Journeys Await",
      subtitle: "Walk the sacred Himalayan pilgrimages with expert guides by your side.",
      videoUrl: "https://cdn.pixabay.com/video/2021/06/11/76907-562557543_large.mp4",
      ctaLink: "/experiences",
      order: 2,
      isActive: true,
    },
  ];
  for (const slide of slides) {
    await prisma.heroSlide.create({ data: slide });
  }
  console.log(`   ✓ ${slides.length} hero slides created`);
}

// ─── EXPERIENCES ──────────────────────────────────────────

async function seedExperiences() {
  console.log("🏔️  Seeding experiences...");

  const experiences = [
    {
      id: IDS.expValleyOfFlowers,
      title: "Valley of Flowers Trek",
      slug: "valley-of-flowers-trek",
      description: { html: "<p>Experience the <strong>breathtaking UNESCO World Heritage</strong> Valley of Flowers in Uttarakhand — a kaleidoscope of alpine blooms nestled at 3,658m. This moderate trek rewards you with sweeping meadows, hanging glaciers, and the sacred Hemkund Sahib gurudwara.</p>" },
      itinerary: [
        { day: 1, title: "Haridwar → Govindghat", description: "Drive from Haridwar to Govindghat via Rishikesh and Joshimath. Overnight at camp." },
        { day: 2, title: "Govindghat → Ghangaria", description: "14km trek through dense forests and gushing rivers to the base camp at Ghangaria (3,050m)." },
        { day: 3, title: "Ghangaria → Valley of Flowers → Ghangaria", description: "Explore the stunning valley full of wildflowers. Spot rare Himalayan flora and fauna." },
        { day: 4, title: "Ghangaria → Hemkund Sahib → Ghangaria", description: "Trek up to the holy Hemkund Sahib lake (4,632m). Return to Ghangaria." },
        { day: 5, title: "Ghangaria → Govindghat → Haridwar", description: "Descend to Govindghat and drive back to Haridwar." },
      ],
      basePrice: 8500,
      durationDays: 5,
      location: "Uttarakhand, India",
      difficulty: "MODERATE",
      capacity: 15,
      status: "PUBLISHED",
      isFeatured: true,
      coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
      cardImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      images: [
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200",
      ],
      highlights: ["UNESCO World Heritage site", "500+ species of flowers", "Hemkund Sahib visit", "Certified mountain guides", "All meals included"],
      inclusions: ["Transport Haridwar-Govindghat-Haridwar", "Accommodation in tents/guesthouses", "All meals (Day 1 dinner to Day 5 lunch)", "Experienced trek guide", "Forest permit", "First aid kit"],
      exclusions: ["Personal expenses", "Travel insurance", "Porter charges (₹800/day optional)", "Anything not mentioned in inclusions"],
      thingsToCarry: ["Trekking boots", "Rain jacket", "Warm layers (fleece + down)", "Sunscreen SPF 50+", "Personal medication", "2L water bottle", "Quick-dry clothes"],
      faqs: [
        { q: "Is this trek suitable for beginners?", a: "Moderate fitness is required. Prior trekking experience is recommended but not mandatory if you are physically active." },
        { q: "What is the best season?", a: "July to September when the valley is in full bloom. The peak window is mid-July to mid-August." },
      ],
      cancellationPolicy: "Cancellation 15+ days before: 90% refund. 7-14 days: 50% refund. Less than 7 days: no refund.",
      meetingPoint: "Haridwar Railway Station, Platform 1",
      minAge: 12,
      maxAltitude: "4,632m (Hemkund Sahib)",
      trekDistance: "38 km (total round trip)",
      bestTimeToVisit: "July to September",
      maxGroupSize: 15,
      pickupPoints: ["Haridwar Railway Station", "Rishikesh Bus Stand"],
      dropPoints: ["Haridwar Railway Station", "Rishikesh Bus Stand"],
      vibeTags: ["Nature Lover", "Photography", "Spiritual", "Moderate Fitness"],
      networkConnectivity: "No network beyond Govindghat",
      fitnessRequirement: "Should be able to walk 10-14 km per day with a 5-7 kg backpack",
      ageRange: "12-60 years",
      meetingTime: "6:00 AM",
      dropoffTime: "7:00 PM",
    },
    {
      id: IDS.expRishikeshRafting,
      title: "Rishikesh White Water Rafting",
      slug: "rishikesh-white-water-rafting",
      description: { html: "<p>Conquer the mighty <strong>Ganges rapids</strong> on this adrenaline-pumping white-water rafting expedition through Rishikesh — the adventure capital of India. Battle Grade III–IV rapids like 'The Wall', 'Three Blind Mice', and 'Golf Course'.</p>" },
      itinerary: [
        { day: 1, title: "Briefing & Rafting", description: "Morning safety briefing at camp. Full day rafting from Shivpuri to Laxman Jhula (16km). Evening bonfire at camp." },
        { day: 2, title: "Yoga & Departure", description: "Morning yoga session by the Ganges. Breakfast and check-out. Optional bungee jumping or cliff jumping." },
      ],
      basePrice: 3200,
      durationDays: 2,
      location: "Rishikesh, Uttarakhand",
      difficulty: "HARD",
      capacity: 12,
      status: "PUBLISHED",
      isFeatured: true,
      coverImage: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1600",
      cardImage: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=800",
      images: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200",
        "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200",
      ],
      highlights: ["Grade III-IV rapids", "16km rafting stretch", "Riverside camping", "Morning yoga session", "Campfire & BBQ"],
      inclusions: ["Rafting equipment (helmet, life jacket, paddle)", "Riverside camp accommodation", "All meals", "Qualified river guide", "Transport to/from put-in point"],
      exclusions: ["Bungee jumping (₹3,500 extra)", "Personal insurance", "Alcoholic beverages"],
      faqs: [
        { q: "Do I need prior rafting experience?", a: "No. Our guides brief you thoroughly before the session. Basic swimming ability is helpful but not mandatory." },
        { q: "What should I not bring?", a: "Avoid bringing mobiles or valuables on the raft. We provide waterproof bags for essentials." },
      ],
      cancellationPolicy: "Cancellation 7+ days before: 80% refund. Less than 7 days: no refund.",
      meetingPoint: "Param Adventures Camp, Shivpuri",
      minAge: 14,
      bestTimeToVisit: "September to June",
      maxGroupSize: 12,
      vibeTags: ["Thrill Seeker", "Water Sports", "Weekend Getaway"],
      pickupPoints: ["Rishikesh Bus Stand", "Haridwar Railway Station"],
      dropPoints: ["Rishikesh Bus Stand"],
    },
    {
      id: IDS.expKedarnath,
      title: "Kedarnath Yatra",
      slug: "kedarnath-yatra",
      description: { html: "<p>Embark on a <strong>sacred pilgrimage</strong> to one of the holiest Shiva temples in the world — Lord Kedarnath at 3,583m in the Garhwal Himalayas. Trek through pristine forests, cross glacial rivers, and experience a transformation that goes beyond tourism.</p>" },
      itinerary: [
        { day: 1, title: "Haridwar → Guptkashi", description: "Drive from Haridwar to Guptkashi (6-7 hrs). Check-in and evening Aarti." },
        { day: 2, title: "Guptkashi → Gaurikund → Kedarnath", description: "Drive to Gaurikund (30min), then 16km trek to Kedarnath. Evening darshan." },
        { day: 3, title: "Kedarnath Darshan", description: "Morning Abhishek puja at the temple. Explore the surrounding area. Descend to Gaurikund." },
        { day: 4, title: "Gaurikund → Haridwar", description: "Drive back to Haridwar with photo stops." },
      ],
      basePrice: 6800,
      durationDays: 4,
      location: "Rudraprayag, Uttarakhand",
      difficulty: "MODERATE",
      capacity: 20,
      status: "PUBLISHED",
      isFeatured: false,
      coverImage: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1600",
      cardImage: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800",
      images: [
        "https://images.unsplash.com/photo-1600019248261-8f88137db25e?w=1200",
        "https://images.unsplash.com/photo-1596547609652-9cf5d8c10616?w=1200",
      ],
      highlights: ["One of the 12 Jyotirlingas", "Stunning Himalayan landscape", "Panch Kedar circuit option", "Expert spiritual guide", "All puja arrangements"],
      inclusions: ["Transport (Haridwar-Haridwar)", "Hotel + guesthouse accommodation", "All meals", "Puja arrangements at temple", "Trekking guide", "Medical kit"],
      exclusions: ["Helicopter charges (optional ₹4,500/person)", "Personal expenses", "Temple prasad"],
      cancellationPolicy: "Cancellation 10+ days: 75% refund. Less: no refund.",
      meetingPoint: "Haridwar Railway Station",
      minAge: 10,
      maxAltitude: "3,583m",
      trekDistance: "32 km (round trip from Gaurikund)",
      bestTimeToVisit: "May to June, September to October",
      vibeTags: ["Spiritual", "Pilgrimage", "Himalayan", "Heritage"],
      pickupPoints: ["Haridwar Railway Station", "Rishikesh Bus Stand"],
      dropPoints: ["Haridwar Railway Station"],
    },
    {
      id: IDS.expGoadiDunes,
      title: "Gadi Sagar Desert Safari, Jaisalmer",
      slug: "gadi-sagar-desert-safari-jaisalmer",
      description: { html: "<p>Experience the <strong>golden sands of the Thar Desert</strong> under a star-studded sky in Jaisalmer. Ride camels into the dunes, enjoy Rajasthani folk music around a bonfire, and sleep in luxury desert tents for an unforgettable experience.</p>" },
      itinerary: [
        { day: 1, title: "Jaisalmer Arrival & Fort Tour", description: "Arrive in Jaisalmer, check-in at camp. Afternoon tour of Jaisalmer Fort and Patwon Ki Haveli." },
        { day: 2, title: "Camel Safari & Dune Bashing", description: "Morning camel safari to Sam Sand Dunes. Afternoon dune bashing (jeep). Sunset on dunes + folk performance + bonfire." },
        { day: 3, title: "Sunrise & Departure", description: "Sunrise over the sand dunes. Breakfast. Departure transfers." },
      ],
      basePrice: 4500,
      durationDays: 3,
      location: "Jaisalmer, Rajasthan",
      difficulty: "EASY",
      capacity: 18,
      status: "PUBLISHED",
      isFeatured: true,
      coverImage: "https://images.unsplash.com/photo-1512553866-4b4e90baada3?w=1600",
      cardImage: "https://images.unsplash.com/photo-1512553866-4b4e90baada3?w=800",
      images: [
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200",
        "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200",
      ],
      highlights: ["Luxury desert camp", "Camel safari at sunset", "Dune bashing (jeep)", "Rajasthani folk performance", "Stargazing session"],
      inclusions: ["Premium desert tent stay", "All meals (Rajasthani cuisine)", "Camel safari", "Jeep dune bashing", "Folk music & dance evening", "Airport/station transfers"],
      exclusions: ["Paragliding (₹2,000 extra)", "Alcoholic beverages", "Personal expenses"],
      cancellationPolicy: "Cancellation 7+ days: 80% refund. Less: 25% refund.",
      meetingPoint: "Jaisalmer Railway Station",
      minAge: 5,
      bestTimeToVisit: "October to March",
      maxGroupSize: 18,
      vibeTags: ["Family Friendly", "Cultural", "Photography", "Star Gazing"],
      pickupPoints: ["Jaisalmer Railway Station", "Jaisalmer Airport"],
      dropPoints: ["Jaisalmer Railway Station", "Jaisalmer Airport"],
    },
    {
      id: IDS.expCoorgCamping,
      title: "Coorg Coffee Forest Camping",
      slug: "coorg-coffee-forest-camping",
      description: { html: "<p>Escape the city into the <strong>emerald hills of Coorg</strong> — Karnataka's coffee capital. Camp amidst aromatic coffee estates, trek through misty rainforests, visit cascading Abbey Falls, and rejuvenate your soul in one of India's most beautiful natural landscapes.</p>" },
      itinerary: [
        { day: 1, title: "Arrival → Camp Setup", description: "Arrive at Madikeri. Set up camp in the coffee estate. Evening bonfire and dinner." },
        { day: 2, title: "Nature Trek & Waterfall Visit", description: "Morning guided forest trek (6km). Visit Abbey Falls. Afternoon coffee estate tour with tasting." },
        { day: 3, title: "Sunrise Yoga & Departure", description: "Sunrise yoga in the mist. Breakfast. Depart by noon." },
      ],
      basePrice: 3800,
      durationDays: 3,
      location: "Madikeri, Coorg, Karnataka",
      difficulty: "EASY",
      capacity: 16,
      status: "PUBLISHED",
      isFeatured: false,
      coverImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600",
      cardImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800",
      images: [
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200",
        "https://images.unsplash.com/photo-1510525009312-b5350d555af7?w=1200",
      ],
      highlights: ["Coffee estate camping", "Abbey Falls visit", "Guided rainforest trek", "Sunrise yoga", "Coorg cuisine"],
      inclusions: ["Tent accommodation in coffee estate", "All meals (local Coorg cuisine)", "Forest trek guide", "Coffee estate tour + tasting", "Transport from Madikeri town"],
      exclusions: ["Alcohol", "Personal expenses", "Travel to Madikeri"],
      cancellationPolicy: "Cancellation 7+ days: 85% refund. Less: no refund.",
      meetingPoint: "Madikeri Bus Stand",
      minAge: 8,
      bestTimeToVisit: "October to March",
      vibeTags: ["Nature Lover", "Couples", "Yoga & Wellness", "Photography"],
      pickupPoints: ["Madikeri Bus Stand"],
      dropPoints: ["Madikeri Bus Stand"],
    },
  ];

  for (const exp of experiences) {
    const { id, itinerary, inclusions, exclusions, thingsToCarry, faqs, highlights, pickupPoints, dropPoints, images, vibeTags, ...rest } = exp;
    await prisma.experience.upsert({
      where: { slug: rest.slug },
      update: { ...rest },
      create: {
        id,
        ...rest,
        itinerary: itinerary,
        inclusions: inclusions ?? [],
        exclusions: exclusions ?? [],
        thingsToCarry: thingsToCarry ?? [],
        faqs: faqs ?? [],
        images: images ?? [],
        highlights: highlights ?? [],
        pickupPoints: pickupPoints ?? [],
        dropPoints: dropPoints ?? [],
        vibeTags: vibeTags ?? [],
      },
    });
  }

  // Link experiences to categories
  const categoryLinks = [
    { experienceId: IDS.expValleyOfFlowers,  categoryId: IDS.catTrekking },
    { experienceId: IDS.expValleyOfFlowers,  categoryId: IDS.catSpiritual },
    { experienceId: IDS.expRishikeshRafting, categoryId: IDS.catWaterSports },
    { experienceId: IDS.expKedarnath,        categoryId: IDS.catSpiritual },
    { experienceId: IDS.expKedarnath,        categoryId: IDS.catTrekking },
    { experienceId: IDS.expGoadiDunes,       categoryId: IDS.catCityTours },
    { experienceId: IDS.expCoorgCamping,     categoryId: IDS.catCamping },
  ];
  await prisma.experienceCategory.deleteMany({
    where: { experienceId: { in: [IDS.expValleyOfFlowers, IDS.expRishikeshRafting, IDS.expKedarnath, IDS.expGoadiDunes, IDS.expCoorgCamping] } },
  });
  for (const link of categoryLinks) {
    await prisma.experienceCategory.create({ data: link });
  }
  console.log(`   ✓ ${experiences.length} experiences seeded`);
}

// ─── SLOTS ────────────────────────────────────────────────

async function seedSlots() {
  console.log("📅 Seeding slots (all TripStatus states)...");

  const now = new Date("2026-03-16T00:00:00Z");
  const past   = (d) => new Date(now.getTime() - d * 86400000);
  const future = (d) => new Date(now.getTime() + d * 86400000);

  const slots = [
    // Valley of Flowers — COMPLETED trip (past)
    { id: IDS.slotVofCompleted, experienceId: IDS.expValleyOfFlowers, date: past(60), capacity: 15, remainingCapacity: 3, status: "COMPLETED", managerId: IDS.userManager, completedAt: past(55) },
    // Valley of Flowers — ACTIVE trip (ongoing)
    { id: IDS.slotVofActive,    experienceId: IDS.expValleyOfFlowers, date: past(2),  capacity: 15, remainingCapacity: 5, status: "ACTIVE",    managerId: IDS.userManager, startedAt: past(2) },
    // Valley of Flowers — UPCOMING
    { id: IDS.slotVofUpcoming,  experienceId: IDS.expValleyOfFlowers, date: future(30),capacity: 15, remainingCapacity: 10, status: "UPCOMING" },

    // Rishikesh Rafting — COMPLETED
    { id: IDS.slotRaftPast,     experienceId: IDS.expRishikeshRafting, date: past(30), capacity: 12, remainingCapacity: 0, status: "COMPLETED", managerId: IDS.userManager, completedAt: past(28) },
    // Rishikesh Rafting — UPCOMING
    { id: IDS.slotRaftUpcoming, experienceId: IDS.expRishikeshRafting, date: future(15), capacity: 12, remainingCapacity: 8, status: "UPCOMING" },

    // Kedarnath — UPCOMING
    { id: IDS.slotKedUpcoming,  experienceId: IDS.expKedarnath, date: future(45), capacity: 20, remainingCapacity: 14, status: "UPCOMING" },

    // Coorg — UPCOMING
    { id: IDS.slotCoorgUpcoming, experienceId: IDS.expCoorgCamping, date: future(20), capacity: 16, remainingCapacity: 12, status: "UPCOMING" },

    // Gadi Sagar — UPCOMING
    { id: IDS.slotGadiUpcoming, experienceId: IDS.expGoadiDunes, date: future(25), capacity: 18, remainingCapacity: 10, status: "UPCOMING" },
  ];

  for (const slot of slots) {
    await prisma.slot.upsert({ where: { id: slot.id }, update: slot, create: slot });
  }
  console.log(`   ✓ ${slots.length} slots seeded`);
}

// ─── BOOKINGS, PAYMENTS & PARTICIPANTS ───────────────────

async function seedBookings() {
  console.log("🎫 Seeding bookings, payments & participants...");

  const bookingsData = [
    // ── Completed slot bookings (canReview: true) ──
    {
      id: "booking-vof-c1",
      userId: IDS.userCustomer1,
      experienceId: IDS.expValleyOfFlowers,
      slotId: IDS.slotVofCompleted,
      participantCount: 2,
      totalPrice: 17680, // 2 × 8500 + taxes
      baseFare: 17000,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      attended: true,
      canReview: true,
      participants: [
        { name: "Rahul Verma", email: "rahul.verma@gmail.com", phoneNumber: "+91-9712345001", gender: "Male", age: 29, bloodGroup: "B+", isPrimary: true, pickupPoint: "Haridwar Railway Station", emergencyContactName: "Sunita Verma", emergencyContactNumber: "+91-9712345002", emergencyRelationship: "Mother", attended: true },
        { name: "Anjali Verma", email: "anjali.verma@gmail.com",  phoneNumber: "+91-9712340022", gender: "Female", age: 26, bloodGroup: "A+", isPrimary: false, pickupPoint: "Haridwar Railway Station", attended: true },
      ],
      payment: { amount: 17680, status: "PAID", provider: "RAZORPAY", method: "UPI", providerPaymentId: "pay_demo_vof_c1" },
    },
    {
      id: "booking-vof-c2",
      userId: IDS.userCustomer2,
      experienceId: IDS.expValleyOfFlowers,
      slotId: IDS.slotVofCompleted,
      participantCount: 1,
      totalPrice: 8840,
      baseFare: 8500,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      attended: true,
      canReview: true,
      participants: [
        { name: "Sneha Kapoor", email: "sneha.kapoor@gmail.com", phoneNumber: "+91-9712345003", gender: "Female", age: 25, bloodGroup: "O+", isPrimary: true, attended: true },
      ],
      payment: { amount: 8840, status: "PAID", provider: "RAZORPAY", method: "CARD", providerPaymentId: "pay_demo_vof_c2" },
    },
    // ── Active slot bookings ──
    {
      id: "booking-vof-a1",
      userId: IDS.userCustomer3,
      experienceId: IDS.expValleyOfFlowers,
      slotId: IDS.slotVofActive,
      participantCount: 3,
      totalPrice: 26520,
      baseFare: 25500,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      attended: false,
      canReview: false,
      participants: [
        { name: "Amit Singh",  email: "amit.singh@gmail.com",  phoneNumber: "+91-9712345005", gender: "Male",   age: 34, bloodGroup: "A+", isPrimary: true,  pickupPoint: "Rishikesh Bus Stand" },
        { name: "Pooja Singh", email: "pooja.singh@gmail.com", phoneNumber: "+91-9712345099", gender: "Female", age: 30, bloodGroup: "B+", isPrimary: false, pickupPoint: "Rishikesh Bus Stand" },
        { name: "Aarav Singh", phoneNumber: "+91-9712345098",  gender: "Male",   age: 8,  bloodGroup: "A+", isPrimary: false },
      ],
      payment: { amount: 26520, status: "PAID", provider: "RAZORPAY", method: "NETBANKING", providerPaymentId: "pay_demo_vof_a1" },
    },
    // ── Upcoming slot with REQUESTED status ──
    {
      id: "booking-vof-u1",
      userId: IDS.userCustomer4,
      experienceId: IDS.expValleyOfFlowers,
      slotId: IDS.slotVofUpcoming,
      participantCount: 1,
      totalPrice: 8840,
      baseFare: 8500,
      bookingStatus: "REQUESTED",
      paymentStatus: "PENDING",
      attended: false,
      canReview: false,
      participants: [
        { name: "Divya Patel", email: "divya.patel@gmail.com", phoneNumber: "+91-9712345007", gender: "Female", age: 22, bloodGroup: "AB+", isPrimary: true },
      ],
      payment: { amount: 8840, status: "PENDING", provider: "RAZORPAY", method: null, providerPaymentId: null },
    },
    // ── Rafting completed ──
    {
      id: "booking-raft-c1",
      userId: IDS.userCustomer5,
      experienceId: IDS.expRishikeshRafting,
      slotId: IDS.slotRaftPast,
      participantCount: 2,
      totalPrice: 6656,
      baseFare: 6400,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      attended: true,
      canReview: true,
      participants: [
        { name: "Rohan Joshi",  email: "rohan.joshi@gmail.com", phoneNumber: "+91-9712345008", gender: "Male",   age: 31, bloodGroup: "O-", isPrimary: true,  attended: true },
        { name: "Meera Joshi",  phoneNumber: "+91-9712345009",  gender: "Female", age: 28, isPrimary: false, attended: true },
      ],
      payment: { amount: 6656, status: "PAID", provider: "RAZORPAY", method: "UPI", providerPaymentId: "pay_demo_raft_c1" },
    },
    // ── Rafting upcoming CONFIRMED ──
    {
      id: "booking-raft-u1",
      userId: IDS.userCustomer1,
      experienceId: IDS.expRishikeshRafting,
      slotId: IDS.slotRaftUpcoming,
      participantCount: 2,
      totalPrice: 6656,
      baseFare: 6400,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      attended: false,
      canReview: false,
      participants: [
        { name: "Rahul Verma",  email: "rahul.verma@gmail.com", gender: "Male",   age: 29, isPrimary: true  },
        { name: "Dev Verma",    gender: "Male",   age: 25, isPrimary: false },
      ],
      payment: { amount: 6656, status: "PAID", provider: "MANUAL", method: "CARD", providerPaymentId: null },
    },
    // ── Kedarnath upcoming REQUESTED ──
    {
      id: "booking-ked-u1",
      userId: IDS.userCustomer2,
      experienceId: IDS.expKedarnath,
      slotId: IDS.slotKedUpcoming,
      participantCount: 2,
      totalPrice: 14144,
      baseFare: 13600,
      bookingStatus: "REQUESTED",
      paymentStatus: "PENDING",
      attended: false,
      canReview: false,
      participants: [
        { name: "Sneha Kapoor", email: "sneha.kapoor@gmail.com", gender: "Female", age: 25, isPrimary: true  },
        { name: "Vikram Kapoor", gender: "Male", age: 28, isPrimary: false },
      ],
      payment: { amount: 14144, status: "PENDING", provider: "RAZORPAY", method: null, providerPaymentId: null },
    },
  ];

  for (const b of bookingsData) {
    const { participants, payment, ...bookingFields } = b;
    const booking = await prisma.booking.upsert({
      where: { id: b.id },
      update: { bookingStatus: bookingFields.bookingStatus, paymentStatus: bookingFields.paymentStatus, attended: bookingFields.attended, canReview: bookingFields.canReview },
      create: bookingFields,
    });
    // Payment
    const existingPayment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });
    if (!existingPayment) {
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: payment.amount, status: payment.status, provider: payment.provider, method: payment.method, providerPaymentId: payment.providerPaymentId },
      });
    }
    // Participants
    const existingCount = await prisma.bookingParticipant.count({ where: { bookingId: booking.id } });
    if (existingCount === 0) {
      for (const p of participants) {
        await prisma.bookingParticipant.create({ data: { ...p, bookingId: booking.id } });
      }
    }
  }
  console.log(`   ✓ ${bookingsData.length} bookings + payments + participants seeded`);
}

// ─── TRIP OPERATIONS (Assignments + TripLog) ─────────────

async function seedTripOperations() {
  console.log("🗂️  Seeding trip assignments & logs...");

  // Trek Lead assignments for COMPLETED and ACTIVE slots
  const assignments = [
    { slotId: IDS.slotVofCompleted, trekLeadId: IDS.userTrekLead1 },
    { slotId: IDS.slotVofActive,    trekLeadId: IDS.userTrekLead1 },
    { slotId: IDS.slotRaftPast,     trekLeadId: IDS.userTrekLead2 },
  ];

  for (const a of assignments) {
    await prisma.tripAssignment.upsert({
      where: { slotId_trekLeadId: { slotId: a.slotId, trekLeadId: a.trekLeadId } },
      update: {},
      create: a,
    });
  }

  // TripLog for the COMPLETED Valley of Flowers slot
  const existingLog = await prisma.tripLog.findUnique({ where: { slotId: IDS.slotVofCompleted } });
  if (!existingLog) {
    await prisma.tripLog.create({
      data: {
        slotId: IDS.slotVofCompleted,
        attendees: [
          { bookingId: "booking-vof-c1", userName: "Rahul Verma",  present: true },
          { bookingId: "booking-vof-c1", userName: "Anjali Verma", present: true },
          { bookingId: "booking-vof-c2", userName: "Sneha Kapoor", present: true },
        ],
        photoUrls: [
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        ],
        trekLeadNote: "Excellent group. All participants were fit and enthusiastic. Weather was perfect on Days 2 & 3. Highly recommend this trek for September batches.",
        managerNote: "Great job Karan! Trip closed successfully. Invoicing done.",
      },
    });
  }

  // TripLog for completed Rafting slot
  const existingRaftLog = await prisma.tripLog.findUnique({ where: { slotId: IDS.slotRaftPast } });
  if (!existingRaftLog) {
    await prisma.tripLog.create({
      data: {
        slotId: IDS.slotRaftPast,
        attendees: [
          { bookingId: "booking-raft-c1", userName: "Rohan Joshi", present: true },
          { bookingId: "booking-raft-c1", userName: "Meera Joshi",present: true },
        ],
        photoUrls: ["https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=800"],
        trekLeadNote: "Both participants were first-timers but very brave. Grade III section was thrilling. No safety incidents.",
        managerNote: "Good work! Positive customer reviews received.",
      },
    });
  }
  console.log("   ✓ Trip assignments & logs seeded");
}

// ─── BLOGS ────────────────────────────────────────────────

async function seedBlogs() {
  console.log("📝 Seeding blogs...");

  const blogs = [
    {
      title: "My Life-Changing Trek to Valley of Flowers",
      slug: "my-life-changing-trek-to-valley-of-flowers",
      authorId: IDS.userCustomer1,
      experienceId: IDS.expValleyOfFlowers,
      status: "PUBLISHED",
      theme: "MODERN",
      coverImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
      authorSocials: { instagram: "@rahulverma_treks", twitter: "" },
      content: {
        html: "<h2>The Day I Found My Mountains</h2><p>I had always been a city person. The Valley of Flowers trip with Param Adventures changed everything. From the first step at Govindghat to the breathtaking carpet of wildflowers — this was the experience of a lifetime.</p><p>Our guide Karan was exceptional. His knowledge of the Himalayan flora and his stories around the campfire made each night unforgettable. The trek to Hemkund Sahib on Day 4 left me speechless.</p><h2>Tips for First-Timers</h2><ul><li>Book 3 months in advance — it fills up fast</li><li>Train for at least 4 weeks before the trip</li><li>Carry a good rain jacket — afternoon showers are common</li></ul><p>I'm already planning my next adventure with Param. Highly recommend this to anyone who wants a true connection with nature.</p>",
      },
    },
    {
      title: "Rafting the Ganges: A Beginner's Guide",
      slug: "rafting-the-ganges-beginners-guide",
      authorId: IDS.userCustomer5,
      experienceId: IDS.expRishikeshRafting,
      status: "PUBLISHED",
      theme: "CLASSIC",
      coverImageUrl: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1200",
      authorSocials: { instagram: "@rohan.joshi.adventures" },
      content: {
        html: "<h2>Conquering the Rapids</h2><p>I was terrified before my first rafting experience. But the team at Param Adventures made the entire process seamless — from the safety briefing to the final plunge into 'The Wall' rapid.</p><p>My advice: trust your guide, lean into the paddle, and just scream your heart out! The 16km stretch from Shivpuri to Laxman Jhula is an absolute must-do.</p><p>The bonfire evening at camp was equally unforgettable. An experience I'll carry forever.</p>",
      },
    },
    {
      title: "Kedarnath Through My Lens: A Photo Essay",
      slug: "kedarnath-through-my-lens-photo-essay",
      authorId: IDS.userCustomer2,
      experienceId: IDS.expKedarnath,
      status: "PENDING_REVIEW",
      theme: "MINIMAL",
      coverImageUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1200",
      content: {
        html: "<h2>A Journey of Faith and Fitness</h2><p>The 16km trek from Gaurikund to Kedarnath is demanding — but what awaits at the top is divine. The ancient stone temple set against glaciated peaks is a sight that no camera can truly capture.</p><p>Booking through Param Adventures meant we had all puja arrangements taken care of. No stress, just devotion.</p>",
      },
    },
    {
      title: "Desert Dreams: An Honest Review of Jaisalmer Safari",
      slug: "desert-dreams-jaisalmer-safari-review",
      authorId: IDS.userCustomer3,
      experienceId: IDS.expGoadiDunes,
      status: "DRAFT",
      theme: "CLASSIC",
      coverImageUrl: "https://images.unsplash.com/photo-1512553866-4b4e90baada3?w=1200",
      content: {
        html: "<h2>Draft: Jaisalmer Notes</h2><p>Still compiling my photos and notes from the Jaisalmer trip. What a magical experience — the stars in the desert are something else entirely. More coming soon...</p>",
      },
    },
  ];

  for (const blog of blogs) {
    const { content, authorSocials, ...rest } = blog;
    const existing = await prisma.blog.findUnique({ where: { slug: rest.slug } });
    if (!existing) {
      await prisma.blog.create({
        data: { ...rest, content: content, authorSocials: authorSocials ?? null },
      });
    }
  }
  console.log(`   ✓ ${blogs.length} blogs seeded`);
}

// ─── REVIEWS ──────────────────────────────────────────────

async function seedReviews() {
  console.log("⭐ Seeding reviews...");

  const reviews = [
    // Valley of Flowers — from completed booking attendees
    {
      experienceId: IDS.expValleyOfFlowers,
      userId: IDS.userCustomer1,
      rating: 5,
      reviewText: "Absolutely mind-blowing experience! Five days in the Valley of Flowers was the most beautiful thing I've ever seen. The Param Adventures team was incredibly well-organised and Karan (our guide) was the best. Will be back next year!",
      isFeaturedHome: true,
      isFeaturedExperience: true,
    },
    {
      experienceId: IDS.expValleyOfFlowers,
      userId: IDS.userCustomer2,
      rating: 5,
      reviewText: "From the moment I booked to the last step home — everything was perfect. The accommodation, the food, the safety equipment — all top-notch. The Valley literally took my breath away.",
      isFeaturedHome: false,
      isFeaturedExperience: true,
    },
    // Rafting reviews
    {
      experienceId: IDS.expRishikeshRafting,
      userId: IDS.userCustomer5,
      rating: 5,
      reviewText: "Best weekend of my life! The rapids were intense, the guides were professional, and the campfire evening was magical. Param Adventures knows how to run a flawless adventure!",
      isFeaturedHome: true,
      isFeaturedExperience: true,
    },
  ];

  for (const review of reviews) {
    await prisma.experienceReview.upsert({
      where: { experienceId_userId: { experienceId: review.experienceId, userId: review.userId } },
      update: { rating: review.rating, reviewText: review.reviewText },
      create: review,
    });
  }
  console.log(`   ✓ ${reviews.length} reviews seeded`);
}

// ─── SAVED EXPERIENCES (Wishlist) ─────────────────────────

async function seedWishlist() {
  console.log("❤️  Seeding wishlist items...");
  const items = [
    { userId: IDS.userCustomer4, experienceId: IDS.expValleyOfFlowers },
    { userId: IDS.userCustomer4, experienceId: IDS.expRishikeshRafting },
    { userId: IDS.userCustomer3, experienceId: IDS.expKedarnath },
    { userId: IDS.userCustomer1, experienceId: IDS.expCoorgCamping },
    { userId: IDS.userCustomer2, experienceId: IDS.expGoadiDunes },
  ];
  for (const item of items) {
    await prisma.savedExperience.upsert({
      where: { userId_experienceId: item },
      update: {},
      create: item,
    });
  }
  console.log(`   ✓ ${items.length} wishlist items seeded`);
}

// ─── CUSTOM LEADS ─────────────────────────────────────────

async function seedLeads() {
  console.log("📋 Seeding custom leads...");
  const existing = await prisma.customLead.count();
  if (existing > 0) { console.log("   ✓ Leads already exist — skipping"); return; }

  await prisma.customLead.createMany({
    data: [
      { name: "Corporate HR - TechVision Ltd", email: "hr@techvision.in", phone: "+91-9900001111", requirements: "Looking for a team-building corporate retreat for 40 employees in the Himalayas. Budget ₹3,000/person. Prefer April.", status: "CONTACTED", adminNotes: "Called on 14 March. Sent proposal. Follow up 20 March." },
      { name: "Preethi Nair", email: "preethi.nair@gmail.com", phone: "+91-9900002222", requirements: "Honeymoon package to Coorg or Himachal for 2 people. Budget flexible. Looking for something private and romantic.", status: "NEW" },
      { name: "Suresh Kumar", email: "skmk@outlook.com", phone: "+91-9900003333", requirements: "Family trip with 2 kids (ages 8 and 11). Want something easy in Rajasthan or Karnataka. Budget ₹15,000 total for 4.", status: "CONVERTED", adminNotes: "Booked the Jaisalmer Safari package." },
      { name: "Delhi University Trekking Club", email: "treks@dutrekclub.in", phone: "+91-9900004444", requirements: "Group of 25 students for a Himalayan trek during summer break (May-June). Student discount possible?", status: "CLOSED", adminNotes: "Could not accommodate due to capacity constraints. Referred to next year." },
    ],
  });
  console.log("   ✓ 4 custom leads seeded");
}

// ─── PLATFORM SETTINGS ────────────────────────────────────

async function seedPlatformSettings() {
  console.log("⚙️  Seeding platform settings...");
  const settings = [
    { key: "cgstPercent",        value: "9",                    description: "CGST percentage applied to bookings" },
    { key: "sgstPercent",        value: "9",                    description: "SGST percentage applied to bookings" },
    { key: "platformFeePercent", value: "2",                    description: "Platform convenience fee percentage" },
    { key: "gstNumber",          value: "27AAHCP1234F1Z5",      description: "Company GST registration number" },
    { key: "companyName",        value: "Param Adventures Pvt Ltd", description: "Legal entity name for invoices" },
    { key: "supportEmail",       value: "support@paramadventures.in", description: "Customer support email" },
    { key: "supportPhone",       value: "+91-9800000000",       description: "Customer support phone number" },
  ];
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("   ✓ Platform settings seeded");
}

// ─── STORY BLOCKS ─────────────────────────────────────────

async function seedStoryBlocks() {
  console.log("📖 Seeding story blocks...");
  const existing = await prisma.storyBlock.count();
  if (existing > 0) { console.log(`   ✓ ${existing} blocks already exist — skipping`); return; }

  const blocks = [
    { type: "hero",      title: "Born from the Mountains",      subtitle: "What started as a group of friends chasing sunrises on remote trails has grown into India's most passionate adventure community.", imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600", order: 0 },
    { type: "milestone", title: "The First Trek (2019)",        subtitle: "A group of 8 friends set out on a Himalayan trail that changed everything.", body: "It was a cold December morning when our founders took their first step into the wild. With nothing but a backpack, a dream, and an unshakable belief that adventure should be accessible to everyone — Param Adventures was born.", imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200", stat: "2019", order: 1 },
    { type: "milestone", title: "Building the Community (2021)", subtitle: "From 8 friends to 500+ adventurers joining every season.", body: "Word spread. Through social media stories, campfire conversations, and genuine reviews from trekkers who returned transformed — our community grew organically.", imageUrl: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200", stat: "500+", order: 2 },
    { type: "value",     title: "Safety First",                  subtitle: "Every route scouted. Every guide certified. Every trip insured.", stat: "🛡️", order: 3 },
    { type: "value",     title: "Authentic Experiences",         subtitle: "We don't do tourist traps. We create stories worth retelling.", stat: "🏔️", order: 4 },
    { type: "value",     title: "Leave No Trace",                subtitle: "The mountains gave us everything. We protect them in return.", stat: "🌿", order: 5 },
    { type: "cta",       title: "Your Story Starts Here",        subtitle: "Join thousands of adventurers who have discovered the extraordinary. Your next chapter awaits in the mountains.", order: 6 },
  ];

  for (const block of blocks) {
    await prisma.storyBlock.create({ data: block });
  }
  console.log(`   ✓ ${blocks.length} story blocks seeded`);
}

// ─── FINAL SEED COORDINATOR ───────────────────────────────

async function seed() {
  console.log("🌱 Seeding complete DEMO database...\n");
  await seedRolesAndPermissions();
  await seedCategories();
  await seedUsers();
  await seedHeroSlides();
  await seedExperiences();
  await seedSlots();
  await seedBookings();
  await seedTripOperations();
  await seedBlogs();
  await seedReviews();
  await seedWishlist();
  await seedLeads();
  await seedPlatformSettings();
  await seedStoryBlocks();
  console.log("\n🎉 Full DEMO seed complete! All features populated.");
  console.log("\n📋 Demo Credentials:");
  console.log("   Super Admin   : superadmin@paramadventures.in  / Demo@1234");
  console.log("   Admin         : admin@paramadventures.in       / Demo@1234");
  console.log("   Trip Manager  : manager@paramadventures.in     / Demo@1234");
  console.log("   Trek Lead 1   : treklead1@paramadventures.in   / Demo@1234");
  console.log("   Trek Lead 2   : treklead2@paramadventures.in   / Demo@1234");
  console.log("   Customer 1    : rahul.verma@gmail.com          / Demo@1234");
  console.log("   Customer 2    : sneha.kapoor@gmail.com         / Demo@1234");
  console.log("   Customer 3    : amit.singh@gmail.com           / Demo@1234");
  console.log("   Customer 4    : divya.patel@gmail.com          / Demo@1234");
  console.log("   Customer 5    : rohan.joshi@gmail.com          / Demo@1234");
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
