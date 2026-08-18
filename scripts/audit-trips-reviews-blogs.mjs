import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres1:NKz5CTCzxYwKov4K8YrWlTyvKvR1oFVu@dpg-d72kst0ule4c73e88crg-a.singapore-postgres.render.com/param_adventure";

async function auditTripsReviewsBlogs() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("=== 1. SLOTS & TRIP STATUS AUDIT ===");
    const slotsRes = await pool.query(`
      SELECT status, count(*) AS count
      FROM "Slot"
      GROUP BY status;
    `);
    console.table(slotsRes.rows);

    const pastUncompletedSlots = await pool.query(`
      SELECT id, date, status, "capacity", "remainingCapacity"
      FROM "Slot"
      WHERE date < NOW() - INTERVAL '1 day' AND status != 'COMPLETED'
      ORDER BY date DESC
      LIMIT 10;
    `);
    console.log(`\nPast slots that are NOT completed: ${pastUncompletedSlots.rows.length}`);
    console.table(pastUncompletedSlots.rows);

    console.log("\n=== 2. BOOKING CAN_REVIEW & ATTENDED AUDIT ===");
    const bookingsReviewRes = await pool.query(`
      SELECT "bookingStatus", "attended", "canReview", count(*) AS count
      FROM "Booking"
      GROUP BY "bookingStatus", "attended", "canReview";
    `);
    console.table(bookingsReviewRes.rows);

    console.log("\n=== 3. REVIEWS TABLE AUDIT ===");
    const reviewsRes = await pool.query(`
      SELECT count(*) AS total_reviews FROM "ExperienceReview";
    `);
    console.log(`Total Experience Reviews in DB: ${reviewsRes.rows[0].total_reviews}`);

    console.log("\n=== 4. BLOGS TABLE AUDIT ===");
    const blogsRes = await pool.query(`
      SELECT status, count(*) AS count
      FROM "Blog"
      GROUP BY status;
    `);
    console.table(blogsRes.rows);

  } catch (err) {
    console.error("Error executing audit:", err.message);
  } finally {
    await pool.end();
  }
}

auditTripsReviewsBlogs();
