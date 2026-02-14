import '@testing-library/jest-dom/vitest';
import { resetFactories } from './factories.ts';
import { beforeEach } from 'vitest';

beforeEach(() => {
  resetFactories();
});
