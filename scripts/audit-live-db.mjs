import pg from "pg";

const connectionString = "postgresql://postgres1:NKz5CTCzxYwKov4K8YrWlTyvKvR1oFVu@dpg-d72kst0ule4c73e88crg-a.singapore-postgres.render.com/param_adventure";

async function runAudit() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const sampleBooking = await pool.query(`
      SELECT b.id, b."totalPrice", b."paidAmount", b."paymentStatus", b."bookingStatus", b."createdAt",
             p.id AS payment_id, p.amount AS payment_amount, p.status AS payment_status, p.provider
      FROM "Booking" b
      LEFT JOIN "Payment" p ON p."bookingId" = b.id
      WHERE b."paymentStatus" = 'PAID' AND b."paidAmount" = 0.00
      LIMIT 3;
    `);

    console.log("=== Zero paidAmount Bookings Detail ===");
    console.log(sampleBooking.rows);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

runAudit();
