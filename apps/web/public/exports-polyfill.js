// Polyfill for exports is not defined error in Next.js 15
(function() {
  if (typeof window !== 'undefined') {
    if (typeof exports === 'undefined') {
      window.exports = {};
    }
    if (typeof module === 'undefined') {
      window.module = { exports: {} };
    }
    if (typeof require === 'undefined') {
      window.require = function() { return {}; };
    }
  }
})();