import '@testing-library/jest-dom/vitest';
import { resetFactories } from './factories.ts';
import { beforeEach } from 'vitest';

// jsdom doesn't implement CSS transforms in getComputedStyle.
// vaul (Drawer) reads transform and calls .match() on it, which throws if undefined.
// A real browser returns 'none' for elements without a transform — replicate that here.
const _getComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) =>
  new Proxy(_getComputedStyle(elt, pseudoElt), {
    get(target, prop: string) {
      if (prop === 'transform') return target.transform || 'none';
      const val = Reflect.get(target, prop);
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });

// jsdom doesn't implement pointer capture (used by vaul's drag handling).
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});

beforeEach(() => {
  resetFactories();
});
