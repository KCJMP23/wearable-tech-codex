// Early polyfill that must be loaded before anything else
// This fixes the "self is not defined" error during Next.js build
(function() {
  'use strict';
  
  // Create a comprehensive self polyfill
  function createSelfPolyfill() {
    if (typeof globalThis !== 'undefined') {
      return globalThis;
    }
    if (typeof global !== 'undefined') {
      return global;
    }
    if (typeof window !== 'undefined') {
      return window;
    }
    if (typeof self !== 'undefined') {
      return self;
    }
    // Fallback
    return {};
  }
  
  // Apply polyfill if self is not defined
  if (typeof self === 'undefined') {
    if (typeof global !== 'undefined') {
      global.self = createSelfPolyfill();
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.self = createSelfPolyfill();
    }
  }
  
  // Additional safety for webpack build
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    // Mock browser globals that might cause issues
    global.window = undefined;
    global.document = undefined;
    global.navigator = undefined;
    global.location = undefined;
    global.localStorage = undefined;
    global.sessionStorage = undefined;
  }
})();