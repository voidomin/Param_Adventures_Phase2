import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/admin/mock-path',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const tags = ['div', 'button', 'span', 'p', 'h1', 'h2', 'h3', 'section', 'footer', 'header', 'nav', 'aside', 'main', 'article', 'ul', 'ol', 'li', 'video', 'img'];

  const motion: Record<string, (props: any) => unknown> = {};
  tags.forEach((tag) => {
    motion[tag] = (props: any) => {
      const {
        initial, animate, exit, transition, variants, whileHover, whileTap, whileInView,
        whileDrag, whileFocus, viewport, layout, layoutId, custom, inherit, static: _static,
        onAnimationStart, onAnimationComplete, onUpdate, onHoverStart, onHoverEnd,
        onTapStart, onTap, onTapCancel, onPan, onPanStart, onPanSessionStart, onPanEnd,
        ...rest
      } = props;

      return React.createElement(
        tag,
        {
          ...rest,
          'data-testid': layoutId ? `motion-${tag}-${layoutId}` : props['data-testid'],
        },
        props.children,
      );
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

vi.mock('jspdf', () => {
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
  (MockJsPDF as any).GState = class {
    opacity = 1;
    constructor(public props: any) {}
  };

  return { default: MockJsPDF };
});