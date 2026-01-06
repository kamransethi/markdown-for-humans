/**
 * Jest test setup
 *
 * This file runs before each test file.
 * Use it for global test configuration and utilities.
 */

import { resetAllMocks } from '../__mocks__/vscode';

// Polyfill File API for Node.js test environment
// File is a browser API that's not available in Node.js by default
if (typeof File === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).File = class File extends Blob {
    name: string;
    lastModified: number;

    constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  };
}

// Reset VS Code mocks before each test
beforeEach(() => {
  resetAllMocks();
});

// Global test timeout (useful for async operations)
jest.setTimeout(10000);

// Custom matchers can be added here
expect.extend({
  /**
   * Check if a word count is within expected range
   * Useful for testing word count with slight variations
   */
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Type declaration for custom matcher

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}
