import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Param Adventures",
  description: "Our transparent policy regarding trek cancellations, rescheduling, and refunds.",
};

export default function RefundsPage() {
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
              <div className="space-y-6">
                <h2 className="text-3xl font-heading font-bold border-b border-border pb-4">One- & Two-Days Treks or Trips</h2>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
                        <th className="p-4 border-b border-r border-border font-bold">Policy</th>
                        <th className="p-4 border-b border-r border-border font-bold">21 days Prior</th>
                        <th className="p-4 border-b border-r border-border font-bold">20-16 days</th>
                        <th className="p-4 border-b border-r border-border font-bold">15-6 days</th>
                        <th className="p-4 border-b border-border font-bold">5-0 days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Batch Shifting</td>
                        <td className="p-4 border-r border-border text-green-600 font-bold">✔</td>
                        <td className="p-4 border-r border-border text-green-600 font-bold">✔</td>
                        <td className="p-4 border-r border-border text-red-500 font-bold">✘</td>
                        <td className="p-4 font-bold text-red-500">✘</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Cancellation Charge</td>
                        <td className="p-4 border-r border-border">Free Cancellation</td>
                        <td className="p-4 border-r border-border">25% of the Trip Amount</td>
                        <td className="p-4 border-r border-border">50% of the Trip Amount</td>
                        <td className="p-4">100% of the Trip Amount</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Booking Amount</td>
                        <td className="p-4 border-r border-border">Refunded in mode of original payment</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Remaining Amount</td>
                        <td className="p-4 border-r border-border">Full Refund (deduction of 5% booking amount)</td>
                        <td className="p-4 border-r border-border">Refund, deduction 25% of the trip amount</td>
                        <td className="p-4 border-r border-border">Refund, deduction 50% of the trip amount</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-heading font-bold border-b border-border pb-4">Multiple Days Treks or Trips</h2>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
                        <th className="p-4 border-b border-r border-border font-bold">Policy</th>
                        <th className="p-4 border-b border-r border-border font-bold">46 days Prior</th>
                        <th className="p-4 border-b border-r border-border font-bold">45-31 days</th>
                        <th className="p-4 border-b border-r border-border font-bold">30-21 days</th>
                        <th className="p-4 border-b border-border font-bold">20-0 days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Batch Shifting</td>
                        <td className="p-4 border-r border-border text-green-600 font-bold">✔</td>
                        <td className="p-4 border-r border-border text-red-500 font-bold">✘</td>
                        <td className="p-4 border-r border-border text-red-500 font-bold">✘</td>
                        <td className="p-4 font-bold text-red-500">✘</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Cancellation Charge</td>
                        <td className="p-4 border-r border-border">Free Cancellation</td>
                        <td className="p-4 border-r border-border">50% of the Trip Amount</td>
                        <td className="p-4 border-r border-border">75% of the Trip Amount</td>
                        <td className="p-4">100% of the Trip Amount</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Booking Amount</td>
                        <td className="p-4 border-r border-border">Refunded in mode of original payment</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Remaining Amount</td>
                        <td className="p-4 border-r border-border">Full Refund (deduction of 5% booking amount)</td>
                        <td className="p-4 border-r border-border">Refund, deduction 50% of the trip amount</td>
                        <td className="p-4 border-r border-border">Refund, deduction 75% of the trip amount</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-heading font-bold border-b border-border pb-4">International Treks & Trips</h2>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
                        <th className="p-4 border-b border-r border-border font-bold">Policy</th>
                        <th className="p-4 border-b border-r border-border font-bold">61 days Prior</th>
                        <th className="p-4 border-b border-r border-border font-bold">60-46 days</th>
                        <th className="p-4 border-b border-r border-border font-bold">45-31 days</th>
                        <th className="p-4 border-b border-border font-bold">30-0 days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Batch Shifting</td>
                        <td className="p-4 border-r border-border text-green-600 font-bold">✔</td>
                        <td className="p-4 border-r border-border text-red-500 font-bold">✘</td>
                        <td className="p-4 border-r border-border text-red-500 font-bold">✘</td>
                        <td className="p-4 font-bold text-red-500">✘</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Cancellation Charge</td>
                        <td className="p-4 border-r border-border">Free Cancellation</td>
                        <td className="p-4 border-r border-border">50% of the Trip Amount</td>
                        <td className="p-4 border-r border-border">75% of the Trip Amount</td>
                        <td className="p-4">100% of the Trip Amount</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Booking Amount</td>
                        <td className="p-4 border-r border-border">Refunded in mode of original payment</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4 border-r border-border">Adjusted in Refund Deduction</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                      <tr>
                        <td className="p-4 border-r border-border font-semibold">Remaining Amount</td>
                        <td className="p-4 border-r border-border">Full Refund (deduction of 10% booking amount)</td>
                        <td className="p-4 border-r border-border">Refund, deduction 50% of the trip amount</td>
                        <td className="p-4 border-r border-border">Refund, deduction 75% of the trip amount</td>
                        <td className="p-4">No Refund</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
                    <li>Any GST charged on transactions is non-refundable.</li>
                    <li>Refund amounts are calculated after deducting the booking amount and applicable cancellation charges.</li>
                    <li>The remaining refundable amount (if any) will be based on the amount paid above the booking amount.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> Payment & Due Amount Policy
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>Full payment must be completed 30 days prior to departure.</li>
                    <li>
                      Late payment charges:
                      <ul className="list-[circle] pl-5 mt-2 space-y-1">
                        <li>5% penalty if paid up to 21 days before departure</li>
                        <li>10% penalty if paid up to 15 days before departure</li>
                      </ul>
                    </li>
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
                      <li>Cancellation charges will depend on the time of cancellation relative to the departure date.</li>
                      <li>Any applicable refund will be issued after deductions as per policy.</li>
                    </ul>
                    <p className="font-semibold text-foreground mt-4">Fitness-Based Cancellation:</p>
                    <p>If a participant is unable to join due to fitness criteria not being met:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>30+ days before departure: 50% refund issued as a trek voucher.</li>
                      <li>Within 30 days: No refund or voucher.</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span> Transfer of Booking
                  </h3>
                  <ul className="space-y-3 text-foreground/70 list-disc pl-5">
                    <li>Participants may transfer their booking to another individual, subject to fulfillment of all eligibility and fitness requirements.</li>
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
                    <p>In rare cases where the company cancels a trek due to natural events, political unrest, pandemics, or any force majeure situation.</p>
                    <p className="font-semibold text-foreground">Resolution Options:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong className="text-foreground">Alternate Trek Option (Primary Solution):</strong> Participants may choose an alternate trek. If lower price: balance issued as voucher. If higher: participant pays difference.
                      </li>
                      <li>
                        <strong className="text-foreground">Trek Voucher:</strong> If no suitable alternative is chosen, a voucher (excluding insurance charges) will be issued. Valid for 1 year and redeemable on any trek.
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

