# Refund & Travel Coupon Modules - Unified Tracking & Risk Ledger

This document serves as the single source of truth for upcoming hooks, integrations, future enhancements, and risk mitigations for both the **Bank Transfer Refund Module** and the **Travel Coupon Credit Wallet**.

---

## 1. Company-Initiated Slot Cancellation Hook

### Objective
Automatically trigger 100% refunds (Base Fare + GST + Convenience Fee) or offer a 110% Travel Coupon value when the admin cancels an entire operational slot (e.g. due to weather, permits, low occupancy, or other company reasons).

### Integration Steps
1. Locate the slot cancellation controller (where slot status is set to `CANCELLED` or the slot is deleted).
2. Retrieve all active bookings related to that slot.
3. Call the calculation helper in `src/lib/refund-engine.ts` with `isCompanyCancellation: true`:
   ```typescript
   const breakdown = calculateRefundBreakdown({
     baseFare: Number(booking.baseFare),
     totalPrice: Number(booking.totalPrice),
     paidAmount: Number(booking.paidAmount),
     paymentType: booking.paymentType,
     refundPercent: 0, // Ignored since isCompanyCancellation is true
     taxBreakdown: booking.taxBreakdown,
     isCompanyCancellation: true, // Triggers 100% calculation
   });
   ```
4. Create the matching `RefundRequest` or generate the 110% `TravelCoupon` based on customer preference.

---

## 2. Future Travel Coupon Enhancements

- [ ] **110% Coupon Incentive Claim UI**
  - Render an option in the Customer Dashboard booking details modal for company-cancelled trips, allowing them to choose a 110% Travel Coupon instead of a 100% bank transfer refund.
- [ ] **Gift Vouchers**
  - Allow customers to buy travel vouchers/credits and assign them directly to another customer's email.
- [ ] **Referral & Sign-up Incentives**
  - Automate coupon code generation on successful sign-ups via referral links (e.g., credit ₹500 to both referee and referrer upon first trek completion).
- [ ] **Loyalty & Birthday Rewards**
  - Automatically distribute seasonal discount codes or birthday credits via a cron hook.

---

## 3. Potential Bugs, Gaps & Mitigation Strategies

Below are potential technical bugs, concurrency edge cases, and operational risks that could arise after this development, along with their solutions.

### Risk A: Prisma Concurrency / Serialization Failures (`P2034`)
* **The Bug**: We use the `Serializable` isolation level in database transactions to prevent double spending of travel coupons during simultaneous checkout checkouts. However, if two concurrent requests access the same coupon record, PostgreSQL/Prisma will throw a serialization error (`P2034`) and rollback one of the checkouts.
* **The Symptoms**: A customer checkout fails unexpectedly with a server error, even though their coupon has active credits.
* **The Mitigation**:
  - Implement a retry handler for database transactions when serialization failure is encountered.
  - Or catch Prisma `P2034` in the booking route and show a user-friendly error message asking them to retry, or automatically retry the transaction up to 3 times with a short exponential backoff.

### Risk B: Timezone Expiry Offset Mismatch
* **The Bug**: Coupon validation checks `expiryDate < now`. Since dates in Prisma are stored in UTC, if a customer tries to checkout at 11:30 PM Indian Standard Time (IST) on the day of expiry, the UTC timestamp might already be in the next day, marking the coupon as `EXPIRED` prematurely.
* **The Symptoms**: Customers complain that their coupons expire 5.5 hours before midnight on the expiry date.
* **The Mitigation**:
  - Ensure coupon expiry checks normalize both dates to the start/end of the day in local IST before comparing:
    ```typescript
    const nowLocal = new Date(); // local server timezone or adjust to UTC+5.5
    // Set validation comparison to match local calendar day bounds
    ```

### Risk C: Double Cancellation / Double Refund Race
* **The Bug**: A customer clicks "Cancel Booking" twice rapidly, or submits two API requests simultaneously for the same booking.
* **The Symptoms**: The system creates duplicate `RefundRequest` entries or issues duplicate refund `TravelCoupon` records for the same booking cancellation.
* **The Mitigation**:
  - The booking status update is done inside a transaction where we first check `bookingStatus`.
  - In `cancel-participants` API, we check if the booking is already `CANCELLED` or if the booking participant is already `isCancelled`. This check is inside the database transaction, preventing double execution.

### Risk D: Refunding Expired Vouchers
* **The Bug**: A customer cancels a booking that was paid for with a coupon. The coupon's expiry date was yesterday.
* **The Symptoms**: If the restoration engine doesn't verify the coupon expiry, it might restore balance to a coupon that is already expired.
* **The Mitigation**:
  - We have proactively built checks in `restoreCouponsForBooking` that check `coupon.expiryDate < new Date()`. If expired, it skips restoration of that coupon's value. This is fully verified by our unit test suite.
