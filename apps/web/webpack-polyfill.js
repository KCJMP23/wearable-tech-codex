// Webpack entry polyfill
// This runs at the very beginning of the webpack bundle

// Comprehensive polyfill for server-side rendering
(function() {
  'use strict';
  
  // Define self if it doesn't exist
  if (typeof self === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      globalThis.self = globalThis;
      if (typeof global !== 'undefined') {
        global.self = globalThis;
      }
    } else if (typeof global !== 'undefined') {
      global.self = global;
    } else {
      // Fallback
      const selfPolyfill = {};
      if (typeof global !== 'undefined') {
        global.self = selfPolyfill;
      }
    }
  }
  
  // Mock browser APIs that might be needed
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    global.window = undefined;
    global.document = undefined;
    global.navigator = undefined;
    global.location = undefined;
    global.localStorage = undefined;
    global.sessionStorage = undefined;
    global.fetch = global.fetch || undefined;
    global.XMLHttpRequest = undefined;
    global.WebSocket = undefined;
  }
  
  // Array polyfill safety
  if (typeof Array === 'undefined') {
    global.Array = [];
  }
  
})();