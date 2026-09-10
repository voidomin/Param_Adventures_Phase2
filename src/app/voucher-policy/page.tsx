import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Ticket, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Travel Voucher Policy | Param Adventures",
  description: "How travel vouchers and coupons are issued, redeemed, and expire at Param Adventures.",
};

export default function VoucherPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 md:py-32 bg-foreground/[0.02] border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
              <Ticket className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-6 tracking-tight">
              Travel <span className="text-primary italic">Voucher Policy</span>
            </h1>
            <p className="text-xl text-foreground/60 leading-relaxed font-medium">
              Travel vouchers (also called coupons or trek credits) let you carry value forward to a future
              booking instead of a cash refund. Here&apos;s exactly how they&apos;re issued, used, and expire.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-12 bg-card border border-border p-8 md:p-12 rounded-[32px]">
            <div className="flex items-center gap-4 mb-8">
              <FileText className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-heading font-black">Voucher Terms</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> What Is a Travel Voucher
                </h3>
                <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                  <li>A travel voucher is a credit code issued to your account, redeemable against the price of a future booking with us.</li>
                  <li>It is not currency and cannot be exchanged for cash.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> How a Voucher Is Issued
                </h3>
                <div className="space-y-3 text-foreground/70">
                  <p>A voucher can reach your account in one of three ways:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">Cancellation Refund:</strong> when you cancel a booking
                      and choose a voucher instead of a bank transfer. Choosing a voucher is the only refund method
                      where GST and the convenience fee are included in the credited amount — a bank refund
                      never includes these (see our{" "}
                      <Link href="/refunds" className="text-primary underline">Cancellation &amp; Refund Policy</Link>).
                    </li>
                    <li>
                      <strong className="text-foreground">Goodwill Credit:</strong> issued at our discretion, for
                      example to make up for a service issue on a trip.
                    </li>
                    <li>
                      <strong className="text-foreground">Promotional Credit:</strong> issued as part of a
                      marketing offer, referral reward, or similar campaign.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span> Using a Voucher
                </h3>
                <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                  <li>A voucher is locked to the account it was issued to — it cannot be transferred, gifted, or resold to another person.</li>
                  <li>It can be applied toward any available booking, unless a specific voucher states otherwise.</li>
                  <li>If a booking costs less than the voucher&apos;s balance, only the amount used is deducted — the remaining balance stays available for a future booking.</li>
                  <li>A voucher can be used across more than one booking over time, until its balance reaches zero.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span> Validity &amp; Expiry
                </h3>
                <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                  <li>Every voucher carries its own validity period, set when it&apos;s issued — by default, 1 year from the date of issue.</li>
                  <li>Any balance still unused once a voucher expires is forfeited and cannot be reinstated.</li>
                  <li>Your account section shows the current balance and expiry date for every voucher you hold.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span> Vouchers on a Cancelled Booking
                </h3>
                <div className="space-y-3 text-foreground/70">
                  <p>If you used a voucher on a booking that you later cancel:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>The unspent portion of that voucher is restored to your account once our team has reviewed and approved the cancellation&apos;s refund — this is a manual review, so it is not instant.</li>
                    <li>How much is restored still follows the standard cancellation charges for the timing of your cancellation.</li>
                    <li>If the voucher itself has since expired, its balance cannot be restored.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span> Misuse &amp; Fraud Prevention
                </h3>
                <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                  <li>We reserve the right to block or cancel a voucher, without prior notice, where we suspect misuse, fraud, or a violation of these terms.</li>
                  <li>All decisions relating to voucher issuance, validity, and blocking are final.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center py-10">
            <p className="text-foreground/50 mb-6 font-medium">Have a question about a voucher on your account?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-10 py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
              Contact Support Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
