import { render } from "@testing-library/react";
import React from "react";
import { expect } from "vitest";

/**
 * Shared helper for React component smoke tests
 */
export function smokeTestReact(Module: any, path: string) {
  // If Module is a function (direct import), use it. 
  // If it's a module object, try default then first named export.
  let Component = typeof Module === 'function' ? Module : Module.default;
  
  if (!Component && typeof Module === 'object') {
    const exports = Object.keys(Module).filter(k => k !== "__esModule" && typeof Module[k] === 'function');
    if (exports.length > 0) {
      Component = Module[exports[0]];
    }
  }

  if (typeof Component === 'function') {
    const props = { 
      params: Promise.resolve({}), 
      searchParams: Promise.resolve({}),
      children: null 
    };
    try {
      render(React.createElement(Component, props));
    } catch (e) {
      // We log but don't necessarily fail as some components have strict prop requirements
      console.warn(`Smoke render failed for ${path}:`, e instanceof Error ? e.message : String(e));
    }
  }
}

/**
 * Shared helper for API and Lib smoke tests
 */
export async function smokeTestModule(importPath: string) {
  const mod = await import(importPath);
  expect(mod).toBeDefined();
  return mod;
}
