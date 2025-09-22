// Polyfill for exports is not defined error in Next.js 15
(function() {
  if (typeof window !== 'undefined') {
    // Set up exports globally
    if (typeof window.exports === 'undefined') {
      window.exports = {};
    }
    if (typeof window.module === 'undefined') {
      window.module = { exports: {} };
    }
    if (typeof window.require === 'undefined') {
      window.require = function() { return {}; };
    }
    // Also set them without window prefix for compatibility
    if (typeof exports === 'undefined') {
      var exports = {};
    }
    if (typeof module === 'undefined') {
      var module = { exports: {} };
    }
    if (typeof require === 'undefined') {
      var require = function() { return {}; };
    }
  }
})();