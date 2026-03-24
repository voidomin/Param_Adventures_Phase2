import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

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
