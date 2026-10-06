// Runs before every component test file.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

// jsdom does not have these browser features. Components and Radix call them, so give them harmless stand-ins.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false });
}
if (!window.ResizeObserver) window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function () {};
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
