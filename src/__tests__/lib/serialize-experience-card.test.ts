import { describe, it, expect } from "vitest";
import { serializeExperienceForCard } from "@/lib/serialize-experience-card";

const baseExperience = {
  id: "exp1",
  title: "Test Trek",
  basePrice: { toString: () => "5000" } as unknown as number,
  advancePaymentAmount: null,
  capacity: 10,
  slots: [] as { date: Date | string; capacity: number; remainingCapacity: number }[],
} as any;

describe("serializeExperienceForCard", () => {
  it("converts basePrice to a plain number", () => {
    const result = serializeExperienceForCard(baseExperience);
    expect(result.basePrice).toBe(5000);
  });

  it("derives nextDeparture and nextDepartureSlot from the first valid slot", () => {
    const exp = {
      ...baseExperience,
      slots: [
        { date: new Date("2026-06-15T00:00:00.000Z"), capacity: 10, remainingCapacity: 4 },
        { date: new Date("2026-07-01T00:00:00.000Z"), capacity: 10, remainingCapacity: 10 },
      ],
    };
    const result = serializeExperienceForCard(exp);
    expect(result.nextDeparture).toBe("2026-06-15T00:00:00.000Z");
    expect(result.nextDepartureSlot).toEqual({
      date: "2026-06-15T00:00:00.000Z",
      capacity: 10,
      remainingCapacity: 4,
    });
    expect(result.upcomingSlots).toHaveLength(2);
  });

  it("filters out slots with an invalid date", () => {
    const exp = {
      ...baseExperience,
      slots: [{ date: "not-a-date", capacity: 10, remainingCapacity: 10 }],
    };
    const result = serializeExperienceForCard(exp);
    expect(result.upcomingSlots).toHaveLength(0);
    expect(result.nextDeparture).toBeNull();
    expect(result.nextDepartureSlot).toBeNull();
  });

  it("returns null nextDeparture when there are no slots", () => {
    const result = serializeExperienceForCard(baseExperience);
    expect(result.nextDeparture).toBeNull();
    expect(result.nextDepartureSlot).toBeNull();
  });

  it("converts advancePaymentAmount to a number when present, null otherwise", () => {
    const withAdvance = { ...baseExperience, advancePaymentAmount: { toString: () => "1500" } };
    expect(serializeExperienceForCard(withAdvance).advancePaymentAmount).toBe(1500);
    expect(serializeExperienceForCard(baseExperience).advancePaymentAmount).toBeNull();
  });
});
