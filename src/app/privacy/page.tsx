import { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and data handling practices.",
};

export default async function PrivacyPage() {
  const siteTitle = await prisma.siteSetting.findUnique({ where: { key: "site_title" } });
  const supportEmail = await prisma.siteSetting.findUnique({ where: { key: "support_email" } });
  
  const title = siteTitle?.value || "Param Adventures";
  const email = supportEmail?.value || "info@paramadventures.in";

  return (
    <LegalLayout title="Privacy Policy">
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
        <p>
          When you register, book an experience, or interact with {title}, 
          we may collect the following types of information:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Personal Details:</strong> Name, email address, phone
            number, and emergency contact details.
          </li>
          <li>
            <strong>Health Information:</strong> Necessary medical history or
            dietary restrictions required for your safety during treks.
          </li>
          <li>
            <strong>Payment Information:</strong> Transaction details securely
            processed through our payment gateway (Razorpay). We do not store
            full credit card numbers.
          </li>
          <li>
            <strong>Device and Usage Data:</strong> IP address, browser type,
            and interactions with our application to improve our services.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          2. How We Use Your Information
        </h2>
        <p>
          We use the collected information for various purposes, including:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            Processing bookings, managing trip manifests, and coordinating
            logistics.
          </li>
          <li>
            Sending transactional emails, booking confirmations, and trip
            updates.
          </li>
          <li>
            Ensuring participant safety by sharing relevant health/emergency
            information securely with the assigned Trek Lead.
          </li>
          <li>Improving our website, services, and customer support.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          3. Data Sharing and Disclosure
        </h2>
        <p>
          We do not sell or rent your personal information to third parties.
          We may share your information only in the following circumstances:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Service Providers:</strong> Vendors, homestays, or
            transport operators who require your details to facilitate the
            trip (e.g., permit applications).
          </li>
          <li>
            <strong>Trek Leads and Managers:</strong> Authorized personnel who
            need access to the trip manifest for operational and safety
            reasons.
          </li>
          <li>
            <strong>Legal Requirements:</strong> If required by law,
            regulation, or legal process to protect the rights and safety of
            Param Adventures.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal data against unauthorized access, alteration,
          disclosure, or destruction. However, no method of transmission over
          the internet or electronic storage is 100% secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you have the right to access,
          correct, update, or request deletion of your personal information.
          You can manage your profile details directly from the User Dashboard
          or by contacting us.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or
          our data practices, please contact us at {email}.
        </p>
      </section>
    </LegalLayout>
  );
}
