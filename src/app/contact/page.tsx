import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, MessageSquare, Clock, Globe } from "lucide-react";
import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Param Adventures. We're here to help you plan your next extraordinary journey.",
};

export default async function ContactPage() {
  const siteSettings = await withBuildSafety(() => prisma.siteSetting.findMany(), []);
  const getSiteVal = (key: string, fallback: string) => siteSettings.find(s => s.key === key)?.value || fallback;

  const supportEmail = getSiteVal("support_email", "info@paramadventures.in");
  const supportPhone = getSiteVal("support_phone", "+91 98765 43210");
  const officeAddress = getSiteVal("office_address", "Kullu, Himachal Pradesh,\nIndia 175131");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-foreground/[0.02] border-b border-border">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-heading font-black mb-6 tracking-tight">
              Get in <span className="text-primary italic">Touch</span>
            </h1>
            <p className="text-xl text-foreground/60 leading-relaxed font-medium">
              Have questions about a trek? Want to customize a group journey? 
              Our team of adventure experts is ready to help you craft the perfect itinerary.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            
            {/* Contact Information */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-8">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-card border border-border p-8 rounded-[32px] hover:border-primary/50 transition-colors group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Email Us</h3>
                    <a href={`mailto:${supportEmail}`} className="text-foreground/60 hover:text-primary transition-colors truncate block">
                      {supportEmail}
                    </a>
                  </div>

                  <div className="bg-card border border-border p-8 rounded-[32px] hover:border-primary/50 transition-colors group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Call Us</h3>
                    <a href={`tel:${supportPhone}`} className="text-foreground/60 hover:text-primary transition-colors block">
                      {supportPhone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-8 md:p-10 rounded-[40px] hover:border-primary/50 transition-colors group">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:rotate-12 transition-transform">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 italic font-heading">Our Basecamp</h3>
                    <p className="text-xl text-foreground/60 leading-relaxed whitespace-pre-line">
                      {officeAddress}
                    </p>
                    <div className="mt-8 pt-8 border-t border-border flex flex-wrap gap-6">
                       <div className="flex items-center gap-2 text-sm font-bold text-foreground/40 uppercase tracking-widest">
                         <Clock className="w-4 h-4 text-primary" /> Mon - Sat: 9AM - 7PM
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social or Extra Info */}
              <div className="flex items-center gap-6 p-4">
                <p className="text-sm font-bold uppercase tracking-widest text-foreground/40">Connect Everywhere</p>
                <div className="h-px flex-1 bg-border/50"></div>
                <div className="flex gap-4">
                  {/* Reuse share buttons or just icons */}
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Support Message */}
            <div className="lg:pl-10">
              <div className="bg-primary/5 border border-primary/20 p-10 md:p-16 rounded-[48px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10">
                  <h2 className="text-4xl font-heading font-black mb-6">Need Immediate <span className="text-primary italic text-5xl">Help?</span></h2>
                  <p className="text-lg text-foreground/70 mb-10 leading-relaxed">
                    Our team typically responds to all inquiries within 24 hours. For urgent matters during treks, please use the direct WhatsApp number provided in your booking confirmation.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-6 bg-background/50 backdrop-blur-md rounded-3xl border border-primary/20 shadow-xl shadow-primary/5">
                      <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black">1</div>
                      <p className="font-bold">Browse our <Link href="/experiences" className="text-primary hover:underline">Adventures</Link></p>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-background/50 backdrop-blur-md rounded-3xl border border-primary/20 shadow-xl shadow-primary/5">
                      <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black">2</div>
                      <p className="font-bold">Read our <Link href="/blog" className="text-primary hover:underline">Travel Stories</Link></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
