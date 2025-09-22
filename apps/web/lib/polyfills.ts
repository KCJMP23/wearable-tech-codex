// Polyfill for server-side rendering - comprehensive approach
(function() {
  // Polyfill for self
  if (typeof globalThis !== 'undefined' && typeof self === 'undefined') {
    (globalThis as any).self = globalThis;
  }
  
  // Additional polyfill via global if available
  if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
    (global as any).self = globalThis || global;
  }
  
  // Browser globals polyfill for SSR
  if (typeof window === 'undefined') {
    (globalThis as any).window = undefined;
    (globalThis as any).document = undefined;
    (globalThis as any).navigator = undefined;
    (globalThis as any).location = undefined;
  }
})();

export {};