import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, FileText } from "lucide-react";
import { getPolicyTiersForGroup, type PolicyTier } from "@/lib/refund-engine";
import { CancellationPolicyGroup } from "@prisma/client";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Param Adventures",
  description: "Our transparent policy regarding trek cancellations, rescheduling, and refunds.",
};

const POLICY_GROUPS: { key: CancellationPolicyGroup; heading: string }[] = [
  { key: "SHORT_TRIP", heading: "One- & Two-Days Treks or Trips" },
  { key: "MULTI_DAY", heading: "Multiple Days Treks or Trips" },
  { key: "INTERNATIONAL", heading: "International Treks & Trips" },
];

function tierLabel(tier: PolicyTier): string {
  if (tier.maxDays === null) {
    return `${tier.minDays}+ days before departure`;
  }
  if (tier.minDays === 0) {
    return `${tier.maxDays} days or less before departure`;
  }
  return `${tier.minDays}-${tier.maxDays} days before departure`;
}

function PolicyTierTable({ heading, tiers }: Readonly<{ heading: string; tiers: PolicyTier[] }>) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-heading font-bold border-b border-border pb-4">{heading}</h2>
      <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {tiers.map((tier) => (
          <div key={`${tier.minDays}-${tier.maxDays}`} className="flex items-center justify-between p-4 bg-card">
            <span className="font-semibold text-foreground/80">{tierLabel(tier)}</span>
            <span className={`font-black text-lg ${tier.refundPercent > 0 ? "text-green-600" : "text-red-500"}`}>
              {tier.refundPercent}% refund
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-foreground/50">
        The refund percentage above applies to whatever you&apos;ve actually paid, whether that&apos;s the full
        amount or just an advance payment. Shifting your booking to another available date instead of cancelling
        can be arranged through our support team — it isn&apos;t yet available as a self-service option in the app.
      </p>
    </div>
  );
}

export default async function RefundsPage() {
  const tiersByGroup = await Promise.all(POLICY_GROUPS.map((g) => getPolicyTiersForGroup(g.key)));

  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 md:py-32 bg-foreground/[0.02] border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-6 tracking-tight">
              Cancellation & <span className="text-primary italic">Refund Policy</span>
            </h1>
            <p className="text-xl text-foreground/60 leading-relaxed font-medium">
              We understand that plans can change. Here is our transparent policy regarding cancellations and refunds to ensure a smooth experience for everyone.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-20">

            {/* Tables Section */}
            <div className="space-y-12">
              {POLICY_GROUPS.map((group, i) => (
                <PolicyTierTable key={group.key} heading={group.heading} tiers={tiersByGroup[i]} />
              ))}
            </div>

            {/* Refund & Cancellation Policy Details */}
            <div className="space-y-12 bg-card border border-border p-8 md:p-12 rounded-[32px]">
              <div className="flex items-center gap-4 mb-8">
                <FileText className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-heading font-black">Refund & Cancellation Policy</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> General Terms
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>All refunds will be processed to the original mode of payment within 5–7 working days.</li>
                    <li>Any GST charged on transactions is non-refundable for a bank transfer — choosing a travel voucher instead includes GST and the convenience fee (see our <Link href="/voucher-policy" className="text-primary underline">Voucher Policy</Link>).</li>
                    <li>Refund amounts are calculated after deducting applicable cancellation charges from what you&apos;ve actually paid.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> Payment & Due Amount Policy
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>Full payment must be completed by the deadline shown on your booking.</li>
                    <li>Late-payment penalty percentages, where applicable, are arranged through our support team rather than charged automatically in the app.</li>
                    <li>Failure to clear dues within the deadline will result in automatic cancellation, and the standard cancellation policy will apply.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span> Cancellation by Participant
                  </h3>
                  <div className="space-y-3 text-foreground/70">
                    <p className="font-semibold text-foreground">Standard Cancellation:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Cancellation charges will depend on the time of cancellation relative to the departure date, per the tables above.</li>
                      <li>Any applicable refund will be issued after deductions as per policy.</li>
                    </ul>
                    <p className="font-semibold text-foreground mt-4">Fitness-Based Cancellation:</p>
                    <p>If a participant is unable to join due to fitness criteria not being met, this is handled by our support team as a manual exception rather than a self-service option — reach out to discuss your options.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span> Transfer of Booking
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>Transferring a booking to another individual, subject to fulfillment of all eligibility and fitness requirements, can be arranged through our support team — it isn&apos;t yet a self-service option in the app.</li>
                    <li>
                      Once transferred:
                      <ul className="list-[circle] pl-5 mt-2 space-y-1">
                        <li>The booking becomes non-cancellable.</li>
                        <li>No refund or voucher will be issued thereafter.</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span> During the Trek / Trip
                  </h3>
                  <p className="text-foreground/70">No refund or voucher will be provided if a participant:</p>
                  <ul className="space-y-2 text-foreground/70 list-disc pl-5">
                    <li>Leaves the trek voluntarily.</li>
                    <li>Is asked to descend due to:
                      <ul className="list-[circle] pl-5 mt-1 space-y-1">
                        <li>Altitude sickness</li>
                        <li>Health issues (e.g., blood pressure, injury)</li>
                        <li>Lack of fitness</li>
                        <li>Rule violations (including smoking, drinking, misconduct)</li>
                        <li>Failure to adhere to trek guidelines (e.g., turnaround time)</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span> Cancellation by the Company
                  </h3>
                  <div className="space-y-3 text-foreground/70">
                    <p>In rare cases where the company cancels a trek due to natural events, political unrest, pandemics, or any force majeure situation, you receive a full refund of whatever you paid (including GST and the convenience fee).</p>
                    <p className="font-semibold text-foreground">Resolution Options:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong className="text-foreground">Alternate Trek Option:</strong> arranged through our support team — choosing a different trek in place of a refund isn&apos;t yet a self-service option in the app.
                      </li>
                      <li>
                        <strong className="text-foreground">Trek Voucher:</strong> if you&apos;d rather not book anything else right now, the full amount can be issued as a voucher instead of a bank refund. See our <Link href="/voucher-policy" className="text-primary underline">Voucher Policy</Link> for how vouchers work.
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span> Force Majeure / Emergency Policy
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>In cases of war, pandemics, natural disasters, or other force majeure events, this policy may be superseded by a special Emergency Cancellation Policy.</li>
                    <li>Decisions in such situations will be made in the best interest of safety and feasibility.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span> Important Notes
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>Refund timelines are subject to banking processes.</li>
                    <li>All decisions made by the company regarding safety, cancellations, and policy application will be final and binding.</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Contact CTA */}
            <div className="text-center py-10">
              <p className="text-foreground/50 mb-6 font-medium">Have questions about your specific booking?</p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-10 py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                Contact Support Team
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
