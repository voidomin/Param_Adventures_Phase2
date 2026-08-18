import { describe, expect, it, vi } from "vitest";
import { assignInvoiceNumberIfNeeded, getFinancialYearLabel, issueCreditNote } from "@/lib/invoice-numbering";

describe("getFinancialYearLabel", () => {
  it("labels an April date as the start of that year's FY", () => {
    expect(getFinancialYearLabel(new Date("2026-04-01T00:00:00Z"))).toBe("26-27");
  });

  it("labels a December date as still within the FY that started in April", () => {
    expect(getFinancialYearLabel(new Date("2026-12-15T00:00:00Z"))).toBe("26-27");
  });

  it("labels a January/February/March date as part of the PREVIOUS calendar year's FY", () => {
    expect(getFinancialYearLabel(new Date("2027-01-10T00:00:00Z"))).toBe("26-27");
    // 10:00 UTC = 15:30 IST -- still March 31st in IST.
    expect(getFinancialYearLabel(new Date("2027-03-31T10:00:00Z"))).toBe("26-27");
  });

  it("rolls over right at the FY boundary in IST, not UTC", () => {
    // 19:00 UTC on Mar 31 = 00:30 IST on Apr 1 -- already the new FY in
    // IST even though the UTC calendar date is still March.
    expect(getFinancialYearLabel(new Date("2027-03-31T19:00:00Z"))).toBe("27-28");
    expect(getFinancialYearLabel(new Date("2027-04-01T00:00:00Z"))).toBe("27-28");
  });
});

describe("assignInvoiceNumberIfNeeded", () => {
  const createTx = (existingInvoiceNumber: string | null, lastNumber: number) => ({
    booking: {
      findUnique: vi.fn().mockResolvedValue({ invoiceNumber: existingInvoiceNumber }),
      update: vi.fn().mockResolvedValue({}),
    },
    invoiceSequence: {
      upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber }),
    },
  });

  it("returns the existing invoice number unchanged without touching the sequence", async () => {
    const tx = createTx("PARAM/26-27/0007", 7);

    const result = await assignInvoiceNumberIfNeeded(tx as any, "booking-1", new Date("2026-08-15"));

    expect(result).toBe("PARAM/26-27/0007");
    expect(tx.invoiceSequence.upsert).not.toHaveBeenCalled();
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("assigns the next sequential number, zero-padded, when none exists", async () => {
    const tx = createTx(null, 1);

    const result = await assignInvoiceNumberIfNeeded(tx as any, "booking-2", new Date("2026-08-15"));

    expect(result).toBe("PARAM/26-27/0001");
    expect(tx.invoiceSequence.upsert).toHaveBeenCalledWith({
      where: { fiscalYear: "26-27" },
      create: { fiscalYear: "26-27", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-2" },
      data: { invoiceNumber: "PARAM/26-27/0001" },
    });
  });

  it("uses booking createdAt date to derive fiscal year sequence", async () => {
    const tx = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          invoiceNumber: null,
          createdAt: new Date("2025-05-10T10:00:00Z"),
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      invoiceSequence: {
        upsert: vi.fn().mockResolvedValue({ fiscalYear: "25-26", lastNumber: 5 }),
      },
    };

    const result = await assignInvoiceNumberIfNeeded(tx as any, "booking-4", new Date("2026-08-15"));

    expect(result).toBe("PARAM/25-26/0005");
    expect(tx.invoiceSequence.upsert).toHaveBeenCalledWith({
      where: { fiscalYear: "25-26" },
      create: { fiscalYear: "25-26", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
  });

  it("grows past 4 digits instead of truncating", async () => {
    const tx = createTx(null, 10042);

    const result = await assignInvoiceNumberIfNeeded(tx as any, "booking-3", new Date("2026-08-15"));

    expect(result).toBe("PARAM/26-27/10042");
  });
});

describe("issueCreditNote", () => {
  const createTx = (lastNumber: number) => ({
    creditNoteSequence: {
      upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber }),
    },
    creditNote: {
      create: vi.fn().mockResolvedValue({}),
    },
  });

  it("issues a sequential, 16-char-max credit note number in its own series", async () => {
    const tx = createTx(1);

    const result = await issueCreditNote(
      tx as any,
      { bookingId: "booking-1", amount: 5000, reason: "Customer cancelled" },
      new Date("2026-08-15"),
    );

    expect(result).toBe("PARAM/CN/26/0001");
    expect(result.length).toBeLessThanOrEqual(16);
    expect(tx.creditNoteSequence.upsert).toHaveBeenCalledWith({
      where: { fiscalYear: "26-27" },
      create: { fiscalYear: "26-27", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    expect(tx.creditNote.create).toHaveBeenCalledWith({
      data: { bookingId: "booking-1", creditNoteNumber: "PARAM/CN/26/0001", amount: 5000, reason: "Customer cancelled" },
    });
  });

  it("does not reuse a number across separate refund events -- each call gets the next one", async () => {
    const tx = createTx(3);

    const result = await issueCreditNote(tx as any, { bookingId: "booking-2", amount: 1200 }, new Date("2026-09-01"));

    expect(result).toBe("PARAM/CN/26/0003");
  });

  it("uses its own sequence table, independent of invoice numbers", async () => {
    const invoiceTx = {
      booking: { findUnique: vi.fn().mockResolvedValue({ invoiceNumber: null }), update: vi.fn().mockResolvedValue({}) },
      invoiceSequence: { upsert: vi.fn().mockResolvedValue({ fiscalYear: "26-27", lastNumber: 1 }) },
    };
    const creditTx = createTx(1);

    const invoiceNumber = await assignInvoiceNumberIfNeeded(invoiceTx as any, "booking-3", new Date("2026-08-15"));
    const creditNoteNumber = await issueCreditNote(creditTx as any, { bookingId: "booking-3", amount: 500 }, new Date("2026-08-15"));

    expect(invoiceNumber).toBe("PARAM/26-27/0001");
    expect(creditNoteNumber).toBe("PARAM/CN/26/0001");
  });
});
