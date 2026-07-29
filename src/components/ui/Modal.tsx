"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Overrides the default card styling entirely if provided. */
  readonly panelClassName?: string;
  /** Element to focus when the dialog opens, instead of the first focusable element. */
  readonly initialFocus?: RefObject<HTMLElement | null>;
}

const DEFAULT_PANEL_CLASSES =
  "bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200";

/**
 * Shared accessible modal shell: Escape-to-close, a focus trap confined to
 * the panel, and focus restored to the trigger on close all come from
 * Headless UI's Dialog, rather than being hand-rolled per call site (which
 * is how every modal in this app worked before -- copy-pasted `fixed
 * inset-0` divs with none of that behavior).
 */
export function Modal({ open, onClose, children, panelClassName, initialFocus }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} initialFocus={initialFocus} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className={cn(panelClassName ?? DEFAULT_PANEL_CLASSES)}>{children}</DialogPanel>
      </div>
    </Dialog>
  );
}
