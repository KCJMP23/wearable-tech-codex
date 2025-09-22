// CommonJS Node.js polyfill for build process
// This fixes "self is not defined" during Next.js build

// Create a robust self polyfill that mimics the browser environment
const createSelfPolyfill = () => {
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  return {};
};

// Set up global self polyfill immediately with comprehensive coverage
if (typeof global !== 'undefined') {
  const selfPolyfill = createSelfPolyfill();
  
  // Set self on all possible global objects
  global.self = selfPolyfill;
  
  // Mock browser globals that might cause issues during build
  global.window = undefined;
  global.document = undefined;
  global.navigator = undefined;
  global.location = undefined;
  global.localStorage = undefined;
  global.sessionStorage = undefined;
  global.XMLHttpRequest = undefined;
  global.fetch = global.fetch || undefined;
  global.WebSocket = undefined;
  global.Worker = undefined;
  global.performance = global.performance || { now: () => Date.now() };
  
  // Set up DOM-like API mocks
  global.addEventListener = undefined;
  global.removeEventListener = undefined;
  global.dispatchEvent = undefined;
  global.requestAnimationFrame = undefined;
  global.cancelAnimationFrame = undefined;
}

// Ensure globalThis.self exists as well
if (typeof globalThis !== 'undefined') {
  const selfPolyfill = createSelfPolyfill();
  globalThis.self = selfPolyfill;
}

// Override the self property to always return our polyfill
Object.defineProperty(global, 'self', {
  value: createSelfPolyfill(),
  writable: false,
  enumerable: true,
  configurable: false
});

console.log('Node.js polyfill: comprehensive SSR polyfills loaded');