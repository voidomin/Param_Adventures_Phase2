"use client";

import DownloadInvoiceBtn from "@/components/booking/DownloadInvoiceBtn";

export default function TestInvoicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          Invoice Preview
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Click the button below to generate and download a dummy tax invoice with the new design and organization logo.
        </p>
        <div className="w-full max-w-xs mx-auto">
          <DownloadInvoiceBtn bookingId="dummy" />
        </div>
      </div>
    </div>
  );
}
