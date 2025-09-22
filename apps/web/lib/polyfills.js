// Global polyfills for server-side rendering - comprehensive approach
(function() {
  // Polyfill for self
  if (typeof self === 'undefined' && typeof global !== 'undefined') {
    global.self = globalThis || global;
  }
  
  // Ensure globalThis.self exists
  if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis;
  }
  
  // Additional browser-like globals for SSR compatibility
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    global.window = undefined;
    global.document = undefined;
    global.navigator = undefined;
    global.location = undefined;
  }
})();