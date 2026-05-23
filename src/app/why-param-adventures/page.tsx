import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Heart, Users, Award, ShieldCheck, Ban, Leaf, IndianRupee, HandHeart, Map, Globe, CalendarCheck, BriefcaseMedical, Coffee, Headset } from "lucide-react";

export const metadata: Metadata = {
  title: "Why Param Adventures? | Param Adventures",
  description: "Discover why Param Adventures is the best choice for your next trek, trip, or spiritual journey.",
};

const reasons = [
  {
    title: "Your Happiness & Safety is Our Reward",
    description: "With over 5 years of expertise in Himalayan, Western Ghats, and Sahyadri treks, Spiritual tours, Holiday Packages and more. We ensure every journey is safe, well-planned, and memorable.",
    icon: <Heart className="w-8 h-8 text-white" />,
    color: "bg-rose-500",
  },
  {
    title: "Inclusive for Everyone",
    description: "Whether you're a kid, adult, solo traveler, family, group of friends, or corporate team—we design experiences for all.",
    icon: <Users className="w-8 h-8 text-white" />,
    color: "bg-blue-500",
  },
  {
    title: "Certified & Experienced Leaders",
    description: "Our trek and trip leaders are trained professionals and certified first responders, ensuring you're always in safe hands.",
    icon: <Award className="w-8 h-8 text-white" />,
    color: "bg-amber-500",
  },
  {
    title: "Women-Friendly & Safe Environment",
    description: "We prioritize safety for women travelers and have dedicated female trek and trip leaders on trips.",
    icon: <ShieldCheck className="w-8 h-8 text-white" />,
    color: "bg-emerald-500",
  },
  {
    title: "Zero Tolerance for Smoking & Alcohol",
    description: "We promote clean, responsible, and mindful travel experiences.",
    icon: <Ban className="w-8 h-8 text-white" />,
    color: "bg-red-500",
  },
  {
    title: "Eco-Conscious Adventures",
    description: "“Leave No Trace” is our mantra—we strictly avoid plastic and protect nature at every step.",
    icon: <Leaf className="w-8 h-8 text-white" />,
    color: "bg-green-600",
  },
  {
    title: "Budget-Friendly Without Compromise",
    description: "Quality experiences at affordable prices—because adventure should be accessible to everyone.",
    icon: <IndianRupee className="w-8 h-8 text-white" />,
    color: "bg-violet-500",
  },
  {
    title: "Personalized Attention",
    description: "We focus on small group sizes to ensure every participant gets individual care and guidance.",
    icon: <HandHeart className="w-8 h-8 text-white" />,
    color: "bg-pink-500",
  },
  {
    title: "Local Expertise & Hidden Gems",
    description: "Discover offbeat trails and unexplored locations that typical tourists miss.",
    icon: <Map className="w-8 h-8 text-white" />,
    color: "bg-orange-500",
  },
  {
    title: "Community & Connection",
    description: "Meet like-minded adventurers, build friendships, and create unforgettable memories together.",
    icon: <Globe className="w-8 h-8 text-white" />,
    color: "bg-indigo-500",
  },
  {
    title: "Well-Planned Itineraries",
    description: "Every trip is thoughtfully curated to balance adventure, relaxation, and exploration.",
    icon: <CalendarCheck className="w-8 h-8 text-white" />,
    color: "bg-cyan-500",
  },
  {
    title: "Emergency Preparedness",
    description: "We are equipped with first-aid kits, safety protocols, and backup plans for all situations.",
    icon: <BriefcaseMedical className="w-8 h-8 text-white" />,
    color: "bg-red-600",
  },
  {
    title: "Authentic Experiences",
    description: "From local culture to regional food, we give you a real taste of every destination.",
    icon: <Coffee className="w-8 h-8 text-white" />,
    color: "bg-amber-700",
  },
  {
    title: "Customer-Centric Approach",
    description: "Your comfort, feedback, and experience matter—we continuously improve based on your needs.",
    icon: <Headset className="w-8 h-8 text-white" />,
    color: "bg-blue-600",
  },
];

export default function WhyParamAdventuresPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-foreground/[0.02] border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-heading font-black mb-6 tracking-tight">
              Why <span className="text-primary italic">Param Adventures?</span>
            </h1>
            <p className="text-xl md:text-2xl text-foreground/70 leading-relaxed font-medium">
              At Param Adventures, we don’t just organize trips—we create meaningful experiences that stay with you forever. Here is why thousands of adventurers choose us.
            </p>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reasons.map((reason, index) => (
              <div 
                key={index} 
                className="group p-8 rounded-[32px] bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/[0.02] rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${reason.color}`}>
                  {reason.icon}
                </div>
                <h3 className="text-2xl font-bold font-heading mb-4 text-foreground group-hover:text-primary transition-colors">
                  {reason.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed font-medium">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center bg-primary/5 border border-primary/20 rounded-[40px] p-12 md:p-20 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
            <h2 className="text-4xl font-heading font-black mb-6 relative z-10">Ready to start your journey?</h2>
            <p className="text-xl text-foreground/70 mb-10 max-w-2xl mx-auto relative z-10">
              Join us on our next adventure and experience the Param difference for yourself.
            </p>
            <Link href="/experiences" className="relative z-10 inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30">
              Explore Experiences
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
