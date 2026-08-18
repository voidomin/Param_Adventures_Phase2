import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres1:NKz5CTCzxYwKov4K8YrWlTyvKvR1oFVu@dpg-d72kst0ule4c73e88crg-a.singapore-postgres.render.com/param_adventure";

async function unlockPastBookingReviews() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("Starting Live DB Repair: Unlocking Customer Review Eligibility for Past Trips...");

    // Find all CONFIRMED bookings for slots with departure dates in the past (date < NOW())
    const queryResult = await pool.query(`
      UPDATE "Booking" b
      SET "canReview" = true, "attended" = true
      FROM "Slot" s
      WHERE b."slotId" = s.id
        AND b."bookingStatus" = 'CONFIRMED'
        AND s.date < NOW()
        AND (b."canReview" = false OR b."attended" = false);
    `);

    console.log(`Successfully updated ${queryResult.rowCount} past customer bookings in live database.`);

    // Also mark past uncompleted slots as COMPLETED if departure date < NOW() - 24 hours
    const slotsResult = await pool.query(`
      UPDATE "Slot"
      SET status = 'COMPLETED', "completedAt" = NOW()
      WHERE date < NOW() - INTERVAL '1 day'
        AND status IN ('UPCOMING', 'ACTIVE', 'TREK_STARTED', 'TREK_ENDED');
    `);

    console.log(`Successfully auto-completed ${slotsResult.rowCount} past departure slots in live database.`);

  } catch (err) {
    console.error("Error executing repair script:", err.message);
  } finally {
    await pool.end();
  }
}

unlockPastBookingReviews();
