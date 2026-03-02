"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, Compass, Map, BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Explore", href: "/experiences", icon: Compass },
    { name: "My Bookings", href: "/bookings", icon: Map },
    { name: "Stories", href: "/blogs", icon: BookOpen },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/param-logo.png"
              alt="Param Adventures"
              width={40}
              height={40}
              className="rounded-full"
              priority
            />
            <span className="text-lg font-heading font-bold tracking-wide hidden sm:block">
              <span className="text-primary">PARAM</span>{" "}
              <span className="text-foreground/60">Adventures</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <div
        className={cn(
          "md:hidden fixed inset-0 top-16 bg-background z-40 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col p-6 space-y-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-xl font-heading font-medium flex items-center gap-4 border-b border-border pb-4"
            >
              <link.icon className="w-6 h-6 text-primary" />
              {link.name}
            </Link>
          ))}
          <Link
            href="/login"
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-lg font-bold text-center block"
          >
            Sign In to Book
          </Link>
        </div>
      </div>
    </nav>
  );
}
