"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, Phone, MapPin, InstagramIcon, YoutubeIcon, X, FacebookIcon, LinkedinIcon } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on admin, auth, and specific dashboard operational routes if desired.
  // The user requested Manager and Trek Lead to have the global header/footer,
  // so we won't hide it on those, but we will hide it on pure Admin and Auth pages.
  if (
    pathname.startsWith("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password")
  ) {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/param-logo.png"
                alt="Param Adventures"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-xl font-heading font-bold text-foreground">
                <span className="text-primary">PARAM</span> Adventures
              </span>
            </Link>
            <p className="text-sm text-foreground/60 leading-relaxed">
              Curated experiences, spiritual journeys, and unforgettable treks
              across India's most breathtaking landscapes. Discover the
              extraordinary with us.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61576234846405"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
                title="Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/param.adventures?igsh=MXUzc25yYTN5NXRmZw%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
                title="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.youtube.com/@ParamAdventures"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
                title="YouTube"
              >
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/Adventures49054"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
                title="X (Twitter)"
              >
                <X className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/param-adventures-936248397/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors"
                title="LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">
              Explore
            </h3>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li>
                <Link
                  href="/experiences"
                  className="hover:text-primary transition-colors"
                >
                  All Adventures
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-primary transition-colors"
                >
                  Travel Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-primary transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">
              Legal
            </h3>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="hover:text-primary transition-colors"
                >
                  Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">
              Get in Touch
            </h3>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>
                  123 Adventure Lane, Himalayas,
                  <br />
                  India 175131
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <a
                  href="mailto:hello@paramadventures.com"
                  className="hover:text-primary transition-colors"
                >
                  hello@paramadventures.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} Param Adventures. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground/40">
            <span>Powered by</span>
            <span className="font-bold text-foreground/60">Param Tech</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
