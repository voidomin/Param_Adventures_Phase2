import Link from "next/link";
import { Mountain, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Mountain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-heading font-black text-white tracking-tight">
                Param Adventures
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-6">
              Curated trekking &amp; adventure experiences across India&apos;s
              most breathtaking landscapes. From Himalayan base camps to
              spiritual trails — we make extraordinary accessible.
            </p>
            <div className="flex flex-col gap-2 text-white/30 text-sm">
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                support@paramadventures.com
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                India
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "All Experiences", href: "/experiences" },
                { label: "Blog", href: "/blog" },
                { label: "Dashboard", href: "/dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/40 text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Terms & Conditions", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/40 text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} Param Adventures. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">Made with ❤️ for adventurers</p>
        </div>
      </div>
    </footer>
  );
}
