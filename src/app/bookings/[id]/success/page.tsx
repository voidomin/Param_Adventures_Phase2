import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CalendarDays, MapPin, Users, MessageCircle, Phone, CreditCard, CheckCircle2, Mountain } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import DownloadInvoiceBtn from "@/components/booking/DownloadInvoiceBtn";
import DownloadItineraryBtn from "@/components/experiences/DownloadItineraryBtn";

type Props = { params: Promise<{ id: string }> };

export default async function BookingSuccessPage({
  params,
}: Readonly<Props>) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  if (!payload?.userId) {
    redirect("/login");
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      experience: true,
      slot: {
        include: {
          manager: true,
          assignments: {
            include: {
              trekLead: true,
            },
          },
        },
      },
      participants: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking) {
    redirect("/dashboard");
  }

  // Ensure the user actually owns this booking
  if (booking.userId !== payload.userId) {
    redirect("/dashboard");
  }

  const { experience, slot, participants, payments } = booking;
  const payment = payments[0]; // the most recent one

  // Dates
  const startDate = slot?.date ? new Date(slot.date) : null;
  const endDate = startDate ? new Date(startDate) : null;
  if (endDate) {
    endDate.setDate(endDate.getDate() + experience.durationDays - 1);
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const dateString =
    startDate && endDate
      ? `${formatDate(startDate)} – ${formatDate(endDate)}`
      : "Dates TBD";

  // Financials
  // In Phase 2, we might not have a detailed breakdown stored in Booking.
  // We'll calculate a mock breakdown based on totalPrice for display purposes, 
  // or just show total if we don't have taxes/fees separated in DB.
  const totalPaid = Number(booking.totalPrice) || 0;
  const baseFare = Number((booking as any).baseFare) || totalPaid;

  const taxItems = Array.isArray((booking as any).taxBreakdown) 
    ? (booking as any).taxBreakdown as unknown as { name: string, percentage: number, amount: number }[]
    : [];

  // Leads
  const trekLeads = slot?.assignments?.map((a) => a.trekLead) || [];

  const adventureImage = experience.cardImage || experience.coverImage || experience.images?.[0];

  return (
    <main className="min-h-screen bg-background/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-linear-to-r from-green-900 via-green-800 to-green-900 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl border border-green-800/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
          
          <div className="w-16 h-16 shrink-0 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          
          <div className="flex-1 text-center sm:text-left z-10">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              BOOKING CONFIRMED!
            </h1>
            <p className="text-green-100/80 font-medium mt-1 uppercase tracking-wider text-sm">
              Booking ID: {booking.id.split("-")[0].toUpperCase()}
            </p>
          </div>
          
          <div className="text-center sm:text-right z-10 bg-black/20 px-6 py-4 rounded-xl border border-white/10 backdrop-blur-sm">
            <p className="font-bold text-white mb-0.5">Payment Successful</p>
            <p className="text-sm text-green-200/80">
              Reference: {payment?.providerPaymentId || "N/A"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Adventure Summary */}
            <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row gap-6">
              <Link 
                href={`/experiences/${experience.slug}`}
                className="w-full sm:w-48 xl:w-56 aspect-[4/3] sm:aspect-square shrink-0 rounded-xl overflow-hidden relative border border-border/50 group/img hover:border-primary/50 transition-colors"
                title={`Back to ${experience.title}`}
              >
                {adventureImage ? (
                  <Image 
                    src={adventureImage} 
                    alt={experience.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/img:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Mountain className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                   <div className="bg-white/90 text-black px-3 py-1.5 rounded-full text-xs font-bold opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg">
                      View Trip
                   </div>
                </div>
              </Link>
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Your Adventure Summary
                </h2>
                <div className="space-y-2.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-3 border-b border-border/50 pb-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-foreground">Destination</span>
                      {experience.title} ({experience.location})
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-b border-border/50 pb-2">
                    <CalendarDays className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-foreground">Dates & Duration</span>
                      {dateString} • {experience.durationDays} Days / {Math.max(1, experience.durationDays - 1)} Nights
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-foreground">Meeting Point</span>
                      {experience.meetingPoint || "To be communicated by Trip Manager"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                <h3 className="text-lg font-bold text-foreground">Guest Details</h3>
              </div>
              <div className="p-0">
                {/* Desktop Table - Hidden on smaller screens */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[10px] font-black text-foreground/40 uppercase tracking-widest bg-muted/20 border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4">Guest</th>
                        <th className="px-6 py-4">Email Address</th>
                        <th className="px-6 py-4">Phone Number</th>
                        <th className="px-6 py-4">Personal Details</th>
                        <th className="px-6 py-4 whitespace-nowrap">Pickup & Drop</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {participants.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${p.isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/40'}`}>
                                {idx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{p.name}</span>
                                {p.isPrimary && (
                                  <span className="w-fit text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black tracking-tighter mt-1">Primary Host</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-foreground/80 font-medium">
                            {p.email || "—"}
                          </td>
                          <td className="px-6 py-4 text-foreground/80 font-medium">
                            {p.phoneNumber || "—"}
                          </td>
                          <td className="px-6 py-4 text-foreground/70">
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-medium">Age: {p.age || "—"}</span>
                              <span className="opacity-40">•</span>
                              <span className="font-medium">{p.gender || "—"}</span>
                              <span className="opacity-40">•</span>
                              <span className="font-medium">Blood: {p.bloodGroup || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2 text-foreground/80">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-medium">{p.pickupPoint || "Meeting Point"}</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards - Better for vertical stacking without scroll */}
                <div className="xl:hidden divide-y divide-border/50">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="p-6 space-y-4 hover:bg-muted/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${p.isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/40'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-lg text-foreground block">{p.name}</span>
                            {p.isPrimary && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-black tracking-wider">Primary Host</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block">Contact Information</span>
                          <div className="text-foreground/80 font-semibold">{p.email || "No email"}</div>
                          <div className="text-foreground/80 font-semibold">{p.phoneNumber || "No phone"}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block">Personal Details</span>
                          <div className="text-foreground/70 font-medium">
                            {p.age ? `Age: ${p.age}` : "Age: —"} • {p.gender || "—"} • Blood: {p.bloodGroup || "—"}
                          </div>
                        </div>
                        <div className="md:col-span-2 pt-2">
                           <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block mb-2">Logistics</span>
                           <div className="flex items-center gap-2 bg-muted/40 p-3 rounded-xl border border-border/50">
                              <MapPin className="w-5 h-5 text-primary shrink-0" />
                              <span className="font-bold text-foreground">{p.pickupPoint || "Assigned by Trip Manager"}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Confirmation */}
            <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col sm:flex-row">
              <div className="bg-muted/40 p-6 sm:w-1/2 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border/50">
                <h3 className="text-lg font-bold text-foreground mb-4">Payment Confirmation</h3>
                <div className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-1">Total Paid</div>
                <div className="text-4xl font-black text-foreground">₹{totalPaid.toLocaleString("en-IN")}</div>
              </div>
              <div className="p-6 sm:w-1/2 space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">Base Fare</span>
                  <span className="font-semibold text-foreground">₹{baseFare.toLocaleString("en-IN")}</span>
                </div>
                {taxItems.map((tax, idx) => (
                  <div key={`${tax.name}-${idx}`} className="flex justify-between items-center py-1">
                    <span className="text-foreground/60">{tax.name} ({tax.percentage}%)</span>
                    <span className="font-semibold text-foreground">₹{(Number(tax.amount) || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {taxItems.length === 0 && (
                   <div className="flex justify-between items-center py-1">
                    <span className="text-foreground/60">Taxes & Fees</span>
                    <span className="font-semibold text-foreground">₹{(totalPaid - baseFare).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="border-t border-border/50 my-1"></div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">Method</span>
                  <span className="font-bold text-foreground flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    {payment?.provider || "Online"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-foreground/60">Status</span>
                  <span className="font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-md uppercase text-xs tracking-wider">
                    {payment?.status || booking.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Column (Narrower) */}
          <div className="space-y-6">
            
            {/* Essential Downloads */}
            <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b border-border/50">
                <h3 className="text-base font-bold text-foreground">Next Steps & Preparation</h3>
              </div>
              <div className="p-5 space-y-3">
                <DownloadItineraryBtn slug={experience.slug} variant="success" />
                <DownloadInvoiceBtn bookingId={booking.id} />
              </div>
            </div>

            {/* Expedition Team */}
            <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b border-border/50">
                <h3 className="text-base font-bold text-foreground">Your Expedition Team</h3>
              </div>
              <div className="p-5 space-y-5">
                {trekLeads.length > 0 ? (
                  trekLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-4">
                      {lead.avatarUrl ? (
                         <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-border">
                         <Image src={lead.avatarUrl} alt={lead.name} width={48} height={48} className="object-cover w-full h-full" />
                       </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <span className="font-bold text-primary">{lead.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Trek Lead</div>
                        <div className="font-bold text-foreground truncate">{lead.name}</div>
                        <div className="flex items-center gap-3 mt-1.5">
                           {lead.phoneNumber && (
                             <a href={`https://wa.me/${lead.phoneNumber.replaceAll(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 px-2 py-1 rounded-md transition-colors">
                               <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                             </a>
                           )}
                           {lead.phoneNumber && (
                              <a href={`tel:${lead.phoneNumber}`} className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70 bg-muted hover:bg-muted/80 px-2 py-1 rounded-md transition-colors">
                                <Phone className="w-3.5 h-3.5" /> Call
                              </a>
                           )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 bg-muted/20 border border-dashed border-border rounded-xl">
                    <p className="text-sm font-medium text-foreground/60 mb-1">Coming Soon</p>
                    <p className="text-xs text-foreground/40 px-4">Trek leads will be assigned closer to your departure date.</p>
                  </div>
                )}

                {slot?.manager && (
                   <div className="pt-5 border-t border-border/50">
                      <div className="flex items-center gap-4">
                      {slot.manager.avatarUrl ? (
                         <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border grayscale hover:grayscale-0 transition-all">
                         <Image src={slot.manager.avatarUrl} alt={slot.manager.name} width={40} height={40} className="object-cover w-full h-full" />
                       </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                          <span className="font-bold text-foreground/50">{slot.manager.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-0.5">Trip Manager</div>
                        <div className="font-semibold text-foreground truncate text-sm">{slot.manager.name}</div>
                        {slot.manager.phoneNumber && (
                          <a href={`tel:${slot.manager.phoneNumber}`} className="text-xs text-primary hover:underline mt-0.5 inline-block">Contact Support</a>
                        )}
                      </div>
                    </div>
                   </div>
                )}
              </div>
            </div>

            {/* Social Share */}
            <div className="text-center pt-2 pb-4">
               <p className="font-bold text-foreground mb-3 text-sm">Share Your Adventure!</p>
               <div className="flex items-center justify-center gap-3">
                  <button className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 transform hover:scale-110">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 transform hover:scale-110">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 transform hover:scale-110">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                  </button>
               </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
