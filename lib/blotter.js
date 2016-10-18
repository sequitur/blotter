/*
  "Adapter" for a bundled version of Blotter.
*/

if (!console.warn) console.warn = console.log;

console.warn('Attaching Blotter bindings to globals.');
window.blotterStart = require('./engine.js').start;
