import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres1:NKz5CTCzxYwKov4K8YrWlTyvKvR1oFVu@dpg-d72kst0ule4c73e88crg-a.singapore-postgres.render.com/param_adventure";

async function fixPaidAmountDrift() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("Starting DB Repair for Stale paidAmount Drift...");

    // Find all bookings where paymentStatus = 'PAID' but paidAmount < totalPrice - 0.01
    const staleBookings = await pool.query(`
      SELECT b.id, b."totalPrice", b."paidAmount", b."paymentStatus", b."bookingStatus"
      FROM "Booking" b
      WHERE b."paymentStatus" = 'PAID' AND (b."paidAmount" < b."totalPrice" - 0.01);
    `);

    console.log(`Found ${staleBookings.rows.length} bookings with stale paidAmount.`);

    if (staleBookings.rows.length === 0) {
      console.log("No repair needed!");
      return;
    }

    let updatedCount = 0;
    for (const b of staleBookings.rows) {
      // Find the highest total amount of PAID payments for this booking (or use totalPrice)
      const paymentsRes = await pool.query(`
        SELECT SUM(amount) AS total_paid_sum
        FROM "Payment"
        WHERE "bookingId" = $1 AND status = 'PAID';
      `, [b.id]);

      const sumPaid = Number(paymentsRes.rows[0]?.total_paid_sum) || 0;
      const targetPaidAmount = sumPaid > 0 ? sumPaid : Number(b.totalPrice);

      await pool.query(`
        UPDATE "Booking"
        SET "paidAmount" = $1, "remainingBalance" = 0
        WHERE id = $2;
      `, [targetPaidAmount, b.id]);

      updatedCount++;
    }

    console.log(`Successfully repaired ${updatedCount} booking records in live database.`);

  } catch (err) {
    console.error("Error executing repair script:", err.message);
  } finally {
    await pool.end();
  }
}

fixPaidAmountDrift();
