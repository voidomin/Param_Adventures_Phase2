import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Polyfill for HTMLDialogElement (JSDOM does not support showModal/close)
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
}

// Global Mocks to reduce duplication across the test suite
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/admin/mock-path",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
  cookies: () => ({ get: vi.fn(), set: vi.fn() }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    booking: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    experience: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    category: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    review: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    blog: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    hero: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
  }
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "mock-admin-id", role: "ADMIN" } }),
  hashPassword: vi.fn().mockResolvedValue("hashed_pwd"),
  comparePasswords: vi.fn().mockResolvedValue(true),
  generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
  generateRefreshToken: vi.fn().mockReturnValue("mock_refresh_token"),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn().mockResolvedValue({ authorized: true, user: { id: "mock-admin-id", role: "ADMIN" } }),
}));

vi.mock("framer-motion", () => {
  const React = require("react");
  const tags = ["div", "button", "span", "p", "h1", "h2", "h3", "section", "footer", "header", "nav", "aside", "main", "article", "ul", "ol", "li", "video", "img"];
  
  const motion: any = {};
  tags.forEach(tag => {
    motion[tag] = (props: any) => {
      const {
        initial, animate, exit, transition, variants, whileHover, whileTap, whileInView,
        whileDrag, whileFocus, viewport, layout, layoutId, custom, inherit, static: _static,
        onAnimationStart, onAnimationComplete, onUpdate, onHoverStart, onHoverEnd,
        onTapStart, onTap, onTapCancel, onPan, onPanStart, onPanSessionStart, onPanEnd,
        ...rest
      } = props;

      return React.createElement(tag, {
        ...rest,
        "data-testid": layoutId ? `motion-${tag}-${layoutId}` : props["data-testid"],
      }, props.children);
    };
  });

  return {
    motion,
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => [vi.fn(), true],
    useScroll: () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } }),
  };
});

// Mock jspdf for all tests
vi.mock("jspdf", () => {
  const MockJsPDF = vi.fn().mockImplementation(function (this: any) {
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    this.lastAutoTable = { finalY: 100 };
    return this;
  });

  MockJsPDF.prototype.save = vi.fn().mockReturnThis();
  MockJsPDF.prototype.addPage = vi.fn().mockReturnThis();
  MockJsPDF.prototype.text = vi.fn().mockReturnThis();
  MockJsPDF.prototype.addImage = vi.fn().mockReturnThis();
  MockJsPDF.prototype.getNumberOfPages = vi.fn(() => 1);
  MockJsPDF.prototype.setPage = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setFontSize = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setFont = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setTextColor = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setFillColor = vi.fn().mockReturnThis();
  MockJsPDF.prototype.rect = vi.fn().mockReturnThis();
  MockJsPDF.prototype.line = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setLineWidth = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setDrawColor = vi.fn().mockReturnThis();
  MockJsPDF.prototype.splitTextToSize = vi.fn((text) => [text]);
  MockJsPDF.prototype.roundedRect = vi.fn().mockReturnThis();
  MockJsPDF.prototype.setGState = vi.fn().mockReturnThis();
  MockJsPDF.prototype.circle = vi.fn().mockReturnThis();
  (MockJsPDF as any).GState = class { opacity = 1; constructor(public props: any) {} };

  return { default: MockJsPDF };
});

// Mock jspdf-autotable
vi.mock("jspdf-autotable", () => ({
  default: vi.fn((doc, options) => {
    doc.lastAutoTable = { finalY: (options.startY || 0) + 50 };
  }),
}));

