import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and conditions for booking experiences with Param Adventures.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4 prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-black font-heading mb-8">
          Terms and Conditions
        </h1>

        <p className="text-lg text-foreground/70 mb-8">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing or using Param Adventures website and booking our
            trekking or adventure services, you agree to be bound by these Terms
            and Conditions. If you disagree with any part of these terms, you
            may not access our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Bookings and Payments</h2>
          <p>
            All bookings are subject to availability and confirmation. A booking
            is only confirmed once full or partial payment (as specified per
            trip) has been received. We reserve the right to cancel bookings if
            payment is not received within the specified timeframe. Payments are
            securely processed via Razorpay.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            3. Cancellation and Refunds
          </h2>
          <p>
            Cancellations made 30 days or more before the trip start date are
            eligible for a full refund minus a 10% processing fee. Cancellations
            made between 15-29 days before the trip are eligible for a 50%
            refund. No refunds are provided for cancellations made less than 15
            days before the trip. In the event Param Adventures cancels a trip
            due to weather or operational reasons, a full refund or free
            rescheduling will be offered.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Health and Safety</h2>
          <p>
            Trekking and adventure sports involve inherent risks. Participants
            are responsible for ensuring they meet the physical and medical
            requirements of the chosen activity. It is mandatory to disclose any
            pre-existing medical conditions before booking. The Trek Lead has
            the final authority to refuse participation if they determine a
            participant is unfit or endangers the group.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Code of Conduct</h2>
          <p>
            Participants are expected to respect nature, local cultures, and
            fellow trekkers. Consumption of alcohol or illegal substances during
            the active trek is strictly prohibited. Param Adventures maintains a
            zero-tolerance policy for harassment or discrimination. Violators
            may be immediately expelled from the trip without refund.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Liability Waiver</h2>
          <p>
            While we prioritize safety, Param Adventures and its vendors/leads
            shall not be liable for any injury, loss, damage, or death occurring
            during the trip, except where such liability cannot be excluded by
            law. Participants must sign a physical liability waiver before the
            trip commences.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">7. Contact Information</h2>
          <p>
            For any questions regarding these Terms, please contact us at
            support@paramadventures.com.
          </p>
        </section>
      </div>
    </div>
  );
}
