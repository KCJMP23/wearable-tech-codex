// CommonJS polyfill file that runs before Next.js
// This fixes the "self is not defined" error during build

// Set up self polyfill globally
if (typeof global !== 'undefined') {
  if (typeof global.self === 'undefined') {
    global.self = globalThis || global;
  }
}

if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis;
  }
}

// Additional browser-like environment setup for Node.js
if (typeof global !== 'undefined') {
  global.window = global.window || undefined;
  global.document = global.document || undefined;
  global.navigator = global.navigator || undefined;
  global.location = global.location || undefined;
  global.localStorage = global.localStorage || undefined;
  global.sessionStorage = global.sessionStorage || undefined;
}

console.log('✓ SSR polyfills loaded: self, window, document, navigator, location');