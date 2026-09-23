import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Testing Library only auto-cleans when Vitest globals are enabled; they are not, so unmount
// explicitly and keep each test isolated.
afterEach(cleanup);
