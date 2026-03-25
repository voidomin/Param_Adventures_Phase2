import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/lib/slugify';

describe('generateSlug', () => {
  it('returns empty string for empty or nullish input', () => {
    expect(generateSlug('')).toBe('');
    // @ts-expect-error - testing invalid JS inputs
    expect(generateSlug(null)).toBe('');
    // @ts-expect-error - testing invalid JS inputs
    expect(generateSlug(undefined)).toBe('');
  });

  it('converts basic text to lowercase with hyphens', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
    expect(generateSlug('This is a Test')).toBe('this-is-a-test');
  });

  it('normalizes diacritics and accented characters', () => {
    expect(generateSlug('Crème Brûlée')).toBe('creme-brulee');
    expect(generateSlug('Jalapeño')).toBe('jalapeno');
    expect(generateSlug('über')).toBe('uber');
  });

  it('removes special characters and symbols', () => {
    expect(generateSlug('Hello @ World!')).toBe('hello-world');
    expect(generateSlug('100% Free & Open Source')).toBe('100-free-open-source');
    expect(generateSlug('What?! (yes, really)')).toBe('what-yes-really');
  });

  it('collapses multiple spaces, underscores, and hyphens into a single hyphen', () => {
    expect(generateSlug('too   many    spaces')).toBe('too-many-spaces');
    expect(generateSlug('some_underscore_text')).toBe('some-underscore-text');
    expect(generateSlug('already---hyphenated')).toBe('already-hyphenated');
    expect(generateSlug('mixed_ _ - characters')).toBe('mixed-characters');
  });

  it('strips leading and trailing hyphens', () => {
    expect(generateSlug(' - leading hyphen')).toBe('leading-hyphen');
    expect(generateSlug('trailing hyphen - ')).toBe('trailing-hyphen');
    expect(generateSlug('-_-')).toBe('');
  });
});
