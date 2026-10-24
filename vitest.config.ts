/** Build tooling: test pure layout and diagnostic interpretation in Node. */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tools/**/*.test.ts'], maxWorkers: 2 } });
