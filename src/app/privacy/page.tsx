import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for Param Adventures — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-heading font-black text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-foreground/40 mb-12">
          Last updated: March 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-foreground/80 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              1. Information We Collect
            </h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Account Data:</strong> Name, email address, phone
                number, and password when you register.
              </li>
              <li>
                <strong>Booking Data:</strong> Trip preferences, participant
                details, and payment information.
              </li>
              <li>
                <strong>Usage Data:</strong> Pages visited, browser type, device
                information, and IP address.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              2. How We Use Your Information
            </h2>
            <p>Your information is used to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Process bookings and payments securely</li>
              <li>Send booking confirmations and trip updates via email</li>
              <li>Improve our website and services</li>
              <li>
                Communicate offers and new experiences (with your consent)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              3. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              personal data. All payment transactions are processed through
              Razorpay{"'"}s PCI-DSS compliant infrastructure. Passwords are
              hashed using bcrypt and are never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              4. Cookies
            </h2>
            <p>
              We use essential cookies for authentication (JWT tokens) to keep
              you logged in. We do not use third-party tracking cookies or
              invasive analytics. Your session data is stored securely and
              automatically expires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              5. Third-Party Services
            </h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Razorpay:</strong> Payment processing
              </li>
              <li>
                <strong>AWS S3 / Cloudinary:</strong> Media storage
              </li>
              <li>
                <strong>Resend:</strong> Transactional emails (booking
                confirmations, welcome emails)
              </li>
            </ul>
            <p className="mt-2">
              These services have their own privacy policies and handle data in
              accordance with their terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              6. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active.
              Booking records are kept for legal and accounting purposes. You
              may request deletion of your account and associated data at any
              time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              7. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access and download your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              8. Contact Us
            </h2>
            <p>
              For privacy-related queries, contact us at{" "}
              <a
                href="mailto:privacy@paramadventures.com"
                className="text-primary hover:underline font-semibold"
              >
                privacy@paramadventures.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <Link
            href="/terms"
            className="text-primary text-sm font-semibold hover:underline"
          >
            Read our Terms & Conditions →
          </Link>
        </div>
      </div>
    </main>
  );
}
