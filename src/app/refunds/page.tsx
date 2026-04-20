import React from "react";
import { Metadata } from "next";
import { ShieldAlert, RefreshCw, AlertCircle, Clock, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Our policy regarding trek cancellations, rescheduling, and refunds.",
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 md:py-32 bg-foreground/[0.02] border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
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
          <div className="max-w-4xl mx-auto space-y-16">
            
            {/* Cancellation Schedule */}
            <div className="space-y-8">
              <h2 className="text-3xl font-heading font-bold flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />
                Standard Cancellation Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card border border-border p-8 rounded-[32px] hover:border-primary/50 transition-colors">
                  <h3 className="text-xl font-bold mb-4">30+ Days Before Departure</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-primary">80%</span>
                    <span className="text-foreground/60 font-bold uppercase tracking-wider text-xs">Refund</span>
                  </div>
                  <p className="text-foreground/60 text-sm">
                    A 20% administrative fee will be deducted from the total booking amount.
                  </p>
                </div>

                <div className="bg-card border border-border p-8 rounded-[32px] hover:border-primary/50 transition-colors">
                  <h3 className="text-xl font-bold mb-4">15-30 Days Before Departure</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-primary">50%</span>
                    <span className="text-foreground/60 font-bold uppercase tracking-wider text-xs">Refund</span>
                  </div>
                  <p className="text-foreground/60 text-sm">
                    50% of the total booking amount will be refunded.
                  </p>
                </div>

                <div className="bg-card border border-border p-8 rounded-[32px] hover:border-primary/50 transition-colors">
                  <h3 className="text-xl font-bold mb-4">7-15 Days Before Departure</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-primary">25%</span>
                    <span className="text-foreground/60 font-bold uppercase tracking-wider text-xs">Refund</span>
                  </div>
                  <p className="text-foreground/60 text-sm">
                    25% of the total booking amount will be refunded.
                  </p>
                </div>

                <div className="bg-card border border-border p-8 rounded-[32px] border-red-500/20 bg-red-500/5">
                  <h3 className="text-xl font-bold mb-4 text-red-500">Less Than 7 Days</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-red-500">0%</span>
                    <span className="text-red-500/60 font-bold uppercase tracking-wider text-xs text-red-500/60">Refund</span>
                  </div>
                  <p className="text-red-500/70 text-sm font-medium">
                    No refunds will be provided for cancellations made within 7 days of the trek departure date.
                  </p>
                </div>
              </div>
            </div>

            {/* Rescheduling */}
            <div className="bg-primary/5 border border-primary/20 rounded-[40px] p-10 md:p-16">
               <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary" />
                Rescheduling & Substitutions
              </h2>
              <div className="space-y-6 text-foreground/70 leading-relaxed text-lg">
                <p>
                   <strong>Substitutions:</strong> You may substitute a participant for your booking up to 72 hours before departure at no extra cost, provided the new participant meets all health and technical requirements for the trek.
                </p>
                <p>
                   <strong>Rescheduling:</strong> Rescheduling requests made more than 15 days before departure will incur a 10% rescheduling fee. Requests made between 7-15 days will be treated as cancellations, though we may offer custom discounts on future bookings at our discretion.
                </p>
              </div>
            </div>

            {/* Important Notes */}
            <div className="space-y-8">
              <h2 className="text-3xl font-heading font-bold flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-primary" />
                Important Considerations
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  "Refunds are processed to the original payment method within 7-10 business days.",
                  "In case of trek cancellation by Param Adventures due to weather or safety concerns, a full refund or future trip credit will be provided.",
                  "Any service fees charged by payment gateways are non-refundable.",
                  "Customized private trips may have different cancellation terms specified at the time of booking."
                ].map((note, i) => (
                  <div key={i} className="flex gap-4 p-6 bg-card border border-border rounded-2xl items-center">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <p className="font-medium text-foreground/80">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact CTA */}
            <div className="text-center py-10">
              <p className="text-foreground/50 mb-6 font-medium">Have questions about your specific booking?</p>
              <a href="/contact" className="inline-flex items-center gap-2 px-10 py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                Contact Support Team
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
