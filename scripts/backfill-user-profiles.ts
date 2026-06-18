import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getMissingProfileFields(
  user: any,
  participant: any
) {
  const updateData: Record<string, any> = {};

  const isStringEmpty = (val: string | null | undefined) => !val || val.trim() === "";

  const isPhoneEmpty = (phone: string | null | undefined) => {
    if (!phone) return true;
    const trimmed = phone.trim();
    return trimmed === "" || /^0+$/.test(trimmed);
  };

  const stringFields = [
    "name",
    "gender",
    "bloodGroup",
    "emergencyContactName",
    "emergencyContactNumber",
    "emergencyRelationship",
  ];

  for (const field of stringFields) {
    const userVal = user[field];
    const partVal = participant[field];
    if (isStringEmpty(userVal) && !isStringEmpty(partVal)) {
      updateData[field] = partVal.trim();
    }
  }

  if (isPhoneEmpty(user.phoneNumber) && !isPhoneEmpty(participant.phoneNumber)) {
    updateData.phoneNumber = participant.phoneNumber!.trim();
  }

  if (!user.dateOfBirth && participant.dateOfBirth) {
    const dob = new Date(participant.dateOfBirth);
    updateData.dateOfBirth = dob;
    updateData.age = calculateAge(dob);
  }

  return updateData;
}

async function run() {
  console.log("Starting backfill for user profiles based on bookings...");

  // Query users who have at least one empty profile field
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: "" },
        { phoneNumber: null },
        { phoneNumber: "" },
        { gender: null },
        { gender: "" },
        { dateOfBirth: null },
        { bloodGroup: null },
        { bloodGroup: "" },
        { emergencyContactName: null },
        { emergencyContactName: "" },
        { emergencyContactNumber: null },
        { emergencyContactNumber: "" },
        { emergencyRelationship: null },
        { emergencyRelationship: "" },
      ],
    },
    include: {
      bookings: {
        include: {
          participants: true,
        },
        orderBy: {
          createdAt: "asc", // Pick the first trip/booking
        },
      },
    },
  });

  console.log(`Found ${users.length} users with potentially incomplete profiles.`);

  let updatedCount = 0;

  for (const user of users) {
    // Look for a booking that contains participant details
    const bookingWithParticipants = user.bookings.find((b) => b.participants.length > 0);
    if (!bookingWithParticipants) {
      continue;
    }

    // Find the primary participant, or fall back to the first participant
    const primaryParticipant =
      bookingWithParticipants.participants.find((p) => p.isPrimary) ||
      bookingWithParticipants.participants[0];

    if (!primaryParticipant) {
      continue;
    }

    const fieldsToUpdate = getMissingProfileFields(user, primaryParticipant);

    // If we have fields to update, write to DB
    if (Object.keys(fieldsToUpdate).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: fieldsToUpdate,
      });
      console.log(`Updated user ${user.email} with fields:`, Object.keys(fieldsToUpdate));
      updatedCount++;
    }
  }

  console.log(`Backfill process completed. Updated ${updatedCount} users.`);
}

run()
  .catch((error) => {
    console.error("Error running backfill script:", error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
