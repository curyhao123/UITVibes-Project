/**
 * Logger utility - disables logs in production builds
 * Import this file first in _layout.tsx to apply globally
 */

// Disable all console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = () => {};
}

export {};
