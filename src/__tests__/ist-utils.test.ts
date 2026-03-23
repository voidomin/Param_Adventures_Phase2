import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayInIST, dateInIST, isSlotDayToday } from '@/lib/ist-utils';

describe('ist-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayInIST returns the correct IST date string for today', () => {
    // Set system time to UTC midnight, Jan 1, 2024
    // IST is UTC+5:30 -> Jan 1, 2024 05:30 AM
    const mockDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    vi.setSystemTime(mockDate);
    expect(todayInIST()).toBe('2024-01-01');
  });

  it('todayInIST accounts for timezone rollover (UTC late night -> IST next day)', () => {
    // Set system time to UTC 20:00 (8:00 PM), Jan 1, 2024
    // IST is UTC+5:30 -> Jan 2, 2024 01:30 AM
    const mockDate = new Date(Date.UTC(2024, 0, 1, 20, 0, 0));
    vi.setSystemTime(mockDate);
    expect(todayInIST()).toBe('2024-01-02');
  });

  it('dateInIST converts a given Date object to its IST calendar representation', () => {
    const testDate = new Date(Date.UTC(2024, 5, 15, 21, 0, 0)); // June 15, 21:00 UTC -> June 16, 02:30 IST
    expect(dateInIST(testDate)).toBe('2024-06-16');
  });

  it('isSlotDayToday returns true if the slot date is today in IST', () => {
    // Current time: Jan 1, 10:00 UTC -> Jan 1, 15:30 IST
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 10, 0, 0)));
    
    // Slot time: Jan 1, 01:00 UTC -> Jan 1, 06:30 IST
    const slotDate = new Date(Date.UTC(2024, 0, 1, 1, 0, 0));
    expect(isSlotDayToday(slotDate)).toBe(true);
  });

  it('isSlotDayToday returns false if the slot date is not today in IST', () => {
    // Current time: Jan 1, 10:00 UTC -> Jan 1, 15:30 IST
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 10, 0, 0)));
    
    // Slot time: Jan 2, 01:00 UTC -> Jan 2, 06:30 IST
    const slotDate = new Date(Date.UTC(2024, 0, 2, 1, 0, 0));
    expect(isSlotDayToday(slotDate)).toBe(false);
  });
});
