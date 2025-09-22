// Node.js loader to polyfill self before any modules are loaded
export async function initialize() {
  // Set up global polyfills immediately
  if (typeof global !== 'undefined') {
    global.self = global.self || globalThis || global;
    global.window = global.window || undefined;
    global.document = global.document || undefined;
    global.navigator = global.navigator || undefined;
    global.location = global.location || undefined;
  }
  
  if (typeof globalThis !== 'undefined') {
    globalThis.self = globalThis.self || globalThis;
  }
}

export async function resolve(specifier, context, defaultResolve) {
  return defaultResolve(specifier, context);
}

export async function load(url, context, defaultLoad) {
  return defaultLoad(url, context);
}