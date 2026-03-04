import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using Param Adventures services.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-heading font-black text-foreground mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-foreground/40 mb-12">
          Last updated: March 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-foreground/80 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using the Param Adventures website and services,
              you agree to be bound by these Terms &amp; Conditions. If you do
              not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              2. Services
            </h2>
            <p>
              Param Adventures provides curated trekking, adventure, and
              experiential travel services across India. Our services include
              trip planning, booking management, and on-ground coordination for
              outdoor experiences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              3. Booking &amp; Payments
            </h2>
            <p>
              All bookings are subject to availability. Payments are processed
              securely through Razorpay. Once a booking is confirmed and payment
              is received, you will receive a confirmation email with your
              booking details.
            </p>
            <p className="mt-2">
              Prices listed on the website are in Indian Rupees (INR) and
              include applicable taxes unless stated otherwise. Param Adventures
              reserves the right to modify pricing at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              4. Cancellation &amp; Refunds
            </h2>
            <p>
              Cancellation policies vary by experience. Specific cancellation
              terms will be provided at the time of booking. Refunds, if
              applicable, will be processed within 7–14 business days to the
              original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              5. User Responsibilities
            </h2>
            <p>
              Participants are responsible for ensuring they are physically fit
              and medically cleared for the activities they book. Param
              Adventures is not liable for injuries, illness, or accidents
              caused by participants{"'"} negligence or failure to disclose
              medical conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              6. Intellectual Property
            </h2>
            <p>
              All content on this website, including text, images, logos, and
              design, is the property of Param Adventures and is protected by
              copyright laws. Unauthorized reproduction or distribution is
              prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              7. Limitation of Liability
            </h2>
            <p>
              Param Adventures shall not be held liable for any indirect,
              incidental, or consequential damages arising from the use of our
              services. Our total liability is limited to the amount paid for
              the specific booking in question.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              8. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the website after changes constitutes acceptance of the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              9. Contact Us
            </h2>
            <p>
              For questions about these Terms &amp; Conditions, please contact
              us at{" "}
              <a
                href="mailto:support@paramadventures.com"
                className="text-primary hover:underline font-semibold"
              >
                support@paramadventures.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <Link
            href="/privacy"
            className="text-primary text-sm font-semibold hover:underline"
          >
            Read our Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  );
}
